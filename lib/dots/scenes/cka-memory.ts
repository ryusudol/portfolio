import { clamp, lerp, rgba, smoothstep } from "../math";
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
import type { Field, Frame, Palette, Scene } from "../types";

const LAYERS = 18;
const BATCHES = 10;
/** Tank capacity, and what each library left allocated after one pass (MB). */
const CAPACITY = 5000;
const HELD = 4260.2;
const KEPT = 182.5;
const STEP_AT = [0, 0.44, 0.64] as const;

type Lane = {
  name: string;
  y: number;
  h: number;
  src: { x: number; y: number; s: number };
  model: { x0: number; x1: number; y: number; h: number };
  tank: { x: number; y: number; w: number; h: number; cols: number };
};

/**
 * What each library leaves on the GPU. Both lanes stream ten CIFAR-10 batches
 * through a model whose 18 forward hooks capture activations into GPU memory;
 * while running they look alike. When the comparison ends, pytorch-cka removes
 * its hooks and clears its features, while torch_cka's hooks stay on the
 * models and keep the last batch alive — even after `del` and `gc.collect()`.
 */
export class MemoryScene implements Scene {
  private lanes: Lane[] = [];
  private fillN = 0;
  private streamN = 0;
  private tickN = 0;
  private hookN = 0;
  private edgeN = 0;
  private srcN = 0;
  private levels = [0, 0];
  private batch = 0;
  private p = 0;
  private steps = new Steps();
  private readouts = new Readouts();
  private ink = true;

  layout(f: Field, fr: Frame) {
    const area = freeArea(fr, 16);
    const laneH = area.h / 2;
    const compact = fr.compact;
    this.lanes = ["torch_cka", "pytorch-cka"].map((name, l) => {
      const y = area.y + l * laneH;
      const cy = y + laneH * 0.56;
      const s = Math.min(laneH * 0.32, area.w * 0.1);
      const tankW = area.w * (compact ? 0.3 : 0.26);
      const tankH = laneH * 0.66;
      const tankX = area.x + area.w - tankW;
      const x0 = area.x + s + (compact ? 14 : 34);
      const x1 = tankX - (compact ? 16 : 40);
      return {
        name,
        y,
        h: laneH,
        src: { x: area.x, y: cy - s / 2, s },
        model: { x0, x1, y: cy, h: laneH * 0.26 },
        tank: { x: tankX, y: cy - tankH / 2, w: tankW, h: tankH, cols: 0 },
      };
    });
    this.fillN = Math.round(f.n * 0.19);
    this.streamN = Math.round(f.n * 0.05);
    this.tickN = Math.round(f.n * 0.03);
    this.hookN = Math.round(f.n * 0.012);
    this.edgeN = Math.round(f.n * 0.03);
    this.srcN = Math.round(f.n * 0.035);
    for (const lane of this.lanes) {
      const { w, h } = lane.tank;
      lane.tank.cols = Math.max(4, Math.round(Math.sqrt((this.fillN * w) / h)));
    }
    this.steps.collect(fr.section);
    this.readouts.collect(fr.section);
  }

  update(f: Field, fr: Frame) {
    const p = fr.progress;
    this.p = p;
    const run = clamp((p - 0.04) / 0.38);
    const running = p < 0.43 ? 1 : 0;
    const batchPos = Math.min(BATCHES - 1e-4, run * BATCHES);
    this.batch = Math.floor(batchPos) + 1;
    const within = batchPos - Math.floor(batchPos);
    const exit = smoothstep(0.46, 0.56, p);
    const gc = smoothstep(0.66, 0.72, p);
    const shake = gc * (1 - smoothstep(0.74, 0.8, p));
    // Each batch clears the last one's features, then its forward pass refills them.
    const during =
      run >= 1 ? HELD : HELD * (0.06 + 0.94 * smoothstep(0.08, 0.7, within));
    const held = p < 0.04 ? 0 : during;
    this.levels = [held, lerp(held, KEPT, exit)];

    const vx = fr.visual.x;
    const vy = fr.visual.y;
    const per = [
      this.fillN,
      this.streamN,
      this.tickN,
      this.hookN,
      this.edgeN,
      this.srcN,
    ];
    const laneSpan = per.reduce((a, b) => a + b, 0);
    const time = fr.reduced ? 0 : fr.time;

    for (let i = 0; i < f.n; i++) {
      const l = Math.floor(i / laneSpan);
      if (l > 1) {
        dust(f, i, fr, 0.1);
        continue;
      }
      const lane = this.lanes[l];
      let k = i - l * laneSpan;
      const { tank, model, src } = lane;
      f.gh[i] = 0;
      if (k < this.fillN) {
        // Fill from the bottom, row by row: the level is the memory held.
        const col = k % tank.cols;
        const row = Math.floor(k / tank.cols);
        const rows = Math.ceil(this.fillN / tank.cols);
        const x =
          vx + tank.x + ((col + 0.2 + f.r1[i] * 0.6) / tank.cols) * tank.w;
        const y =
          vy + tank.y + tank.h - ((row + 0.2 + f.r2[i] * 0.6) / rows) * tank.h;
        const filled = k < (this.levels[l] / CAPACITY) * this.fillN;
        const jolt =
          l === 0 ? Math.sin(time * 40 + f.r0[i] * 9) * 2 * shake : 0;
        f.gx[i] = x + jolt;
        f.gy[i] = filled ? y : y - 34 - f.r3[i] * 40;
        f.ga[i] = filled ? 0.5 + f.r3[i] * 0.35 : 0;
        f.gh[i] = l === 0 ? shake * 0.8 : 0;
        continue;
      }
      k -= this.fillN;
      if (k < this.streamN) {
        // Images flowing from the batch, through the layers, into memory.
        const s = (time * 0.32 + f.r0[i]) % 1;
        let x: number;
        let y: number;
        if (s < 0.22) {
          x = src.x + (s / 0.22) * src.s;
          y = src.y + f.r1[i] * src.s;
        } else if (s < 0.8) {
          const t = (s - 0.22) / 0.58;
          x = lerp(src.x + src.s, model.x1, t);
          y = model.y + (f.r1[i] - 0.5) * model.h * 0.32;
        } else {
          const t = (s - 0.8) / 0.2;
          x = lerp(model.x1, tank.x + tank.w * (0.2 + f.r2[i] * 0.6), t);
          y =
            lerp(model.y, tank.y + tank.h * 0.2, t) -
            Math.sin(t * Math.PI) * 18;
        }
        f.gx[i] = vx + x;
        f.gy[i] = vy + y;
        // Hidden while wrapping from the tank back to the batch.
        const wrap = s > 0.03 && s < 0.97 ? 1 : 0;
        f.ga[i] = 0.55 * running * wrap * (p > 0.04 ? 1 : 0);
        continue;
      }
      k -= this.streamN;
      if (k < this.tickN) {
        // The model: 18 layers, as short vertical bars.
        const layer = k % LAYERS;
        const x = lerp(model.x0, model.x1, (layer + 0.5) / LAYERS);
        f.gx[i] = vx + x + (f.r1[i] - 0.5) * 2;
        f.gy[i] = vy + model.y + (f.r0[i] - 0.5) * model.h;
        f.ga[i] = 0.7;
        continue;
      }
      k -= this.tickN;
      if (k < this.hookN) {
        // A forward hook on every layer; pytorch-cka's come off on exit.
        const layer = k % LAYERS;
        const x = lerp(model.x0, model.x1, (layer + 0.5) / LAYERS);
        const gone = l === 1 ? exit : 0;
        f.gx[i] = vx + x + (f.r1[i] - 0.5) * 3;
        f.gy[i] =
          vy + model.y - model.h / 2 - 7 + (f.r2[i] - 0.5) * 3 - gone * 16;
        f.ga[i] = (p > 0.02 ? 0.95 : 0) * (1 - gone);
        f.gh[i] = 1;
        continue;
      }
      k -= this.hookN;
      if (k >= this.edgeN) {
        // The batch: a block of images waiting to go through the model.
        const g = Math.ceil(Math.sqrt(this.srcN));
        const m = k - this.edgeN;
        f.gx[i] = vx + src.x + ((m % g) + 0.5) * (src.s / g);
        f.gy[i] = vy + src.y + (Math.floor(m / g) + 0.5) * (src.s / g);
        f.ga[i] = p < 0.04 ? 0.3 : running ? 0.55 : 0.12;
        f.gj[i] = 0.2;
        continue;
      }
      // The tank's outline: top, right, bottom, left.
      const d = f.r0[i] * 2 * (tank.w + tank.h);
      const { w, h } = tank;
      let x = tank.x;
      let y = tank.y + h - (d - 2 * w - h);
      if (d < w) {
        x = tank.x + d;
        y = tank.y;
      } else if (d < w + h) {
        x = tank.x + w;
        y = tank.y + d - w;
      } else if (d < 2 * w + h) {
        x = tank.x + w - (d - w - h);
        y = tank.y + h;
      }
      f.gx[i] = vx + x;
      f.gy[i] = vy + y;
      f.ga[i] = 0.45;
      f.gj[i] = 0.3;
    }

    this.steps.set(stepAt(p, STEP_AT));
    this.readouts.write("torch", `${fmt(this.levels[0])} MB`);
    this.readouts.write(
      "ours",
      `${this.levels[1] < 1000 ? this.levels[1].toFixed(1) : fmt(this.levels[1])} MB`,
    );
    this.readouts.write("freed", exit > 0.98 ? "−95.7%" : "–");
  }

  draw(ctx: CanvasRenderingContext2D, fr: Frame, palette: Palette) {
    this.ink = palette.ink;
    const p = this.p;
    const vx = fr.visual.x;
    const vy = fr.visual.y;
    const size = fr.compact ? 9 : 10;
    const exit = smoothstep(0.46, 0.52, p);
    const gc = smoothstep(0.66, 0.72, p);

    this.lanes.forEach((lane, l) => {
      const { tank, model, src } = lane;
      label(ctx, palette, lane.name, vx + src.x, vy + lane.y + 12, {
        size: fr.compact ? 10 : 11,
        color: l === 1 ? palette.accent : palette.fg,
        alpha: 0.95,
      });
      label(
        ctx,
        palette,
        p < 0.43 ? `batch ${this.batch} / ${BATCHES}` : "done",
        vx + src.x,
        vy + src.y + src.s + 14,
        { size },
      );
      if (l === 0 || !fr.compact) {
        label(ctx, palette, "GPU memory", vx + tank.x, vy + tank.y - 10, {
          size,
        });
      }
      const level = this.levels[l];
      const ly = vy + tank.y + tank.h * (1 - level / CAPACITY);
      if (level > 1) {
        ctx.strokeStyle = rgba(palette.fg, 0.35);
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 3]);
        ctx.beginPath();
        ctx.moveTo(vx + tank.x - 4, ly);
        ctx.lineTo(vx + tank.x + tank.w + 4, ly);
        ctx.stroke();
        ctx.setLineDash([]);
        label(
          ctx,
          palette,
          `${level < 1000 ? level.toFixed(1) : fmt(level)} MB`,
          // On narrow stages the label moves inside the tank, above the level.
          fr.compact ? vx + tank.x + 4 : vx + tank.x - 8,
          fr.compact ? ly - 9 : ly,
          { align: fr.compact ? "left" : "right", size, color: palette.fg },
        );
      }
      const hookY = vy + model.y - model.h / 2 - 20;
      const mid = vx + (model.x0 + model.x1) / 2;
      if (l === 0) {
        label(
          ctx,
          palette,
          p < 0.46 ? "forward hooks" : "hooks still attached",
          mid,
          hookY,
          {
            align: "center",
            size,
            color: p < 0.46 ? palette.muted : palette.accent,
          },
        );
      } else {
        label(
          ctx,
          palette,
          exit > 0.5 ? "hooks removed · features cleared" : "forward hooks",
          mid,
          hookY,
          { align: "center", size },
        );
      }
      if (l === 0 && gc > 0) {
        // The references that keep the memory alive: model hooks → features.
        ctx.strokeStyle = rgba(palette.accent, 0.55 * gc);
        ctx.setLineDash([3, 4]);
        ctx.beginPath();
        ctx.moveTo(vx + model.x1, vy + model.y - model.h / 2 - 7);
        ctx.quadraticCurveTo(
          vx + (model.x1 + tank.x) / 2,
          vy + model.y - model.h,
          vx + tank.x + tank.w * 0.2,
          vy + tank.y + tank.h * 0.3,
        );
        ctx.stroke();
        ctx.setLineDash([]);
        label(
          ctx,
          palette,
          "del cka; gc.collect()  →  still held",
          mid,
          vy + model.y + model.h / 2 + 18,
          { align: "center", size, color: palette.fg, alpha: gc },
        );
      }
    });
    resetText(ctx);
  }
}
