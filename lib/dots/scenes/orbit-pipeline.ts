import { clamp, rgba } from "../math";
import { dust } from "../shapes";
import { freeArea, label, resetText, StageSize, Steps, stepAt } from "../story";
import type { Field, Frame, Palette, Scene } from "../types";

const STEP_AT = [0, 0.18, 0.38, 0.58, 0.78] as const;
/** 400 ms of the app at an hour a second, replayed 15× slower. */
const WINDOW = 400;
const REPLAY = 6;
const HOLD = 1.2;
const FRAME = 1000 / 60;
/** Measured: per-frame JavaScript, all-object interpolation, one keyframe. */
const FRAME_JS = 2.6;
const INTERP = 0.22;
const KEYFRAME = [5.8, 6.2, 6.0, 5.7];
/** At 1 h/s keyframes are 300 s of orbit apart, 12 a second: every 5th frame. */
const EVERY = 5;
/** The store hears from the loop about every 200 ms. */
const PUBLISH = [30, 230];
const LANES = [
  "render loop",
  "worker 1",
  "worker 2",
  "worker 3",
  "worker 4",
  "keyframe slots",
  "React",
];
/** Narrow screens get shorter lane names. */
const SHORT = [
  "loop",
  "worker 1",
  "worker 2",
  "worker 3",
  "worker 4",
  "slots",
  "React",
];
const SLOT_LANE = 5;
const REACT_LANE = 6;

type Kind = "frame" | "sgp4" | "slot" | "react";
type Block = {
  kind: Kind;
  lane: number;
  /** Slot rows split the keyframe lane in four. */
  row: number;
  t0: number;
  t1: number;
  start: number;
  count: number;
};

/**
 * A trace of the app, like a profiler's: the render loop's frames, four SGP4
 * workers, the four keyframe slots in shared memory, and React. Every fifth
 * frame asks for a keyframe; the workers fill a slot in about 6 ms while
 * the loop keeps drawing, interpolating between the two newest slots. React
 * only wakes for the summary, twice in the window.
 */
export class PipelineScene implements Scene {
  private blocks: Block[] = [];
  private requests: number[] = [];
  private track = { x: 0, w: 1, top: 0, laneH: 1, bottom: 0 };
  private used = 0;
  private clock = 0;
  private head = 0;
  private step = 0;
  private steps = new Steps();
  private size = new StageSize();
  private ink = true;

  layout(_f: Field, fr: Frame) {
    const area = freeArea(fr, 18);
    const labelW = fr.compact ? 62 : 104;
    const axisH = 26;
    const laneH = Math.min(46, (area.h - axisH) / LANES.length);
    const top = area.y + (area.h - axisH - laneH * LANES.length) / 2;
    this.track = {
      x: area.x + labelW,
      w: area.w - labelW,
      top,
      laneH,
      bottom: top + laneH * LANES.length,
    };

    const blocks: Omit<Block, "start" | "count">[] = [];
    this.requests = [];
    const frames = Math.ceil(WINDOW / FRAME);
    for (let k = 0; k < frames; k++) {
      const t = 1 + k * FRAME;
      blocks.push({ kind: "frame", lane: 0, row: 0, t0: t, t1: t + FRAME_JS });
      if (k % EVERY === 0) {
        const req = t + 0.3;
        this.requests.push(req);
        KEYFRAME.forEach((ms, w) => {
          blocks.push({
            kind: "sgp4",
            lane: 1 + w,
            row: 0,
            t0: req + 0.15 + w * 0.05,
            t1: req + ms,
          });
        });
        const done = req + Math.max(...KEYFRAME);
        const slot = (k / EVERY) % 4;
        blocks.push({
          kind: "slot",
          lane: SLOT_LANE,
          row: slot,
          t0: done,
          t1: WINDOW,
        });
      }
    }
    // Slots written before the window opens are already ready.
    for (let slot = 1; slot < 4; slot++)
      blocks.push({
        kind: "slot",
        lane: SLOT_LANE,
        row: slot,
        t0: 0,
        t1: this.requests[slot] ?? WINDOW,
      });
    for (const t of PUBLISH)
      blocks.push({
        kind: "react",
        lane: REACT_LANE,
        row: 0,
        t0: t,
        t1: t + 3,
      });

    // Particles in proportion to each block's area, about one per 9 px².
    let start = 0;
    this.blocks = blocks.map((b) => {
      const r = this.rect(b);
      const count = Math.max(4, Math.round((r.w * r.h) / 9));
      const block = { ...b, start, count };
      start += count;
      return block;
    });
    this.used = start;
    this.steps.collect(fr.section);
  }

  private x(t: number) {
    return this.track.x + (t / WINDOW) * this.track.w;
  }

  private rect(b: Omit<Block, "start" | "count">) {
    const { top, laneH } = this.track;
    const pad = laneH * 0.22;
    let y = top + b.lane * laneH + pad;
    let h = laneH - 2 * pad;
    if (b.kind === "slot") {
      h = (laneH - 2 * pad) / 4;
      y += b.row * h;
      h *= 0.7;
    }
    const x = this.x(b.t0);
    return { x, y, w: Math.max(2, this.x(b.t1) - x), h };
  }

  update(f: Field, fr: Frame) {
    if (this.size.changed(fr)) this.layout(f, fr);
    const step = stepAt(fr.progress, STEP_AT);
    this.step = step;
    this.steps.set(step);
    this.clock += fr.dt;
    const cycle = REPLAY + HOLD;
    const into = this.clock % cycle;
    this.head = fr.reduced ? WINDOW : clamp(into / REPLAY) * WINDOW;
    const vx = fr.visual.x;
    const vy = fr.visual.y;
    const boost = this.ink ? 1 : 1.25;
    const hx = this.x(this.head);

    let b = 0;
    for (let i = 0; i < f.n; i++) {
      if (i >= this.used) {
        dust(f, i, fr, 0.08);
        continue;
      }
      while (i >= this.blocks[b].start + this.blocks[b].count) b++;
      const block = this.blocks[b];
      const r = this.rect(block);
      const k = i - block.start;
      const cols = Math.max(
        1,
        Math.round(Math.sqrt((block.count * r.w) / r.h)),
      );
      const rows = Math.ceil(block.count / cols);
      const x = r.x + ((k % cols) + 0.2 + f.r1[i] * 0.6) * (r.w / cols);
      const y =
        r.y + (Math.floor(k / cols) + 0.2 + f.r2[i] * 0.6) * (r.h / rows);
      const shown = x <= hx;
      f.gx[i] = vx + (shown ? x : Math.min(x, hx));
      f.gy[i] = vy + y;
      f.gz[i] = fr.compact ? 1.2 : 1.5;
      f.gj[i] = 0.1;
      let a = 0.55;
      let tint = 0;
      if (step === 1 && (block.kind === "sgp4" || block.kind === "slot")) {
        a = 0.9;
        tint = block.kind === "sgp4" ? 0.85 : 0.5;
      } else if (step === 2 && block.kind === "frame") {
        a = 0.8;
      } else if (step === 4 && block.kind === "react") {
        a = 1;
        tint = 0.9;
      } else if (step > 0) {
        a = 0.32;
      }
      f.ga[i] = shown ? Math.min(1, (a + f.r3[i] * 0.2) * boost) : 0;
      f.gh[i] = tint;
    }
  }

  draw(ctx: CanvasRenderingContext2D, fr: Frame, palette: Palette) {
    this.ink = palette.ink;
    const vx = fr.visual.x;
    const vy = fr.visual.y;
    const { x, w, top, laneH, bottom } = this.track;
    const size = fr.compact ? 9 : 10;
    const step = this.step;
    ctx.lineWidth = 1;

    (fr.compact ? SHORT : LANES).forEach((name, l) => {
      const y = vy + top + (l + 0.5) * laneH;
      const lit =
        (step === 1 && l >= 1 && l <= SLOT_LANE) ||
        (step === 4 && l === REACT_LANE) ||
        ((step === 0 || step === 2) && l === 0);
      label(ctx, palette, name, vx + x - 12, y, {
        size,
        align: "right",
        color: lit ? palette.fg : palette.muted,
        alpha: lit ? 1 : 0.75,
      });
      ctx.strokeStyle = rgba(palette.muted, 0.08);
      ctx.beginPath();
      ctx.moveTo(vx + x, vy + top + (l + 1) * laneH);
      ctx.lineTo(vx + x + w, vy + top + (l + 1) * laneH);
      ctx.stroke();
    });

    // Vsync every 16.7 ms, and the time axis.
    for (let t = 1; t < WINDOW; t += FRAME) {
      ctx.strokeStyle = rgba(palette.muted, 0.06);
      ctx.beginPath();
      ctx.moveTo(vx + this.x(t), vy + top);
      ctx.lineTo(vx + this.x(t), vy + bottom);
      ctx.stroke();
    }
    for (let t = 0; t <= WINDOW; t += 100) {
      label(ctx, palette, `${t} ms`, vx + this.x(t), vy + bottom + 14, {
        size: 9.5,
        align: t === 0 ? "left" : t === WINDOW ? "right" : "center",
        alpha: 0.7,
      });
    }

    const head = this.head;
    // Atomics.notify: from the loop down to every worker.
    for (const t of this.requests) {
      if (t > head) continue;
      const rx = vx + this.x(t);
      ctx.strokeStyle = rgba(palette.accent, step === 0 ? 0.9 : 0.35);
      ctx.beginPath();
      ctx.moveTo(rx, vy + top + laneH * 0.2);
      ctx.lineTo(rx, vy + top + laneH * 4.8);
      ctx.stroke();
    }
    if (step === 0 && this.requests[0] <= head) {
      label(
        ctx,
        palette,
        "Atomics.notify",
        vx + this.x(this.requests[0]) + 6,
        vy + top + laneH * 0.95,
        {
          size,
          color: palette.accent,
        },
      );
    }
    // The interpolation, 0.22 ms of every frame: too thin for dots, so a line.
    if (step === 2) {
      ctx.strokeStyle = rgba(palette.accent, 0.95);
      ctx.lineWidth = 1.5;
      for (let t = 1; t < Math.min(head, WINDOW); t += FRAME) {
        const ix = vx + this.x(t + 0.4 + INTERP / 2);
        ctx.beginPath();
        ctx.moveTo(ix, vy + top + laneH * 0.12);
        ctx.lineTo(ix, vy + top + laneH * 0.88);
        ctx.stroke();
      }
      ctx.lineWidth = 1;
      label(
        ctx,
        palette,
        "Hermite, all 32,583 objects, 0.22 ms",
        vx + x,
        vy + top - 10,
        {
          size,
          color: palette.accent,
        },
      );
    }
    // Two keyframes apart: 83 ms of wall time, 300 s of orbit.
    if (step === 3 && this.requests.length > 1) {
      const a = vx + this.x(this.requests[0]);
      const b = vx + this.x(this.requests[1]);
      const y = vy + top + laneH * 5 - 6;
      ctx.strokeStyle = rgba(palette.fg, 0.7);
      ctx.beginPath();
      ctx.moveTo(a, y - 4);
      ctx.lineTo(a, y);
      ctx.lineTo(b, y);
      ctx.lineTo(b, y - 4);
      ctx.stroke();
      label(ctx, palette, "83 ms apart, 300 s of orbit", (a + b) / 2, y - 10, {
        size,
        align: "center",
        color: palette.fg,
      });
    }
    // The playhead.
    if (head < WINDOW) {
      const px = vx + this.x(head);
      ctx.strokeStyle = rgba(palette.fg, 0.35);
      ctx.beginPath();
      ctx.moveTo(px, vy + top);
      ctx.lineTo(px, vy + bottom);
      ctx.stroke();
    }
    resetText(ctx);
  }
}
