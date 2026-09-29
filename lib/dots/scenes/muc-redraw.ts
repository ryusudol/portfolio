import { rgba, smoothstep } from "../math";
import { onPaper, PURPLE } from "../muc-colors";
import { ATTACK, ENTROPY } from "../muc-data";
import { dust } from "../shapes";
import {
  fmt,
  freeArea,
  label,
  resetText,
  StageSize,
  Steps,
  stepAt,
} from "../story";
import type { Field, Frame, Palette, Scene } from "../types";
import { BIN, BINS, stack, TOP } from "./muc-attack";

const STEP_AT = [0, 0.5] as const;
/** Seconds between the replayed hovers. */
const HOP = 1.6;
/** SVG nodes one hover created or removed, before and after (measured). */
const REBUILT = [1133, 8];
const SAMPLES = ENTROPY.retrained.length;
const LEFT = stack(ENTROPY.retrained);
const RIGHT = stack(ENTROPY.ft);
/** Axes, gridlines, legend, and the line chart: the rest of the SVG. */
const FRAME = 240;
const CURVE = ATTACK.ft.filter((row) => row[0] >= 0 && row[0] <= TOP);
const CURVE_W = 90;
const [PURPLE_PAPER] = onPaper([PURPLE]);

type Plot = { x: number; y: number; w: number; h: number; d: number };

/**
 * The attack plot, hovered again and again. Before the fix, each hover tore
 * the whole SVG down and appended it again, so every dot and axis leaves and
 * comes back. After, the plot is built once and a hover only restyles the
 * circles already there and adds one label, so nothing moves.
 */
export class RedrawScene implements Scene {
  private plot: Plot = { x: 0, y: 0, w: 0, h: 0, d: 5 };
  private p = 0;
  private hovered = -1;
  private phase = 0;
  private hops = 0;
  private mode = 0;
  private startHop = 0;
  private f: Field | null = null;
  private stage = new StageSize();
  private steps = new Steps();
  private ink = true;

  layout(f: Field, fr: Frame) {
    this.stage.changed(fr);
    this.f = f;
    const area = freeArea(fr, 22);
    const curve = fr.compact ? 0 : Math.min(120, area.w * 0.2);
    const h = Math.min(area.h - 44, 420);
    this.plot = {
      x: area.x + (fr.compact ? 8 : 20),
      y: area.y + (fr.compact ? 44 : 30) + (area.h - 44 - h) / 2,
      w: area.w - curve - (fr.compact ? 16 : 60),
      h,
      d: Math.max(3, Math.min(5.6, h / BINS)),
    };
    this.steps.collect(fr.section);
  }

  private dot(side: -1 | 1, bin: number, slot: number, out: [number, number]) {
    const { x, y, w, h, d } = this.plot;
    const perRow = Math.max(4, Math.floor((w / 2 - 6) / d));
    const row = Math.floor(slot / perRow);
    out[0] = x + w / 2 + side * (d * 0.8 + (slot % perRow) * d);
    out[1] = y + (1 - ((bin + 0.5) * BIN) / TOP) * h - row * d;
    return out;
  }

  update(f: Field, fr: Frame) {
    if (this.stage.changed(fr)) this.layout(f, fr);
    this.f = f;
    const { x, y, w, h } = this.plot;
    if (w <= 0) return;
    const p = fr.progress;
    this.p = p;
    const step = stepAt(p, STEP_AT);
    this.steps.set(step);
    if (step !== this.mode) {
      this.mode = step;
      this.startHop = Math.floor(fr.time / HOP);
    }
    const hop = Math.floor(fr.time / HOP);
    this.hops = Math.max(0, hop - this.startHop);
    this.phase = (fr.time % HOP) / HOP;
    this.hovered = SAMPLES + PICKS[hop % PICKS.length];
    f.classColors = [this.ink ? PURPLE : PURPLE_PAPER];
    const boost = this.ink ? 1 : 1.3;
    const vx = fr.visual.x;
    const vy = fr.visual.y;
    const out: [number, number] = [0, 0];
    const before = step === 0 && !fr.reduced;

    for (let i = 0; i < f.n; i++) {
      if (i >= 2 * SAMPLES + FRAME) {
        dust(f, i, fr, 0.08);
        continue;
      }
      let alpha: number;
      if (i < 2 * SAMPLES) {
        const right = i >= SAMPLES;
        const s = right ? RIGHT[i - SAMPLES] : LEFT[i];
        this.dot(right ? 1 : -1, s.bin, s.slot, out);
        const hit = i === this.hovered;
        // After the fix, a hover dims every other circle in place.
        alpha = hit ? 1 : step === 1 ? 0.3 : 0.75;
        f.gc[i] = right ? 1 : 0;
        f.gz[i] = hit && step === 1 ? this.plot.d * 1.05 : this.plot.d * 0.6;
        f.gh[i] = hit && step === 1 ? 1 : 0;
      } else {
        // The rest of the SVG: axes, gridlines, legend, and the line chart.
        const k = i - 2 * SAMPLES;
        const part = k % 4;
        const u = f.r0[i];
        if (part === 0) {
          out[0] = x;
          out[1] = y + u * h;
        } else if (part === 1) {
          out[0] = x + u * w;
          out[1] = y + h;
        } else if (part === 2) {
          out[0] = x + w / 2;
          out[1] = y + u * h;
        } else {
          // The attack-score curve beside the plot, as the view draws it.
          const row = CURVE[Math.floor(u * CURVE.length)];
          out[0] = x + w + 24 + row[3] * CURVE_W;
          out[1] = y + (1 - row[0] / TOP) * h;
        }
        alpha = part === 3 && fr.compact ? 0 : 0.35;
        f.gz[i] = 1.2;
        f.gh[i] = 0;
      }
      // Before the fix, each hover removes every node and appends it again.
      let gx = out[0];
      let gy = out[1];
      if (before) {
        const gone = this.phase < 0.16 + f.r3[i] * 0.22;
        if (gone) {
          gx += (f.r1[i] - 0.5) * 70;
          gy += -30 - f.r2[i] * 60;
          alpha = 0;
        }
      }
      f.gx[i] = vx + gx;
      f.gy[i] = vy + gy;
      f.ga[i] = Math.min(1, alpha * boost);
      f.gj[i] = 0.1;
    }
  }

  draw(ctx: CanvasRenderingContext2D, fr: Frame, palette: Palette) {
    this.ink = palette.ink;
    const f = this.f;
    const plot = this.plot;
    if (!f || plot.w <= 0) return;
    const vx = fr.visual.x;
    const vy = fr.visual.y;
    const step = stepAt(this.p, STEP_AT);
    const size = fr.compact ? 9.5 : 10.5;

    // What this mode costs, per hover and so far.
    const title =
      step === 0 ? "BEFORE · redraw everything" : "AFTER · update in place";
    const compact = fr.compact;
    label(ctx, palette, title, vx + plot.x, vy + plot.y - (compact ? 34 : 18), {
      size,
      color: step === 0 ? palette.fg : palette.accent,
      alpha: 0.95,
    });
    const total = this.hops * REBUILT[step];
    const hovers = `${this.hops} ${this.hops === 1 ? "hover" : "hovers"}`;
    label(
      ctx,
      palette,
      `${hovers} · ${fmt(total)} nodes rebuilt`,
      compact ? vx + plot.x : vx + plot.x + plot.w,
      vy + plot.y - 18,
      { align: compact ? "left" : "right", size, alpha: 0.85 },
    );

    // The replayed cursor, on the hovered circle.
    const i = this.hovered;
    const cx = f.x[i];
    const cy = f.y[i];
    const enter = smoothstep(0, 0.12, this.phase);
    ctx.fillStyle = rgba(palette.fg, 0.95 * enter);
    ctx.strokeStyle = rgba(
      palette.ink ? [17, 17, 17] : [255, 255, 255],
      0.9 * enter,
    );
    ctx.lineWidth = 1;
    ctx.beginPath();
    const px = cx + 2;
    const py = cy + 2;
    ctx.moveTo(px, py);
    ctx.lineTo(px, py + 14);
    ctx.lineTo(px + 4, py + 10);
    ctx.lineTo(px + 9, py + 12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // After the fix the hover adds a single label, and that is all it adds.
    if (step === 1) {
      const e = (ENTROPY.ft[i - SAMPLES] / 100).toFixed(2);
      label(ctx, palette, `entropy ${e}`, cx + 14, cy - 10, {
        size,
        color: palette.fg,
        alpha: enter,
      });
    }
    resetText(ctx);
  }
}

/** Right-side circles the replayed cursor visits, spread over the plot. */
const PICKS = [12, 57, 101, 143, 176, 33, 88, 160];
