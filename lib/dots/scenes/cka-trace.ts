import { clamp, lerp, mulberry32, rgba, smoothstep } from "../math";
import { dust } from "../shapes";
import {
  fmt,
  freeArea,
  label,
  Readouts,
  resetText,
  Steps,
  stepAt,
} from "../story";
import type { Field, Frame, Palette, RGB, Scene } from "../types";

/** Batch size drawn. The real one is 1,000; eight keeps every cell legible. */
const B = 8;
const CELLS = B * B;
const VOXELS = B * B * B;
const HALF = (B - 1) / 2;
/** Gap between the cube and the K/L faces, in voxels. */
const GAP = 1.6;
const FACE = HALF + GAP;
const YAW = 0.58;
const PITCH = 0.42;
/** Share of the diagonal that flows into the first answer. */
const TO_DISC = 0.55;
const STEP_AT = [0, 0.1, 0.56, 0.7] as const;

type Point = { x: number; y: number };

/** A B × B Gram matrix XXᵀ from random non-negative features, scaled to [0, 1]. */
function gram(seed: number) {
  const rand = mulberry32(seed);
  const dims = 3;
  const x = Array.from({ length: B * dims }, () => rand());
  const g = new Float32Array(CELLS);
  let max = 0;
  for (let i = 0; i < B; i++) {
    for (let j = 0; j < B; j++) {
      let s = 0;
      for (let d = 0; d < dims; d++) s += x[i * dims + d] * x[j * dims + d];
      g[i * B + j] = s;
      max = Math.max(max, s);
    }
  }
  for (let c = 0; c < CELLS; c++) g[c] = (g[c] / max) ** 1.15;
  return g;
}

/** Slot `k` of a g × g grid inside a cell, as offsets in [0.14, 0.86]. */
function slot(k: number, g: number, out: [number, number]) {
  out[0] = 0.14 + (((k % g) + 0.5) / g) * 0.72;
  out[1] = 0.14 + (((Math.floor(k / g) % g) + 0.5) / g) * 0.72;
  return out;
}

/**
 * Why tr(KL) never needed K @ L. K and L fold onto two faces of a B × B × B
 * cube and fill it slice by slice — every multiply-add of the product. The
 * cube collapses into K @ L, whose diagonal alone becomes the trace while the
 * rest falls away. Below it, the same number straight from the matrices: lay
 * L on K, multiply matching cells, add. The two answers match; one cost B³,
 * the other B².
 */
export class TraceScene implements Scene {
  private K = gram(3);
  private L = gram(29);
  private kN = 0;
  private lN = 0;
  private vN = 0;
  /** Particles per matrix cell and per voxel, and their slot grids. */
  private perCell = 1;
  private cellGrid = 1;
  private perVoxel = 1;
  private voxelGrid = 1;
  private pGrid = 1;
  /** Flat size (first step), size in the two answer rows, gap between matrices. */
  private S = 200;
  private Sr = 160;
  private gap = 40;
  private pitch3 = 20;
  private center: Point = { x: 0, y: 0 };
  private row1: Point = { x: 0, y: 0 };
  private row2: Point = { x: 0, y: 0 };
  private disc1: Point = { x: 0, y: 0 };
  private disc2: Point = { x: 0, y: 0 };
  private radius = 18;
  private share2 = 1;
  private steps = new Steps();
  private readouts = new Readouts();
  private p = 0;
  private ink = true;

  layout(f: Field, fr: Frame) {
    const area = freeArea(fr, 12);
    const at = (u: number, v: number): Point => ({
      x: area.x + area.w * u,
      y: area.y + area.h * v,
    });
    this.kN = Math.round(f.n * 0.1);
    this.lN = Math.round(f.n * 0.1);
    this.vN = Math.round(f.n * 0.42);
    this.perCell = Math.max(1, Math.floor(this.kN / CELLS));
    this.cellGrid = Math.ceil(Math.sqrt(this.perCell));
    this.perVoxel = Math.max(1, Math.floor(this.vN / VOXELS));
    this.voxelGrid = Math.ceil(Math.cbrt(this.perVoxel));
    this.pGrid = Math.ceil(Math.sqrt(this.perVoxel * B));
    if (fr.compact) {
      this.S = Math.min(area.w * 0.4, area.h * 0.36);
      this.Sr = Math.min(area.w * 0.36, area.h * 0.34);
      this.center = at(0.5, 0.48);
      this.row1 = at(0.3, 0.24);
      this.row2 = at(0.3, 0.74);
      this.disc1 = at(0.8, 0.24);
      this.disc2 = at(0.8, 0.74);
    } else {
      this.S = Math.min(area.w * 0.25, area.h * 0.36);
      this.Sr = Math.min(area.w * 0.21, area.h * 0.33);
      this.center = at(0.42, 0.5);
      this.row1 = at(0.3, 0.24);
      this.row2 = at(0.3, 0.76);
      this.disc1 = at(0.76, 0.24);
      this.disc2 = at(0.76, 0.76);
    }
    this.gap = this.S * 0.24;
    this.pitch3 = Math.min(area.w * 0.034, area.h * 0.05);
    this.radius = this.Sr * 0.17;
    const toDisc1 = (this.vN / B) * TO_DISC;
    this.share2 = Math.min(1, toDisc1 / (this.kN + this.lN));
    this.steps.collect(fr.section);
    this.readouts.collect(fr.section);
  }

  /** Orthographic cube view of cube space (x = column, y = row, z = k). */
  private project(
    fr: Frame,
    x: number,
    y: number,
    z: number,
    out: [number, number],
  ) {
    const cy = Math.cos(YAW);
    const sy = Math.sin(YAW);
    const x1 = x * cy + z * sy;
    const z1 = -x * sy + z * cy;
    const y2 = y * Math.cos(PITCH) - z1 * Math.sin(PITCH);
    out[0] = fr.visual.x + this.center.x + x1 * this.pitch3;
    out[1] = fr.visual.y + this.center.y + y2 * this.pitch3;
    return out;
  }

  private disc(
    f: Field,
    i: number,
    at: Point,
    fr: Frame,
    out: [number, number],
  ) {
    const r = this.radius * Math.sqrt(f.r1[i]);
    const a = f.r0[i] * Math.PI * 2;
    out[0] = fr.visual.x + at.x + Math.cos(a) * r;
    out[1] = fr.visual.y + at.y + Math.sin(a) * r;
    return out;
  }

  update(f: Field, fr: Frame) {
    const p = fr.progress;
    this.p = p;
    const fold = smoothstep(0.08, 0.2, p);
    const sweep = smoothstep(0.22, 0.46, p) * B;
    const collapse = smoothstep(0.48, 0.6, p);
    const used = smoothstep(0.48, 0.54, p);
    const keepDiag = smoothstep(0.58, 0.62, p);
    const discard = smoothstep(0.6, 0.66, p);
    const toS1 = smoothstep(0.64, 0.7, p);
    const again = smoothstep(0.68, 0.75, p);
    const overlay = smoothstep(0.77, 0.85, p);
    const toS2 = smoothstep(0.87, 0.94, p);
    const slice = sweep > 0 && sweep < B ? Math.floor(sweep) : -1;
    const vx = fr.visual.x;
    const vy = fr.visual.y;
    const boost = this.ink ? 1 : 1.3;
    const grow = this.ink ? 1.5 : 1.75;

    const cellA = this.S / B;
    const cellR = this.Sr / B;
    const pt: [number, number] = [0, 0];
    const sub: [number, number] = [0, 0];
    const kEnd = this.kN;
    const lEnd = kEnd + this.lN;
    const vEnd = lEnd + this.vN;
    // Step one: K left of centre, L right of it.
    const kA = {
      x: vx + this.center.x - this.gap / 2 - this.S,
      y: vy + this.center.y - this.S / 2,
    };
    const lA = { x: vx + this.center.x + this.gap / 2, y: kA.y };
    // Step four: K in the second row, L beside it until it slides over.
    const k2 = {
      x: vx + this.row2.x - this.Sr / 2,
      y: vy + this.row2.y - this.Sr / 2,
    };
    const l2 = { x: k2.x + this.Sr + this.gap * 0.8, y: k2.y };
    const p1 = {
      x: vx + this.row1.x - this.Sr / 2,
      y: vy + this.row1.y - this.Sr / 2,
    };

    for (let i = 0; i < f.n; i++) {
      if (i < lEnd) {
        const isK = i < kEnd;
        const local = i - (isK ? 0 : kEnd);
        const c = local % CELLS;
        const nth = Math.floor(local / CELLS);
        const r = Math.floor(c / B);
        const q = c % B;
        const v = isK ? this.K[c] : this.L[c];
        slot(nth, this.cellGrid, sub);
        const baseA = isK ? kA : lA;
        let x = baseA.x + (q + sub[0]) * cellA;
        let y = baseA.y + (r + sub[1]) * cellA;
        // K[i, k] lies on the cube's left face, L[k, j] on its top face.
        if (isK)
          this.project(
            fr,
            -FACE,
            r - HALF + sub[1] - 0.5,
            q - HALF + sub[0] - 0.5,
            pt,
          );
        else
          this.project(
            fr,
            q - HALF + sub[0] - 0.5,
            -FACE,
            r - HALF + sub[1] - 0.5,
            pt,
          );
        x = lerp(x, pt[0], fold);
        y = lerp(y, pt[1], fold);
        const base2 = isK ? k2 : l2;
        let x2 = base2.x + (q + sub[0]) * cellR;
        const y2 = base2.y + (r + sub[1]) * cellR;
        if (!isK) x2 = lerp(x2, k2.x + (q + sub[0]) * cellR, overlay);
        x = lerp(x, x2, again);
        y = lerp(y, y2, again);
        let alpha = (0.16 + v * 0.84) * (1 - used * (1 - again));
        let tint = 0;
        if (slice >= 0 && (isK ? q === slice : r === slice)) tint = 0.95;
        if (overlay > 0.85) tint = (overlay - 0.85) / 0.15;
        if (toS2 > 0 && f.r3[i] < this.share2) {
          this.disc(f, i, this.disc2, fr, pt);
          x = lerp(x, pt[0], toS2);
          y = lerp(y, pt[1], toS2);
          alpha = lerp(alpha, 0.9, toS2);
        }
        f.gx[i] = x;
        f.gy[i] = y;
        f.ga[i] = Math.min(1, alpha * boost);
        f.gh[i] = tint;
        f.gz[i] = f.size[i] * grow;
        f.gj[i] = 0.3;
        continue;
      }
      if (i < vEnd) {
        // Voxel (i, j, k) holds K[i, k] · L[k, j].
        const local = i - lEnd;
        const vox = local % VOXELS;
        const nth = Math.floor(local / VOXELS);
        const k = Math.floor(vox / CELLS);
        const r = Math.floor((vox % CELLS) / B);
        const q = vox % B;
        const v = this.K[r * B + k] * this.L[k * B + q];
        const g = this.voxelGrid;
        const ox = ((nth % g) + 0.5) / g - 0.5;
        const oy = ((Math.floor(nth / g) % g) + 0.5) / g - 0.5;
        const oz = ((Math.floor(nth / (g * g)) % g) + 0.5) / g - 0.5;
        this.project(
          fr,
          q - HALF + ox * 0.62,
          r - HALF + oy * 0.62,
          k - HALF + oz * 0.62,
          pt,
        );
        // Collapsing along k: every product lands in its cell of K @ L.
        slot(k * this.perVoxel + nth, this.pGrid, sub);
        const px = p1.x + (q + sub[0]) * cellR;
        const py = p1.y + (r + sub[1]) * cellR;
        let x = lerp(pt[0], px, collapse);
        let y = lerp(pt[1], py, collapse);
        const shown = clamp(sweep - k);
        let alpha =
          (0.2 + Math.sqrt(v) * 0.72) * (k === slice ? 1.35 : 1) * shown;
        let tint = k === slice ? 0.85 : 0;
        if (r === q) {
          tint = Math.max(tint, keepDiag);
          alpha = Math.max(alpha, 0.75 * keepDiag * shown);
          if (toS1 > 0 && f.r3[i] < TO_DISC) {
            this.disc(f, i, this.disc1, fr, pt);
            x = lerp(x, pt[0], toS1);
            y = lerp(y, pt[1], toS1);
            alpha = lerp(alpha, 0.9, toS1);
          }
        } else if (discard > 0) {
          // Computed, then thrown away.
          y += discard * (20 + f.r3[i] * 50);
          x += (f.r0[i] - 0.5) * discard * 24;
          alpha *= 1 - discard;
        }
        f.gx[i] = x;
        f.gy[i] = y;
        f.ga[i] = Math.min(1, alpha * boost);
        f.gh[i] = tint;
        f.gj[i] = 0.4;
        if (!this.ink) f.gz[i] = f.size[i] * 1.3;
        continue;
      }
      dust(f, i, fr, 0.1);
    }

    this.steps.set(stepAt(p, STEP_AT));
    this.readouts.write("cubic", fmt((Math.min(sweep, B) / B) * VOXELS));
    this.readouts.write("square", fmt(overlay * CELLS));
    this.readouts.write(
      "ratio",
      overlay > 0.5 ? "1,000× less" : sweep > 0 ? "10⁹ / pair" : "–",
    );
  }

  private arrow(
    ctx: CanvasRenderingContext2D,
    palette: Palette,
    x0: number,
    x1: number,
    y: number,
    text: string,
    alpha: number,
  ) {
    if (alpha <= 0.01) return;
    ctx.strokeStyle = rgba(palette.muted, 0.6 * alpha);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x1, y);
    ctx.moveTo(x1 - 5, y - 4);
    ctx.lineTo(x1, y);
    ctx.lineTo(x1 - 5, y + 4);
    ctx.stroke();
    label(ctx, palette, text, (x0 + x1) / 2, y - 11, {
      align: "center",
      size: 11,
      color: palette.fg,
      alpha,
    });
  }

  /**
   * A matrix's name over its box's left edge and the library that computes it
   * over the right edge. When the box is too narrow for both on one line, the
   * library moves up a line so the two never overlap.
   */
  private heading(
    ctx: CanvasRenderingContext2D,
    palette: Palette,
    fr: Frame,
    box: { left: number; right: number; y: number },
    name: { text: string; color: RGB; alpha: number },
    library: { text: string; color: RGB; alpha: number },
  ) {
    const big = fr.compact ? 12 : 14;
    const small = fr.compact ? 9 : 10;
    ctx.font = `${big}px ${palette.mono}`;
    const nameW = ctx.measureText(name.text).width;
    ctx.font = `${small}px ${palette.mono}`;
    const libraryW = ctx.measureText(library.text).width;
    const fits = nameW + libraryW + 12 <= box.right - box.left;
    label(ctx, palette, name.text, box.left, box.y, {
      size: big,
      color: name.color,
      alpha: name.alpha,
    });
    label(
      ctx,
      palette,
      library.text,
      fits ? box.right : box.left,
      fits ? box.y : box.y - big - 4,
      {
        align: fits ? "right" : "left",
        size: small,
        color: library.color,
        alpha: library.alpha,
      },
    );
  }

  draw(ctx: CanvasRenderingContext2D, fr: Frame, palette: Palette) {
    this.ink = palette.ink;
    const p = this.p;
    const vx = fr.visual.x;
    const vy = fr.visual.y;
    const pt: [number, number] = [0, 0];
    const big = fr.compact ? 12 : 14;
    const small = fr.compact ? 9 : 10;
    const fold = smoothstep(0.08, 0.16, p);
    const cube = smoothstep(0.14, 0.2, p) * (1 - smoothstep(0.48, 0.52, p));

    // Step one: the two matrices.
    const flat = 1 - fold;
    const kAx = vx + this.center.x - this.gap / 2 - this.S / 2;
    const lAx = vx + this.center.x + this.gap / 2 + this.S / 2;
    const topA = vy + this.center.y - this.S / 2 - 16;
    label(ctx, palette, "K", kAx, topA, {
      align: "center",
      size: big,
      color: palette.fg,
      alpha: flat,
    });
    label(ctx, palette, "L", lAx, topA, {
      align: "center",
      size: big,
      color: palette.fg,
      alpha: flat,
    });
    // What the dots mean: one cell per pair of inputs, brightness = likeness.
    const kLeft = vx + this.center.x - this.gap / 2 - this.S;
    const lLeft = vx + this.center.x + this.gap / 2;
    const top = vy + this.center.y - this.S / 2;
    for (const left of [kLeft, lLeft]) {
      label(ctx, palette, "input j →", left + this.S, top - 16, {
        align: "right",
        size: small,
        alpha: flat * 0.7,
      });
      ctx.save();
      ctx.translate(left - 10, top);
      ctx.rotate(Math.PI / 2);
      label(ctx, palette, "input i →", 0, 0, {
        size: small,
        alpha: flat * 0.7,
      });
      ctx.restore();
    }
    const below = vy + this.center.y + this.S / 2;
    label(
      ctx,
      palette,
      fr.compact
        ? "cell (i, j) = how alike inputs i and j look"
        : "cell (i, j) = how alike inputs i and j look to the layer",
      (kAx + lAx) / 2,
      below + 20,
      { align: "center", size: small, alpha: flat * 0.85 },
    );
    label(
      ctx,
      palette,
      "brighter = more alike · 8 inputs here, 1,000 in the benchmark",
      (kAx + lAx) / 2,
      below + 36,
      { align: "center", size: small, alpha: flat * 0.7 },
    );

    // The cube: names just outside the K and L faces.
    this.project(fr, -FACE, 0, -HALF - 0.5, pt);
    label(ctx, palette, "K", pt[0] - 16, pt[1], {
      align: "center",
      size: big,
      color: palette.fg,
      alpha: cube,
    });
    this.project(fr, 0, -FACE, HALF + 0.5, pt);
    label(ctx, palette, "L", pt[0], pt[1] - 16, {
      align: "center",
      size: big,
      color: palette.fg,
      alpha: cube,
    });
    this.project(fr, 0, HALF + 1.6, -HALF, pt);
    label(ctx, palette, "torch_cka · K @ L, every multiply-add", pt[0], pt[1], {
      align: "center",
      size: small,
      alpha: cube * smoothstep(0.2, 0.24, p) * 0.9,
    });

    // Row one: the product, its diagonal, and the trace.
    const row1 = smoothstep(0.56, 0.6, p);
    const toS1 = smoothstep(0.64, 0.7, p);
    const r1x = vx + this.row1.x;
    const r1y = vy + this.row1.y;
    const half = this.Sr / 2;
    if (row1 > 0) {
      ctx.strokeStyle = rgba(palette.muted, 0.28 * row1);
      ctx.lineWidth = 1;
      ctx.strokeRect(r1x - half - 3, r1y - half - 3, this.Sr + 6, this.Sr + 6);
    }
    this.heading(
      ctx,
      palette,
      fr,
      { left: r1x - half - 3, right: r1x + half + 3, y: r1y - half - 16 },
      { text: "K @ L", color: palette.fg, alpha: row1 },
      { text: "torch_cka", color: palette.muted, alpha: row1 * 0.85 },
    );
    label(
      ctx,
      palette,
      "diagonal kept, the rest discarded",
      r1x - half - 3,
      r1y + half + 18,
      {
        size: small,
        alpha: smoothstep(0.6, 0.64, p) * 0.85,
      },
    );
    const d1x = vx + this.disc1.x;
    const d2x = vx + this.disc2.x;
    const r = this.radius;
    this.arrow(ctx, palette, r1x + half + 14, d1x - r - 12, r1y, "tr", toS1);
    label(ctx, palette, "B³", d1x, r1y + r + 16, {
      align: "center",
      size: 11,
      alpha: toS1,
    });

    // Row two: the same sum, straight from K and L.
    const again = smoothstep(0.72, 0.76, p);
    const overlay = smoothstep(0.77, 0.85, p);
    const toS2 = smoothstep(0.87, 0.94, p);
    const r2x = vx + this.row2.x;
    const r2y = vy + this.row2.y;
    const lx = lerp(r2x + this.Sr + this.gap * 0.8, r2x, overlay);
    label(ctx, palette, "K", r2x - half - 3, r2y - half - 16, {
      size: big,
      color: palette.fg,
      alpha: again * (1 - overlay),
    });
    label(ctx, palette, "L", lx - half - 3, r2y - half - 16, {
      size: big,
      color: palette.fg,
      alpha: again * (1 - overlay),
    });
    const merged = smoothstep(0.8, 0.85, p);
    this.heading(
      ctx,
      palette,
      fr,
      { left: r2x - half - 3, right: r2x + half + 3, y: r2y - half - 16 },
      { text: "K ⊙ L", color: palette.accent, alpha: merged },
      { text: "pytorch-cka", color: palette.accent, alpha: merged * 0.9 },
    );
    this.arrow(ctx, palette, r2x + half + 14, d2x - r - 12, r2y, "Σ", toS2);
    label(ctx, palette, "B²", d2x, r2y + r + 16, {
      align: "center",
      size: 11,
      alpha: toS2,
    });
    label(ctx, palette, "=", (d1x + d2x) / 2, (r1y + r2y) / 2, {
      align: "center",
      size: 20,
      color: palette.fg,
      alpha: smoothstep(0.92, 0.95, p),
    });
    resetText(ctx);
  }
}
