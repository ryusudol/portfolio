import { bezierAt, gauss, sCurve, TAU } from "./math";
import { dust } from "./shapes";
import type { Field, Frame } from "./types";

export type MarkKind = "box" | "fill" | "line" | "curve" | "ring" | "disc";

/**
 * A shape drawn in particles, in stage-relative pixels. Boxes and fills use
 * x, y, w, h; lines run from (x, y) to (x2, y2), and curves bend between
 * the same two points like a node-link edge; rings and discs are centered
 * on (x, y) with radius `r`. Scenes move marks and restyle them every frame.
 */
export type Mark = {
  kind: MarkKind;
  x: number;
  y: number;
  w: number;
  h: number;
  x2: number;
  y2: number;
  r: number;
  /** Opacity, before the per-particle grain. */
  a: number;
  /** 0 = the dot color, 1 = the accent. */
  tint: number;
  /** 1-based index into the field's class colors, 0 = none. */
  cls: number;
  /** Fraction of the mark drawn, in particle order (along a line or box). */
  show: number;
  /** Along a line: cycles per second the particles stream at (0 = still). */
  flow: number;
  /** Gaussian scatter, in pixels. */
  spread: number;
  /** A fixed dot size (0 = each particle's own). */
  size: number;
  start: number;
  count: number;
};

type Geometry = Partial<
  Pick<Mark, "x" | "y" | "w" | "h" | "x2" | "y2" | "r" | "spread">
> & { density?: number; count?: number };

const blank = (kind: MarkKind): Mark => ({
  kind,
  x: 0,
  y: 0,
  w: 0,
  h: 0,
  x2: 0,
  y2: 0,
  r: 0,
  a: 0.6,
  tint: 0,
  cls: 0,
  show: 1,
  flow: 0,
  spread: 0,
  size: 0,
  start: 0,
  count: 0,
});

/** How many particles a mark wants at `density` per pixel (or per px² for areas). */
function want(m: Mark, density: number) {
  switch (m.kind) {
    case "box":
      return 2 * (m.w + m.h) * density;
    case "fill":
      return m.w * m.h * density;
    case "line":
    case "curve":
      return Math.hypot(m.x2 - m.x, m.y2 - m.y) * density;
    case "ring":
      return TAU * m.r * density;
    case "disc":
      return Math.PI * m.r * m.r * density;
  }
}

/**
 * A scene's particles as a list of marks. Build the list in `layout`, call
 * `fit` once, then restyle marks and call `apply` in `update`. Particles no
 * mark claims drift as dust.
 */
export class Marks {
  list: Mark[] = [];
  private owner = new Int32Array(0);
  private used = 0;

  clear() {
    this.list = [];
    this.used = 0;
  }

  add(kind: MarkKind, g: Geometry, density = 0.4) {
    const m = blank(kind);
    Object.assign(m, g);
    m.count = Math.max(3, Math.round(g.count ?? want(m, density)));
    this.list.push(m);
    return m;
  }

  /** Assigns particle ranges, scaling every mark down if they outgrow `share` of the field. */
  fit(f: Field, share = 0.82) {
    const total = this.list.reduce((s, m) => s + m.count, 0);
    const scale = Math.min(1, (f.n * share) / Math.max(1, total));
    let start = 0;
    for (const m of this.list) {
      m.count = Math.max(2, Math.floor(m.count * scale));
      m.start = start;
      start += m.count;
    }
    this.used = Math.min(start, f.n);
    if (this.owner.length !== f.n) this.owner = new Int32Array(f.n);
    let k = 0;
    for (let i = 0; i < f.n; i++) {
      while (
        k < this.list.length &&
        i >= this.list[k].start + this.list[k].count
      )
        k++;
      this.owner[i] = i < this.used ? k : -1;
    }
  }

  apply(f: Field, fr: Frame, { boost = 1, dustAlpha = 0.1 } = {}) {
    const pt: [number, number] = [0, 0];
    const vx = fr.visual.x;
    const vy = fr.visual.y;
    const time = fr.reduced ? 0 : fr.time;
    for (let i = 0; i < f.n; i++) {
      const o = this.owner[i];
      if (o < 0) {
        dust(f, i, fr, dustAlpha);
        continue;
      }
      const m = this.list[o];
      const k = i - m.start;
      const q = (k + 0.5) / m.count;
      const shown = q <= m.show + 1e-6;
      let x = 0;
      let y = 0;
      switch (m.kind) {
        case "box": {
          const per = 2 * (m.w + m.h);
          let d = ((q + (f.r1[i] - 0.5) * (0.6 / m.count)) % 1) * per;
          if (d < 0) d += per;
          const right = m.w;
          const bottom = right + m.h;
          const left = bottom + m.w;
          if (d < right) {
            x = m.x + d;
            y = m.y;
          } else if (d < bottom) {
            x = m.x + m.w;
            y = m.y + d - right;
          } else if (d < left) {
            x = m.x + m.w - (d - bottom);
            y = m.y + m.h;
          } else {
            x = m.x;
            y = m.y + m.h - (d - left);
          }
          break;
        }
        case "fill": {
          const cols = Math.max(
            1,
            Math.round(Math.sqrt((m.count * m.w) / Math.max(1, m.h))),
          );
          const rows = Math.ceil(m.count / cols);
          x = m.x + ((k % cols) + 0.15 + f.r1[i] * 0.7) * (m.w / cols);
          y =
            m.y + (Math.floor(k / cols) + 0.15 + f.r2[i] * 0.7) * (m.h / rows);
          break;
        }
        case "line":
        case "curve": {
          const head = Math.min(1, m.show);
          let t = m.flow ? (q + time * m.flow) % 1 : q;
          if (m.flow) t *= head;
          else if (!shown) t = head;
          if (m.kind === "line") {
            x = m.x + (m.x2 - m.x) * t;
            y = m.y + (m.y2 - m.y) * t;
          } else {
            bezierAt(sCurve(m.x, m.y, m.x2, m.y2), t, pt);
            x = pt[0];
            y = pt[1];
          }
          break;
        }
        case "ring": {
          const angle = -Math.PI / 2 + q * TAU;
          x = m.x + Math.cos(angle) * m.r;
          y = m.y + Math.sin(angle) * m.r;
          break;
        }
        case "disc": {
          const rr = m.r * Math.sqrt(f.r1[i]);
          x = m.x + Math.cos(f.r0[i] * TAU) * rr;
          y = m.y + Math.sin(f.r0[i] * TAU) * rr;
          break;
        }
      }
      if (m.spread) {
        // Flows widen into ribbons, so their spread is vertical only.
        if (m.kind !== "line" && m.kind !== "curve")
          x += gauss(f.r2[i], f.r3[i]) * m.spread;
        y += gauss(f.r3[i], f.r0[i]) * m.spread;
      } else if (m.kind !== "fill" && m.kind !== "disc") {
        x += gauss(f.r2[i], f.r3[i]) * 0.5;
        y += gauss(f.r3[i], f.r0[i]) * 0.5;
      }
      f.gx[i] = vx + x;
      f.gy[i] = vy + y;
      const visible = m.flow && m.kind !== "fill" ? true : shown;
      f.ga[i] = visible
        ? Math.min(1, m.a * (0.65 + 0.35 * f.r3[i]) * boost)
        : 0;
      f.gh[i] = m.tint;
      f.gc[i] = m.cls;
      if (m.size) f.gz[i] = m.size;
    }
  }
}

/**
 * Lines of monospace text as particle words: one fill mark per run of
 * non-space characters, so a document reads as text at a glance.
 */
export function textMarks(
  marks: Marks,
  lines: readonly string[],
  x: number,
  y: number,
  charW: number,
  lineH: number,
  density = 0.5,
) {
  const words: { mark: Mark; line: number; col: number; text: string }[] = [];
  lines.forEach((text, line) => {
    for (const match of text.matchAll(/\S+/g)) {
      const col = match.index ?? 0;
      const mark = marks.add(
        "fill",
        {
          x: x + col * charW,
          y: y + line * lineH + lineH * 0.22,
          w: match[0].length * charW,
          h: lineH * 0.5,
        },
        density,
      );
      words.push({ mark, line, col, text: match[0] });
    }
  });
  return words;
}
