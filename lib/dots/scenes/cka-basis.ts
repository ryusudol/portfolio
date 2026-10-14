import { gauss, lerp, mix, mulberry32, rgba, smoothstep, TAU } from "../math";
import { dust } from "../shapes";
import { freeArea, label, Readouts, resetText, Steps, stepAt } from "../story";
import type { Field, Frame, Palette, RGB, Scene } from "../types";

/** Grid lines at −N … N units, in the style of Essence of Linear Algebra. */
const N = 4;
const LINES = 2 * N + 1;
/** How far each line runs, so it still fills the view once transformed. */
const REACH = 6;
const STEP_AT = [0, 0.14, 0.34, 0.54, 0.76] as const;

/** Three CIFAR-10 classes, in the same Tableau colors as the unlearning map. */
const CLUSTERS: { x: number; y: number; name: string; color: RGB }[] = [
  { x: -1.7, y: -1.1, name: "airplane", color: [78, 121, 167] },
  { x: 1.5, y: -1.4, name: "cat", color: [118, 183, 178] },
  { x: 0.2, y: 1.7, name: "dog", color: [237, 201, 72] },
];
const INK_COLORS = CLUSTERS.map((c) => c.color);
const PAPER_COLORS = INK_COLORS.map((c) => mix(c, [0, 0, 0], 0.22));

type M2 = [number, number, number, number];

/** The transformation for scroll position p: rotate, scale, shear, flatten. */
function transform(p: number): M2 {
  const theta = 0.72 * smoothstep(0.16, 0.3, p);
  const s = 1 + 0.32 * smoothstep(0.36, 0.48, p);
  const e = smoothstep(0.56, 0.7, p);
  const q = smoothstep(0.78, 0.9, p);
  // D = [[sx, k], [0, sy]]: stretch x, squeeze y, lean, then flatten y.
  const sx = s * (1 + 0.55 * e);
  const k = s * 0.55 * e;
  const sy = s * (1 - 0.42 * e) * (1 - 0.96 * q);
  const c = Math.cos(theta);
  const n = Math.sin(theta);
  // A = R(θ) · D
  return [c * sx, c * k - n * sy, n * sx, n * k + c * sy];
}

/**
 * A layer's activations are points; a matrix moves them. The grid, the basis
 * vectors, and three classes of points all move under the same matrix while
 * linear CKA against the original is computed live from the drawn points —
 * unchanged by rotation and uniform scaling, lowered by anything else.
 */
export class BasisScene implements Scene {
  private cx = 0;
  private cy = 0;
  private unit = 40;
  private gridN = 0;
  private cloudN = 0;
  private arrowN = 0;
  /** Cloud point per particle, in grid units. */
  private px = new Float32Array(0);
  private py = new Float32Array(0);
  /** XᵀX of the centered cloud. */
  private sigma: M2 = [1, 0, 0, 1];
  private A: M2 = [1, 0, 0, 1];
  private steps = new Steps();
  private readouts = new Readouts();
  private ink = true;

  layout(f: Field, fr: Frame) {
    const area = freeArea(fr, 12);
    this.cx = area.x + area.w / 2;
    this.cy = area.y + area.h / 2;
    this.unit = Math.min(area.w, area.h) / (fr.compact ? 8.6 : 9.6);
    this.gridN = Math.round(f.n * 0.4);
    this.cloudN = Math.round(f.n * 0.24);
    this.arrowN = Math.round(f.n * 0.05);

    const rand = mulberry32(7);
    this.px = new Float32Array(this.cloudN);
    this.py = new Float32Array(this.cloudN);
    let mx = 0;
    let my = 0;
    for (let k = 0; k < this.cloudN; k++) {
      const c = CLUSTERS[k % CLUSTERS.length];
      const r = Math.max(1e-6, rand());
      this.px[k] = c.x + gauss(r, rand()) * 0.5;
      this.py[k] = c.y + gauss(Math.max(1e-6, rand()), rand()) * 0.42;
      mx += this.px[k];
      my += this.py[k];
    }
    mx /= this.cloudN;
    my /= this.cloudN;
    let sxx = 0;
    let sxy = 0;
    let syy = 0;
    for (let k = 0; k < this.cloudN; k++) {
      const x = this.px[k] - mx;
      const y = this.py[k] - my;
      sxx += x * x;
      sxy += x * y;
      syy += y * y;
    }
    this.sigma = [sxx, sxy, sxy, syy];
    this.steps.collect(fr.section);
    this.readouts.collect(fr.section);
  }

  /**
   * Linear CKA between X and Y = XAᵀ, from XᵀX alone:
   * ‖YᵀX‖²_F / (‖XᵀX‖_F · ‖YᵀY‖_F), with YᵀX = AΣ and YᵀY = AΣAᵀ.
   */
  private cka(A: M2) {
    const [a, b, c, d] = A;
    const [s0, s1, s2, s3] = this.sigma;
    const as0 = a * s0 + b * s2;
    const as1 = a * s1 + b * s3;
    const as2 = c * s0 + d * s2;
    const as3 = c * s1 + d * s3;
    const cross = as0 * as0 + as1 * as1 + as2 * as2 + as3 * as3;
    const y0 = as0 * a + as1 * b;
    const y1 = as0 * c + as1 * d;
    const y3 = as2 * c + as3 * d;
    const self = Math.sqrt(s0 * s0 + 2 * s1 * s1 + s3 * s3);
    const other = Math.sqrt(y0 * y0 + 2 * y1 * y1 + y3 * y3);
    return cross / Math.max(1e-9, self * other);
  }

  update(f: Field, fr: Frame) {
    const p = fr.progress;
    const A = transform(p);
    this.A = A;
    const [a, b, c, d] = A;
    const ox = fr.visual.x + this.cx;
    const oy = fr.visual.y + this.cy;
    const U = this.unit;
    // Screen y grows downward, so flip y on the way in and out.
    const sx = (x: number, y: number) => ox + (a * x + b * y) * U;
    const sy = (x: number, y: number) => oy - (c * x + d * y) * U;
    const fade = N * U * 1.12;
    f.classColors = this.ink ? INK_COLORS : PAPER_COLORS;
    const boost = this.ink ? 1 : 1.3;

    const gridEnd = this.gridN;
    const cloudEnd = gridEnd + this.cloudN;
    const arrowEnd = cloudEnd + this.arrowN;
    for (let i = 0; i < f.n; i++) {
      if (i < gridEnd) {
        // Particles strung along 2 × LINES grid lines.
        const line = i % (2 * LINES);
        const vertical = line < LINES;
        const at = (vertical ? line : line - LINES) - N;
        const along = (f.r0[i] * 2 - 1) * REACH;
        const x = vertical ? at : along;
        const y = vertical ? along : at;
        const gx = sx(x, y);
        const gy = sy(x, y);
        const r = Math.hypot(gx - ox, gy - oy);
        const axis = at === 0;
        f.gx[i] = gx;
        f.gy[i] = gy;
        f.ga[i] =
          (axis ? 0.85 : 0.46) *
          (1 - smoothstep(fade * 0.62, fade * 1.1, r)) *
          boost;
        f.gh[i] = 0;
        f.gj[i] = 0.4;
        continue;
      }
      if (i < cloudEnd) {
        const k = i - gridEnd;
        f.gx[i] = sx(this.px[k], this.py[k]);
        f.gy[i] = sy(this.px[k], this.py[k]);
        f.ga[i] = Math.min(1, (0.7 + f.r3[i] * 0.3) * boost);
        f.gh[i] = 0;
        f.gc[i] = 1 + (k % CLUSTERS.length);
        f.gz[i] = f.size[i] * (this.ink ? 1.15 : 1.4);
        continue;
      }
      if (i < arrowEnd) {
        // î (accent) and ĵ (ink): a shaft plus a filled arrowhead.
        const k = i - cloudEnd;
        const isI = k % 2 === 0;
        const ex = sx(isI ? 1 : 0, isI ? 0 : 1);
        const ey = sy(isI ? 1 : 0, isI ? 0 : 1);
        const dx = ex - ox;
        const dy = ey - oy;
        const len = Math.max(1, Math.hypot(dx, dy));
        const ux = dx / len;
        const uy = dy / len;
        const head = Math.min(11, len * 0.4);
        let x: number;
        let y: number;
        if (f.r1[i] < 0.62) {
          const t = f.r0[i] * (len - head * 0.8);
          x = ox + ux * t;
          y = oy + uy * t;
        } else {
          // Uniform point in the head triangle.
          let s = f.r0[i];
          let t = f.r2[i];
          if (s + t > 1) {
            s = 1 - s;
            t = 1 - t;
          }
          const bx = ex - ux * head;
          const by = ey - uy * head;
          const w = head * 0.45;
          const lx = bx - uy * w;
          const ly = by + ux * w;
          const rx = bx + uy * w;
          const ry = by - ux * w;
          x = ex + (lx - ex) * s + (rx - ex) * t;
          y = ey + (ly - ey) * s + (ry - ey) * t;
        }
        f.gx[i] = x;
        f.gy[i] = y;
        f.ga[i] = 1;
        f.gh[i] = isI ? 1 : 0;
        f.gj[i] = 0.2;
        continue;
      }
      dust(f, i, fr, 0.1);
    }

    this.steps.set(stepAt(p, STEP_AT));
    const show = (v: number) => (Math.abs(v) < 0.005 ? 0 : v).toFixed(2);
    this.readouts.write("m0", show(a));
    this.readouts.write("m1", show(b));
    this.readouts.write("m2", show(c));
    this.readouts.write("m3", show(d));
    this.readouts.write("cka", this.cka(A).toFixed(2));
  }

  draw(ctx: CanvasRenderingContext2D, fr: Frame, palette: Palette) {
    this.ink = palette.ink;
    const ox = fr.visual.x + this.cx;
    const oy = fr.visual.y + this.cy;
    const U = this.unit;
    const [a, b, c, d] = this.A;

    // The untransformed grid, as a faint reference.
    ctx.save();
    ctx.beginPath();
    ctx.arc(ox, oy, N * U * 1.05, 0, TAU);
    ctx.clip();
    ctx.strokeStyle = rgba(palette.muted, palette.ink ? 0.16 : 0.22);
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    for (let k = -N; k <= N; k++) {
      ctx.moveTo(ox + k * U, oy - N * U * 1.1);
      ctx.lineTo(ox + k * U, oy + N * U * 1.1);
      ctx.moveTo(ox - N * U * 1.1, oy + k * U);
      ctx.lineTo(ox + N * U * 1.1, oy + k * U);
    }
    ctx.stroke();
    ctx.restore();
    ctx.setLineDash([]);

    const tip = (x: number, y: number): [number, number] => [
      ox + (a * x + b * y) * U,
      oy - (c * x + d * y) * U,
    ];
    const [ix, iy] = tip(1.28, 0);
    const [jx, jy] = tip(0, 1.28);
    label(ctx, palette, "î", ix, iy, {
      align: "center",
      size: 13,
      color: palette.accent,
      alpha: 1,
    });
    label(ctx, palette, "ĵ", jx, jy, {
      align: "center",
      size: 13,
      color: palette.fg,
      alpha: 1,
    });

    if (!fr.compact) {
      const flat = smoothstep(0.8, 0.88, fr.progress);
      for (const cl of CLUSTERS) {
        const [x, y] = tip(cl.x, cl.y + 0.95);
        label(ctx, palette, cl.name, x, lerp(y, y - 6, flat), {
          align: "center",
          size: 9.5,
          alpha: 0.75 * (1 - flat),
        });
      }
    }
    resetText(ctx);
  }
}
