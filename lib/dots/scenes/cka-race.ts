import { clamp, rgba, smoothstep } from "../math";
import { dust } from "../shapes";
import { freeArea, label, Readouts, resetText } from "../story";
import type { Field, Frame, Palette, Scene } from "../types";

/**
 * Mean wall-clock seconds to compare two ResNet-18s on all 18 layers over the
 * CIFAR-10 test set on an RTX PRO 6000 Blackwell
 * (docs/benchmarks/speed_comparison_libraries).
 */
const RUNS = [
  { name: "pytorch-cka", seconds: 0.86 },
  { name: "torch_cka", seconds: 5.87 },
  { name: "NumPy (CPU)", seconds: 25.64 },
];
const SPAN = 26;
const TOTAL = RUNS.reduce((s, r) => s + r.seconds, 0);

/**
 * A race against the clock. Scrolling runs time forward; every bar grows at
 * the same rate and stops when its library finishes, so the finished picture
 * is a plain bar chart of runtime — and pytorch-cka's bar is the one that
 * barely leaves the line.
 */
export class RaceScene implements Scene {
  private x0 = 0;
  private span = 400;
  private rowY: number[] = [];
  private bar = 14;
  private barN = 0;
  private starts: number[] = [];
  private axisY = 0;
  private elapsed = 0;
  private readouts = new Readouts();

  layout(f: Field, fr: Frame) {
    const area = freeArea(fr, 16);
    const nameW = fr.compact ? 84 : 118;
    const endW = fr.compact ? 64 : 150;
    this.x0 = area.x + nameW;
    this.span = Math.max(80, area.w - nameW - endW);
    const rowH = Math.min(area.h / 5.4, fr.compact ? 56 : 92);
    const top = area.y + (area.h - rowH * RUNS.length) / 2 - rowH * 0.3;
    this.rowY = RUNS.map((_, r) => top + (r + 0.5) * rowH);
    this.axisY = top + RUNS.length * rowH + rowH * 0.1;
    this.bar = Math.min(fr.compact ? 12 : 20, rowH * 0.3);
    this.barN = Math.round(f.n * 0.5);
    let acc = 0;
    this.starts = RUNS.map((r) => {
      const s = acc;
      acc += Math.round((r.seconds / TOTAL) * this.barN);
      return s;
    });
    this.starts.push(this.barN);
    this.readouts.collect(fr.section);
  }

  update(f: Field, fr: Frame) {
    const t = clamp((fr.progress - 0.06) / 0.78);
    const T = SPAN * t ** 1.7;
    this.elapsed = T;
    const px = this.span / SPAN;
    const vx = fr.visual.x;
    const vy = fr.visual.y;

    let r = 0;
    for (let i = 0; i < f.n; i++) {
      if (i >= this.barN) {
        dust(f, i, fr, 0.1);
        continue;
      }
      while (r < RUNS.length - 1 && i >= this.starts[r + 1]) r++;
      const run = RUNS[r];
      const head = Math.min(T, run.seconds);
      const at = f.r0[i] * run.seconds;
      const shown = at <= head;
      const x = vx + this.x0 + (shown ? at : head) * px;
      const y = vy + this.rowY[r] + (f.r1[i] - 0.5) * this.bar;
      const running = T < run.seconds;
      const nearHead = running && (head - at) * px < 7;
      f.gx[i] = x;
      f.gy[i] = y;
      f.ga[i] = shown ? (nearHead ? 1 : 0.62 + f.r3[i] * 0.3) : 0;
      f.gh[i] = r === 0 ? 1 : nearHead ? 0.9 : 0;
      f.gj[i] = 0.3;
    }
    this.readouts.write("elapsed", `${T.toFixed(T < 10 ? 2 : 1)} s`);
  }

  draw(ctx: CanvasRenderingContext2D, fr: Frame, palette: Palette) {
    const vx = fr.visual.x;
    const vy = fr.visual.y;
    const px = this.span / SPAN;
    const T = this.elapsed;
    const size = fr.compact ? 9.5 : 10.5;
    const left = vx + this.x0;

    // Tracks and the seconds axis.
    ctx.lineWidth = 1;
    for (const y of this.rowY) {
      ctx.strokeStyle = rgba(palette.muted, 0.12);
      ctx.beginPath();
      ctx.moveTo(left, vy + y);
      ctx.lineTo(left + this.span, vy + y);
      ctx.stroke();
    }
    for (let s = 0; s <= 25; s += 5) {
      const x = left + s * px;
      ctx.strokeStyle = rgba(palette.muted, s === 0 ? 0.35 : 0.1);
      ctx.beginPath();
      ctx.moveTo(x, vy + this.rowY[0] - this.bar * 1.4);
      ctx.lineTo(x, vy + this.axisY - 6);
      ctx.stroke();
      label(ctx, palette, `${s}s`, x, vy + this.axisY + 6, {
        align: "center",
        size: 9.5,
        alpha: 0.7,
      });
    }

    // The clock.
    if (T > 0 && T < RUNS[RUNS.length - 1].seconds) {
      const x = left + T * px;
      ctx.strokeStyle = rgba(palette.accent, 0.5);
      ctx.beginPath();
      ctx.moveTo(x, vy + this.rowY[0] - this.bar * 1.4);
      ctx.lineTo(x, vy + this.axisY - 6);
      ctx.stroke();
    }

    RUNS.forEach((run, r) => {
      const y = vy + this.rowY[r];
      const ours = r === 0;
      label(ctx, palette, run.name, left - 14, y, {
        align: "right",
        size: fr.compact ? 10 : 11,
        color: ours ? palette.accent : palette.fg,
        alpha: ours ? 1 : 0.85,
      });
      const finished = T >= run.seconds;
      const head = Math.min(T, run.seconds);
      if (T <= 0) return;
      const x = left + head * px + 10;
      if (!finished) {
        label(ctx, palette, `${T.toFixed(1)}s`, x, y, { size, alpha: 0.6 });
        return;
      }
      const ratio = run.seconds / RUNS[0].seconds;
      const times = ratio < 10 ? ratio.toFixed(1) : Math.round(ratio);
      const text =
        ours || fr.compact
          ? `${run.seconds.toFixed(2)} s`
          : `${run.seconds.toFixed(2)} s  ·  ${times}× longer`;
      label(ctx, palette, text, x, y, {
        size,
        color: ours ? palette.accent : palette.fg,
        alpha: smoothstep(0, 0.4, T - run.seconds + 0.4),
      });
    });
    resetText(ctx);
  }
}
