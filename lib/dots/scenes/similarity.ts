import { clamp, mulberry32, rgba, smoothstep } from "../math";
import { dust } from "../shapes";
import type { Field, Frame, Palette, Scene } from "../types";

/** ResNet-18's layers: stem, four stages of four convs, and the classifier. */
const LAYERS = 18;
const stageOf = (l: number) =>
  l === 0 ? 0 : l === LAYERS - 1 ? 5 : 1 + Math.floor((l - 1) / 4);

/**
 * An illustrative layer-by-layer CKA map between two ResNet-18s trained from
 * different seeds. Early layers see low-level features the same way, so they
 * agree broadly; deeper layers work on abstract features that each network
 * encodes its own way, so agreement fades — even at matching depths.
 */
function similarity() {
  const rand = mulberry32(18);
  const values = new Float32Array(LAYERS * LAYERS);
  for (let a = 0; a < LAYERS; a++) {
    for (let b = 0; b < LAYERS; b++) {
      const da = a / (LAYERS - 1);
      const db = b / (LAYERS - 1);
      const depth = Math.max(da, db);
      // Agreement at matching depth falls from ~0.9 to ~0.35.
      const peak = 0.9 - 0.55 * depth ** 1.3;
      // Early layers resemble many of their neighbours; deep ones, fewer.
      const sigma = 4.2 - 2.6 * depth;
      const near = Math.exp(-((a - b) ** 2) / (2 * sigma * sigma));
      const stage = stageOf(a) === stageOf(b) ? 0.06 * (1 - depth) : 0;
      const v = 0.06 + near * (peak - 0.06) + stage + (rand() - 0.5) * 0.06;
      values[a * LAYERS + b] = clamp(v, 0.03, 0.95);
    }
  }
  return values;
}

/**
 * Layer-wise representation similarity, drawn as a stippled heatmap. Each
 * network's layers start as a column of activations along an axis; scrolling
 * compares them pair by pair, and each pair settles into its cell — denser and
 * warmer where the two networks see the input the same way. Density follows
 * similarity gently, so the whole map reads, not just its diagonal.
 */
export class SimilarityScene implements Scene {
  private values = similarity();
  private cellOf = new Uint16Array(0);
  private heatN = 0;
  private box = { x: 0, y: 0, size: 0 };
  private hover = -1;
  private counter: HTMLElement | null = null;
  private shown = -1;

  layout(f: Field, fr: Frame) {
    const { w, h } = fr.visual;
    const size = Math.min(w * 0.78, h - (fr.compact ? 70 : 130));
    this.box = {
      x: (w - size) / 2 + size * 0.04,
      y: (h - size) / 2 - (fr.compact ? 18 : 36),
      size,
    };

    // Share particles among cells by similarity, so density reads as value.
    this.heatN = Math.round(f.n * 0.6);
    const cells = LAYERS * LAYERS;
    const cumulative = new Float32Array(cells);
    let total = 0;
    for (let c = 0; c < cells; c++) {
      total += 0.05 + this.values[c] ** 1.4;
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
  }

  update(f: Field, fr: Frame) {
    const { x: vx, y: vy } = fr.visual;
    const { x: bx, y: by, size } = this.box;
    const cell = size / LAYERS;
    const left = vx + bx;
    const top = vy + by;
    const cells = LAYERS * LAYERS;
    const computed = Math.floor(smoothstep(0.04, 0.78, fr.progress) * cells);
    const ptr = fr.pointer;

    this.hover = -1;
    if (ptr.active) {
      const col = Math.floor((ptr.x - left) / cell);
      const row = Math.floor((ptr.y - top) / cell);
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
        f.gy[i] = top + (row + 0.1 + f.r2[i] * 0.8) * cell;
        f.ga[i] = (0.3 + v * 0.6) * (this.hover === c ? 1.4 : 1);
        f.gh[i] = smoothstep(0.25, 0.9, v);
        continue;
      }

      // Not compared yet: waiting as activations on either network's axis.
      const fromTop = f.r3[i] < 0.5;
      const across = (fromTop ? col : row) + 0.5 + (f.r1[i] - 0.5) * 0.7;
      const out = 14 + f.r2[i] * 16;
      f.gx[i] = fromTop ? left + across * cell : left - out;
      f.gy[i] = fromTop ? top - out : top + across * cell;
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

    ctx.font = `9.5px ${palette.mono}`;
    ctx.fillStyle = rgba(palette.muted, 0.85);
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillText("ResNet-18 · seed B", left + size / 2, top - 44);
    for (const l of [1, 6, 10, 14, 18]) {
      ctx.fillText(String(l), left + (l - 0.5) * cell, top + size + 12);
    }
    ctx.save();
    ctx.translate(left - 44, top + size / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("ResNet-18 · seed A", 0, 0);
    ctx.restore();
    ctx.textAlign = "right";
    for (const l of [1, 6, 10, 14, 18]) {
      ctx.fillText(String(l), left + size + 18, top + (l - 0.5) * cell);
    }

    if (this.hover >= 0) {
      const row = Math.floor(this.hover / LAYERS);
      const col = this.hover % LAYERS;
      ctx.strokeStyle = rgba(palette.fg, 0.8);
      ctx.lineWidth = 1;
      ctx.strokeRect(left + col * cell, top + row * cell, cell, cell);
      ctx.fillStyle = rgba(palette.fg, 0.95);
      ctx.font = `10px ${palette.mono}`;
      const label = `A·L${row + 1} × B·L${col + 1}  CKA ${this.values[this.hover].toFixed(2)}`;
      const onRight = col < LAYERS / 2;
      ctx.textAlign = onRight ? "left" : "right";
      const x = onRight ? left + (col + 1) * cell + 8 : left + col * cell - 8;
      ctx.fillText(label, x, top + (row + 0.5) * cell);
    }
    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";
  }
}
