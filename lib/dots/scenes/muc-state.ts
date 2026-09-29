import { lerp, rgba, smoothstep } from "../math";
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

const STEP_AT = [0, 0.24, 0.5, 0.72] as const;
/** Seconds between two polls of the backend while a model trains. */
const POLL = 1;
/** How long a re-render flash lasts, as a share of a poll. */
const FLASH = 0.4;
const PROVIDERS = 6;
const EDGE = 120;
const STORES = [
  "modelData",
  "experiments",
  "runningStatus",
  "runningIndex",
  "forgetClass",
  "baseConfig",
  "attack",
  "threshold",
];
/** The store every poll writes to. */
const STATUS = 2;

type Part = {
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Reads the running status: re-rendered by every poll under Context. */
  reads: boolean;
  /** Still subscribes to the whole store after the move to Zustand. */
  whole: boolean;
};

/** The app's layout, in fractions of the innermost provider's box. */
const PARTS: Part[] = [
  {
    name: "Model table",
    x: 0,
    y: 0,
    w: 0.56,
    h: 0.44,
    reads: true,
    whole: false,
  },
  {
    name: "Progress",
    x: 0.61,
    y: 0,
    w: 0.39,
    h: 0.19,
    reads: true,
    whole: true,
  },
  {
    name: "Configuration",
    x: 0.61,
    y: 0.24,
    w: 0.39,
    h: 0.08,
    reads: true,
    whole: true,
  },
  {
    name: "Add models",
    x: 0.61,
    y: 0.36,
    w: 0.18,
    h: 0.08,
    reads: true,
    whole: true,
  },
  {
    name: "Pages",
    x: 0.82,
    y: 0.36,
    w: 0.18,
    h: 0.08,
    reads: true,
    whole: true,
  },
  {
    name: "Embedding · Attack",
    x: 0,
    y: 0.52,
    w: 0.56,
    h: 0.48,
    reads: false,
    whole: false,
  },
  {
    name: "Metrics",
    x: 0.61,
    y: 0.52,
    w: 0.39,
    h: 0.48,
    reads: false,
    whole: false,
  },
];

type Rect = { x: number; y: number; w: number; h: number };
type Grid = { cols: number; rows: number; start: number };

/**
 * The same app under two state managers. Under React Context, six providers
 * wrap everything, and a poll that writes the running status re-renders every
 * component reading that context, the model table included, though it only
 * needs to know whether a run is going. Under Zustand the providers become
 * stores outside the tree, and the table's selector keeps it still. The small
 * components that still take the whole store keep flashing.
 */
export class StateScene implements Scene {
  private frames: Rect[] = [];
  private inner: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private parts: Rect[] = [];
  private grids: Grid[] = [];
  private stores: Rect[] = [];
  private partDots = 0;
  private spacing = 6;
  private p = 0;
  private time = 0;
  private mode = -1;
  private since = 0;
  private compact = false;
  private stage = new StageSize();
  private steps = new Steps();
  private readouts = new Readouts();
  private ink = true;

  layout(_f: Field, fr: Frame) {
    this.stage.changed(fr);
    const area = freeArea(fr, 18);
    const compact = fr.compact;
    this.compact = compact;
    // The app on the left, the stores it will move into on the right; on a
    // phone the stores sit under it.
    const storeW = compact ? 0 : Math.min(150, area.w * 0.26);
    const storeH = compact ? 52 : 0;
    const app: Rect = {
      x: area.x,
      y: area.y + 16,
      w: area.w - storeW - (compact ? 0 : 24),
      h: Math.min(area.h - storeH - 16, (area.w - storeW) * 1.3),
    };
    // Phones get tighter frames, so the parts inside keep some room.
    const inset = compact ? 3.5 : 11;
    this.frames = Array.from({ length: PROVIDERS }, (_, k) => ({
      x: app.x + k * inset,
      y: app.y + k * inset,
      w: app.w - 2 * k * inset,
      h: app.h - 2 * k * inset,
    }));
    const last = this.frames[PROVIDERS - 1];
    const pad = compact ? 5 : 12;
    const top = compact ? 0 : 12;
    this.inner = {
      x: last.x + pad,
      y: last.y + pad + top,
      w: last.w - 2 * pad,
      h: last.h - 2 * pad - top,
    };
    const inner = this.inner;
    this.spacing = compact ? 5 : 6.5;
    const head = compact ? 10 : 12;
    this.parts = PARTS.map((part) => ({
      x: inner.x + part.x * inner.w,
      y: inner.y + part.y * inner.h + head,
      w: part.w * inner.w,
      h: Math.max(this.spacing, part.h * inner.h - head),
    }));
    let start = 0;
    this.grids = this.parts.map((r) => {
      const cols = Math.max(2, Math.floor(r.w / this.spacing));
      const rows = Math.max(1, Math.floor(r.h / this.spacing));
      const grid = { cols, rows, start };
      start += cols * rows;
      return grid;
    });
    this.partDots = start;
    // Store chips.
    const n = STORES.length;
    if (compact) {
      const w = area.w / 4;
      this.stores = STORES.map((_, k) => ({
        x: area.x + (k % 4) * w,
        y: app.y + app.h + 10 + Math.floor(k / 4) * 22,
        w: w - 8,
        h: 16,
      }));
    } else {
      const h = Math.min(34, app.h / n);
      const top = app.y + (app.h - h * n) / 2;
      this.stores = STORES.map((_, k) => ({
        x: app.x + app.w + 24,
        y: top + k * h,
        w: storeW,
        h: h - 8,
      }));
    }
    this.steps.collect(fr.section);
    this.readouts.collect(fr.section);
  }

  /** How strongly a part flashes right now, 0 to 1. */
  private flash(part: number, step: number) {
    if (step !== 1 && step !== 3) return 0;
    const spec = PARTS[part];
    const hit = step === 1 ? spec.reads : spec.whole;
    if (!hit) return 0;
    const phase = ((this.time - this.since) % POLL) / POLL;
    return phase < FLASH ? 1 - phase / FLASH : 0;
  }

  update(f: Field, fr: Frame) {
    if (this.stage.changed(fr)) this.layout(f, fr);
    if (this.parts.length === 0) return;
    const p = fr.progress;
    this.p = p;
    this.time = fr.reduced ? 0 : fr.time;
    const step = stepAt(p, STEP_AT);
    this.steps.set(step);
    if (step !== this.mode) {
      this.mode = step;
      this.since = this.time;
    }
    this.readout(step);
    const boost = this.ink ? 1 : 1.3;
    const vx = fr.visual.x;
    const vy = fr.visual.y;
    // Providers dissolve into stores between the second and third steps.
    const toStores = smoothstep(0.46, 0.58, p);
    const frameDots = PROVIDERS * EDGE;

    for (let i = 0; i < f.n; i++) {
      f.gh[i] = 0;
      f.gj[i] = 0.1;
      if (i < this.partDots) {
        let part = 0;
        while (part < this.grids.length - 1 && i >= this.grids[part + 1].start)
          part++;
        const g = this.grids[part];
        const r = this.parts[part];
        const k = i - g.start;
        const col = k % g.cols;
        const row = Math.floor(k / g.cols);
        const hit = this.flash(part, step);
        f.gx[i] = vx + r.x + (col + 0.5) * (r.w / g.cols);
        f.gy[i] = vy + r.y + (row + 0.5) * (r.h / g.rows) - hit * 2;
        f.gz[i] = this.spacing * 0.5;
        f.ga[i] = Math.min(1, (0.42 + hit * 0.58) * boost);
        f.gh[i] = hit;
        f.gj[i] = 0.1 + hit * 0.5;
        continue;
      }
      const q = i - this.partDots;
      if (q < frameDots) {
        // A provider's frame, traced around its edge, or the store it becomes.
        const n = Math.floor(q / EDGE);
        const u = (q % EDGE) / EDGE;
        const [fx, fy] = this.edge(this.frames[n], u);
        const s = this.stores[Math.floor((q / frameDots) * STORES.length)];
        const [sx, sy] = this.edge(s, ((q * 7) % EDGE) / EDGE);
        f.gx[i] = vx + lerp(fx, sx, toStores);
        f.gy[i] = vy + lerp(fy, sy, toStores);
        f.gz[i] = 1.3;
        // Before the move, each poll lights the outermost provider, the one
        // that holds the running status; after it, the status store.
        const pulse =
          step === 1 && n === 0
            ? this.flash(0, step)
            : step === 3 &&
                Math.floor((q / frameDots) * STORES.length) === STATUS
              ? this.flash(1, step)
              : 0;
        f.ga[i] = Math.min(1, (0.42 + pulse * 0.5) * boost);
        f.gh[i] = pulse;
        continue;
      }
      dust(f, i, fr, 0.08);
    }
  }

  /** The point `u` of the way around a rectangle's edge. */
  private edge(r: Rect, u: number): [number, number] {
    const d = u * 2 * (r.w + r.h);
    if (d < r.w) return [r.x + d, r.y];
    if (d < r.w + r.h) return [r.x + r.w, r.y + d - r.w];
    if (d < 2 * r.w + r.h) return [r.x + r.w - (d - r.w - r.h), r.y + r.h];
    return [r.x, r.y + r.h - (d - 2 * r.w - r.h)];
  }

  private readout(step: number) {
    const polls =
      step === 1 || step === 3
        ? Math.floor((this.time - this.since) / POLL) + 1
        : 0;
    this.readouts.write("polls", step === 1 || step === 3 ? `${polls}` : "–");
    this.readouts.write(
      "table",
      step === 1 ? `${polls}` : step === 3 ? "0" : "–",
    );
  }

  draw(ctx: CanvasRenderingContext2D, fr: Frame, palette: Palette) {
    this.ink = palette.ink;
    if (this.parts.length === 0) return;
    const vx = fr.visual.x;
    const vy = fr.visual.y;
    const p = this.p;
    const step = stepAt(p, STEP_AT);
    const size = this.compact ? 8.5 : 9.5;
    const toStores = smoothstep(0.46, 0.58, p);

    PARTS.forEach((part, k) => {
      const r = this.parts[k];
      const hit = this.flash(k, step);
      // Small controls too close together to name go unlabeled.
      ctx.font = `${size}px ${palette.mono}`;
      const room = k === 3 ? this.parts[4].x - r.x - 6 : r.w + 4;
      if (ctx.measureText(part.name).width > room) return;
      label(ctx, palette, part.name, vx + r.x, vy + r.y - 7, {
        size,
        color: hit > 0.05 ? palette.accent : palette.fg,
        alpha: 0.85,
      });
    });

    // Before the move, the providers' names, outermost first.
    const a = 1 - toStores;
    if (a > 0.02) {
      const outer = this.frames[0];
      label(
        ctx,
        palette,
        "6 nested context providers",
        vx + outer.x,
        vy + outer.y - 9,
        {
          size,
          color: step === 1 ? palette.accent : palette.fg,
          alpha: a * 0.9,
        },
      );
    }
    if (toStores > 0.02) {
      STORES.forEach((name, k) => {
        const s = this.stores[k];
        label(ctx, palette, name, vx + s.x + 6, vy + s.y + s.h / 2, {
          size: this.compact ? 8 : 9,
          color: k === STATUS && step === 3 ? palette.accent : palette.fg,
          alpha: toStores * 0.9,
        });
      });
      if (!this.compact)
        label(
          ctx,
          palette,
          "Zustand stores",
          vx + this.stores[0].x,
          vy + this.stores[0].y - 12,
          { size, alpha: toStores * 0.9 },
        );
      // Step 3 on: who subscribes to the status store, and how.
      const b = smoothstep(0.54, 0.6, p);
      if (b > 0.02) this.subscriptions(ctx, palette, vx, vy, b);
    }
    resetText(ctx);
  }

  /**
   * Lines from the status store to the parts reading it: dashed for the
   * table's selector, solid for the parts that take the whole store.
   */
  private subscriptions(
    ctx: CanvasRenderingContext2D,
    palette: Palette,
    vx: number,
    vy: number,
    alpha: number,
  ) {
    const s = this.stores[STATUS];
    const sx = vx + s.x;
    const sy = vy + s.y + s.h / 2;
    ctx.lineWidth = 1;
    const table = this.parts[0];
    const progress = this.parts[1];
    PARTS.forEach((part, k) => {
      if (!part.reads) return;
      const r = this.parts[k];
      const tx = vx + r.x + r.w;
      const ty = vy + r.y + Math.min(r.h / 2, 10);
      ctx.strokeStyle = rgba(
        part.whole ? palette.muted : palette.accent,
        (part.whole ? 0.35 : 0.8) * alpha,
      );
      ctx.setLineDash(part.whole ? [] : [3, 3]);
      ctx.beginPath();
      if (this.compact) {
        ctx.moveTo(sx + s.w / 2, vy + s.y);
        ctx.lineTo(tx - 4, ty);
      } else if (!part.whole) {
        // The table's selector arcs over Progress to the table's corner.
        ctx.moveTo(sx, sy);
        ctx.quadraticCurveTo(
          vx + progress.x + progress.w * 0.6,
          vy + table.y - 70,
          vx + table.x + table.w - 4,
          vy + table.y - 18,
        );
      } else {
        ctx.moveTo(sx, sy);
        ctx.lineTo(tx + 3, ty);
      }
      ctx.stroke();
    });
    ctx.setLineDash([]);
    // Beside the table's name when both fit, otherwise on a line above it.
    const size = this.compact ? 8 : 9;
    ctx.font = `${size}px ${palette.mono}`;
    const both =
      ctx.measureText("Model table").width +
      ctx.measureText("(s) => s.isRunning").width +
      12;
    label(
      ctx,
      palette,
      "(s) => s.isRunning",
      vx + table.x + table.w,
      vy + table.y - (both > table.w ? 20 : 7),
      {
        align: "right",
        size,
        color: palette.accent,
        alpha,
      },
    );
  }
}
