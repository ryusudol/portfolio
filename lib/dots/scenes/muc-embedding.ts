import { lerp, rgba, smoothstep } from "../math";
import {
  EMERALD,
  onPaper,
  PURPLE,
  TABLEAU,
  TABLEAU_PAPER,
} from "../muc-colors";
import {
  AIRPLANE_SPRITE,
  CLASSES,
  confidence,
  type Embedding,
  embedding,
  FORGET,
  TRUTH,
} from "../muc-data";
import { dust } from "../shapes";
import {
  freeArea,
  label,
  Readouts,
  resetText,
  StageSize,
  Steps,
  stepAt,
} from "../story";
import type { Field, Frame, Palette, RGB, Scene } from "../types";

const STEP_AT = [0, 0.24, 0.5, 0.76] as const;
const N = TRUTH.length;
const [EMERALD_PAPER, PURPLE_PAPER] = onPaper([EMERALD, PURPLE]);
/** Images before this index are airplanes, with thumbnails and confidences. */
const AIRPLANES = 200;
const SHORT = [
  "plane",
  "auto",
  "bird",
  "cat",
  "deer",
  "dog",
  "frog",
  "horse",
  "ship",
  "truck",
];

type Plot = { x: number; y: number; s: number; pad: number };

/** Where each class's cluster sits in a model's embedding, for its label. */
type Anchor = { x: number; y: number };

/**
 * The comparator's Embedding Space view on the demo's real data: 2,000
 * training images through the original model (A) and, beside it, the
 * retrained model (B), then Random Labeling. Every image is one particle that
 * travels from its place in A to its place in B, so the airplanes (×) can be
 * followed across. Hovering a dot links the same image in both plots.
 */
export class EmbeddingScene implements Scene {
  private a: Plot = { x: 0, y: 0, s: 0, pad: 0 };
  private b: Plot = { x: 0, y: 0, s: 0, pad: 0 };
  private truth = new Uint8Array(N);
  private models: Record<"original" | "retrained" | "rl", Embedding> | null =
    null;
  private anchors: Record<string, (Anchor | null)[]> = {};
  /** The class each B particle currently shows, and how visible it is. */
  private bClass = new Uint8Array(N);
  private bShown = new Float32Array(N);
  private f: Field | null = null;
  private hover = -1;
  private sprite: HTMLImageElement | null = null;
  private p = 0;
  private morph = 0;
  private stage = new StageSize();
  private steps = new Steps();
  private readouts = new Readouts();
  private ink = true;

  layout(f: Field, fr: Frame) {
    this.stage.changed(fr);
    this.f = f;
    const area = freeArea(fr, 22);
    const title = 26;
    const gap = fr.compact ? 20 : 44;
    // Side by side, as the view draws them, unless stacking gives more room.
    const side = Math.min((area.w - gap) / 2, area.h - title);
    const stacked = Math.min(area.w, (area.h - 2 * title - gap) / 2);
    if (stacked > side * 1.15) {
      const s = stacked;
      const x = area.x + (area.w - s) / 2;
      this.a = { x, y: area.y + title, s, pad: s * 0.05 };
      this.b = { x, y: area.y + 2 * title + s + gap, s, pad: s * 0.05 };
    } else {
      const s = side;
      const x = area.x + (area.w - (2 * s + gap)) / 2;
      const y = area.y + title + (area.h - title - s) / 2;
      this.a = { x, y, s, pad: s * 0.05 };
      this.b = { x: x + s + gap, y, s, pad: s * 0.05 };
    }
    for (let i = 0; i < N; i++) this.truth[i] = TRUTH.charCodeAt(i) - 48;
    this.models = {
      original: embedding("original"),
      retrained: embedding("retrained"),
      rl: embedding("rl"),
    };
    for (const [name, e] of Object.entries(this.models))
      this.anchors[name] = this.clusterAnchors(e);
    if (!this.sprite && typeof Image !== "undefined") {
      this.sprite = new Image();
      this.sprite.src = AIRPLANE_SPRITE;
    }
    this.steps.collect(fr.section);
    this.readouts.collect(fr.section);
  }

  /** The top middle of each true class's cluster, or null if it has none. */
  private clusterAnchors(e: Embedding) {
    return CLASSES.map((_, c) => {
      const xs: number[] = [];
      const ys: number[] = [];
      for (let i = 0; i < N; i++) {
        if (this.truth[i] !== c) continue;
        xs.push(e.x[i]);
        ys.push(e.y[i]);
      }
      xs.sort((u, v) => u - v);
      ys.sort((u, v) => u - v);
      const q = (arr: number[], t: number) =>
        arr[Math.floor(t * (arr.length - 1))];
      // A spread-out class has no cluster to label.
      if (q(xs, 0.9) - q(xs, 0.1) > 0.24 || q(ys, 0.9) - q(ys, 0.1) > 0.24)
        return null;
      return { x: q(xs, 0.5), y: q(ys, 0.04) };
    });
  }

  private at(plot: Plot, u: number, v: number, out: [number, number]) {
    out[0] = plot.x + plot.pad + u * (plot.s - 2 * plot.pad);
    out[1] = plot.y + plot.pad + v * (plot.s - 2 * plot.pad);
    return out;
  }

  /** Plot B's coordinates for image `i`, between retrained and RL. */
  private bAt(i: number, out: [number, number]) {
    const m = this.models;
    if (!m) return out;
    const t = this.morph;
    return this.at(
      this.b,
      lerp(m.retrained.x[i], m.rl.x[i], t),
      lerp(m.retrained.y[i], m.rl.y[i], t),
      out,
    );
  }

  private inside(plot: Plot, x: number, y: number, fr: Frame) {
    const px = x - fr.visual.x - plot.x;
    const py = y - fr.visual.y - plot.y;
    return px >= 0 && py >= 0 && px <= plot.s && py <= plot.s;
  }

  repels(fr: Frame) {
    const ptr = fr.pointer;
    return !(
      ptr.active &&
      (this.inside(this.a, ptr.x, ptr.y, fr) ||
        this.inside(this.b, ptr.x, ptr.y, fr))
    );
  }

  /** The image under the pointer, or a demo airplane once the story ends. */
  private pick(f: Field, fr: Frame, step: number) {
    const ptr = fr.pointer;
    const overA = ptr.active && this.inside(this.a, ptr.x, ptr.y, fr);
    const overB =
      ptr.active && step >= 1 && this.inside(this.b, ptr.x, ptr.y, fr);
    if (overA || overB) {
      let best = 14 * 14;
      let hit = -1;
      const offset = overA ? 0 : N;
      for (let j = 0; j < N; j++) {
        const i = j + offset;
        const dx = f.x[i] - ptr.x;
        const dy = f.y[i] - ptr.y;
        const d = dx * dx + dy * dy;
        if (d < best) {
          best = d;
          hit = j;
        }
      }
      return hit;
    }
    if (step < 3 || fr.reduced) return -1;
    // Step through a few airplanes, one every two seconds.
    const k = Math.floor(fr.time / 2) % DEMO.length;
    return DEMO[k];
  }

  update(f: Field, fr: Frame) {
    if (this.stage.changed(fr)) this.layout(f, fr);
    const m = this.models;
    if (!m) return;
    this.f = f;
    const p = fr.progress;
    this.p = p;
    const step = stepAt(p, STEP_AT);
    this.steps.set(step);
    this.morph = smoothstep(0.5, 0.62, p);
    this.hover = this.pick(f, fr, step);
    f.classColors = this.ink ? TABLEAU : TABLEAU_PAPER;
    const boost = this.ink ? 1 : 1.3;
    const vx = fr.visual.x;
    const vy = fr.visual.y;
    const pa: [number, number] = [0, 0];
    const pb: [number, number] = [0, 0];
    const hover = this.hover;
    const dimOthers = hover >= 0 ? 0.45 : 1;

    for (let i = 0; i < f.n; i++) {
      if (i >= 2 * N) {
        dust(f, i, fr, 0.08);
        continue;
      }
      const j = i < N ? i : i - N;
      const forget = this.truth[j] === FORGET;
      const lit = j === hover ? 1 : dimOthers;
      f.gh[i] = 0;
      f.gj[i] = 0.12;
      this.at(this.a, m.original.x[j], m.original.y[j], pa);
      if (i < N) {
        f.gx[i] = vx + pa[0];
        f.gy[i] = vy + pa[1];
        f.gc[i] = m.original.pred[j] + 1;
        // Airplanes are drawn as crosses on top (see draw).
        f.ga[i] = forget ? 0 : Math.min(1, (0.5 + f.r3[i] * 0.3) * boost * lit);
        continue;
      }
      // Each image leaves A for its place in B, a little after its neighbours.
      const go = smoothstep(0.25 + f.r0[i] * 0.07, 0.33 + f.r0[i] * 0.07, p);
      this.bAt(j, pb);
      const bend = Math.sin(Math.PI * go) * 26 * (f.r1[i] - 0.5);
      f.gx[i] = vx + lerp(pa[0], pb[0], go);
      f.gy[i] = vy + lerp(pa[1], pb[1], go) + bend;
      const cls =
        go < 0.5
          ? m.original.pred[j]
          : this.morph < 0.5
            ? m.retrained.pred[j]
            : m.rl.pred[j];
      this.bClass[j] = cls;
      this.bShown[j] = go;
      f.gc[i] = cls + 1;
      f.ga[i] =
        forget || go <= 0.01
          ? 0
          : Math.min(1, (0.5 + f.r3[i] * 0.3) * boost * lit);
    }

    // The readouts: what B calls the airplanes, and whether they still cluster.
    if (step === 0) {
      this.readouts.write("called", "–");
      this.readouts.write("near", "–");
    } else if (this.morph < 0.5) {
      this.readouts.write("called", "ship 37% · bird 33%");
      this.readouts.write("near", "72%");
    } else {
      this.readouts.write("called", "bird 90%");
      this.readouts.write("near", "100%");
    }
  }

  draw(ctx: CanvasRenderingContext2D, fr: Frame, palette: Palette) {
    this.ink = palette.ink;
    const f = this.f;
    const m = this.models;
    if (!f || !m) return;
    const vx = fr.visual.x;
    const vy = fr.visual.y;
    const p = this.p;
    const colors = palette.ink ? TABLEAU : TABLEAU_PAPER;
    const green = palette.ink ? EMERALD : EMERALD_PAPER;
    const purple = palette.ink ? PURPLE : PURPLE_PAPER;
    const showB = smoothstep(0.26, 0.34, p);
    const size = fr.compact ? 10 : 11;

    // Titles, as the view names its two models.
    label(
      ctx,
      palette,
      "Model A · Original",
      vx + this.a.x + this.a.s / 2,
      vy + this.a.y - 12,
      {
        align: "center",
        size,
        color: green,
        alpha: 0.95,
      },
    );
    label(
      ctx,
      palette,
      "Model B · Retrained",
      vx + this.b.x + this.b.s / 2,
      vy + this.b.y - 12,
      {
        align: "center",
        size,
        color: purple,
        alpha: showB * (1 - this.morph),
      },
    );
    label(
      ctx,
      palette,
      "Model B · Random Labeling",
      vx + this.b.x + this.b.s / 2,
      vy + this.b.y - 12,
      {
        align: "center",
        size,
        color: purple,
        alpha: showB * this.morph,
      },
    );
    for (const plot of [this.a, this.b]) {
      ctx.strokeStyle = rgba(
        palette.muted,
        plot === this.a ? 0.14 : 0.14 * showB,
      );
      ctx.lineWidth = 1;
      ctx.strokeRect(vx + plot.x, vy + plot.y, plot.s, plot.s);
    }

    // Links from the airplanes in A to the same images in B.
    const links = smoothstep(0.34, 0.4, p) * (this.hover >= 0 ? 0.35 : 1);
    if (links > 0.01) {
      ctx.strokeStyle = rgba(palette.fg, 0.14 * links);
      ctx.beginPath();
      for (let j = 0; j < N; j += 1) {
        if (this.truth[j] !== FORGET || j % 8 !== 0) continue;
        ctx.moveTo(f.x[j], f.y[j]);
        ctx.lineTo(f.x[j + N], f.y[j + N]);
      }
      ctx.stroke();
    }

    // Airplanes as crosses, coloured by the class each model predicts.
    const arm = fr.compact ? 2.2 : 2.6;
    ctx.lineWidth = 1.1;
    for (let c = 0; c < colors.length; c++) {
      ctx.beginPath();
      let any = false;
      for (let j = 0; j < N; j++) {
        if (this.truth[j] !== FORGET) continue;
        if (m.original.pred[j] === c) {
          cross(ctx, f.x[j], f.y[j], arm);
          any = true;
        }
        if (this.bShown[j] > 0.05 && this.bClass[j] === c) {
          cross(ctx, f.x[j + N], f.y[j + N], arm);
          any = true;
        }
      }
      if (!any) continue;
      const dim = this.hover >= 0 ? 0.5 : 1;
      ctx.strokeStyle = rgba(colors[c], 0.95 * dim);
      ctx.stroke();
    }

    // Cluster names, above each class's cluster.
    this.names(
      ctx,
      palette,
      this.a,
      this.anchors.original,
      1,
      colors,
      vx,
      vy,
      size,
    );
    const bAnchors =
      this.morph < 0.5 ? this.anchors.retrained : this.anchors.rl;
    const swap = Math.abs(this.morph - 0.5) * 2;
    this.names(
      ctx,
      palette,
      this.b,
      bAnchors,
      showB * swap,
      colors,
      vx,
      vy,
      size,
    );

    this.linked(ctx, palette, f, fr);
    resetText(ctx);
  }

  private names(
    ctx: CanvasRenderingContext2D,
    palette: Palette,
    plot: Plot,
    anchors: (Anchor | null)[],
    alpha: number,
    colors: RGB[],
    vx: number,
    vy: number,
    size: number,
  ) {
    if (alpha < 0.02 || !anchors) return;
    const out: [number, number] = [0, 0];
    anchors.forEach((a, c) => {
      if (!a) return;
      this.at(plot, a.x, a.y, out);
      label(
        ctx,
        palette,
        c === FORGET ? "airplane ×" : CLASSES[c],
        vx + out[0],
        vy + out[1] - 9,
        {
          align: "center",
          size: size - 1.5,
          color: colors[c],
          alpha: alpha * 0.9,
        },
      );
    });
  }

  /** The hovered image, ringed in both plots and joined by a line. */
  private linked(
    ctx: CanvasRenderingContext2D,
    palette: Palette,
    f: Field,
    fr: Frame,
  ) {
    const j = this.hover;
    const m = this.models;
    if (j < 0 || !m) return;
    const ax = f.x[j];
    const ay = f.y[j];
    const bx = f.x[j + N];
    const by = f.y[j + N];
    const inB = this.bShown[j] > 0.9;
    ctx.strokeStyle = rgba(palette.fg, 0.9);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(ax, ay, 6, 0, Math.PI * 2);
    if (inB) {
      ctx.moveTo(bx + 6, by);
      ctx.arc(bx, by, 6, 0, Math.PI * 2);
    }
    ctx.stroke();
    if (inB) {
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();
    }
    this.tooltip(ctx, palette, fr, j, inB ? bx : ax, inB ? by : ay, inB);
  }

  /**
   * The card the view shows for an image. Airplanes get the image itself and
   * each model's confidence in every class, Model A above Model B.
   */
  private tooltip(
    ctx: CanvasRenderingContext2D,
    palette: Palette,
    fr: Frame,
    j: number,
    x: number,
    y: number,
    inB: boolean,
  ) {
    const m = this.models;
    if (!m) return;
    const compact = fr.compact;
    const green = palette.ink ? EMERALD : EMERALD_PAPER;
    const purple = palette.ink ? PURPLE : PURPLE_PAPER;
    const plane = j < AIRPLANES;
    const size = compact ? 8.5 : 10.5;
    const line = compact ? 12 : 15;
    const pad = compact ? 7 : 10;
    const img = plane ? (compact ? 40 : 68) : 0;
    const left = compact ? 92 : 132;
    const row = compact ? 8.5 : 12;
    const labelW = compact ? 30 : 42;
    const barW = compact ? 70 : 112;
    const w = pad * 2 + left + (plane ? 10 + labelW + barW : 0);
    const textH = 3 * line;
    const h =
      pad * 2 + Math.max(img + (img ? 6 : 0) + textH, plane ? 10 * row : 0);
    // Beside the image, flipped and clamped to stay on the stage.
    const stage = fr.visual;
    let cx = x + 14;
    if (cx + w > stage.x + stage.w) cx = x - 14 - w;
    cx = Math.max(stage.x, cx);
    const cy = Math.min(Math.max(stage.y, y - h / 2), stage.y + stage.h - h);
    ctx.fillStyle = rgba(palette.bg, 0.95);
    ctx.strokeStyle = rgba(palette.muted, 0.45);
    ctx.lineWidth = 1;
    ctx.fillRect(cx, cy, w, h);
    ctx.strokeRect(cx + 0.5, cy + 0.5, w - 1, h - 1);

    let ty = cy + pad;
    const sprite = this.sprite;
    if (plane && sprite?.complete && sprite.naturalWidth > 0) {
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(
        sprite,
        (j % 20) * 32,
        Math.floor(j / 20) * 32,
        32,
        32,
        cx + pad,
        ty,
        img,
        img,
      );
      ty += img + 6;
    }
    const a = confidence("original", j);
    const bModel = this.morph < 0.5 ? "retrained" : "rl";
    const b = plane ? confidence(bModel, j) : null;
    const aPred = m.original.pred[j];
    const bPred = this.bClass[j];
    const lines: [string, RGB][] = [
      [`true · ${CLASSES[this.truth[j]]}`, palette.fg],
      [
        plane
          ? `A · ${CLASSES[aPred]} ${Math.round(a[aPred] * 100)}%`
          : `A · ${CLASSES[aPred]}`,
        green,
      ],
    ];
    if (inB)
      lines.push([
        b
          ? `B · ${CLASSES[bPred]} ${Math.round(b[bPred] * 100)}%`
          : `B · ${CLASSES[bPred]}`,
        purple,
      ]);
    lines.forEach(([text, color], k) => {
      label(ctx, palette, text, cx + pad, ty + line * (k + 0.5), {
        size,
        color,
        alpha: 0.95,
      });
    });
    if (!plane) return;

    // Confidence in each class, as the view's tooltip charts it.
    const bx = cx + pad + left + 10;
    for (let c = 0; c < 10; c++) {
      const ry = cy + pad + c * row;
      label(ctx, palette, SHORT[c], bx + labelW - 4, ry + row / 2, {
        align: "right",
        size: size - 1.5,
        alpha: 0.8,
      });
      const x0 = bx + labelW;
      ctx.fillStyle = rgba(palette.muted, 0.18);
      ctx.fillRect(x0, ry + 1, barW, row - 2);
      ctx.fillStyle = rgba(green, 0.95);
      ctx.fillRect(
        x0,
        ry + 1,
        Math.max(1, a[c] * barW),
        b ? (row - 2) / 2 : row - 2,
      );
      if (b && inB) {
        ctx.fillStyle = rgba(purple, 0.95);
        ctx.fillRect(
          x0,
          ry + 1 + (row - 2) / 2,
          Math.max(1, b[c] * barW),
          (row - 2) / 2,
        );
      }
    }
  }
}

function cross(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.moveTo(x - r, y - r);
  ctx.lineTo(x + r, y + r);
  ctx.moveTo(x + r, y - r);
  ctx.lineTo(x - r, y + r);
}

/** Airplanes the view steps through when nobody is hovering. */
const DEMO = (() => {
  const picks: number[] = [];
  for (let i = 0; i < TRUTH.length && picks.length < 6; i++)
    if (TRUTH.charCodeAt(i) - 48 === FORGET && i % 29 === 3) picks.push(i);
  return picks.length > 0 ? picks : [0];
})();
