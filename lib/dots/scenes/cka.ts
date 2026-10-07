import { clamp, gauss, smoothstep } from "../math";
import { dust } from "../shapes";
import type { Field, Frame, Palette, Scene } from "../types";

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

/** Retained GPU memory vs. the baseline library (−95.7%). */
const RETAINED = 0.043;
/** Dark dots on paper read fainter than light dots on ink. */
const PAPER_BOOST = 1.7;

/**
 * O(B³) → O(B²): a lattice cube of work flattens into a single plane as you
 * scroll, then most of the dots let go — the memory CKA no longer holds on to.
 */
export class CkaScene implements Scene {
  private grid = 10;
  private latticeN = 0;
  private edgeN = 0;
  private yaw = 0;
  private counters: Record<string, HTMLElement> = {};
  private shown: Record<string, string> = {};
  private ink = true;

  layout(f: Field, fr: Frame) {
    this.grid = fr.compact ? 8 : 10;
    this.latticeN = Math.round(f.n * 0.6);
    this.edgeN = Math.round(f.n * 0.2);
    this.counters = {};
    this.shown = {};
    for (const el of fr.section.querySelectorAll<HTMLElement>(
      "[data-counter]",
    )) {
      this.counters[el.dataset.counter ?? ""] = el;
    }
  }

  private write(key: string, value: string) {
    const el = this.counters[key];
    if (!el || this.shown[key] === value) return;
    this.shown[key] = value;
    el.textContent = value;
  }

  update(f: Field, fr: Frame) {
    const { x: vx, y: vy, w, h } = fr.visual;
    const p = fr.progress;
    const collapse = smoothstep(0.16, 0.52, p);
    const release = smoothstep(0.6, 0.9, p);
    const keep = 1 - release * (1 - RETAINED);

    const cx = vx + w / 2;
    const cy = vy + h / 2;
    const ptr = fr.pointer;
    const lean = ptr.active
      ? clamp((ptr.x - cx) / Math.max(w, 1), -0.5, 0.5)
      : 0;
    if (!fr.reduced) this.yaw += fr.dt * 0.22;
    const yaw = this.yaw + lean * 1.2;
    const tiltBack = ptr.active
      ? clamp((ptr.y - cy) / Math.max(h, 1), -0.5, 0.5)
      : 0;
    const pitch = 0.5 + tiltBack * 0.4;
    const size = Math.min(w, h) * (fr.compact ? 0.3 : 0.27);
    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);
    const cosP = Math.cos(pitch);
    const sinP = Math.sin(pitch);
    const G = this.grid;
    const cells = G * G * G;
    const squash = 1 - collapse;
    const boost = this.ink ? 1 : PAPER_BOOST;

    const project = (
      i: number,
      x: number,
      y: number,
      z: number,
      alpha: number,
      tint: number,
    ) => {
      const yy = y * squash;
      const x1 = x * cosY - z * sinY;
      const z1 = x * sinY + z * cosY;
      const y2 = yy * cosP - z1 * sinP;
      const z2 = yy * sinP + z1 * cosP;
      const persp = 4 / (4 + z2);
      const depth = 0.55 + 0.45 * (1 - (z2 + 1.7) / 3.4);
      let sx = cx + x1 * size * persp;
      let sy = cy + y2 * size * persp;
      let a = Math.min(1, alpha * depth * boost);
      // Lattice work is released; the cube's edges stay to outline the plane.
      if (i < this.latticeN && f.r3[i] > keep) {
        const drift = release * 140 * (0.4 + f.r1[i]);
        sx += (f.r0[i] - 0.5) * drift * 2;
        sy -= drift;
        a = 0;
      }
      f.gx[i] = sx;
      f.gy[i] = sy;
      f.ga[i] = a;
      f.gh[i] = tint;
    };

    for (let i = 0; i < f.n; i++) {
      if (i < this.latticeN) {
        const cell = i % cells;
        const a = cell % G;
        const b = Math.floor(cell / G) % G;
        const c = Math.floor(cell / (G * G));
        const step = 2 / (G - 1);
        const j = 0.012 * gauss(f.r1[i], f.r2[i]);
        project(
          i,
          -1 + a * step + j,
          -1 + b * step + j,
          -1 + c * step + j,
          0.28 + f.r3[i] * 0.3 + collapse * 0.25,
          collapse * (b === 0 || b === G - 1 ? 0.2 : 0.05),
        );
      } else if (i < this.latticeN + this.edgeN) {
        const [from, to] = EDGES[i % EDGES.length];
        const t = f.r0[i];
        const A = CORNERS[from];
        const B = CORNERS[to];
        const g = gauss(f.r1[i], f.r2[i]) * 0.006;
        project(
          i,
          A[0] + (B[0] - A[0]) * t + g,
          A[1] + (B[1] - A[1]) * t + g,
          A[2] + (B[2] - A[2]) * t + g,
          0.85,
          collapse * 0.9,
        );
      } else {
        dust(f, i, fr, 0.12);
      }
    }

    this.write("order", collapse > 0.5 ? "O(B²)" : "O(B³)");
    this.write("speed", `${(1 + 5.8 * collapse).toFixed(1)}×`);
    this.write(
      "memory",
      `${(100 - (100 - RETAINED * 100) * release).toFixed(1)}%`,
    );
  }

  draw(_ctx: CanvasRenderingContext2D, _fr: Frame, palette: Palette) {
    this.ink = palette.ink;
  }
}
