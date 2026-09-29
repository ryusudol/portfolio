import { clamp, rgba, smoothstep } from "../math";
import { TABLEAU, TABLEAU_PAPER } from "../muc-colors";
import { embedding, STARS } from "../muc-data";
import { dust } from "../shapes";
import { label, resetText } from "../story";
import type { Field, Frame, Palette, Scene } from "../types";

type Kind = "views" | "linked" | "stars" | "redraw";

type Chart = {
  el: HTMLElement;
  kind: Kind;
  rect: DOMRect | null;
  start: number;
  count: number;
};

/**
 * The comparator's layout, in fractions of the chart: Model Screening top
 * left, the embedding plots under it, and the Metrics view down the right.
 */
const PANELS = [
  { x: 0, y: 0, w: 0.57, h: 0.45, name: "Screening" },
  { x: 0, y: 0.53, w: 0.57, h: 0.47, name: "Embedding" },
  { x: 0.63, y: 0, w: 0.37, h: 1, name: "Metrics" },
];
const EDGE = 52;
/** Rows and columns of the screening table. */
const ROWS = 4;
const COLS = 22;
const TABLE = ROWS * COLS;
const SCATTER = 2 * 36;
const METRICS = 3 * 30;
/** Room for a panel's name inside its frame. */
const HEAD = 15;
const VIEW_DOTS = PANELS.length * EDGE + TABLE + SCATTER + METRICS;
/** Seconds between one pick of Model B and the next. */
const PICK = 3;

/** Every eighth of the demo's 2,000 images, in both models. */
const SAMPLE = 250;
/** The images the linking hover visits, all airplanes. */
const LINKS = [3, 11, 17, 5, 22, 8];
const STAR_DOTS = 3;
const REBUILT = [1133, 8];
const COUNT: Record<Kind, number> = {
  views: VIEW_DOTS,
  linked: 2 * SAMPLE,
  stars: STARS[STARS.length - 1] * STAR_DOTS,
  redraw: REBUILT[0] + REBUILT[1],
};

/**
 * The case study's results, each with a particle chart of its evidence: the
 * comparator's coordinated views lighting up as a new pair of models is
 * picked, the same image linked across two UMAP plots, one dot per GitHub
 * star as they arrived, and the 1,133 SVG nodes a hover used to rebuild next
 * to the 8 it touches now.
 */
export class MucResultsScene implements Scene {
  private charts: Chart[] = [];
  private clock = 0;
  private ink = true;

  layout(_f: Field, fr: Frame) {
    let start = 0;
    this.charts = Array.from(
      fr.section.querySelectorAll<HTMLElement>("[data-chart]"),
    ).map((el) => {
      const kind = el.dataset.chart as Kind;
      const count = COUNT[kind] ?? 0;
      const chart = { el, kind, rect: null, start, count };
      start += count;
      return chart;
    });
    this.clock = 0;
  }

  update(f: Field, fr: Frame) {
    this.clock = fr.reduced ? 10 : this.clock + fr.dt;
    const t = smoothstep(0.4, 2.6, this.clock);
    const boost = this.ink ? 1 : 1.3;
    f.classColors = this.ink ? TABLEAU : TABLEAU_PAPER;
    for (const c of this.charts) c.rect = c.el.getBoundingClientRect();

    let chart = 0;
    for (let i = 0; i < f.n; i++) {
      while (
        chart < this.charts.length &&
        i >= this.charts[chart].start + this.charts[chart].count
      )
        chart++;
      const c = this.charts[chart];
      if (!c || !c.rect || c.rect.width < 1 || i < c.start) {
        dust(f, i, fr, 0.12);
        continue;
      }
      const k = i - c.start;
      f.gh[i] = 0;
      f.gj[i] = 0.25;
      if (!this.ink) f.gz[i] = f.size[i] * 1.3;
      if (c.kind === "views") this.views(f, i, k, c.rect, t, fr);
      else if (c.kind === "linked") this.linked(f, i, k, c.rect, t, fr);
      else if (c.kind === "stars") this.stars(f, i, k, c.rect, t);
      else this.redraw(f, i, k, c.rect, t, fr);
      f.ga[i] = Math.min(1, f.ga[i] * boost);
    }
  }

  /** Where the current pick is on its way through the views, 0 to 1. */
  private sweep(fr: Frame) {
    return fr.reduced ? 1 : (this.clock % PICK) / PICK;
  }

  private panel(r: DOMRect, n: number) {
    const p = PANELS[n];
    return {
      x: r.left + p.x * r.width,
      y: r.top + p.y * r.height,
      w: p.w * r.width,
      h: p.h * r.height,
    };
  }

  /** A panel's area under its name. */
  private body(r: DOMRect, n: number) {
    const p = this.panel(r, n);
    return { x: p.x + 6, y: p.y + HEAD, w: p.w - 12, h: p.h - HEAD - 5 };
  }

  /**
   * The views as the comparator lays them out. Every few seconds a new row is
   * picked in the table and the pick spreads to the embedding plots and the
   * metrics, since every view reads the same Model A and Model B.
   */
  private views(
    f: Field,
    i: number,
    k: number,
    r: DOMRect,
    t: number,
    fr: Frame,
  ) {
    const s = this.sweep(fr);
    const pickRow = Math.floor(this.clock / PICK) % ROWS;
    f.gz[i] = 1.6;
    if (k < PANELS.length * EDGE) {
      // Each view's frame, traced around its edge.
      const n = Math.floor(k / EDGE);
      const p = this.panel(r, n);
      const u = (k % EDGE) / EDGE;
      const d = u * 2 * (p.w + p.h);
      let x = p.x;
      let y = p.y + p.h - (d - 2 * p.w - p.h);
      if (d < p.w) {
        x = p.x + d;
        y = p.y;
      } else if (d < p.w + p.h) {
        x = p.x + p.w;
        y = p.y + d - p.w;
      } else if (d < 2 * p.w + p.h) {
        x = p.x + p.w - (d - p.w - p.h);
        y = p.y + p.h;
      }
      f.gx[i] = x;
      f.gy[i] = y;
      f.ga[i] = t > 0.05 ? 0.3 : 0;
      f.gz[i] = 1.2;
      return;
    }
    let q = k - PANELS.length * EDGE;
    if (q < TABLE) {
      // Model Screening, one row per model, the picked one lit.
      const b = this.body(r, 0);
      const row = Math.floor(q / COLS);
      const col = q % COLS;
      f.gx[i] = b.x + (col / (COLS - 1)) * b.w;
      f.gy[i] = b.y + (row + 0.5) * (b.h / ROWS);
      const lit = row === pickRow && s < 0.85;
      f.ga[i] = t > 0.2 ? (lit ? 1 : 0.35) : 0;
      f.gh[i] = lit ? 1 : 0;
      return;
    }
    q -= TABLE;
    if (q < SCATTER) {
      // Two embedding plots, side by side, re-drawn for the new pick.
      const b = this.body(r, 1);
      const side = Math.floor(q / 36);
      const a = f.r1[i] * Math.PI * 2;
      const rad = Math.sqrt(f.r2[i]) * 0.5;
      const cx = b.x + b.w * (side ? 0.75 : 0.25);
      const cy = b.y + b.h * 0.5;
      f.gx[i] = cx + Math.cos(a) * rad * b.w * 0.42;
      f.gy[i] = cy + Math.sin(a) * rad * b.h;
      f.gc[i] = 1 + Math.floor(f.r3[i] * 10);
      const lit = s > 0.15 && s < 0.85;
      f.ga[i] = t > 0.4 ? (lit ? 0.95 : 0.35) : 0;
      return;
    }
    q -= SCATTER;
    // Metrics, three charts stacked: accuracy bars, the matrix, similarity.
    const b = this.body(r, 2);
    const chart = Math.floor(q / 30);
    const j = q % 30;
    const slot = b.h / 3;
    const top = b.y + chart * slot;
    const h = slot - 8;
    if (chart === 0) {
      const bar = Math.floor(j / 3);
      const lvl = j % 3;
      f.gx[i] = b.x + (bar / 9) * b.w;
      f.gy[i] = top + h - lvl * 3.5 - (bar % 3) * 2.5;
    } else if (chart === 1) {
      f.gx[i] = b.x + ((j % 6) / 5) * b.w;
      f.gy[i] = top + (Math.floor(j / 6) / 4) * h;
    } else {
      const u = j / 29;
      f.gx[i] = b.x + u * b.w;
      f.gy[i] = top + (u < 0.7 ? 0.1 : 0.1 + (u - 0.7) * 2.5) * h;
    }
    const lit = s > 0.3 + chart * 0.1 && s < 0.9;
    f.ga[i] = t > 0.6 ? (lit ? 1 : 0.35) : 0;
    f.gh[i] = lit ? 0.8 : 0;
  }

  /**
   * Two of the demo's UMAP plots, the original model and the retrained one,
   * each point one image colored by predicted class. A hover on one image
   * draws a line to the same image in the other plot, as the view does.
   */
  private linked(
    f: Field,
    i: number,
    k: number,
    r: DOMRect,
    t: number,
    fr: Frame,
  ) {
    const side = k < SAMPLE ? 0 : 1;
    const n = (k % SAMPLE) * 8;
    const e = embedding(side ? "retrained" : "original");
    const box = this.plotBox(r, side);
    f.gx[i] = box.x + e.x[n] * box.w;
    f.gy[i] = box.y + e.y[n] * box.h;
    f.gc[i] = e.pred[n] + 1;
    f.gz[i] = 1.8;
    const hovered = this.hovered(fr) === k % SAMPLE;
    f.ga[i] = t > 0.05 ? (hovered ? 1 : 0.75) : 0;
    f.gh[i] = 0;
    if (hovered) f.gz[i] = 4;
  }

  /** One of the two plots, leaving a line under them for their names. */
  private plotBox(r: DOMRect, side: number) {
    const w = (r.width - 16) / 2;
    return {
      x: r.left + side * (w + 16),
      y: r.top + 2,
      w,
      h: r.height - 18,
    };
  }

  /** Which sampled image the replayed hover is on. */
  private hovered(fr: Frame) {
    const hop = fr.reduced ? 0 : Math.floor(this.clock / 1.8);
    return LINKS[hop % LINKS.length];
  }

  /** One dot per star, in the month it arrived, climbing to 101. */
  private stars(f: Field, i: number, k: number, r: DOMRect, t: number) {
    const star = Math.floor(k / STAR_DOTS);
    const total = STARS[STARS.length - 1];
    let month = 0;
    while (STARS[month] <= star) month++;
    const before = month === 0 ? 0 : STARS[month - 1];
    const within = (star - before + 0.5) / Math.max(1, STARS[month] - before);
    const u = (month + within) / STARS.length;
    const base = r.top + r.height - 16;
    const h = r.height - 26;
    f.gx[i] = r.left + u * (r.width * 0.84) + (f.r1[i] - 0.5) * 2;
    f.gy[i] = base - ((star + 1) / total) * h + (f.r2[i] - 0.5) * 2;
    f.ga[i] = u <= t ? 0.85 : 0;
  }

  private blocks(r: DOMRect) {
    const w = r.width * 0.7;
    const h = r.height - 28;
    const s = Math.sqrt((w * h) / REBUILT[0]);
    const cols = Math.floor(w / s);
    return { cols, s, top: r.top + 14 };
  }

  /** The nodes one hover rebuilt, flickering as they did, next to today's 8. */
  private redraw(
    f: Field,
    i: number,
    k: number,
    r: DOMRect,
    t: number,
    fr: Frame,
  ) {
    const b = this.blocks(r);
    if (k < REBUILT[0]) {
      const col = k % b.cols;
      const row = Math.floor(k / b.cols);
      const cycle = fr.reduced ? 1 : (this.clock % 2.4) / 2.4;
      const gone = cycle < 0.12 + f.r3[i] * 0.1;
      f.gx[i] = r.left + (col + 0.5) * b.s;
      f.gy[i] = b.top + (row + 0.5) * b.s - (gone ? 6 : 0);
      f.ga[i] = t > 0.05 && !gone ? 0.5 : 0;
      f.gz[i] = b.s * 0.6;
      return;
    }
    const d = k - REBUILT[0];
    const x = r.left + r.width * 0.8 + (d % 4) * 7;
    const y = b.top + 30 + Math.floor(d / 4) * 7;
    f.gx[i] = x;
    f.gy[i] = y;
    f.ga[i] = t > 0.6 ? 1 : 0;
    f.gz[i] = 3.4;
    f.gh[i] = 1;
  }

  draw(ctx: CanvasRenderingContext2D, fr: Frame, palette: Palette) {
    this.ink = palette.ink;
    const t = smoothstep(0.4, 2.6, this.clock);
    const size = 9.5;
    for (const c of this.charts) {
      const r = c.rect;
      if (!r || r.width < 1) continue;
      if (c.kind === "views") {
        PANELS.forEach((_, n) => {
          const p = this.panel(r, n);
          label(ctx, palette, PANELS[n].name, p.x + 6, p.y + 8, {
            size: 8.5,
            alpha: clamp(t * 3) * 0.75,
          });
        });
      } else if (c.kind === "linked") {
        const k = this.hovered(fr);
        const n = k * 8;
        const a = this.plotBox(r, 0);
        const b = this.plotBox(r, 1);
        const ea = embedding("original");
        const eb = embedding("retrained");
        const x0 = a.x + ea.x[n] * a.w;
        const y0 = a.y + ea.y[n] * a.h;
        const x1 = b.x + eb.x[n] * b.w;
        const y1 = b.y + eb.y[n] * b.h;
        const phase = fr.reduced ? 1 : (this.clock % 1.8) / 1.8;
        const grow = smoothstep(0.05, 0.35, phase) * clamp(t * 2);
        ctx.strokeStyle = rgba(palette.fg, 0.8 * grow);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x0 + (x1 - x0) * grow, y0 + (y1 - y0) * grow);
        ctx.stroke();
        label(ctx, palette, "original", a.x, r.bottom - 4, {
          size: 9,
          alpha: clamp(t * 3) * 0.75,
        });
        label(ctx, palette, "retrained", b.x, r.bottom - 4, {
          size: 9,
          alpha: clamp(t * 3) * 0.75,
        });
      } else if (c.kind === "stars") {
        const base = r.top + r.height - 4;
        label(ctx, palette, "Dec 2024", r.left, base, { size: 9, alpha: 0.75 });
        label(ctx, palette, "Aug 2026", r.left + r.width * 0.84, base, {
          align: "right",
          size: 9,
          alpha: 0.75,
        });
        ctx.strokeStyle = rgba(palette.muted, 0.3);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(r.left, r.top + r.height - 15);
        ctx.lineTo(r.left + r.width * 0.86, r.top + r.height - 15);
        ctx.stroke();
      } else {
        label(ctx, palette, "before  1,133", r.left, r.top + 4, {
          size,
          alpha: clamp(t * 3) * 0.85,
        });
        label(ctx, palette, "after  8", r.left + r.width * 0.8, r.top + 4, {
          size,
          color: palette.accent,
          alpha: smoothstep(0.6, 0.7, t),
        });
      }
    }
    resetText(ctx);
  }
}
