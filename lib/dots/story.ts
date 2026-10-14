import { rgba } from "./math";
import type { Frame, Palette, RGB } from "./types";

/**
 * Keeps a chapter's `[data-step]` captions in sync with its scene: the current
 * step is marked active and earlier ones done, so the copy narrates whichever
 * phase the particles are in.
 */
export class Steps {
  private items: HTMLElement[] = [];
  private current = -2;

  collect(section: HTMLElement) {
    this.items = Array.from(
      section.querySelectorAll<HTMLElement>("[data-step]"),
    );
    this.current = -2;
    return this;
  }

  set(k: number) {
    if (k === this.current) return;
    this.current = k;
    this.items.forEach((el, i) => {
      el.classList.toggle("is-active", i === k);
      el.classList.toggle("is-done", i < k);
    });
  }
}

/** Index of the last threshold `p` has reached. */
export function stepAt(p: number, at: readonly number[]) {
  let k = 0;
  for (let i = 1; i < at.length; i++) if (p >= at[i]) k = i;
  return k;
}

/** Writes scene values into `[data-counter]` elements, touching the DOM only on change. */
export class Readouts {
  private els: Record<string, HTMLElement> = {};
  private shown: Record<string, string> = {};

  collect(section: HTMLElement) {
    this.els = {};
    this.shown = {};
    for (const el of section.querySelectorAll<HTMLElement>("[data-counter]")) {
      this.els[el.dataset.counter ?? ""] = el;
    }
    return this;
  }

  write(key: string, value: string) {
    const el = this.els[key];
    if (!el || this.shown[key] === value) return;
    this.shown[key] = value;
    el.textContent = value;
  }
}

export const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

/**
 * The part of a chapter's stage left for particles once its DOM overlays (a
 * code snippet on top, readouts at the bottom) take their room, in
 * stage-relative pixels.
 */
export function freeArea(fr: Frame, gap = 28) {
  const stage = fr.visual;
  let top = 0;
  let bottom = stage.h;
  const root = fr.section.querySelector<HTMLElement>("[data-visual]");
  for (const el of root?.querySelectorAll<HTMLElement>("[data-reserve]") ??
    []) {
    const r = el.getBoundingClientRect();
    if (r.height < 1) continue;
    if (el.dataset.reserve === "top") top = Math.max(top, r.bottom - stage.y);
    else bottom = Math.min(bottom, r.top - stage.y);
  }
  if (top > 0) top += gap;
  if (bottom < stage.h) bottom -= gap;
  return { x: 0, y: top, w: stage.w, h: Math.max(80, bottom - top) };
}

type LabelOptions = {
  align?: CanvasTextAlign;
  alpha?: number;
  size?: number;
  color?: RGB;
  baseline?: CanvasTextBaseline;
};

/** A small monospace canvas label in the page's label voice. */
export function label(
  ctx: CanvasRenderingContext2D,
  palette: Palette,
  text: string,
  x: number,
  y: number,
  {
    align = "left",
    alpha = 0.85,
    size = 10,
    color,
    baseline = "middle",
  }: LabelOptions = {},
) {
  if (alpha <= 0.01) return;
  ctx.font = `${size}px ${palette.mono}`;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.fillStyle = rgba(color ?? palette.muted, alpha);
  ctx.fillText(text, x, y);
}

/** Resets canvas text state that labels change. */
export function resetText(ctx: CanvasRenderingContext2D) {
  ctx.textAlign = "start";
  ctx.textBaseline = "alphabetic";
  ctx.setLineDash([]);
}

/** Layer ticks on a layer-by-layer heatmap (1-based, as the axes read). */
const LAYER_TICKS = [1, 6, 10, 14, 18];

/** Distances out from a heatmap's edge to its tick numbers and axis title. */
export const axisGutter = (compact: boolean) =>
  compact ? { tick: 25, title: 41 } : { tick: 34, title: 54 };

/**
 * Axes for an 18 × 18 layer heatmap laid out like a plot: layer 1 at the
 * bottom-left corner, ticks and titles on the left and bottom edges.
 */
export function layerAxes(
  ctx: CanvasRenderingContext2D,
  palette: Palette,
  box: { left: number; bottom: number; size: number },
  titles: { x: string; y: string },
  { compact = false, alpha = 1, layers = 18 } = {},
) {
  if (alpha <= 0.01) return;
  const { left, bottom, size } = box;
  const { tick, title } = axisGutter(compact);
  const cell = size / layers;
  ctx.font = `9.5px ${palette.mono}`;
  ctx.fillStyle = rgba(palette.muted, 0.85 * alpha);
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  for (const l of LAYER_TICKS) {
    ctx.fillText(String(l), left + (l - 0.5) * cell, bottom + tick);
    ctx.fillText(String(l), left - tick, bottom - (l - 0.5) * cell);
  }
  ctx.fillText(titles.x, left + size / 2, bottom + title);
  ctx.save();
  ctx.translate(left - title, bottom - size / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(titles.y, 0, 0);
  ctx.restore();
}

/**
 * The hovered cell's outline and readout, written beside the cell (toward the
 * map's center) so it never lands on an axis title.
 */
export function cellReadout(
  ctx: CanvasRenderingContext2D,
  palette: Palette,
  box: { left: number; bottom: number; size: number },
  row: number,
  col: number,
  text: string,
  layers = 18,
) {
  const cell = box.size / layers;
  const top = box.bottom - (row + 1) * cell;
  ctx.strokeStyle = rgba(palette.fg, 0.8);
  ctx.lineWidth = 1;
  ctx.strokeRect(box.left + col * cell, top, cell, cell);
  const onRight = col < layers / 2;
  label(
    ctx,
    palette,
    text,
    onRight ? box.left + (col + 1) * cell + 8 : box.left + col * cell - 8,
    top + cell / 2,
    { align: onRight ? "left" : "right", color: palette.fg, alpha: 0.95 },
  );
}

/**
 * Reports each change in a stage's size. On narrow screens the copy above a
 * stage grows and shrinks as its step captions swap, so the stage resizes
 * mid-chapter and a scene has to re-plan its geometry.
 */
export class StageSize {
  private key = "";

  changed(fr: Frame) {
    const key = `${Math.round(fr.visual.w)}x${Math.round(fr.visual.h)}`;
    if (key === this.key) return false;
    this.key = key;
    return true;
  }
}
