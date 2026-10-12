import { rgba } from "../math";
import { MU, RE } from "../orbit-data";
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

const STEP_AT = [0, 0.2, 0.4, 0.6, 0.8] as const;

/**
 * The engine's `fast_eccentric_objects_are_not_missed`: a 300 × 42,164 km
 * transfer orbit at perigee meets a 300 km satellite on a 179° orbit
 * head-on, closest midway between two 120 s samples, with a 20 km threshold.
 */
const STEP_S = 120;
const THRESHOLD = 20;
const RP = RE + 300;
const RA = 42_164;
/** Top speeds as the screener computes them: vis-viva at perigee, +2%. */
const V_TRANSFER = Math.sqrt(MU * (2 / RP - 2 / (RP + RA))) * 1.02;
const V_LEO = Math.sqrt(MU / RP);
const V_REL = Math.sqrt(MU * (2 / RP - 2 / (RP + RA))) + V_LEO;
/** One radius for every pair, sized for 16 km/s. */
const SLOW = THRESHOLD + 16 * (STEP_S / 2);
/** The pair's own bound, and the fast object's radius: its top speed plus the fastest's. */
const OWN = THRESHOLD + V_REL * (STEP_S / 2);
const FAST = THRESHOLD + (V_TRANSFER + V_TRANSFER) * (STEP_S / 2);
const MISS = 2;
const SAMPLE = Math.hypot(MISS, V_REL * (STEP_S / 2));
const Y_MAX = 1500;
const T_MAX = 95;
const STEPS = [10, 20, 60, 120];
const ENCOUNTERS = 60_756;

const km = (v: number) => `${Math.round(v).toLocaleString("en-US")} km`;

/**
 * Separation against time for that pass. The curve dips once, between two
 * samples; a horizontal line is the search radius. Too small a radius leaves
 * both samples above it and the pass is missed; the fast object's own radius
 * catches it. Then the proof in practice: four step sizes, one count.
 */
export class BoundScene implements Scene {
  private box = { x: 0, y: 0, w: 1, h: 1 };
  private curveN = 0;
  private sampleN = 0;
  private barN = 0;
  private step = 0;
  private clock = 0;
  private steps = new Steps();
  private readouts = new Readouts();
  private size = new StageSize();
  private ink = true;

  layout(f: Field, fr: Frame) {
    const area = freeArea(fr, 16);
    const left = fr.compact ? 44 : 64;
    const bottom = fr.compact ? 34 : 42;
    this.box = {
      x: area.x + left,
      y: area.y + 24,
      w: area.w - left - (fr.compact ? 10 : 30),
      h: area.h - bottom - 24,
    };
    this.curveN = Math.round(f.n * 0.2);
    this.sampleN = Math.round(f.n * 0.02);
    this.barN = Math.round(f.n * 0.36);
    this.steps.collect(fr.section);
    this.readouts.collect(fr.section);
  }

  private x(t: number) {
    return this.box.x + ((t + T_MAX) / (2 * T_MAX)) * this.box.w;
  }

  private y(d: number) {
    return this.box.y + this.box.h * (1 - Math.min(d, Y_MAX) / Y_MAX);
  }

  /** The radius the step's screen searches with. */
  private radius(step: number) {
    if (step === 1) return OWN;
    if (step === 2) return SLOW;
    return FAST;
  }

  update(f: Field, fr: Frame) {
    if (this.size.changed(fr)) this.layout(f, fr);
    const step = stepAt(fr.progress, STEP_AT);
    this.step = step;
    this.steps.set(step);
    const vx = fr.visual.x;
    const vy = fr.visual.y;
    const boost = this.ink ? 1 : 1.25;
    const bars = step === 4;
    const missed = step === 2;
    this.clock += fr.dt;

    for (let i = 0; i < f.n; i++) {
      f.gj[i] = 0.12;
      f.gh[i] = 0;
      f.gz[i] = fr.compact ? 1.2 : 1.45;
      if (bars && i < this.barN) {
        // Four equal bars: the same count at every step size.
        const per = Math.floor(this.barN / STEPS.length);
        const b = Math.min(STEPS.length - 1, Math.floor(i / per));
        const slot = this.box.w / STEPS.length;
        const x = this.box.x + slot * b + slot * 0.25 + f.r0[i] * slot * 0.5;
        const y = this.box.y + this.box.h * (1 - f.r1[i] * 0.72);
        f.gx[i] = vx + x;
        f.gy[i] = vy + y;
        f.ga[i] = Math.min(1, (0.55 + f.r3[i] * 0.3) * boost);
        f.gh[i] = b === STEPS.length - 1 ? 0.8 : 0;
        continue;
      }
      if (!bars && i < this.curveN) {
        // Dots along the curve, evenly by time.
        const t = -T_MAX + ((i + f.r0[i]) / this.curveN) * 2 * T_MAX;
        const d = Math.hypot(MISS, V_REL * t);
        f.gx[i] = vx + this.x(t);
        f.gy[i] = vy + this.y(d) + (f.r1[i] - 0.5) * 2;
        f.ga[i] = d > Y_MAX ? 0 : Math.min(1, (0.5 + f.r3[i] * 0.3) * boost);
        continue;
      }
      const k = i - this.curveN;
      if (!bars && k >= 0 && k < this.sampleN) {
        // The two samples, half a step either side of closest approach.
        const side = k < this.sampleN / 2 ? -1 : 1;
        const a = f.r0[i] * Math.PI * 2;
        const r = Math.sqrt(f.r1[i]) * (fr.compact ? 4 : 5.5);
        f.gx[i] = vx + this.x((side * STEP_S) / 2) + Math.cos(a) * r;
        f.gy[i] = vy + this.y(SAMPLE) + Math.sin(a) * r;
        f.ga[i] = Math.min(1, 0.95 * boost);
        f.gh[i] = missed ? 1 : step >= 1 ? 0 : 0.6;
        f.gz[i] = fr.compact ? 1.6 : 2;
        continue;
      }
      dust(f, i, fr, 0.08);
    }
    this.readouts.write(
      "radius",
      step === 0 ? "–" : bars ? km(FAST) : km(this.radius(step)),
    );
    this.readouts.write("sample", km(SAMPLE));
  }

  draw(ctx: CanvasRenderingContext2D, fr: Frame, palette: Palette) {
    this.ink = palette.ink;
    const vx = fr.visual.x;
    const vy = fr.visual.y;
    const b = this.box;
    const size = fr.compact ? 9 : 10;
    const step = this.step;
    const x0 = vx + b.x;
    const y1 = vy + b.y + b.h;
    ctx.lineWidth = 1;

    if (step === 4) {
      const slot = b.w / STEPS.length;
      STEPS.forEach((s, k) => {
        const cx = x0 + slot * k + slot / 2;
        label(ctx, palette, `${s} s steps`, cx, y1 + 14, {
          size,
          align: "center",
          alpha: 0.8,
        });
        label(
          ctx,
          palette,
          ENCOUNTERS.toLocaleString("en-US"),
          cx,
          vy + b.y + b.h * 0.28 - 12,
          {
            size: size + 1,
            align: "center",
            color: k === STEPS.length - 1 ? palette.accent : palette.fg,
          },
        );
      });
      label(
        ctx,
        palette,
        "encounters under 5 km, 24 hours, whole catalogue",
        x0 + b.w / 2,
        y1 + 32,
        {
          size,
          align: "center",
          alpha: 0.75,
        },
      );
      resetText(ctx);
      return;
    }

    // Axes: separation in km, time from closest approach in s.
    for (let d = 0; d <= Y_MAX; d += 500) {
      const y = vy + this.y(d);
      ctx.strokeStyle = rgba(palette.muted, d === 0 ? 0.35 : 0.1);
      ctx.beginPath();
      ctx.moveTo(x0, y);
      ctx.lineTo(x0 + b.w, y);
      ctx.stroke();
      label(ctx, palette, d === 0 ? "0" : km(d), x0 - 8, y, {
        size,
        align: "right",
        alpha: 0.75,
      });
    }
    for (const t of [-60, 0, 60]) {
      const x = vx + this.x(t);
      ctx.strokeStyle = rgba(palette.muted, t === 0 ? 0.2 : 0.35);
      ctx.setLineDash(t === 0 ? [2, 3] : []);
      ctx.beginPath();
      ctx.moveTo(x, vy + b.y);
      ctx.lineTo(x, y1);
      ctx.stroke();
      ctx.setLineDash([]);
      label(
        ctx,
        palette,
        t === 0 ? "closest" : `${t > 0 ? "+" : "−"}${Math.abs(t)} s, sample`,
        x,
        y1 + 14,
        {
          size,
          align: "center",
          alpha: 0.8,
        },
      );
    }
    label(ctx, palette, "separation of the pair", x0, vy + b.y - 14, {
      size,
      alpha: 0.6,
    });

    if (step >= 1) {
      const r = this.radius(step);
      const y = vy + this.y(r);
      const caught = SAMPLE <= r;
      ctx.strokeStyle = rgba(caught ? palette.fg : palette.accent, 0.8);
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(x0, y);
      ctx.lineTo(x0 + b.w, y);
      ctx.stroke();
      ctx.setLineDash([]);
      const text =
        step === 1
          ? `d + v·Δt/2 = ${km(r)}`
          : step === 2
            ? `one radius for all, 16 km/s, ${km(r)}`
            : `the fast object's own, ${km(r)}`;
      label(ctx, palette, text, x0 + 10, y - 10, {
        size: size + 0.5,
        color: caught ? palette.fg : palette.accent,
      });
      label(
        ctx,
        palette,
        caught ? "inside, caught" : "outside, missed",
        vx + this.x(STEP_S / 2) + 12,
        vy + this.y(SAMPLE) + 2,
        {
          size: size + 0.5,
          color: caught ? palette.fg : palette.accent,
        },
      );
    }
    // The pass itself: a cursor sweeps the curve, and an inset, seen from
    // above, shows the two objects closing head-on, the samples ghosted.
    const sweep = fr.reduced ? 0 : ((this.clock % 5) / 5) * 2 * T_MAX - T_MAX;
    const sep = Math.hypot(MISS, V_REL * sweep);
    const cx = vx + this.x(sweep);
    const cy = vy + this.y(sep);
    ctx.strokeStyle = rgba(palette.fg, 0.25);
    ctx.beginPath();
    ctx.moveTo(cx, vy + b.y);
    ctx.lineTo(cx, y1);
    ctx.stroke();
    if (sep < Y_MAX) {
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 10);
      glow.addColorStop(0, rgba(palette.accent, 0.9));
      glow.addColorStop(1, rgba(palette.accent, 0));
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, 10, 0, Math.PI * 2);
      ctx.fill();
    }
    if (!fr.compact) {
      const iw = Math.min(220, b.w * 0.34);
      const ih = 64;
      const ix = x0 + b.w / 2 - iw / 2;
      const iy = vy + b.y + 30;
      ctx.strokeStyle = rgba(palette.muted, 0.3);
      ctx.strokeRect(ix + 0.5, iy + 0.5, iw - 1, ih - 1);
      label(ctx, palette, "seen from above", ix + 8, iy + 10, {
        size: 9,
        alpha: 0.6,
      });
      const mid = ix + iw / 2;
      const ky = iy + ih / 2 + 6;
      const kmPx = (iw / 2 - 12) / (V_REL * T_MAX);
      const dot = (
        x: number,
        y: number,
        r: number,
        c: typeof palette.fg,
        a: number,
      ) => {
        ctx.fillStyle = rgba(c, a);
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      };
      for (const t of [-STEP_S / 2, STEP_S / 2]) {
        const d = V_REL * t * kmPx * 0.5;
        dot(mid - d, ky - 5, 2, palette.muted, 0.6);
        dot(mid + d, ky + 5, 2, palette.muted, 0.6);
      }
      // Each object covers half the closing distance, toward the other.
      const d = V_REL * sweep * kmPx * 0.5;
      dot(mid - d, ky - 5, 3, palette.fg, 0.95);
      dot(mid + d, ky + 5, 3, palette.accent, 0.95);
      label(ctx, palette, "LEO satellite", ix + 8, iy + ih - 8, {
        size: 8.5,
        alpha: 0.7,
      });
      label(ctx, palette, "transfer orbit", ix + iw - 8, iy + ih - 8, {
        size: 8.5,
        align: "right",
        color: palette.accent,
      });
    }
    resetText(ctx);
  }
}
