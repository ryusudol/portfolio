import { rgba, TAU } from "../math";
import { type Catalog, loadCatalog, orbitPosition, RE } from "../orbit-data";
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
/** The cell a 60 s screening step uses: 5 km + 16 km/s × 30 s. */
const CELL = 485;
const REACH = RE + 2100;
/**
 * Pairs a step checks across the full catalogue: all of them, and what the
 * grid leaves at 485 km cells (460 M over the 1,441 steps of a day's screen,
 * the app's README).
 */
const ALL = "530.7 M";
const HASHED = "319 k";
const SHARE = "0.06%";
/** Columns, seen from above, that a cell checks: its own and the four ahead of it. */
const AHEAD: [number, number][] = [
  [0, 0],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];
/** Two minutes of orbit a second, so the objects visibly cross cells. */
const WARP = 120;

/**
 * Low Earth orbit from the sample, looked down on from above the North Pole,
 * flying on its orbits at two minutes a second. Checking all pairs fans one
 * object out to every other; the spatial grid keeps only the nine columns of
 * cells around it, re-bucketed as the object crosses from cell to cell, and
 * of those only its own and the four ahead, so each pair is met once.
 */
export class SieveScene implements Scene {
  private cat: Catalog | null = null;
  private pts = new Float32Array(0);
  private idx = new Int32Array(0);
  private t = 0;
  private n = 0;
  private query = 0;
  private near = new Uint8Array(0);
  private centre = { x: 0, y: 0, s: 1 };
  private step = 0;
  private steps = new Steps();
  private readouts = new Readouts();
  private size = new StageSize();
  private ink = true;

  layout(f: Field, fr: Frame) {
    const area = freeArea(fr, 16);
    const r = Math.min(area.w, area.h) * 0.48;
    this.centre = {
      x: area.x + area.w / 2,
      y: area.y + area.h / 2,
      s: r / REACH,
    };
    loadCatalog().then((cat) => {
      if (!cat || this.cat) return;
      this.cat = cat;
      this.place(f);
    });
    if (this.cat) this.place(f);
    this.steps.collect(fr.section);
    this.readouts.collect(fr.section);
  }

  /** The sample's low-orbit objects, and the one whose neighbourhood is shown. */
  private place(f: Field) {
    const cat = this.cat as Catalog;
    const cap = Math.round(f.n * 0.7);
    const idx: number[] = [];
    for (let k = 0; k < cat.n && idx.length < cap; k++) {
      if (cat.alt[k] > 2000 || cat.e[k] > 0.05) continue;
      idx.push(k);
    }
    this.idx = Int32Array.from(idx);
    this.n = idx.length;
    this.pts = new Float32Array(2 * this.n);
    this.near = new Uint8Array(this.n);
    this.move(0);
    // The query: the object with the busiest neighbourhood at the snapshot.
    const cell = (v: number) => Math.floor(v / CELL);
    const counts = new Map<string, number>();
    for (let k = 0; k < this.n; k++) {
      const key = `${cell(this.pts[2 * k])},${cell(this.pts[2 * k + 1])}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    let best = 0;
    let bestN = -1;
    for (let k = 0; k < this.n; k++) {
      const cx = cell(this.pts[2 * k]);
      const cy = cell(this.pts[2 * k + 1]);
      // Keep it off the pole's crowd so the fan reads from one side.
      if (Math.hypot(this.pts[2 * k], this.pts[2 * k + 1]) < RE * 0.75)
        continue;
      let sum = 0;
      for (let dx = -1; dx <= 1; dx++)
        for (let dy = -1; dy <= 1; dy++)
          sum += counts.get(`${cx + dx},${cy + dy}`) ?? 0;
      if (sum > bestN) {
        bestN = sum;
        best = k;
      }
    }
    this.query = best;
  }

  /** Positions `t` seconds after the snapshot, and who shares the query's 3 × 3 cells. */
  private move(t: number) {
    const cat = this.cat as Catalog;
    const pos = new Float64Array(3);
    for (let k = 0; k < this.n; k++) {
      orbitPosition(cat, this.idx[k], t, pos);
      this.pts[2 * k] = pos[0];
      this.pts[2 * k + 1] = pos[1];
    }
    const cell = (v: number) => Math.floor(v / CELL);
    const qx = cell(this.pts[2 * this.query]);
    const qy = cell(this.pts[2 * this.query + 1]);
    for (let k = 0; k < this.n; k++) {
      this.near[k] =
        Math.abs(cell(this.pts[2 * k]) - qx) <= 1 &&
        Math.abs(cell(this.pts[2 * k + 1]) - qy) <= 1
          ? 1
          : 0;
    }
  }

  update(f: Field, fr: Frame) {
    if (this.size.changed(fr)) this.layout(f, fr);
    const step = stepAt(fr.progress, STEP_AT);
    this.step = step;
    this.steps.set(step);
    if (this.n) {
      if (!fr.reduced) this.t += fr.dt * WARP;
      this.move(this.t);
    }
    const cx = fr.visual.x + this.centre.x;
    const cy = fr.visual.y + this.centre.y;
    const s = this.centre.s;
    const boost = this.ink ? 1 : 1.25;
    for (let i = 0; i < f.n; i++) {
      if (i >= this.n) {
        dust(f, i, fr, 0.08);
        continue;
      }
      f.gx[i] = cx + this.pts[2 * i] * s;
      f.gy[i] = cy - this.pts[2 * i + 1] * s;
      const q = i === this.query;
      let a = 0.55 + f.r3[i] * 0.3;
      let tint = 0;
      if (q && step >= 1) {
        a = 1;
        tint = 1;
      } else if (step >= 3) {
        a *= this.near[i] ? 1 : 0.25;
        tint = this.near[i] ? 0.6 : 0;
      }
      f.ga[i] = Math.min(1, a * boost);
      f.gh[i] = tint;
      f.gz[i] = q && step >= 1 ? 4 : fr.compact ? 1.1 : 1.3;
      f.gj[i] = 0;
    }
    this.readouts.write("pairs", step >= 3 ? HASHED : ALL);
    this.readouts.write("share", step >= 3 ? SHARE : "100%");
  }

  draw(ctx: CanvasRenderingContext2D, fr: Frame, palette: Palette) {
    this.ink = palette.ink;
    if (!this.n) return;
    const cx = fr.visual.x + this.centre.x;
    const cy = fr.visual.y + this.centre.y;
    const s = this.centre.s;
    const step = this.step;
    const size = fr.compact ? 9 : 10;
    const qx = cx + this.pts[2 * this.query] * s;
    const qy = cy - this.pts[2 * this.query + 1] * s;

    ctx.lineWidth = 1;
    ctx.strokeStyle = rgba(palette.muted, 0.3);
    ctx.beginPath();
    ctx.arc(cx, cy, RE * s, 0, TAU);
    ctx.stroke();
    label(ctx, palette, "Earth", cx, cy + RE * s - 12, {
      size,
      align: "center",
      alpha: 0.6,
    });

    if (step === 1 || step === 2) {
      ctx.strokeStyle = rgba(palette.accent, this.ink ? 0.05 : 0.07);
      ctx.beginPath();
      for (let k = 0; k < this.n; k++) {
        if (k === this.query) continue;
        ctx.moveTo(qx, qy);
        ctx.lineTo(cx + this.pts[2 * k] * s, cy - this.pts[2 * k + 1] * s);
      }
      ctx.stroke();
    }
    if (step >= 2) {
      // The grid, aligned to Earth's centre as the engine's floor(x / cell) is.
      const px = CELL * s;
      const n = Math.ceil(REACH / CELL);
      ctx.strokeStyle = rgba(palette.muted, 0.14);
      ctx.beginPath();
      for (let k = -n; k <= n; k++) {
        ctx.moveTo(cx + k * px, cy - n * px);
        ctx.lineTo(cx + k * px, cy + n * px);
        ctx.moveTo(cx - n * px, cy + k * px);
        ctx.lineTo(cx + n * px, cy + k * px);
      }
      ctx.stroke();
      const gx = Math.floor(this.pts[2 * this.query] / CELL);
      const gy = Math.floor(this.pts[2 * this.query + 1] / CELL);
      const span = step >= 3 ? 1 : 0;
      ctx.strokeStyle = rgba(palette.accent, 0.85);
      ctx.strokeRect(
        cx + (gx - span) * px,
        cy - (gy + 1 + span) * px,
        (2 * span + 1) * px,
        (2 * span + 1) * px,
      );
      if (step >= 3) {
        // The half of the neighbourhood a cell searches: the rest search it.
        ctx.fillStyle = rgba(palette.accent, this.ink ? 0.13 : 0.1);
        for (const [dx, dy] of AHEAD) {
          ctx.fillRect(cx + (gx + dx) * px, cy - (gy + dy + 1) * px, px, px);
        }
        label(
          ctx,
          palette,
          "own cell + 13 ahead",
          cx + (gx + 2) * px + 6,
          cy - (gy + 1.5) * px,
          {
            size,
            color: palette.accent,
          },
        );
      }
      if (step === 2) {
        label(
          ctx,
          palette,
          "485 km",
          cx + (gx + 1) * px + 6,
          cy - (gy + 0.5) * px,
          {
            size,
            color: palette.accent,
          },
        );
      }
    }
    if (step >= 1) {
      const glow = ctx.createRadialGradient(qx, qy, 0, qx, qy, 18);
      glow.addColorStop(0, rgba(palette.accent, 0.55));
      glow.addColorStop(1, rgba(palette.accent, 0));
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(qx, qy, 18, 0, TAU);
      ctx.fill();
    }
    if (step >= 3) {
      const gx = Math.floor(this.pts[2 * this.query] / CELL);
      const gy = Math.floor(this.pts[2 * this.query + 1] / CELL);
      const ahead = (k: number) => {
        const dx = Math.floor(this.pts[2 * k] / CELL) - gx;
        const dy = Math.floor(this.pts[2 * k + 1] / CELL) - gy;
        return AHEAD.some(([ax, ay]) => ax === dx && ay === dy);
      };
      for (const mine of [true, false]) {
        ctx.strokeStyle = rgba(palette.accent, mine ? 0.65 : 0.18);
        ctx.beginPath();
        for (let k = 0; k < this.n; k++) {
          if (!this.near[k] || k === this.query || ahead(k) !== mine) continue;
          ctx.moveTo(qx, qy);
          ctx.lineTo(cx + this.pts[2 * k] * s, cy - this.pts[2 * k + 1] * s);
        }
        ctx.stroke();
      }
    }
    resetText(ctx);
  }
}
