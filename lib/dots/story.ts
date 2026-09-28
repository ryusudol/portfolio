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
