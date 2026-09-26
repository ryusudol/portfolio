import { clamp, mulberry32, rgba, smoothstep } from "../math";
import { dust } from "../shapes";
import type { Field, Frame, Palette, Scene } from "../types";

/** ResNet-18's layers: stem, four stages of four convs, and the classifier. */
const LAYERS = 18;

/**
 * Relative layer-by-layer CKA for ResNet-18 on CIFAR-10 (0 = least similar
 * pair, 1 = a layer with itself), traced from a real run. Row 0 is `conv1`,
 * row 17 is `fc`. Each stage's layers agree with one another, and early layers
 * share little with the deepest ones.
 */
// biome-ignore format: one row per layer keeps the grid readable
const TRACED = [
  [1.00, 0.52, 0.71, 0.43, 0.40, 0.37, 0.24, 0.27, 0.14, 0.24, 0.18, 0.09, 0.01, 0.08, 0.00, 0.10, 0.05, 0.00],
  [0.52, 1.00, 0.87, 0.83, 0.46, 0.49, 0.49, 0.51, 0.33, 0.44, 0.32, 0.25, 0.11, 0.22, 0.14, 0.18, 0.15, 0.06],
  [0.71, 0.87, 1.00, 0.68, 0.53, 0.56, 0.48, 0.53, 0.34, 0.43, 0.32, 0.23, 0.10, 0.21, 0.10, 0.19, 0.14, 0.05],
  [0.43, 0.83, 0.68, 1.00, 0.69, 0.70, 0.60, 0.61, 0.43, 0.53, 0.44, 0.32, 0.19, 0.29, 0.19, 0.26, 0.26, 0.21],
  [0.40, 0.46, 0.53, 0.69, 1.00, 0.70, 0.51, 0.55, 0.39, 0.46, 0.34, 0.23, 0.13, 0.21, 0.11, 0.18, 0.16, 0.09],
  [0.37, 0.49, 0.56, 0.70, 0.70, 1.00, 0.61, 0.59, 0.40, 0.35, 0.21, 0.17, 0.06, 0.14, 0.05, 0.06, 0.05, 0.01],
  [0.24, 0.49, 0.48, 0.60, 0.51, 0.61, 1.00, 0.88, 0.61, 0.63, 0.48, 0.46, 0.26, 0.36, 0.26, 0.22, 0.21, 0.14],
  [0.27, 0.51, 0.53, 0.61, 0.55, 0.59, 0.88, 1.00, 0.83, 0.69, 0.50, 0.47, 0.28, 0.36, 0.24, 0.22, 0.21, 0.15],
  [0.14, 0.33, 0.34, 0.43, 0.39, 0.40, 0.61, 0.83, 1.00, 0.65, 0.48, 0.49, 0.34, 0.36, 0.26, 0.20, 0.19, 0.10],
  [0.24, 0.44, 0.43, 0.53, 0.46, 0.35, 0.63, 0.69, 0.65, 1.00, 0.90, 0.71, 0.48, 0.63, 0.46, 0.49, 0.46, 0.34],
  [0.18, 0.32, 0.32, 0.44, 0.34, 0.21, 0.48, 0.50, 0.48, 0.90, 1.00, 0.85, 0.55, 0.83, 0.58, 0.66, 0.62, 0.49],
  [0.09, 0.25, 0.23, 0.32, 0.23, 0.17, 0.46, 0.47, 0.49, 0.71, 0.85, 1.00, 0.83, 0.86, 0.65, 0.57, 0.54, 0.42],
  [0.01, 0.11, 0.10, 0.19, 0.13, 0.06, 0.26, 0.28, 0.34, 0.48, 0.55, 0.83, 1.00, 0.69, 0.65, 0.49, 0.49, 0.37],
  [0.08, 0.22, 0.21, 0.29, 0.21, 0.14, 0.36, 0.36, 0.36, 0.63, 0.83, 0.86, 0.69, 1.00, 0.91, 0.71, 0.65, 0.54],
  [0.00, 0.14, 0.10, 0.19, 0.11, 0.05, 0.26, 0.24, 0.26, 0.46, 0.58, 0.65, 0.65, 0.91, 1.00, 0.69, 0.65, 0.53],
  [0.10, 0.18, 0.19, 0.26, 0.18, 0.06, 0.22, 0.22, 0.20, 0.49, 0.66, 0.57, 0.49, 0.71, 0.69, 1.00, 0.90, 0.65],
  [0.05, 0.15, 0.14, 0.26, 0.16, 0.05, 0.21, 0.21, 0.19, 0.46, 0.62, 0.54, 0.49, 0.65, 0.65, 0.90, 1.00, 0.88],
  [0.00, 0.06, 0.05, 0.21, 0.09, 0.01, 0.14, 0.15, 0.10, 0.34, 0.49, 0.42, 0.37, 0.54, 0.53, 0.65, 0.88, 1.00],
];

/**
 * Maps the traced map onto the drawn scale, with slight per-cell jitter so the
 * two networks' maps are not a perfect mirror image of each other.
 */
function similarity() {
  const rand = mulberry32(18);
  const values = new Float32Array(LAYERS * LAYERS);
  for (let a = 0; a < LAYERS; a++) {
    for (let b = 0; b < LAYERS; b++) {
      const v = 0.05 + TRACED[a][b] * 0.88 + (rand() - 0.5) * 0.04;
      values[a * LAYERS + b] = clamp(v, 0.03, 0.95);
    }
  }
  return values;
}

/**
 * Layer-wise representation similarity, drawn as a stippled heatmap laid out
 * like a plot: layer 1 sits at the bottom-left corner and depth grows rightward
 * and upward. Each network's layers start as activations along its axis
 * (bottom for seed B, left for seed A); scrolling
 * compares them pair by pair, and each pair settles into its cell — denser and
 * warmer where the two networks see the input the same way. Every cell keeps a
 * base of plain dots and trades them for accent dots as similarity rises, so
 * the whole map reads, not just its diagonal.
 */
export class SimilarityScene implements Scene {
  private values = similarity();
  private cellOf = new Uint16Array(0);
  private heatN = 0;
  private box = { x: 0, y: 0, size: 0 };
  /** Distances out from the plot edge: waiting band, tick numbers, title. */
  private gutter = { band: 8, spread: 14, tick: 34, title: 54 };
  private hover = -1;
  private counter: HTMLElement | null = null;
  private shown = -1;

  layout(f: Field, fr: Frame) {
    const { w, h } = fr.visual;
    this.gutter = fr.compact
      ? { band: 6, spread: 10, tick: 25, title: 41 }
      : { band: 8, spread: 14, tick: 34, title: 54 };
    const size = Math.min(w * 0.78, h - (fr.compact ? 100 : 160));
    this.box = {
      x: (w - size) / 2 + size * 0.04,
      y: (h - size) / 2 - (fr.compact ? 34 : 56),
      size,
    };

    // Share particles among cells by similarity, so density reads as value.
    this.heatN = Math.round(f.n * 0.88);
    const cells = LAYERS * LAYERS;
    const cumulative = new Float32Array(cells);
    let total = 0;
    for (let c = 0; c < cells; c++) {
      total += 0.35 + this.values[c] ** 1.2;
      cumulative[c] = total;
    }
    this.cellOf = new Uint16Array(this.heatN);
    let c = 0;
    for (let i = 0; i < this.heatN; i++) {
      const t = ((i + 0.5) / this.heatN) * total;
      while (c < cells - 1 && cumulative[c] < t) c++;
      this.cellOf[i] = c;
    }
    this.counter = fr.section.querySelector<HTMLElement>(
      '[data-counter="pairs"]',
    );
    this.shown = -1;
    // Pin the readout just under the heatmap's axis title.
    const below =
      this.box.y + this.box.size + this.gutter.title + (fr.compact ? 14 : 18);
    fr.section.style.setProperty("--below", `${below.toFixed(1)}px`);
  }

  update(f: Field, fr: Frame) {
    const { x: vx, y: vy } = fr.visual;
    const { x: bx, y: by, size } = this.box;
    const cell = size / LAYERS;
    const left = vx + bx;
    const top = vy + by;
    const bottom = top + size;
    const { band, spread } = this.gutter;
    const cells = LAYERS * LAYERS;
    const computed = Math.floor(smoothstep(0.04, 0.78, fr.progress) * cells);
    const ptr = fr.pointer;

    this.hover = -1;
    if (ptr.active) {
      const col = Math.floor((ptr.x - left) / cell);
      const row = Math.floor((bottom - ptr.y) / cell);
      if (col >= 0 && col < LAYERS && row >= 0 && row < LAYERS) {
        const c = row * LAYERS + col;
        if (c < computed) this.hover = c;
      }
    }

    for (let i = 0; i < f.n; i++) {
      if (i >= this.heatN) {
        dust(f, i, fr, 0.12);
        continue;
      }
      const c = this.cellOf[i];
      const row = Math.floor(c / LAYERS);
      const col = c % LAYERS;
      const v = this.values[c];

      if (c < computed) {
        f.gx[i] = left + (col + 0.1 + f.r1[i] * 0.8) * cell;
        f.gy[i] = bottom - (row + 0.1 + f.r2[i] * 0.8) * cell;
        f.ga[i] = (0.6 + v * 0.35) * (this.hover === c ? 1.3 : 1);
        f.gh[i] = f.r0[i] < smoothstep(0.25, 0.9, v) ? 1 : 0;
        continue;
      }

      // Not compared yet: waiting as activations on either network's axis.
      const fromBottom = f.r3[i] < 0.5;
      const along = (fromBottom ? col : row) + 0.5 + (f.r1[i] - 0.5) * 0.7;
      const out = band + f.r2[i] * spread;
      f.gx[i] = fromBottom ? left + along * cell : left - out;
      f.gy[i] = fromBottom ? bottom + out : bottom - along * cell;
      f.ga[i] = 0.22 + f.r0[i] * 0.3;
      f.gh[i] = 0;
    }

    if (computed !== this.shown && this.counter) {
      this.shown = computed;
      this.counter.textContent = `${computed} / ${cells}`;
    }
  }

  draw(ctx: CanvasRenderingContext2D, fr: Frame, palette: Palette) {
    const { x: vx, y: vy } = fr.visual;
    const { x: bx, y: by, size } = this.box;
    const cell = size / LAYERS;
    const left = vx + bx;
    const top = vy + by;
    const bottom = top + size;
    const { tick, title } = this.gutter;

    ctx.font = `9.5px ${palette.mono}`;
    ctx.fillStyle = rgba(palette.muted, 0.85);
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    for (const l of [1, 6, 10, 14, 18]) {
      ctx.fillText(String(l), left + (l - 0.5) * cell, bottom + tick);
      ctx.fillText(String(l), left - tick, bottom - (l - 0.5) * cell);
    }
    ctx.fillText("ResNet-18 · seed B", left + size / 2, bottom + title);
    ctx.save();
    ctx.translate(left - title, top + size / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("ResNet-18 · seed A", 0, 0);
    ctx.restore();

    if (this.hover >= 0) {
      const row = Math.floor(this.hover / LAYERS);
      const col = this.hover % LAYERS;
      ctx.strokeStyle = rgba(palette.fg, 0.8);
      ctx.lineWidth = 1;
      ctx.strokeRect(left + col * cell, bottom - (row + 1) * cell, cell, cell);
      ctx.fillStyle = rgba(palette.fg, 0.95);
      ctx.font = `10px ${palette.mono}`;
      const label = `A·L${row + 1} × B·L${col + 1}  CKA ${this.values[this.hover].toFixed(2)}`;
      const onRight = col < LAYERS / 2;
      ctx.textAlign = onRight ? "left" : "right";
      const x = onRight ? left + (col + 1) * cell + 8 : left + col * cell - 8;
      ctx.fillText(label, x, bottom - (row + 0.5) * cell);
    }
    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";
  }
}
