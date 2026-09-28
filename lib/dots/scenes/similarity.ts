import {
  INK_RAMP,
  LAYERS,
  PAPER_RAMP,
  rampClass,
  shareByValue,
  similarity,
} from "../cka-data";
import { smoothstep } from "../math";
import { dust } from "../shapes";
import { axisGutter, cellReadout, layerAxes, resetText } from "../story";
import type { Field, Frame, Palette, Scene } from "../types";

/** Dark dots on paper cover less than light dots on ink, so draw them bigger. */
const PAPER_SIZE = 1.3;
const PAPER_ALPHA = 1.25;

/**
 * Layer-wise representation similarity, drawn as a stippled heatmap laid out
 * like a plot: layer 1 sits at the bottom-left corner and depth grows rightward
 * and upward. Each network's layers start as activations along its axis
 * (bottom for seed B, left for seed A); scrolling
 * compares them pair by pair, and each pair settles into its cell — denser and
 * further along inferno where the two networks see the input the same way.
 * Per-dot jitter dithers neighbouring colour steps, so the scale reads as
 * continuous.
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
  private ink = true;

  layout(f: Field, fr: Frame) {
    const { w, h } = fr.visual;
    this.gutter = {
      ...(fr.compact ? { band: 6, spread: 10 } : { band: 8, spread: 14 }),
      ...axisGutter(fr.compact),
    };
    const size = Math.min(w * 0.78, h - (fr.compact ? 100 : 160));
    this.box = {
      x: (w - size) / 2 + size * 0.04,
      y: (h - size) / 2 - (fr.compact ? 34 : 56),
      size,
    };

    // Share particles among cells by similarity, so density reads as value.
    this.heatN = Math.round(f.n * 0.88);
    this.cellOf = shareByValue(this.values, this.heatN);
    this.counter = fr.section.querySelector<HTMLElement>(
      '[data-counter="pairs"]',
    );
    this.shown = -1;
    // Pin the readout just under the heatmap's axis title.
    const below =
      this.box.y + this.box.size + this.gutter.title + (fr.compact ? 26 : 36);
    fr.section.style.setProperty("--below", `${below.toFixed(1)}px`);
  }

  /** Hold the map still under the pointer so a hovered cell can be read. */
  repels(fr: Frame) {
    const { x, y, size } = this.box;
    const px = fr.pointer.x - fr.visual.x - x;
    const py = fr.pointer.y - fr.visual.y - y;
    return px < 0 || py < 0 || px > size || py > size;
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
    const grow = this.ink ? 1 : PAPER_SIZE;
    const boost = this.ink ? 1 : PAPER_ALPHA;
    f.classColors = this.ink ? INK_RAMP : PAPER_RAMP;

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
      if (!this.ink) f.gz[i] = f.size[i] * grow;

      if (c < computed) {
        f.gx[i] = left + (col + 0.1 + f.r1[i] * 0.8) * cell;
        f.gy[i] = bottom - (row + 0.1 + f.r2[i] * 0.8) * cell;
        f.ga[i] = Math.min(
          1,
          (0.6 + v * 0.35) * boost * (this.hover === c ? 1.3 : 1),
        );
        f.gh[i] = 0;
        f.gc[i] = rampClass(v, f.r0[i]);
        continue;
      }

      // Not compared yet: waiting as activations on either network's axis.
      const fromBottom = f.r3[i] < 0.5;
      const along = (fromBottom ? col : row) + 0.5 + (f.r1[i] - 0.5) * 0.7;
      const out = band + f.r2[i] * spread;
      f.gx[i] = fromBottom ? left + along * cell : left - out;
      f.gy[i] = fromBottom ? bottom + out : bottom - along * cell;
      f.ga[i] = (0.22 + f.r0[i] * 0.3) * boost;
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
    const left = vx + bx;
    const bottom = vy + by + size;
    const axes = { left, bottom, size };
    this.ink = palette.ink;
    layerAxes(
      ctx,
      palette,
      axes,
      { x: "ResNet-18 · seed B", y: "ResNet-18 · seed A" },
      { compact: fr.compact },
    );
    if (this.hover >= 0) {
      const row = Math.floor(this.hover / LAYERS);
      const col = this.hover % LAYERS;
      cellReadout(
        ctx,
        palette,
        axes,
        row,
        col,
        `A·L${row + 1} × B·L${col + 1}  CKA ${this.values[this.hover].toFixed(2)}`,
      );
    }
    resetText(ctx);
  }
}
