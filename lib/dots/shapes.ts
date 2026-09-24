import { gauss, TAU } from "./math";
import type { Field, Frame } from "./types";

/** Faint, slowly drifting background grain for particles a scene doesn't need. */
export function dust(f: Field, i: number, fr: Frame, alpha = 0.16) {
  const t = fr.reduced ? 0 : fr.time * 0.05;
  f.gx[i] = f.r0[i] * fr.vw + Math.sin(t + f.r2[i] * TAU) * 28;
  f.gy[i] = f.r1[i] * fr.vh + Math.cos(t * 0.8 + f.r3[i] * TAU) * 28;
  f.ga[i] = alpha * (0.35 + f.r3[i] * 0.65);
  f.gh[i] = 0;
}

export type ShapeKind = "outline" | "rule" | "disc" | "ring" | "bar" | "fill";

type Shape = {
  el: HTMLElement;
  kind: ShapeKind;
  weight: number;
  spread: number;
  radius: number;
  tint: number;
  /** Fraction of a ring to draw, clockwise from 12 o'clock. */
  arc: number;
  /** Build order; shapes above `DomShapes.stage` stay unbuilt (dust). */
  stage: number;
  rect: DOMRect | null;
};

const corner: [number, number, number, number] = [0, 0, 0, 0];

/** Point + outward normal on a rounded rectangle's perimeter at u ∈ [0, 1). */
function roundedRectPoint(
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
  u: number,
) {
  const r = Math.max(0, Math.min(radius, w / 2, h / 2));
  const sw = w - 2 * r;
  const sh = h - 2 * r;
  const arc = (Math.PI * r) / 2;
  let d = u * (2 * sw + 2 * sh + 4 * arc);
  const arcAt = (cx: number, cy: number, from: number) => {
    const a = from + d / Math.max(r, 1e-3);
    corner[0] = cx + Math.cos(a) * r;
    corner[1] = cy + Math.sin(a) * r;
    corner[2] = Math.cos(a);
    corner[3] = Math.sin(a);
    return corner;
  };
  const edge = (px: number, py: number, nx: number, ny: number) => {
    corner[0] = px;
    corner[1] = py;
    corner[2] = nx;
    corner[3] = ny;
    return corner;
  };
  if (d < sw) return edge(x + r + d, y, 0, -1);
  d -= sw;
  if (d < arc) return arcAt(x + w - r, y + r, -Math.PI / 2);
  d -= arc;
  if (d < sh) return edge(x + w, y + r + d, 1, 0);
  d -= sh;
  if (d < arc) return arcAt(x + w - r, y + h - r, 0);
  d -= arc;
  if (d < sw) return edge(x + w - r - d, y + h, 0, 1);
  d -= sw;
  if (d < arc) return arcAt(x + r, y + h - r, Math.PI / 2);
  d -= arc;
  if (d < sh) return edge(x, y + h - r - d, -1, 0);
  d -= sh;
  return arcAt(x + r, y + r, Math.PI);
}

function inkLength(kind: ShapeKind, w: number, h: number, radius: number) {
  const R = Math.min(w, h) / 2;
  switch (kind) {
    case "outline": {
      const r = Math.min(radius, w / 2, h / 2);
      return 2 * (w + h) - (8 - 2 * Math.PI) * r;
    }
    case "ring":
      return TAU * R;
    case "fill":
      return w * h * 0.06;
    case "disc":
      return Math.PI * R * R * 0.18;
    case "rule":
    case "bar":
      return w;
  }
}

/**
 * Lets markup decide where particles go. Elements tagged with
 * `data-dots="outline|rule|disc|ring|bar|fill"` are traced every frame, so the dots
 * follow real, accessible controls as they move, scroll, and resize.
 */
export class DomShapes {
  shapes: Shape[] = [];
  owner = new Int16Array(0);
  start = 0;
  count = 0;
  /** Highest build stage currently shown (see `data-stage`). */
  stage = Number.POSITIVE_INFINITY;

  collect(root: ParentNode, selector = "[data-dots]") {
    this.shapes = Array.from(root.querySelectorAll<HTMLElement>(selector)).map(
      (el) => ({
        el,
        kind: (el.dataset.dots ?? "outline") as ShapeKind,
        weight: Number(el.dataset.dotsWeight ?? 1),
        spread: Number(el.dataset.dotsSpread ?? 1.1),
        tint: Number(el.dataset.dotsTint ?? 0),
        arc: Number(el.dataset.dotsArc ?? 1),
        stage: Number(
          el.closest<HTMLElement>("[data-stage]")?.dataset.stage ?? 0,
        ),
        radius: 0,
        rect: null,
      }),
    );
    return this;
  }

  /** Splits particles [start, start + count) across shapes by drawn length. */
  allocate(start: number, count: number) {
    this.start = start;
    this.count = count;
    this.owner = new Int16Array(count).fill(-1);
    const lengths = this.shapes.map((s) => {
      const r = s.el.getBoundingClientRect();
      s.radius = Number.parseFloat(getComputedStyle(s.el).borderTopLeftRadius);
      if (!Number.isFinite(s.radius)) s.radius = 0;
      if (r.width < 1 || (r.height < 1 && s.kind !== "rule")) return 0;
      return inkLength(s.kind, r.width, r.height, s.radius) * s.weight;
    });
    const total = lengths.reduce((a, b) => a + b, 0);
    if (total <= 0 || count <= 0) return this;
    let shape = 0;
    let acc = lengths[0];
    for (let k = 0; k < count; k++) {
      const at = ((k + 0.5) / count) * total;
      while (at > acc && shape < lengths.length - 1) {
        shape++;
        acc += lengths[shape];
      }
      this.owner[k] = shape;
    }
    return this;
  }

  refresh() {
    for (const s of this.shapes) {
      s.rect = s.el.getBoundingClientRect();
      s.tint = Number(s.el.dataset.dotsTint ?? 0);
    }
  }

  /** Writes a goal for particle i if it belongs to a shape. */
  place(f: Field, i: number, alpha: number): boolean {
    const k = i - this.start;
    if (k < 0 || k >= this.count) return false;
    const s = this.shapes[this.owner[k]];
    const r = s?.rect;
    if (!s || !r || r.width < 1 || s.stage > this.stage) return false;
    const u = f.r0[i];
    const g = gauss(f.r1[i], f.r2[i]);
    let x = 0;
    let y = 0;
    switch (s.kind) {
      case "outline": {
        const p = roundedRectPoint(
          r.left,
          r.top,
          r.width,
          r.height,
          s.radius,
          u,
        );
        const wobble = Math.sin(u * TAU * 3 + s.weight) * s.spread * 0.5;
        const off = g * s.spread + wobble;
        x = p[0] + p[2] * off;
        y = p[1] + p[3] * off;
        break;
      }
      case "ring": {
        const R = Math.min(r.width, r.height) / 2 + g * s.spread;
        const a = -Math.PI / 2 + u * s.arc * TAU;
        x = r.left + r.width / 2 + Math.cos(a) * R;
        y = r.top + r.height / 2 + Math.sin(a) * R;
        break;
      }
      case "fill":
        x = r.left + u * r.width;
        y = r.top + f.r1[i] * r.height;
        break;
      case "disc": {
        const R = (Math.min(r.width, r.height) / 2) * Math.sqrt(f.r1[i]);
        x = r.left + r.width / 2 + Math.cos(u * TAU) * R;
        y = r.top + r.height / 2 + Math.sin(u * TAU) * R;
        break;
      }
      case "rule":
        x = r.left + u * r.width;
        y = r.top + r.height / 2 + g * s.spread;
        break;
      case "bar":
        x = r.left + u * r.width;
        y = r.top + r.height * (0.3 + f.r1[i] * 0.4);
        break;
    }
    f.gx[i] = x;
    f.gy[i] = y;
    f.ga[i] = alpha * (0.55 + f.r3[i] * 0.45);
    f.gh[i] = s.tint;
    return true;
  }
}

let scratch: HTMLCanvasElement | null = null;

export type TextSample = {
  pts: Float32Array;
  count: number;
  width: number;
  height: number;
};

/**
 * Rasterises an element's text with its computed font and returns the inked
 * pixel coordinates relative to the element's box.
 */
export function sampleText(el: HTMLElement): TextSample {
  const rect = el.getBoundingClientRect();
  const width = Math.max(1, Math.ceil(rect.width));
  const height = Math.max(1, Math.ceil(rect.height));
  scratch ??= document.createElement("canvas");
  scratch.width = width;
  scratch.height = height;
  const ctx = scratch.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { pts: new Float32Array(0), count: 0, width, height };

  const cs = getComputedStyle(el);
  const text = (el.textContent ?? "").trim();
  ctx.clearRect(0, 0, width, height);
  ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  if ("letterSpacing" in ctx && cs.letterSpacing !== "normal") {
    (
      ctx as CanvasRenderingContext2D & { letterSpacing: string }
    ).letterSpacing = cs.letterSpacing;
  }
  ctx.fillStyle = "#000";
  ctx.textBaseline = "alphabetic";
  const m = ctx.measureText(text);
  const ascent = m.actualBoundingBoxAscent;
  const descent = m.actualBoundingBoxDescent;
  const inkW = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
  const x = (width - inkW) / 2 + m.actualBoundingBoxLeft;
  const y = (height + ascent - descent) / 2;
  ctx.fillText(text, x, y);

  const data = ctx.getImageData(0, 0, width, height).data;
  let count = 0;
  for (let p = 3; p < data.length; p += 4) if (data[p] > 110) count++;
  const pts = new Float32Array(count * 2);
  let j = 0;
  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      if (data[(py * width + px) * 4 + 3] > 110) {
        pts[j++] = px;
        pts[j++] = py;
      }
    }
  }
  return { pts, count, width, height };
}
