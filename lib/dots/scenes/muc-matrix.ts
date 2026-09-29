import { lerp, rgba, smoothstep } from "../math";
import { CLASSES, FORGET, MATRIX } from "../muc-data";
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

const STEP_AT = [0, 0.26, 0.5, 0.74] as const;
const K = CLASSES.length;
/** The cell the story ends on: airplanes predicted as birds. */
const BIRD = 2;
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
const GOLDEN = Math.PI * (3 - Math.sqrt(5));

/** d3.interpolateTurbo, which the comparator's bubble matrix colors with. */
function turbo(t: number): RGB {
  const x = Math.max(0, Math.min(1, t));
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return [
    c(
      34.61 +
        x *
          (1172.33 -
            x * (10793.56 - x * (33300.12 - x * (38394.49 - x * 14825.05)))),
    ),
    c(
      23.31 +
        x *
          (557.33 + x * (1225.33 - x * (3574.96 - x * (1073.77 + x * 707.56)))),
    ),
    c(
      27.2 +
        x *
          (3211.1 -
            x * (15327.97 - x * (27814 - x * (22569.18 - x * 6838.66)))),
    ),
  ];
}

/** Ten bins of the view's scale, turbo(0.05 + 0.95 × confidence). */
const BINS = Array.from({ length: 10 }, (_, k) =>
  turbo(0.05 + 0.95 * ((k + 0.5) / 10)),
);
const bin = (conf: number) => Math.min(9, Math.floor(conf * 10));

type Grid = { x: number; y: number; cell: number; g: number };

/**
 * Random Labeling's Prediction Matrix, real values from the demo. It starts
 * as the first design, one bubble per cell sized by the proportion of
 * predictions and colored by the average confidence on the view's turbo
 * scale, where small bubbles give their color away. It then becomes the
 * shipped design, each cell split along its diagonal with the proportion in
 * the lower-left triangle and the confidence in the upper-right. Hovering a
 * cell reads out both numbers.
 */
export class MatrixScene implements Scene {
  private grid: Grid = { x: 0, y: 0, cell: 0, g: 6 };
  private p = 0;
  private split = 0;
  private hover = -1;
  private stage = new StageSize();
  private steps = new Steps();
  private readouts = new Readouts();
  private ink = true;

  layout(_f: Field, fr: Frame) {
    this.stage.changed(fr);
    const area = freeArea(fr, 18);
    const compact = fr.compact;
    const left = compact ? 50 : 80;
    const below = compact ? 50 : 58;
    const above = compact ? 46 : 36;
    const cell = Math.floor(
      Math.min((area.w - left) / K, (area.h - below - above) / K),
    );
    const w = cell * K;
    this.grid = {
      x: area.x + left + (area.w - left - w) / 2,
      y: area.y + above + (area.h - above - below - w) / 2,
      cell,
      g: cell >= 42 ? 7 : cell >= 30 ? 6 : 5,
    };
    this.steps.collect(fr.section);
    this.readouts.collect(fr.section);
  }

  /** The cell under the pointer, as row × K + column, or -1. */
  private cellAt(fr: Frame) {
    const ptr = fr.pointer;
    const { x, y, cell } = this.grid;
    if (!ptr.active || cell <= 0) return -1;
    const col = Math.floor((ptr.x - fr.visual.x - x) / cell);
    const row = Math.floor((ptr.y - fr.visual.y - y) / cell);
    if (col < 0 || row < 0 || col >= K || row >= K) return -1;
    return row * K + col;
  }

  repels(fr: Frame) {
    return this.cellAt(fr) < 0;
  }

  update(f: Field, fr: Frame) {
    if (this.stage.changed(fr)) this.layout(f, fr);
    const { x: gx, y: gy, cell, g } = this.grid;
    if (cell <= 0) return;
    const p = fr.progress;
    this.p = p;
    const step = stepAt(p, STEP_AT);
    this.steps.set(step);
    this.hover = this.cellAt(fr);
    this.readout(step);
    const split = smoothstep(0.5, 0.62, p);
    this.split = split;
    f.classColors = BINS;
    const boost = this.ink ? 1 : 1.3;
    const vx = fr.visual.x;
    const vy = fr.visual.y;
    const per = g * g;
    const inset = cell * 0.06;
    const inner = cell - 2 * inset;

    for (let i = 0; i < f.n; i++) {
      const c = Math.floor(i / per);
      if (c >= K * K) {
        dust(f, i, fr, 0.08);
        continue;
      }
      const row = Math.floor(c / K);
      const col = c % K;
      const k = i - c * per;
      const proportion = MATRIX.proportion[row][col];
      const conf = MATRIX.confidence[row][col];
      const cx = gx + col * cell + cell / 2;
      const cy = gy + row * cell + cell / 2;

      // First design: a disc, its area the proportion, its color the
      // confidence, drawn at the view's 0.7 opacity.
      const shown =
        proportion < 0.002 ? 0 : Math.max(1, Math.round(per * proportion));
      let bx = cx;
      let by = cy;
      let ba = 0;
      if (k < shown) {
        const radius = inner * 0.5 * Math.sqrt(proportion);
        const r = radius * Math.sqrt((k + 0.5) / shown);
        bx = cx + Math.cos(k * GOLDEN) * r;
        by = cy + Math.sin(k * GOLDEN) * r;
        // Brighter on the dark theme, where 0.7 reads dim.
        ba = this.ink ? 0.9 : 0.7;
      }

      // Shipped design: proportion fills the lower-left, confidence the
      // upper-right.
      const lx = k % g;
      const ly = Math.floor(k / g);
      const sx = gx + col * cell + inset + ((lx + 0.5) / g) * inner;
      const sy = gy + row * cell + inset + ((ly + 0.5) / g) * inner;
      const value = ly > lx ? proportion : ly < lx ? conf : -1;
      const sa = value < 0.002 ? 0 : 0.12 + 0.84 * value;

      let alpha = lerp(ba, sa, split);
      // A hovered cell takes over; otherwise step 2 points at the airplane
      // row and the ending at its bird cell.
      const hovered = this.hover === c;
      if (this.hover >= 0) {
        if (!hovered) alpha *= 0.45;
      } else {
        if (step === 1 && row !== FORGET) alpha *= 0.3;
        if (step === 3 && !(row === FORGET && col === BIRD)) alpha *= 0.55;
      }
      const focus =
        hovered ||
        (this.hover < 0 && step === 3 && row === FORGET && col === BIRD);
      f.gx[i] = vx + lerp(bx, sx, split);
      f.gy[i] = vy + lerp(by, sy, split);
      f.ga[i] = Math.min(1, alpha * boost);
      f.gc[i] = split < 0.5 ? bin(conf) + 1 : 0;
      f.gh[i] = focus && split >= 0.5 ? 0.9 : 0;
      f.gj[i] = 0.08;
      f.gz[i] = (inner / g) * 0.7;
    }
  }

  /** The hovered cell's numbers, or the cell the story is about. */
  private readout(step: number) {
    const c = this.hover >= 0 ? this.hover : step >= 1 ? FORGET * K + BIRD : -1;
    if (c < 0) {
      this.readouts.write("cell", "–");
      this.readouts.write("proportion", "–");
      this.readouts.write("confidence", "–");
      return;
    }
    const row = Math.floor(c / K);
    const col = c % K;
    this.readouts.write("cell", `${CLASSES[row]} → ${CLASSES[col]}`);
    this.readouts.write("proportion", MATRIX.proportion[row][col].toFixed(2));
    this.readouts.write("confidence", MATRIX.confidence[row][col].toFixed(2));
  }

  draw(ctx: CanvasRenderingContext2D, fr: Frame, palette: Palette) {
    this.ink = palette.ink;
    const { x: gx, y: gy, cell } = this.grid;
    if (cell <= 0) return;
    const vx = fr.visual.x;
    const vy = fr.visual.y;
    const compact = fr.compact;
    const step = stepAt(this.p, STEP_AT);
    const size = compact ? 9 : 10;
    const x0 = vx + gx;
    const y0 = vy + gy;
    const w = cell * K;
    const hoverRow = this.hover >= 0 ? Math.floor(this.hover / K) : -1;
    const hoverCol = this.hover >= 0 ? this.hover % K : -1;

    // Cell grid, faint, so empty cells still read as cells.
    ctx.strokeStyle = rgba(palette.muted, 0.12);
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let k = 0; k <= K; k++) {
      ctx.moveTo(x0 + k * cell, y0);
      ctx.lineTo(x0 + k * cell, y0 + w);
      ctx.moveTo(x0, y0 + k * cell);
      ctx.lineTo(x0 + w, y0 + k * cell);
    }
    ctx.stroke();

    const names = compact ? SHORT : CLASSES;
    names.forEach((name, k) => {
      const forget = k === FORGET;
      const text = forget ? `${name} ×` : name;
      label(ctx, palette, text, x0 - 8, y0 + (k + 0.5) * cell, {
        align: "right",
        size,
        color:
          k === hoverRow || (forget && step === 1 && hoverRow < 0)
            ? palette.accent
            : palette.muted,
        alpha: 0.9,
      });
      ctx.save();
      ctx.translate(x0 + (k + 0.5) * cell, y0 + w + 8);
      ctx.rotate(-Math.PI / 4);
      label(ctx, palette, text, 0, 0, {
        align: "right",
        size,
        color: k === hoverCol ? palette.accent : palette.muted,
        alpha: 0.9,
      });
      ctx.restore();
    });
    const axis = "true class ↓  ·  predicted class →";
    if (!compact) label(ctx, palette, axis, x0, y0 - 14, { size, alpha: 0.7 });

    // The legend switches with the design, and moves up a line when it
    // would run into the axis label.
    ctx.font = `${size}px ${palette.mono}`;
    const room = w - ctx.measureText(axis).width - 20;
    const lx = x0 + w;
    const ly = y0 - (compact || room < this.legendWidth(ctx) ? 32 : 14);
    this.bubbleLegend(ctx, palette, lx, ly, size, 1 - this.split, compact);
    if (this.split > 0.02) this.splitLegend(ctx, palette, lx, ly, size);

    if (step === 1 && this.hover < 0) {
      ctx.strokeStyle = rgba(palette.accent, 0.7);
      ctx.strokeRect(x0, y0 + FORGET * cell, w, cell);
    }
    if (this.hover >= 0) {
      ctx.strokeStyle = rgba(palette.accent, 0.9);
      ctx.strokeRect(x0 + hoverCol * cell, y0 + hoverRow * cell, cell, cell);
    } else if (step === 3) {
      const a = smoothstep(0.76, 0.8, this.p);
      const cx = x0 + BIRD * cell;
      const cy = y0 + FORGET * cell;
      ctx.strokeStyle = rgba(palette.accent, 0.9 * a);
      ctx.strokeRect(cx, cy, cell, cell);
      label(
        ctx,
        palette,
        "90% of airplanes → bird, at 0.16",
        compact ? x0 : cx + cell + 10,
        compact ? y0 - 14 : cy + cell / 2,
        {
          size: compact ? 9.5 : 10.5,
          color: palette.accent,
          alpha: a,
        },
      );
    }
    resetText(ctx);
  }

  /** The wider of the two legends, in the current font. */
  private legendWidth(ctx: CanvasRenderingContext2D) {
    const text = (t: string) => ctx.measureText(t).width;
    const bubble =
      72 + 8 + text("confidence") + 14 + text("size = proportion ·");
    const split = text("proportion") + text("confidence") + 2 * 9 + 31;
    return Math.max(bubble, split);
  }

  /** Bubble size is proportion, and color is confidence on the turbo scale. */
  private bubbleLegend(
    ctx: CanvasRenderingContext2D,
    palette: Palette,
    right: number,
    y: number,
    size: number,
    alpha: number,
    compact: boolean,
  ) {
    if (alpha < 0.02) return;
    const barW = 72;
    const x = right - barW;
    for (let k = 0; k < 24; k++) {
      ctx.fillStyle = rgba(turbo(0.05 + 0.95 * (k / 23)), 0.85 * alpha);
      ctx.fillRect(x + (k / 24) * barW, y - 4, barW / 24 + 0.5, 8);
    }
    ctx.font = `${size}px ${palette.mono}`;
    label(ctx, palette, "confidence", x - 8, y, {
      align: "right",
      size,
      color: palette.fg,
      alpha: alpha * 0.9,
    });
    // Phones keep just the color scale; the caption explains size.
    if (compact) return;
    const confW = ctx.measureText("confidence").width;
    label(ctx, palette, "size = proportion ·", x - confW - 14, y, {
      align: "right",
      size,
      color: palette.fg,
      alpha: alpha * 0.9,
    });
  }

  /** The split cell's two triangles and what each holds. */
  private splitLegend(
    ctx: CanvasRenderingContext2D,
    palette: Palette,
    right: number,
    y: number,
    size: number,
  ) {
    const a = this.split;
    const t = 9;
    const conf = "confidence";
    ctx.font = `${size}px ${palette.mono}`;
    const cw = ctx.measureText(conf).width;
    const pw = ctx.measureText("proportion").width;
    const confX = right - cw - t - 6;
    const propX = confX - pw - t - 20;
    ctx.fillStyle = rgba(palette.fg, 0.85 * a);
    ctx.beginPath();
    ctx.moveTo(propX, y - t / 2);
    ctx.lineTo(propX, y + t / 2);
    ctx.lineTo(propX + t, y + t / 2);
    ctx.closePath();
    ctx.fill();
    label(ctx, palette, "proportion", propX + t + 5, y, {
      size,
      color: palette.fg,
      alpha: a * 0.9,
    });
    ctx.beginPath();
    ctx.moveTo(confX, y - t / 2);
    ctx.lineTo(confX + t, y - t / 2);
    ctx.lineTo(confX + t, y + t / 2);
    ctx.closePath();
    ctx.fill();
    label(ctx, palette, conf, confX + t + 5, y, {
      size,
      color: palette.fg,
      alpha: a * 0.9,
    });
  }
}
