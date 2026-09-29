import { lerp, rgba, smoothstep } from "../math";
import {
  EMERALD,
  onPaper,
  PURPLE,
  TABLEAU,
  TABLEAU_PAPER,
} from "../muc-colors";
import { embedding, FORGET, MODELS, TRUTH } from "../muc-data";
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

const STEP_AT = [0, 0.2, 0.4, 0.62, 0.82] as const;
/** Every fifth of the demo's 2,000 images, in every model. */
const EVERY = 5;
const PER = 400;
const KEYS = ["original", "retrained", "ft", "rl", "ga"] as const;
/** Rows of the model table in `MODELS`, in `KEYS` order. */
const ROW = [0, 1, 2, 3, 4];
const TIME = ["", "58.7 min", "2.6 min", "58 s", "11 s"];
/** How each method forgets, in a few words. */
const HOW = [
  "",
  "",
  "trains on the rest",
  "relabels at random",
  "raises airplane loss",
];
const RETRAINED = 1;
const RL = 3;
/** A bar of the summary view, 40 × 5 dots: half a model's particles. */
const BAR_COLS = 40;
const BAR_ROWS = 5;
/** An airplane image whose link the last step draws, in sample order. */
const LINK = 7;
const PAIR = [EMERALD, PURPLE];
const PAIR_PAPER = onPaper(PAIR);

type Box = { x: number; y: number; s: number };

/**
 * Why the comparator exists, in the demo's real embeddings. The original
 * model's view of 400 training images comes first, then the retrained model
 * assembles from scratch, and the three unlearning methods grow out of the
 * original. Next each model is squeezed into the two accuracy bars methods
 * were mostly judged by, where the differences vanish. Last the pictures come
 * back, two models side by side, which is what the comparator shows.
 */
export class MotivationScene implements Scene {
  private boxes: Box[] = [];
  private p = 0;
  private f: Field | null = null;
  private compact = false;
  private stage = new StageSize();
  private steps = new Steps();
  private readouts = new Readouts();
  private ink = true;

  layout(f: Field, fr: Frame) {
    this.stage.changed(fr);
    this.f = f;
    const area = freeArea(fr, 18);
    const compact = fr.compact;
    this.compact = compact;
    // Original and retrained on top, the three methods under a bracket.
    const title = compact ? 28 : 34;
    // Methods take a third line under their names, for how they forget.
    const lowTitle = compact ? 28 : 47;
    const bracket = compact ? 18 : 30;
    const gap = compact ? 12 : 22;
    const arrow = compact ? 40 : 116;
    // Leave air below for the last step's frames; methods are drawn smaller.
    const avail =
      area.h - title - lowTitle - bracket - gap - (compact ? 8 : 20);
    const top = Math.min((area.w - arrow) / 2, avail / 1.85, 300);
    const low = Math.min((area.w - 2 * gap) / 3, top * 0.85);
    const used = title + lowTitle + bracket + gap + top + low;
    const y0 = area.y + Math.max(0, (area.h - used) / 2) + title;
    const row1 = (area.w - (2 * top + arrow)) / 2;
    const y1 = y0 + top + gap + bracket + lowTitle;
    const row2 = (area.w - (3 * low + 2 * gap)) / 2;
    this.boxes = [
      { x: area.x + row1, y: y0, s: top },
      { x: area.x + row1 + top + arrow, y: y0, s: top },
      ...[0, 1, 2].map((k) => ({
        x: area.x + row2 + k * (low + gap),
        y: y1,
        s: low,
      })),
    ];
    this.steps.collect(fr.section);
    this.readouts.collect(fr.section);
  }

  /** How far each model has arrived, 0 to 1. */
  private arrive(m: number, p: number) {
    if (m === 0) return 1;
    if (m === RETRAINED) return smoothstep(0.21, 0.34, p);
    return smoothstep(0.41 + (m - 2) * 0.03, 0.53 + (m - 2) * 0.03, p);
  }

  /** Squeezed into bars from the fourth step, back out in the fifth. */
  private squeeze(p: number) {
    return smoothstep(0.63, 0.73, p) * (1 - smoothstep(0.83, 0.91, p));
  }

  update(f: Field, fr: Frame) {
    if (this.stage.changed(fr)) this.layout(f, fr);
    this.f = f;
    if (this.boxes.length === 0) return;
    const p = fr.progress;
    this.p = p;
    const step = stepAt(p, STEP_AT);
    this.steps.set(step);
    this.readout(step, p);
    f.classColors = this.ink ? TABLEAU : TABLEAU_PAPER;
    const boost = this.ink ? 1 : 1.3;
    const vx = fr.visual.x;
    const vy = fr.visual.y;
    const bars = this.squeeze(p);
    const original = embedding("original");
    const pair = smoothstep(0.84, 0.9, p);

    for (let i = 0; i < f.n; i++) {
      const m = Math.floor(i / PER);
      if (m >= KEYS.length) {
        dust(f, i, fr, 0.08);
        continue;
      }
      const k = i % PER;
      const n = k * EVERY;
      const e = embedding(KEYS[m]);
      const box = this.boxes[m];
      let x = box.x + e.x[n] * box.s;
      let y = box.y + e.y[n] * box.s;
      const come = this.arrive(m, p);
      if (m === RETRAINED) {
        // Retraining starts from nothing, so its points gather from noise.
        x = lerp(box.x + f.r1[i] * box.s, x, come);
        y = lerp(box.y + f.r2[i] * box.s, y, come);
      } else if (m > RETRAINED) {
        // Unlearning starts from the trained model and moves its points.
        const from = this.boxes[0];
        x = lerp(from.x + original.x[n] * from.s, x, come);
        y = lerp(from.y + original.y[n] * from.s, y, come);
      }
      // The summary view: half the dots make the airplane accuracy bar and
      // half the accuracy on the other classes, lit up to each value.
      const bar = k < PER / 2 ? 0 : 1;
      const slot = k % (PER / 2);
      const col = slot % BAR_COLS;
      const row = Math.floor(slot / BAR_COLS);
      const b = this.barAt(box, bar);
      const model = MODELS[ROW[m]];
      const value = bar === 0 ? model.ua : model.ra;
      const lit = col < Math.round(value * BAR_COLS);
      x = lerp(x, b.x + (col + 0.5) * b.gap, bars);
      y = lerp(y, b.y + (row + 0.5) * b.gap, bars);

      // Airplanes are drawn as crosses on top (see draw), until they're bars.
      const plane = TRUTH.charCodeAt(n) - 48 === FORGET;
      const cloud = plane ? 0 : 0.7 * come;
      const summary = lit ? 0.9 : 0.1;
      // The last step keeps the pair the comparator would show in front.
      const dim = m === RETRAINED || m === RL ? 1 : 1 - pair * 0.7;
      f.gx[i] = vx + x;
      f.gy[i] = vy + y;
      f.ga[i] = Math.min(1, lerp(cloud, summary * come, bars) * dim * boost);
      f.gc[i] = bars > 0.5 ? 0 : e.pred[n] + 1;
      f.gz[i] = lerp(1.7, b.gap * 0.62, bars);
      f.gh[i] = 0;
      f.gj[i] = 0.1;
    }
  }

  /** Where the summary view puts bar 0 (airplanes) or 1 (the rest). */
  private barAt(box: Box, bar: number) {
    // Room on the right for each bar's value.
    const w = box.s * (this.compact ? 0.6 : 0.78);
    const gap = w / BAR_COLS;
    const h = BAR_ROWS * gap;
    const mid = box.y + box.s / 2;
    return {
      x: box.x,
      y: mid + (bar === 0 ? -h - 10 : 10),
      gap,
    };
  }

  private readout(step: number, p: number) {
    this.readouts.write("retrain", step >= 1 && p > 0.3 ? "58.7 min" : "–");
    this.readouts.write(
      "methods",
      step >= 2 && p > 0.52 ? "11 s to 2.6 min" : "–",
    );
  }

  draw(ctx: CanvasRenderingContext2D, fr: Frame, palette: Palette) {
    this.ink = palette.ink;
    const f = this.f;
    if (!f || this.boxes.length === 0) return;
    const vx = fr.visual.x;
    const vy = fr.visual.y;
    const p = this.p;
    const compact = this.compact;
    const size = compact ? 8.5 : 10;
    const bars = this.squeeze(p);
    const pair = smoothstep(0.84, 0.9, p);
    const colors = palette.ink ? TABLEAU : TABLEAU_PAPER;

    // Airplanes as crosses, colored by what each model now calls them.
    const cloud = 1 - bars;
    if (cloud > 0.05) {
      ctx.lineWidth = 1.1;
      for (let m = 0; m < KEYS.length; m++) {
        const come = this.arrive(m, p);
        if (come < 0.05) continue;
        const e = embedding(KEYS[m]);
        const dim = m === RETRAINED || m === RL ? 1 : 1 - pair * 0.7;
        const r = compact ? 1.8 : 2.4;
        for (let k = 0; k < PER; k++) {
          const n = k * EVERY;
          if (TRUTH.charCodeAt(n) - 48 !== FORGET) continue;
          const i = m * PER + k;
          ctx.strokeStyle = rgba(colors[e.pred[n]], 0.95 * come * cloud * dim);
          ctx.beginPath();
          ctx.moveTo(f.x[i] - r, f.y[i] - r);
          ctx.lineTo(f.x[i] + r, f.y[i] + r);
          ctx.moveTo(f.x[i] + r, f.y[i] - r);
          ctx.lineTo(f.x[i] - r, f.y[i] + r);
          ctx.stroke();
        }
      }
    }

    // Model names, with how long each took and, for methods, how it forgets.
    this.boxes.forEach((box, m) => {
      const come = this.arrive(m, p);
      const a =
        Math.min(1, come * 1.5) *
        (m === RETRAINED || m === RL ? 1 : 1 - pair * 0.6);
      const x = vx + box.x;
      const y = vy + box.y;
      // Phones name the methods by initials, under the bracket that says
      // what they are.
      const model = MODELS[ROW[m]];
      const name = compact && m > RETRAINED ? model.short : model.name;
      const method = m > RETRAINED;
      // Names, then run time, then (for methods, off phones) how each
      // forgets, a line apiece so neighbours never run together.
      const lines = !compact && method ? 3 : 2;
      const top = y - (compact ? 17 : lines === 3 ? 35 : 22);
      label(ctx, palette, name, x, top, {
        size: size + 0.5,
        color: palette.fg,
        alpha: a * 0.95,
      });
      const note =
        m === 0
          ? compact
            ? ""
            : "trained on all ten classes"
          : m === RETRAINED && !compact
            ? `from scratch · ${TIME[m]}`
            : TIME[m];
      label(ctx, palette, note, x, top + (compact ? 11 : 14), {
        size: size - 1,
        color: method ? palette.accent : palette.muted,
        alpha: a * 0.85,
      });
      // Only where it fits beside the next plot.
      ctx.font = `${size - 1}px ${palette.mono}`;
      if (lines === 3 && ctx.measureText(HOW[m]).width < box.s + 14)
        label(ctx, palette, HOW[m], x, top + 27, {
          size: size - 1,
          alpha: a * 0.75,
        });
    });

    // Retraining, from the original's data minus the airplanes.
    const [o, r] = this.boxes;
    const ra = this.arrive(RETRAINED, p);
    if (ra > 0.02) {
      const y = vy + o.y + o.s / 2;
      const x0 = vx + o.x + o.s + 8;
      const x1 = vx + r.x - 8;
      ctx.strokeStyle = rgba(palette.muted, 0.6 * ra);
      ctx.fillStyle = ctx.strokeStyle;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x0, y);
      ctx.lineTo(x1, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x1, y);
      ctx.lineTo(x1 - 5, y - 3);
      ctx.lineTo(x1 - 5, y + 3);
      ctx.closePath();
      ctx.fill();
      if (!compact) {
        label(ctx, palette, "retrain without", (x0 + x1) / 2, y - 21, {
          align: "center",
          size: size - 1,
          alpha: ra * 0.8,
        });
        label(ctx, palette, "airplanes", (x0 + x1) / 2, y - 9, {
          align: "center",
          size: size - 1,
          alpha: ra * 0.8,
        });
      }
    }

    // A bracket over the three methods, which all start from the original.
    const ma = this.arrive(2, p);
    if (ma > 0.02) {
      const first = this.boxes[2];
      const last = this.boxes[4];
      const y = vy + first.y - (compact ? 30 : 57);
      const x0 = vx + first.x;
      const x1 = vx + last.x + last.s;
      ctx.strokeStyle = rgba(palette.accent, 0.6 * ma);
      ctx.beginPath();
      ctx.moveTo(x0, y + 5);
      ctx.lineTo(x0, y);
      ctx.lineTo(x1, y);
      ctx.lineTo(x1, y + 5);
      ctx.stroke();
      label(
        ctx,
        palette,
        compact
          ? "unlearning methods"
          : "unlearning methods · adjust the original instead",
        (x0 + x1) / 2,
        y - 9,
        { align: "center", size, color: palette.accent, alpha: ma },
      );
    }

    // The summary view's labels.
    if (bars > 0.05) {
      this.boxes.forEach((box, m) => {
        const model = MODELS[ROW[m]];
        [model.ua, model.ra].forEach((value, bar) => {
          const b = this.barAt(box, bar);
          const y = vy + b.y + (BAR_ROWS * b.gap) / 2;
          // Too small to name on a phone; the step's caption says what they are.
          if (!compact)
            label(
              ctx,
              palette,
              bar === 0 ? "accuracy on airplanes" : "on the other classes",
              vx + b.x,
              vy + b.y - 6,
              { size: 8.5, alpha: bars * 0.7 },
            );
          label(
            ctx,
            palette,
            value.toFixed(2),
            vx + b.x + BAR_COLS * b.gap + 6,
            y,
            { size: size - 1, color: palette.fg, alpha: bars * 0.9 },
          );
        });
      });
    }

    // The comparator's answer: two models side by side, one image linked.
    if (pair > 0.02) {
      const model = palette.ink ? PAIR : PAIR_PAPER;
      [RETRAINED, RL].forEach((m, k) => {
        const box = this.boxes[m];
        ctx.strokeStyle = rgba(model[k], 0.85 * pair);
        ctx.lineWidth = 1.2;
        // The frame takes in the name above the plot.
        const head = compact ? 24 : m === RL ? 45 : 32;
        ctx.strokeRect(
          vx + box.x - 6,
          vy + box.y - head,
          box.s + 12,
          box.s + head + 6,
        );
        label(
          ctx,
          palette,
          k === 0 ? "Model A" : "Model B",
          vx + box.x + box.s,
          // Phones have no room beside the name, so the label goes under.
          vy + (compact ? box.y + box.s + 14 : box.y - head + 10),
          { align: "right", size, color: model[k], alpha: pair },
        );
      });
      const a = RETRAINED * PER + LINK;
      const b = RL * PER + LINK;
      const grow = smoothstep(0.9, 0.97, p);
      ctx.strokeStyle = rgba(palette.fg, 0.8 * grow);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(f.x[a], f.y[a]);
      ctx.lineTo(lerp(f.x[a], f.x[b], grow), lerp(f.y[a], f.y[b], grow));
      ctx.stroke();
      for (const i of [a, b]) {
        ctx.beginPath();
        ctx.arc(f.x[i], f.y[i], 4, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    resetText(ctx);
  }
}
