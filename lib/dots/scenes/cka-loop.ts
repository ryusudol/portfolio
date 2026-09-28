import {
  INK_RAMP,
  LAYERS,
  PAPER_RAMP,
  rampClass,
  shareByValue,
  similarity,
} from "../cka-data";
import { clamp, gauss, lerp, rgba, smoothstep, TAU } from "../math";
import { dust } from "../shapes";
import { fmt, freeArea, label, Readouts, resetText } from "../story";
import type { Field, Frame, Palette, Scene } from "../types";

const CELLS = LAYERS * LAYERS;
/** The first pairs run slowly enough to read, then the loop settles into its pace. */
const SLOW = 3;
const SLOW_DUR = 1.6;
const DUR = 0.46;
const HOLD = 3;
const CYCLE = SLOW * SLOW_DUR + (CELLS - SLOW) * DUR + HOLD;
/** Lattice points per cube edge: the B × B × B multiply-adds of K @ L. */
const G = 6;
const PAPER_SIZE = 1.3;
const PAPER_ALPHA = 1.25;

const CORNERS: [number, number, number][] = [
  [-1, -1, -1],
  [1, -1, -1],
  [1, 1, -1],
  [-1, 1, -1],
  [-1, -1, 1],
  [1, -1, 1],
  [1, 1, 1],
  [-1, 1, 1],
];
const EDGES: [number, number][] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 0],
  [4, 5],
  [5, 6],
  [6, 7],
  [7, 4],
  [0, 4],
  [1, 5],
  [2, 6],
  [3, 7],
];

/** Which pair the loop is on at `clock`, and how far through it (0–1). */
function pairAt(clock: number) {
  const t = clock % CYCLE;
  const slow = SLOW * SLOW_DUR;
  if (t < slow) {
    const k = Math.floor(t / SLOW_DUR);
    return { k, u: (t - k * SLOW_DUR) / SLOW_DUR };
  }
  const k = SLOW + Math.floor((t - slow) / DUR);
  if (k >= CELLS) return { k: CELLS, u: 0 };
  return { k, u: (t - slow - (k - SLOW) * DUR) / DUR };
}

/**
 * torch_cka's inner loop, running: one layer pair at a time, each pair a full
 * B × B × B cube of multiply-adds for trace(K @ L) that collapses into a
 * single cell, followed by three GPU→CPU syncs. The 18 × 18 map fills in
 * reading order, slowly.
 */
export class LoopScene implements Scene {
  private values = similarity();
  private cellOf = new Uint16Array(0);
  private heatN = 0;
  private cubeN = 0;
  private edgeN = 0;
  private box = { x: 0, y: 0, size: 0 };
  private clock = 0;
  private k = 0;
  private u = 0;
  private readouts = new Readouts();
  private ink = true;

  layout(f: Field, fr: Frame) {
    const area = freeArea(fr, fr.compact ? 18 : 52);
    const gutter = fr.compact ? 18 : 30;
    const size = Math.min(area.w * 0.86, area.h - gutter);
    this.box = {
      x: area.x + (area.w - size) / 2,
      y: area.y + (area.h - size) / 2 + gutter / 2,
      size,
    };
    this.heatN = Math.round(f.n * 0.5);
    this.cubeN = Math.round(f.n * 0.13);
    this.edgeN = Math.round(f.n * 0.045);
    this.cellOf = shareByValue(this.values, this.heatN);
    this.readouts.collect(fr.section);
    this.clock = 0;
  }

  private cellCenter(c: number, fr: Frame, out: [number, number]) {
    const cell = this.box.size / LAYERS;
    out[0] = fr.visual.x + this.box.x + ((c % LAYERS) + 0.5) * cell;
    out[1] = fr.visual.y + this.box.y + (Math.floor(c / LAYERS) + 0.5) * cell;
    return out;
  }

  update(f: Field, fr: Frame) {
    if (fr.reduced) this.clock = SLOW * SLOW_DUR + 38 * DUR + DUR * 0.45;
    else this.clock += fr.dt;
    const { k, u } = pairAt(this.clock);
    this.k = k;
    this.u = u;

    const cell = this.box.size / LAYERS;
    const left = fr.visual.x + this.box.x;
    const top = fr.visual.y + this.box.y;
    const done = Math.min(CELLS, k + (u > 0.8 ? 1 : 0));
    const grow = this.ink ? 1 : PAPER_SIZE;
    const boost = this.ink ? 1 : PAPER_ALPHA;
    f.classColors = this.ink ? INK_RAMP : PAPER_RAMP;

    // The cube travels from the previous pair to this one, builds slice by
    // slice, then collapses into the cell.
    const here: [number, number] = [0, 0];
    const prev: [number, number] = [0, 0];
    this.cellCenter(Math.min(k, CELLS - 1), fr, here);
    this.cellCenter(Math.max(0, Math.min(k, CELLS - 1) - 1), fr, prev);
    const travel = k === 0 ? 1 : smoothstep(0, 0.16, u);
    const cx = lerp(prev[0], here[0], travel);
    const cy = lerp(prev[1], here[1], travel);
    const fill = k >= CELLS ? 0 : smoothstep(0.1, 0.58, u);
    const squash = k >= CELLS ? 1 : smoothstep(0.6, 0.8, u);
    const yaw = fr.reduced ? 0.7 : fr.time * 1.1;
    const pitch = 0.55;
    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);
    const cosP = Math.cos(pitch);
    const sinP = Math.sin(pitch);
    const half = cell * (fr.compact ? 1.5 : 1.75);

    const place = (
      i: number,
      x: number,
      y: number,
      z: number,
      alpha: number,
      tint: number,
      cellU: number,
      cellV: number,
    ) => {
      const x1 = x * cosY - z * sinY;
      const z1 = x * sinY + z * cosY;
      const y2 = y * cosP - z1 * sinP;
      const z2 = y * sinP + z1 * cosP;
      const depth = 0.6 + 0.4 * (1 - (z2 + 1.7) / 3.4);
      const sx = cx + x1 * half;
      const sy = cy + y2 * half;
      // Collapsing: every multiply-add lands inside the one cell it produces.
      const tx = here[0] + (cellU - 0.5) * cell * 0.9;
      const ty = here[1] + (cellV - 0.5) * cell * 0.9;
      f.gx[i] = lerp(sx, tx, squash);
      f.gy[i] = lerp(sy, ty, squash);
      f.ga[i] = alpha * lerp(depth, 0.4, squash) * (1 - squash * 0.7) * boost;
      f.gh[i] = tint;
    };

    const heatEnd = this.heatN;
    const cubeEnd = heatEnd + this.cubeN;
    const edgeEnd = cubeEnd + this.edgeN;
    const lattice = G * G * G;
    const step = 2 / (G - 1);

    for (let i = 0; i < f.n; i++) {
      if (i < heatEnd) {
        const c = this.cellOf[i];
        const col = c % LAYERS;
        const row = Math.floor(c / LAYERS);
        if (!this.ink) f.gz[i] = f.size[i] * grow;
        if (c < done) {
          f.gx[i] = left + (col + 0.1 + f.r1[i] * 0.8) * cell;
          f.gy[i] = top + (row + 0.1 + f.r2[i] * 0.8) * cell;
          f.ga[i] = Math.min(1, (0.6 + this.values[c] * 0.35) * boost);
          f.gh[i] = 0;
          f.gc[i] = rampClass(this.values[c], f.r0[i]);
        } else {
          // Still to do: one faint dot per pair.
          const j = 0.05 * cell;
          f.gx[i] = left + (col + 0.5) * cell + gauss(f.r1[i], f.r2[i]) * j;
          f.gy[i] = top + (row + 0.5) * cell + gauss(f.r2[i], f.r3[i]) * j;
          f.ga[i] = 0.08 * boost;
          f.gh[i] = 0;
        }
        continue;
      }
      if (i < cubeEnd) {
        const p = (i - heatEnd) % lattice;
        const a = p % G;
        const b = Math.floor(p / G) % G;
        const c = Math.floor(p / (G * G));
        const shown = c < fill * G ? 1 : 0;
        const j = 0.035 * gauss(f.r1[i], f.r2[i]);
        place(
          i,
          -1 + a * step + j,
          -1 + b * step + j,
          -1 + c * step + j,
          (0.28 + f.r3[i] * 0.3) * shown,
          0.35,
          f.r1[i],
          f.r2[i],
        );
        continue;
      }
      if (i < edgeEnd) {
        const e = (i - cubeEnd) % EDGES.length;
        const [from, to] = EDGES[e];
        const t = f.r0[i];
        const A = CORNERS[from];
        const B = CORNERS[to];
        // Edges fold down onto the cell's outline.
        const side = e % 4;
        const cu = side === 0 ? t : side === 1 ? 1 : side === 2 ? 1 - t : 0;
        const cv = side === 0 ? 0 : side === 1 ? t : side === 2 ? 1 : 1 - t;
        place(
          i,
          A[0] + (B[0] - A[0]) * t,
          A[1] + (B[1] - A[1]) * t,
          A[2] + (B[2] - A[2]) * t,
          k >= CELLS ? 0 : 0.85 * smoothstep(0, 0.12, fill + 0.04),
          0.9,
          cu,
          cv,
        );
        continue;
      }
      dust(f, i, fr, 0.12);
    }

    // Pairs finished, trace(K @ L) products formed, and `.item()` syncs so far:
    // each row starts with HSIC(K, K); each pair runs HSIC(K, L) and HSIC(L, L).
    const rows = done >= CELLS ? LAYERS : Math.floor(done / LAYERS) + 1;
    const calls = rows + 2 * done;
    this.readouts.write("pairs", `${done} / ${CELLS}`);
    this.readouts.write("products", fmt(calls));
    this.readouts.write("syncs", fmt(calls * 3));
    const current = Math.min(k, CELLS - 1);
    this.readouts.write("i", String(Math.floor(current / LAYERS)));
    this.readouts.write("j", String(current % LAYERS));
  }

  draw(ctx: CanvasRenderingContext2D, fr: Frame, palette: Palette) {
    this.ink = palette.ink;
    const cell = this.box.size / LAYERS;
    const left = fr.visual.x + this.box.x;
    const top = fr.visual.y + this.box.y;
    const size = this.box.size;
    const off = fr.compact ? 12 : 16;

    // Axis names sit bottom and right, away from where the loop starts.
    label(ctx, palette, "model B layer  j →", left, top + size + off, {
      size: fr.compact ? 9 : 10,
    });
    ctx.save();
    ctx.translate(left + size + off, top);
    ctx.rotate(Math.PI / 2);
    label(ctx, palette, "model A layer  i →", 0, 0, {
      size: fr.compact ? 9 : 10,
    });
    ctx.restore();

    if (this.k >= CELLS) {
      resetText(ctx);
      return;
    }
    const here: [number, number] = [0, 0];
    this.cellCenter(this.k, fr, here);
    const u = this.u;
    const onRight = this.k % LAYERS < LAYERS - 4;
    const tx = here[0] + (onRight ? cell * 2.3 : -cell * 2.3);
    const align = onRight ? "left" : "right";

    const build = smoothstep(0.1, 0.2, u) * (1 - smoothstep(0.62, 0.72, u));
    label(ctx, palette, "K @ L, L @ L  ·  B³ each", tx, here[1] - cell * 1.2, {
      align,
      alpha: build * 0.9,
      color: palette.fg,
    });

    // Two HSIC calls, three `.item()` each: the GPU waits on Python six times.
    const sync = smoothstep(0.78, 0.82, u);
    if (sync > 0) {
      label(ctx, palette, ".item() ×6", tx, here[1], {
        align,
        alpha: sync * 0.95,
        color: palette.accent,
      });
      for (let r = 0; r < 6; r++) {
        const t0 = 0.8 + r * 0.032;
        const life = clamp((u - t0) / 0.06);
        if (life <= 0 || life >= 1) continue;
        ctx.beginPath();
        ctx.arc(here[0], here[1], cell * (0.6 + life * 1.4), 0, TAU);
        ctx.strokeStyle = rgba(palette.accent, 0.7 * (1 - life));
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
    // A faint frame around the whole map, so unfinished pairs read as work left.
    ctx.strokeStyle = rgba(palette.muted, 0.14);
    ctx.lineWidth = 1;
    ctx.strokeRect(left - 0.5, top - 0.5, size + 1, size + 1);
    resetText(ctx);
  }
}
