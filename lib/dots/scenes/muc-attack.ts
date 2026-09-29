import { clamp, lerp, rgba, smoothstep } from "../math";
import { onPaper, PURPLE } from "../muc-colors";
import { ATTACK, ENTROPY, MODELS } from "../muc-data";
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

const STEP_AT = [0, 0.3, 0.64] as const;
export const BIN = 0.05;
export const TOP = 2.5;
export const BINS = Math.round(TOP / BIN);
const SAMPLES = ENTROPY.retrained.length;
/** Where each sweep settles: the threshold with the highest attack score. */
const BEST = { ft: 1.6, rl: 2.15 };
const [PURPLE_PAPER] = onPaper([PURPLE]);

type Plot = { x: number; y: number; w: number; h: number; curve: number };

/** Slot of every sample in a stacked dot plot: its bin, and its place in it. */
export function stack(values: number[]) {
  const counts = new Array<number>(BINS).fill(0);
  return values.map((v) => {
    const bin = Math.min(BINS - 1, Math.floor(v / 100 / BIN));
    return { bin, slot: counts[bin]++ };
  });
}

const SLOTS = {
  retrained: stack(ENTROPY.retrained),
  ft: stack(ENTROPY.ft),
  rl: stack(ENTROPY.rl),
};

/** Attack score at threshold `t` for one unlearned model's sweep. */
function scoreAt(curve: number[][], t: number) {
  let best = curve[0];
  for (const row of curve)
    if (Math.abs(row[0] - t) < Math.abs(best[0] - t)) best = row;
  return best[3];
}

/**
 * The Attack Simulation view on the demo's real outputs. Each side stacks the
 * 200 airplane images by output entropy, the retrained model's on the left
 * and the unlearned model's on the right, and a threshold sweeps up to find
 * where an attacker separates them best. Fine-Tuning overlaps enough to hold
 * the attack near half; Random Labeling's outputs all pile up near maximum
 * entropy, so one threshold splits them perfectly.
 */
export class AttackScene implements Scene {
  private plot: Plot = { x: 0, y: 0, w: 0, h: 0, curve: 0 };
  private d = 6;
  private p = 0;
  private threshold = -1;
  private rlMix = 0;
  private stage = new StageSize();
  private steps = new Steps();
  private readouts = new Readouts();
  private ink = true;

  layout(_f: Field, fr: Frame) {
    this.stage.changed(fr);
    const area = freeArea(fr, 18);
    const left = fr.compact ? 34 : 44;
    const curve = fr.compact ? 0 : Math.min(170, area.w * 0.24);
    const gap = curve ? 26 : 0;
    const above = 30;
    const below = 30;
    this.plot = {
      x: area.x + left,
      y: area.y + above,
      w: area.w - left - curve - gap,
      h: area.h - above - below,
      curve,
    };
    this.d = Math.max(3.4, Math.min(6.6, this.plot.h / BINS));
    this.steps.collect(fr.section);
    this.readouts.collect(fr.section);
  }

  private y(entropy: number) {
    return this.plot.y + (1 - entropy / TOP) * this.plot.h;
  }

  /** Dot position for a stacked slot; sides grow out from the centre line. */
  private dot(side: -1 | 1, bin: number, slot: number, out: [number, number]) {
    const half = this.plot.w / 2 - 6;
    const perRow = Math.max(4, Math.floor(half / this.d));
    const row = Math.floor(slot / perRow);
    const col = slot % perRow;
    const cx = this.plot.x + this.plot.w / 2;
    out[0] = cx + side * (this.d * 0.8 + col * this.d);
    // Overflowing bins stack upward, as a pile at one value.
    out[1] = this.y((bin + 0.5) * BIN) - row * this.d;
    return out;
  }

  update(f: Field, fr: Frame) {
    if (this.stage.changed(fr)) this.layout(f, fr);
    if (this.plot.w <= 0) return;
    const p = fr.progress;
    this.p = p;
    const step = stepAt(p, STEP_AT);
    this.steps.set(step);
    f.classColors = [this.ink ? PURPLE : PURPLE_PAPER];
    const boost = this.ink ? 1 : 1.3;
    const vx = fr.visual.x;
    const vy = fr.visual.y;
    const leftIn = smoothstep(0.02, 0.12, p);
    const rightIn = smoothstep(0.3, 0.38, p);
    const rl = smoothstep(0.64, 0.74, p);
    this.rlMix = rl;

    // The threshold sweeps up, then settles where the attack does best.
    let t = -1;
    if (step === 1) {
      const sweep = smoothstep(0.38, 0.52, p);
      const settle = smoothstep(0.54, 0.6, p);
      t = lerp(lerp(0.3, 2.35, sweep), BEST.ft, settle);
    } else if (step === 2) {
      const sweep = smoothstep(0.76, 0.86, p);
      t = lerp(BEST.ft, BEST.rl, sweep);
    }
    this.threshold = t;
    const a: [number, number] = [0, 0];
    const b: [number, number] = [0, 0];

    for (let i = 0; i < f.n; i++) {
      if (i >= 2 * SAMPLES) {
        dust(f, i, fr, 0.08);
        continue;
      }
      const right = i >= SAMPLES;
      const j = right ? i - SAMPLES : i;
      let entropy: number;
      if (!right) {
        const s = SLOTS.retrained[j];
        this.dot(-1, s.bin, s.slot, a);
        entropy = ENTROPY.retrained[j] / 100;
      } else {
        const s0 = SLOTS.ft[j];
        const s1 = SLOTS.rl[j];
        this.dot(1, s0.bin, s0.slot, a);
        this.dot(1, s1.bin, s1.slot, b);
        const e = smoothstep(0, 1, clamp(rl * 1.4 - f.r0[i] * 0.4));
        a[0] = lerp(a[0], b[0], e);
        a[1] = lerp(a[1], b[1], e);
        entropy = lerp(ENTROPY.ft[j], ENTROPY.rl[j], e) / 100;
      }
      // Above the line reads as "unlearned model", below as "retrained".
      const above = t >= 0 && entropy > t;
      const shade = t < 0 ? 0.75 : above ? 0.95 : 0.32;
      const shown = right ? rightIn : leftIn;
      f.gx[i] = vx + a[0];
      f.gy[i] = vy + a[1];
      f.ga[i] = Math.min(1, shade * shown * (right ? 1 : 0.8) * boost);
      f.gz[i] = this.d * 0.62;
      f.gj[i] = 0.1;
      f.gh[i] = 0;
      if (right) f.gc[i] = 1;
    }

    const curve = rl > 0.5 ? ATTACK.rl : ATTACK.ft;
    this.readouts.write("threshold", t < 0 ? "–" : t.toFixed(2));
    this.readouts.write("score", t < 0 ? "–" : scoreAt(curve, t).toFixed(3));
    // The privacy score appears once a sweep has found the worst case.
    let privacy = "–";
    if (step === 1 && p >= 0.58) privacy = (MODELS[2].ps ?? 0).toFixed(3);
    if (step === 2 && p >= 0.86) privacy = (MODELS[3].ps ?? 0).toFixed(3);
    this.readouts.write("privacy", privacy);
  }

  draw(ctx: CanvasRenderingContext2D, fr: Frame, palette: Palette) {
    this.ink = palette.ink;
    const plot = this.plot;
    if (plot.w <= 0) return;
    const vx = fr.visual.x;
    const vy = fr.visual.y;
    const p = this.p;
    const size = fr.compact ? 9 : 10;
    const purple = palette.ink ? PURPLE : PURPLE_PAPER;
    const cx = vx + plot.x + plot.w / 2;

    // Entropy axis, and the line between the two stacks.
    ctx.lineWidth = 1;
    for (let v = 0; v <= TOP + 1e-6; v += 0.5) {
      const y = vy + this.y(v);
      label(ctx, palette, v.toFixed(1), vx + plot.x - 8, y, {
        align: "right",
        size,
        alpha: 0.75,
      });
      ctx.strokeStyle = rgba(palette.muted, 0.08);
      ctx.beginPath();
      ctx.moveTo(vx + plot.x, y);
      ctx.lineTo(vx + plot.x + plot.w, y);
      ctx.stroke();
    }
    ctx.strokeStyle = rgba(palette.muted, 0.3);
    ctx.beginPath();
    ctx.moveTo(cx, vy + plot.y);
    ctx.lineTo(cx, vy + plot.y + plot.h);
    ctx.stroke();
    label(ctx, palette, "entropy", vx + plot.x - 8, vy + plot.y - 16, {
      align: "right",
      size,
      alpha: 0.75,
    });
    const baseY = vy + plot.y + plot.h + 18;
    label(ctx, palette, "← retrained", cx - 10, baseY, {
      align: "right",
      size: size + 0.5,
      color: palette.fg,
      alpha: smoothstep(0.02, 0.12, p) * 0.9,
    });
    const rightIn = smoothstep(0.3, 0.38, p);
    label(ctx, palette, "Fine-Tuning →", cx + 10, baseY, {
      size: size + 0.5,
      color: purple,
      alpha: rightIn * (1 - this.rlMix),
    });
    label(ctx, palette, "Random Labeling →", cx + 10, baseY, {
      size: size + 0.5,
      color: purple,
      alpha: rightIn * this.rlMix,
    });

    // Attack score against threshold, like the view's line chart.
    const t = this.threshold;
    if (plot.curve > 0 && rightIn > 0.01) {
      const x0 = vx + plot.x + plot.w + 26;
      const w = plot.curve;
      ctx.strokeStyle = rgba(palette.muted, 0.3);
      ctx.beginPath();
      ctx.moveTo(x0, vy + plot.y);
      ctx.lineTo(x0, vy + plot.y + plot.h);
      ctx.lineTo(x0 + w, vy + plot.y + plot.h);
      ctx.stroke();
      label(ctx, palette, "0", x0, baseY, {
        align: "center",
        size,
        alpha: 0.7,
      });
      label(ctx, palette, "1", x0 + w, baseY, {
        align: "center",
        size,
        alpha: 0.7,
      });
      label(ctx, palette, "attack score", x0, vy + plot.y - 16, {
        size,
        color: palette.accent,
        alpha: 0.9,
      });
      for (const [curve, weight] of [
        [ATTACK.ft, 1 - this.rlMix],
        [ATTACK.rl, this.rlMix],
      ] as const) {
        if (weight < 0.02) continue;
        ctx.strokeStyle = rgba(palette.accent, 0.85 * weight * rightIn);
        ctx.beginPath();
        curve.forEach(([th, , , score], k) => {
          if (th < 0 || th > TOP) return;
          const x = x0 + score * w;
          const y = vy + this.y(th);
          if (k === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      }
      if (t >= 0) {
        const score = scoreAt(this.rlMix > 0.5 ? ATTACK.rl : ATTACK.ft, t);
        ctx.fillStyle = rgba(palette.accent, 1);
        ctx.beginPath();
        ctx.arc(x0 + score * w, vy + this.y(t), 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // The threshold line and what it calls each side.
    if (t >= 0) {
      const y = vy + this.y(t);
      const x1 = vx + plot.x + plot.w + (plot.curve ? 26 + plot.curve : 0);
      ctx.strokeStyle = rgba(palette.fg, 0.8);
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(vx + plot.x, y);
      ctx.lineTo(x1, y);
      ctx.stroke();
      ctx.setLineDash([]);
      label(ctx, palette, "↑ called unlearned", vx + plot.x + 4, y - 9, {
        size,
        color: palette.fg,
        alpha: 0.85,
      });
      label(ctx, palette, "↓ called retrained", vx + plot.x + 4, y + 10, {
        size,
        alpha: 0.85,
      });
    }
    resetText(ctx);
  }
}
