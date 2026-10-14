import {
  INK_RAMP,
  LAYERS,
  PAPER_RAMP,
  rampClass,
  shareByValue,
  similarity,
} from "../cka-data";
import { clamp, lerp, rgba, smoothstep } from "../math";
import { dust } from "../shapes";
import {
  axisGutter,
  cellReadout,
  freeArea,
  label,
  layerAxes,
  resetText,
  Steps,
  stepAt,
} from "../story";
import type { Field, Frame, Palette, Scene } from "../types";

/** Virtual rows per Gram card, so flattening reads as rows laid end to end. */
const ROWS = 6;
const STEP_AT = [0, 0.18, 0.38, 0.54, 0.76] as const;
const PAPER_SIZE = 1.3;
const PAPER_ALPHA = 1.25;

type Box = { x: number; y: number; w: number; h: number };

/**
 * pytorch-cka's HSIC, as one pass. Two stacks of 18 Gram matrices unroll into
 * (18, B²) and (B², 18) — the shapes `einsum('aij,bij->ab')` contracts — and
 * every one of the 324 cells fills at once, fed by its row and its column. The
 * off-diagonal and column sums shrink each strip to a short vector and sweep
 * the correction terms across; normalizing turns the grid into the CKA map.
 * Model A's layers run bottom to top and model B's left to right, so layer 1
 * of both sits at the bottom-left, as in every heatmap on the site.
 */
export class BatchScene implements Scene {
  private values = similarity();
  private cellOf = new Uint16Array(0);
  /** Strip particles join the finished map too, so it reads as dense as a heatmap. */
  private stripCellOf = new Uint16Array(0);
  private deckA = { x: 0, y: 0 };
  private deckB = { x: 0, y: 0 };
  private stripN = 0;
  private cellN = 0;
  private out: Box = { x: 0, y: 0, w: 0, h: 0 };
  private rowsBox: Box = { x: 0, y: 0, w: 0, h: 0 };
  private colsBox: Box = { x: 0, y: 0, w: 0, h: 0 };
  /** Where the finished map settles: centered, and larger. */
  private final: Box = { x: 0, y: 0, w: 0, h: 0 };
  /** The output grid's box this frame. */
  private box: Box = { x: 0, y: 0, w: 0, h: 0 };
  private card = 60;
  private steps = new Steps();
  private hover = -1;
  /** The map has reached its final place and can be hovered. */
  private settled = false;
  private p = 0;
  private ink = true;

  layout(f: Field, fr: Frame) {
    const area = freeArea(fr, fr.compact ? 16 : 24);
    const size = fr.compact
      ? Math.min(area.w * 0.58, area.h * 0.62)
      : Math.min(area.w * 0.46, area.h * 0.66);
    const gap = fr.compact ? 10 : 16;
    const wa = Math.min(area.w - size - gap - 8, size * 0.95);
    const hb = Math.min(area.h - size - gap - 26, size * 0.45);
    const totalW = wa + gap + size;
    const totalH = hb + gap + size;
    const ox = area.x + (area.w - totalW) / 2 + wa + gap;
    const oy = area.y + (area.h - totalH) / 2 + hb + gap;
    this.out = { x: ox, y: oy, w: size, h: size };
    this.rowsBox = { x: ox - gap - wa, y: oy, w: wa, h: size };
    this.colsBox = { x: ox, y: oy - gap - hb, w: size, h: hb };
    this.card = Math.min(wa * 0.46, hb * 0.52, size * 0.4);
    // The finished map leaves room on the left and below for its axes.
    const { title } = axisGutter(fr.compact);
    const finalSize = Math.min(
      area.w * 0.64,
      area.w - title * 2 - 16,
      area.h - title - 12,
    );
    this.final = {
      x: area.x + (area.w - finalSize + title) / 2,
      y: area.y + (area.h - finalSize - title) / 2,
      w: finalSize,
      h: finalSize,
    };
    this.box = { ...this.out };
    this.stripN = Math.round(f.n * 0.15);
    this.cellN = Math.round(f.n * 0.46);
    this.cellOf = shareByValue(this.values, this.cellN);
    this.stripCellOf = shareByValue(this.values, this.stripN * 2);
    this.steps.collect(fr.section);
  }

  /** Hold the finished map still under the pointer so a cell can be read. */
  repels(fr: Frame) {
    if (!this.settled) return true;
    const b = this.box;
    const px = fr.pointer.x - fr.visual.x - b.x;
    const py = fr.pointer.y - fr.visual.y - b.y;
    return px < 0 || py < 0 || px > b.w || py > b.h;
  }

  update(f: Field, fr: Frame) {
    const p = fr.progress;
    this.p = p;
    const vx = fr.visual.x;
    const vy = fr.visual.y;
    const unroll = smoothstep(0.16, 0.36, p);
    const einsum = smoothstep(0.38, 0.5, p);
    const reduce = smoothstep(0.54, 0.6, p);
    const outerWave = clamp((p - 0.58) / 0.08);
    const colWave = clamp((p - 0.66) / 0.08);
    const normalize = smoothstep(0.76, 0.86, p);
    const settle = smoothstep(0.86, 0.96, p);
    const box = this.box;
    box.x = lerp(this.out.x, this.final.x, settle);
    box.y = lerp(this.out.y, this.final.y, settle);
    box.w = lerp(this.out.w, this.final.w, settle);
    box.h = box.w;
    const co = this.out.w / LAYERS;
    const cf = box.w / LAYERS;
    const grow = this.ink ? 1 : PAPER_SIZE;
    const boost = this.ink ? 1 : PAPER_ALPHA;
    f.classColors = this.ink ? INK_RAMP : PAPER_RAMP;

    // Hovering the finished map reads out a pair.
    this.hover = -1;
    this.settled = settle > 0.9;
    const ptr = fr.pointer;
    if (ptr.active && this.settled) {
      const col = Math.floor((ptr.x - vx - box.x) / cf);
      const row = Math.floor((vy + box.y + box.h - ptr.y) / cf);
      if (col >= 0 && col < LAYERS && row >= 0 && row < LAYERS)
        this.hover = row * LAYERS + col;
    }

    // A deck of 18 cards, each one layer's Gram matrix.
    const spread = 0.9;
    const deck = this.card * (1 + spread);
    const cardA = this.deckA;
    cardA.x = vx + this.rowsBox.x + (this.rowsBox.w - deck) / 2;
    cardA.y = vy + this.rowsBox.y + (this.rowsBox.h - deck) / 2;
    const cardB = this.deckB;
    cardB.x = vx + this.colsBox.x + (this.colsBox.w - deck) / 2;
    cardB.y = vy + this.colsBox.y + (this.colsBox.h - deck) / 2;
    const offset = (this.card * spread) / (LAYERS - 1);
    const stripsEnd = this.stripN * 2;
    const cellsEnd = stripsEnd + this.cellN;

    for (let i = 0; i < f.n; i++) {
      if (i < stripsEnd) {
        // One Gram card per layer, unrolled row by row into a strip.
        const isA = i < this.stripN;
        const k = isA ? i : i - this.stripN;
        const layer = k % LAYERS;
        const u = f.r0[i];
        const v = f.r1[i];
        // Gram matrices are brightest on the diagonal: an input vs. itself.
        const texture = 0.16 + 0.64 * Math.exp(-Math.abs(u - v) * 7);
        const origin = isA ? cardA : cardB;
        const cx = origin.x + layer * offset + u * this.card;
        // Row v counts up from the card's bottom edge, like every heatmap here.
        const cy = origin.y + layer * offset + (1 - v) * this.card;
        const flatAt = (Math.floor(v * ROWS) + u) / ROWS;
        const t = clamp(unroll * 1.6 - flatAt * 0.6);
        // Column sums keep one entry per row: each strip shrinks from B² to B.
        const along = lerp(flatAt, flatAt / ROWS, reduce);
        const across = (f.r2[i] - 0.5) * co * 0.34;
        let sx: number;
        let sy: number;
        if (isA) {
          sx = vx + this.rowsBox.x + this.rowsBox.w * (1 - along);
          sy = vy + this.out.y + this.out.h - (layer + 0.5) * co + across;
        } else {
          sx = vx + this.out.x + (layer + 0.5) * co + across;
          sy = vy + this.colsBox.y + this.colsBox.h * (1 - along);
        }
        let x = lerp(cx, sx, t);
        let y = lerp(cy, sy, t);
        const layered = lerp(0.3 + 0.7 * (layer / LAYERS), 1, t);
        let alpha =
          texture * layered * lerp(1, 0.28, normalize) * (1 + reduce * 0.4);
        // Once the map settles, these dots fill it in as well.
        if (settle > 0) {
          const c = this.stripCellOf[i];
          const value = this.values[c];
          const tx = vx + box.x + ((c % LAYERS) + 0.1 + f.r1[i] * 0.8) * cf;
          const ty =
            vy +
            box.y +
            box.h -
            (Math.floor(c / LAYERS) + 0.1 + f.r2[i] * 0.8) * cf;
          x = lerp(x, tx, settle);
          y = lerp(y, ty, settle);
          alpha = lerp(alpha, (0.6 + value * 0.35) * boost, settle);
          if (f.r3[i] < settle) f.gc[i] = rampClass(value, f.r0[i]);
          if (!this.ink) f.gz[i] = f.size[i] * grow;
        }
        f.gx[i] = x;
        f.gy[i] = y;
        f.ga[i] = Math.min(1, alpha);
        f.gh[i] = reduce * (1 - normalize) * 0.6;
        continue;
      }
      if (i < cellsEnd) {
        const c = this.cellOf[i - stripsEnd];
        const row = Math.floor(c / LAYERS);
        const col = c % LAYERS;
        const value = this.values[c];
        if (!this.ink) f.gz[i] = f.size[i] * grow;
        // Fed by its row of A and its column of B at the same moment.
        const fromRow = f.r3[i] < 0.5;
        const srcX = fromRow
          ? vx + this.rowsBox.x + f.r0[i] * this.rowsBox.w
          : vx + this.out.x + (col + 0.5) * co;
        const srcY = fromRow
          ? vy + this.out.y + this.out.h - (row + 0.5) * co
          : vy + this.colsBox.y + f.r0[i] * this.colsBox.h;
        const t = clamp(einsum * 1.35 - f.r1[i] * 0.35);
        const dstX = vx + box.x + (col + 0.1 + f.r1[i] * 0.8) * cf;
        const dstY = vy + box.y + box.h - (row + 0.1 + f.r2[i] * 0.8) * cf;
        f.gx[i] = lerp(srcX, dstX, t);
        f.gy[i] = lerp(srcY, dstY, t);
        // Two correction terms sweep across: row by row, then column by column.
        const outer = Math.exp(-(((row + 0.5) / LAYERS - outerWave) ** 2) * 90);
        const colSum = Math.exp(-(((col + 0.5) / LAYERS - colWave) ** 2) * 90);
        const sweeping =
          (outerWave > 0 && outerWave < 1 ? outer : 0) +
          (colWave > 0 && colWave < 1 ? colSum : 0);
        const raw = 0.22 + value * 0.5;
        const final = 0.6 + value * 0.35;
        const alpha = lerp(raw, final, normalize) * t;
        f.ga[i] = Math.min(
          1,
          (alpha + sweeping * 0.4) * boost * (this.hover === c ? 1.3 : 1),
        );
        f.gh[i] = Math.min(1, sweeping) * (1 - normalize);
        // Color arrives dot by dot as the values are normalized.
        if (f.r3[i] < normalize) f.gc[i] = rampClass(value, f.r0[i]);
        continue;
      }
      dust(f, i, fr, 0.1);
    }
    this.steps.set(stepAt(p, STEP_AT));
  }

  draw(ctx: CanvasRenderingContext2D, fr: Frame, palette: Palette) {
    this.ink = palette.ink;
    const p = this.p;
    const vx = fr.visual.x;
    const vy = fr.visual.y;
    const size = fr.compact ? 9 : 10;
    const stacks = 1 - smoothstep(0.16, 0.24, p);
    // The decks' card edges.
    if (stacks > 0.01) {
      const spread = 0.9;
      const offset = (this.card * spread) / (LAYERS - 1);
      ctx.lineWidth = 1;
      for (const deck of [this.deckA, this.deckB]) {
        for (let l = 0; l < LAYERS; l++) {
          const a = (0.1 + 0.45 * (l / (LAYERS - 1))) * stacks;
          ctx.strokeStyle = rgba(palette.fg, a);
          ctx.strokeRect(
            deck.x + l * offset,
            deck.y + l * offset,
            this.card,
            this.card,
          );
        }
      }
    }
    const flat = smoothstep(0.3, 0.36, p) * (1 - smoothstep(0.54, 0.58, p));
    const reduced = smoothstep(0.56, 0.6, p) * (1 - smoothstep(0.76, 0.8, p));
    const done = smoothstep(0.92, 0.97, p);

    const a = this.rowsBox;
    const b = this.colsBox;
    const o = this.box;
    label(
      ctx,
      palette,
      "grams_a  (18, B, B)",
      vx + a.x + a.w / 2,
      vy + a.y + a.h / 2 + this.card * 1.1,
      {
        align: "center",
        size,
        alpha: stacks,
      },
    );
    label(
      ctx,
      palette,
      "grams_b  (18, B, B)",
      vx + b.x - 8,
      vy + b.y + b.h / 2,
      {
        align: "right",
        size,
        alpha: stacks,
      },
    );
    label(ctx, palette, "(18, B²)", vx + a.x, vy + a.y - 10, {
      size,
      alpha: flat,
    });
    label(ctx, palette, "(B², 18)", vx + b.x - 8, vy + b.y + 6, {
      align: "right",
      size,
      alpha: flat,
    });
    label(ctx, palette, "column sums  (18, B)", vx + a.x + a.w, vy + a.y - 10, {
      align: "right",
      size,
      alpha: reduced,
    });
    const einsum = smoothstep(0.44, 0.5, p) * (1 - done);
    label(
      ctx,
      palette,
      "(18, 18)  in one call",
      vx + o.x + o.w / 2,
      vy + o.y + o.h + 14,
      {
        align: "center",
        size,
        alpha: einsum,
      },
    );
    const axes = { left: vx + o.x, bottom: vy + o.y + o.h, size: o.w };
    layerAxes(
      ctx,
      palette,
      axes,
      { x: "model B layer", y: "model A layer" },
      { compact: fr.compact, alpha: done },
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
