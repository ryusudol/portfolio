import { rgba } from "../math";
import { dust } from "../shapes";
import {
  freeArea,
  label,
  Readouts,
  resetText,
  StageSize,
  Steps,
  stepAt,
} from "../story";
import type { Field, Frame, Palette, Scene } from "../types";

const STEP_AT = [0, 0.24, 0.5, 0.76] as const;
/**
 * The 53° shell's 464 km, from Earth's center, and orbital speed there. The
 * app works in kilometers, and float32's step depends on the unit, so the
 * rounding here happens in km too.
 */
const RADIUS_KM = 6842;
const SPEED_KM_S = 7.63;
/** Float32's spacing at that radius, in meters (0.49 m). */
const ULP_M = 2 ** (Math.floor(Math.log2(RADIUS_KM)) - 23) * 1000;
/** Model span drawn on the stage (m), and the camera's distance from it. */
const SPAN = 34;
/** Bytes uploaded per frame for 32,583 satellites (ENGINE-OPTIMIZATION.md). */
const UPLOAD = "0.38 MB";

type Part = { x: number; y: number; w: number; h: number; weight: number };

/**
 * A Starlink V2 Mini drawn in dots, after the app's model: a flat bus and,
 * on a boom to one side, a long two-panel array (about 30 m end to end).
 * Rough proportions; SpaceX doesn't publish drawings.
 */
const PARTS: Part[] = [
  { x: -4.6, y: -1.4, w: 4.1, h: 2.8, weight: 1.6 },
  { x: -0.5, y: -0.15, w: 2.2, h: 0.3, weight: 0.4 },
  { x: 1.7, y: -2.1, w: 12.6, h: 4.2, weight: 1 },
  { x: 14.6, y: -2.1, w: 12.6, h: 4.2, weight: 1 },
];
const AREA = PARTS.reduce((s, p) => s + p.w * p.h * p.weight, 0);

/**
 * Float32 rounding, done for real with `Math.fround`. The satellite flies at
 * orbital speed 6,842 km from Earth's center with the camera riding along.
 * Drawn the naive way, each vertex's world position and the camera's are
 * rounded to float32 separately, so every vertex lands up to half a meter off
 * and the model shakes. Drawn camera-relative, the offset is taken in
 * float64 first and only the small result is rounded.
 */
export class PrecisionScene implements Scene {
  private n = 0;
  private local = new Float64Array(0);
  private center = { x: 0, y: 0 };
  private scale = 10;
  private t = 0;
  private step = 0;
  private steps = new Steps();
  private readouts = new Readouts();
  private size = new StageSize();
  private ink = true;

  layout(f: Field, fr: Frame) {
    const area = freeArea(fr, 24);
    this.scale = Math.min((area.w * 0.86) / (SPAN - 2), area.h * 0.09);
    this.center = {
      x: area.x + area.w / 2 - ((PARTS[0].x + 27.2) / 2) * this.scale,
      y: area.y + area.h * 0.5,
    };
    this.n = Math.min(Math.round(f.n * 0.5), 5200);
    this.local = new Float64Array(this.n * 2);
    // Spread dots over the parts by area, on a jittered grid in each.
    let k = 0;
    for (let p = 0; p < PARTS.length; p++) {
      const part = PARTS[p];
      const share =
        p === PARTS.length - 1
          ? this.n - k
          : Math.round((this.n * part.w * part.h * part.weight) / AREA);
      const cols = Math.max(
        1,
        Math.round(Math.sqrt((share * part.w) / part.h)),
      );
      const rows = Math.max(1, Math.ceil(share / cols));
      for (let j = 0; j < share && k < this.n; j++, k++) {
        const c = j % cols;
        const r = Math.floor(j / cols);
        // Panels read as cells: leave a seam every few columns and rows.
        const seamX = p >= 2 && c % 7 === 6 ? 0.5 : 0;
        this.local[2 * k] = part.x + ((c + 0.5 + seamX * 0.3) / cols) * part.w;
        this.local[2 * k + 1] = part.y + ((r + 0.5) / rows) * part.h;
      }
    }
    this.steps.collect(fr.section);
    this.readouts.collect(fr.section);
  }

  update(f: Field, fr: Frame) {
    if (this.size.changed(fr)) this.layout(f, fr);
    const step = stepAt(fr.progress, STEP_AT);
    this.step = step;
    this.steps.set(step);
    if (!fr.reduced) this.t += fr.dt;
    // Along the orbit at 45°, so both screen axes carry the full radius.
    const angle = Math.PI / 4 + (SPEED_KM_S * this.t) / RADIUS_KM;
    const sx = RADIUS_KM * Math.cos(angle);
    const sy = RADIUS_KM * Math.sin(angle);
    // The camera rides along, 40 m off the satellite in depth only.
    const cx = sx;
    const cy = sy;
    const naive = step === 1;
    const camX = Math.fround(cx);
    const camY = Math.fround(cy);
    const vx = fr.visual.x + this.center.x;
    const vy = fr.visual.y + this.center.y;
    const s = this.scale;
    const boost = this.ink ? 1 : 1.25;
    let worst = 0;

    for (let i = 0; i < f.n; i++) {
      if (i >= this.n) {
        dust(f, i, fr, 0.08);
        continue;
      }
      // Model offsets in km, as the app stores everything.
      const lx = this.local[2 * i] / 1000;
      const ly = this.local[2 * i + 1] / 1000;
      let ox: number;
      let oy: number;
      if (naive) {
        // GPU-style: world position and camera each rounded to float32.
        ox = Math.fround(sx + lx) - camX;
        oy = Math.fround(sy + ly) - camY;
      } else {
        // Camera-relative: subtract in float64, then round the small offset.
        ox = Math.fround(sx + lx - cx);
        oy = Math.fround(sy + ly - cy);
      }
      worst = Math.max(worst, Math.hypot(ox - lx, oy - ly) * 1000);
      const gx = vx + ox * 1000 * s;
      const gy = vy - oy * 1000 * s;
      f.gx[i] = gx;
      f.gy[i] = gy;
      // Once the model has formed, place dots exactly: the shake is the point.
      if (Math.abs(f.x[i] - gx) < 16 && Math.abs(f.y[i] - gy) < 16) {
        f.x[i] = gx;
        f.y[i] = gy;
        f.vx[i] = 0;
        f.vy[i] = 0;
      }
      const bus = i < this.n * 0.25;
      f.ga[i] = Math.min(1, (bus ? 0.85 : 0.6 + f.r3[i] * 0.25) * boost);
      f.gh[i] = naive ? 0.9 : 0;
      f.gz[i] = fr.compact ? 1.1 : 1.35;
      f.gj[i] = 0;
    }
    this.readouts.write(
      "error",
      worst > 0.01 ? `${worst.toFixed(2)} m` : `${(worst * 1e6).toFixed(1)} µm`,
    );
    this.readouts.write("upload", step >= 3 ? UPLOAD : "–");
  }

  draw(ctx: CanvasRenderingContext2D, fr: Frame, palette: Palette) {
    this.ink = palette.ink;
    const vx = fr.visual.x + this.center.x;
    const vy = fr.visual.y + this.center.y;
    const s = this.scale;
    const size = fr.compact ? 9 : 10;
    // Float32's spacing at this radius, 0.49 m, as a faint grid under the model.
    if (this.step === 1 || this.step === 2) {
      const step = ULP_M;
      const px = step * s;
      const x0 = vx + PARTS[0].x * s - 20;
      const x1 = vx + 27.2 * s + 20;
      const y0 = vy - 4.5 * s;
      const y1 = vy + 4.5 * s;
      ctx.strokeStyle = rgba(palette.muted, 0.13);
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let y = y0; y <= y1; y += px) {
        ctx.moveTo(x0, y);
        ctx.lineTo(x1, y);
      }
      for (let x = x0; x <= x1; x += px) {
        ctx.moveTo(x, y0);
        ctx.lineTo(x, y1);
      }
      ctx.stroke();
      label(
        ctx,
        palette,
        `float32 steps here, ${step.toFixed(2)} m`,
        x0,
        y1 + 16,
        {
          size,
          alpha: 0.85,
        },
      );
    }
    // A 5 m scale bar.
    const bar = 5 * s;
    const bx = vx + 27.2 * s - bar;
    const by = vy - 4.5 * s - 18;
    ctx.strokeStyle = rgba(palette.fg, 0.6);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bx, by - 3);
    ctx.lineTo(bx, by);
    ctx.lineTo(bx + bar, by);
    ctx.lineTo(bx + bar, by - 3);
    ctx.stroke();
    label(ctx, palette, "5 m", bx - 8, by, {
      size,
      align: "right",
      color: palette.fg,
    });
    label(
      ctx,
      palette,
      "Starlink V2 Mini, from 40 m",
      vx + PARTS[0].x * s,
      by,
      {
        size,
        alpha: 0.8,
      },
    );
    if (this.step === 1) {
      label(
        ctx,
        palette,
        "world float32, camera float32",
        vx + PARTS[0].x * s,
        vy + 4.5 * s + 34,
        {
          size,
          color: palette.accent,
        },
      );
    } else if (this.step === 2) {
      label(
        ctx,
        palette,
        "offset in float64, then float32",
        vx + PARTS[0].x * s,
        vy + 4.5 * s + 34,
        {
          size,
          color: palette.fg,
        },
      );
    }
    resetText(ctx);
  }
}
