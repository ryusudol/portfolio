import { rgba, smoothstep } from "../math";
import { METRIC, onPaper } from "../muc-colors";
import { MODELS, type ModelRow } from "../muc-data";
import { dust } from "../shapes";
import {
  fmt,
  freeArea,
  label,
  resetText,
  StageSize,
  Steps,
  stepAt,
} from "../story";
import type { Field, Frame, Palette, Scene } from "../types";

const STEP_AT = [0, 0.3, 0.56, 0.8] as const;
const RETRAINED = 1;
const RL = 3;
/** The longest run time, retraining, fills an RT bar. */
const MAX_RT = 3519.4;
const METRIC_PAPER = onPaper(METRIC);

type Column = {
  /** The column's full name, over two lines. */
  name: [string, string];
  /** 0 accuracy, 1 efficiency, 2 privacy, as the comparator colors them. */
  group: number;
  value: (m: ModelRow) => number | null;
  text: (m: ModelRow) => string;
};

const COLUMNS: Column[] = [
  {
    name: ["Unlearning", "Accuracy"],
    group: 0,
    value: (m) => m.ua,
    text: (m) => m.ua.toFixed(3),
  },
  {
    name: ["Retain", "Accuracy"],
    group: 0,
    value: (m) => m.ra,
    text: (m) => m.ra.toFixed(3),
  },
  {
    name: ["Run", "Time"],
    group: 1,
    value: (m) => (m.rt === null ? null : m.rt / MAX_RT),
    text: (m) => (m.rt === null ? "–" : `${fmt(m.rt)} s`),
  },
  {
    name: ["Privacy", "Score"],
    group: 2,
    value: (m) => m.ps,
    text: (m) => (m.ps === null ? "–" : m.ps.toFixed(3)),
  },
];

type Geometry = {
  nameX: number;
  top: number;
  headerH: number;
  rowH: number;
  colX: number[];
  colW: number;
  barW: number;
  barH: number;
  cols: number;
  rows: number;
  gap: number;
};

/**
 * The demo's Model Screening table for forget class "airplane", replayed in
 * dots. Accuracy fills first, then run time, then Random Labeling's accuracy
 * lines up with retraining's exactly, and last the privacy column shows the
 * one number where it falls apart.
 */
export class ScreenScene implements Scene {
  private g: Geometry | null = null;
  private per = 0;
  private p = 0;
  private stage = new StageSize();
  private steps = new Steps();
  private ink = true;

  layout(_f: Field, fr: Frame) {
    this.stage.changed(fr);
    const area = freeArea(fr, 20);
    const compact = fr.compact;
    const nameW = compact ? 50 : 132;
    const headerH = compact ? 46 : 54;
    const rowH = Math.min(
      (area.h - headerH) / MODELS.length,
      compact ? 64 : 88,
    );
    const tableH = headerH + rowH * MODELS.length;
    const colW = (area.w - nameW) / COLUMNS.length;
    const gap = compact ? 3 : 3.4;
    const barW = colW * (compact ? 0.5 : 0.6);
    const barH = Math.min(rowH * 0.4, 26);
    this.g = {
      nameX: area.x,
      top: area.y + Math.max(0, (area.h - tableH) / 2),
      headerH,
      rowH,
      colX: COLUMNS.map((_, c) => area.x + nameW + c * colW),
      colW,
      barW,
      barH,
      cols: Math.max(6, Math.floor(barW / gap)),
      rows: Math.max(3, Math.floor(barH / gap)),
      gap,
    };
    this.per = this.g.cols * this.g.rows;
    this.steps.collect(fr.section);
  }

  /** How far each column has filled in, by scroll. */
  private reveal(c: number, p: number) {
    if (c < 2) return smoothstep(0.02, 0.2, p);
    if (c === 2) return smoothstep(0.32, 0.5, p);
    return smoothstep(0.8, 0.95, p);
  }

  /** Rows and columns the current step points at stay bright; others dim. */
  private emphasis(row: number, col: number, step: number) {
    if (step === 1) return col === 2 ? 1 : 0.45;
    if (step === 2)
      return (row === RL || row === RETRAINED) && col < 2 ? 1 : 0.3;
    if (step === 3) {
      const pair = row === RL || row === RETRAINED;
      return col === 3 ? (pair ? 1 : 0.5) : 0.3;
    }
    return 1;
  }

  update(f: Field, fr: Frame) {
    if (this.stage.changed(fr)) this.layout(f, fr);
    const g = this.g;
    if (!g) return;
    const p = fr.progress;
    this.p = p;
    const step = stepAt(p, STEP_AT);
    this.steps.set(step);
    f.classColors = this.ink ? METRIC : METRIC_PAPER;
    const boost = this.ink ? 1 : 1.35;
    const vx = fr.visual.x;
    const vy = fr.visual.y;
    const cells = MODELS.length * COLUMNS.length;

    for (let i = 0; i < f.n; i++) {
      const cell = Math.floor(i / this.per);
      if (cell >= cells) {
        dust(f, i, fr, 0.1);
        continue;
      }
      const row = Math.floor(cell / COLUMNS.length);
      const col = cell % COLUMNS.length;
      const k = i - cell * this.per;
      const column = COLUMNS[col];
      const value = column.value(MODELS[row]);
      const cx = k % g.cols;
      const cy = Math.floor(k / g.cols);
      const cellY = g.top + g.headerH + row * g.rowH + g.rowH / 2;
      const x = g.colX[col] + (cx + 0.5) * g.gap;
      const y = cellY - g.barH / 2 + (cy + 0.5) * (g.barH / g.rows);
      const reveal = this.reveal(col, p);
      // At least one lit column for any nonzero value, so 11 s still shows.
      const lit =
        value !== null &&
        value > 0.0005 &&
        cx < Math.max(1, value * g.cols * reveal) &&
        reveal > 0.02;
      const em = this.emphasis(row, col, step);
      f.gx[i] = vx + x;
      f.gy[i] = vy + y;
      f.gh[i] = 0;
      f.gj[i] = 0.1;
      f.gz[i] = g.gap * 0.62;
      if (lit) {
        f.ga[i] = Math.min(1, (0.8 + f.r3[i] * 0.2) * em * boost);
        f.gc[i] = column.group + 1;
      } else {
        f.ga[i] = value === null ? 0 : 0.08 * reveal * boost;
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, fr: Frame, palette: Palette) {
    this.ink = palette.ink;
    const g = this.g;
    if (!g) return;
    const vx = fr.visual.x;
    const vy = fr.visual.y;
    const p = this.p;
    const step = stepAt(p, STEP_AT);
    const compact = fr.compact;
    const colors = palette.ink ? METRIC : METRIC_PAPER;
    const size = compact ? 9.5 : 10.5;

    // Column headers, colored like the comparator's metric groups.
    COLUMNS.forEach((column, c) => {
      const x = vx + g.colX[c];
      const y = vy + g.top + 12;
      const alpha = this.reveal(c, p) > 0.02 ? 1 : 0.35;
      column.name.forEach((line, k) => {
        label(ctx, palette, line, x, y + k * (compact ? 13 : 15), {
          size: compact ? 9.5 : 11,
          color: colors[column.group],
          alpha,
        });
      });
    });

    MODELS.forEach((m, row) => {
      const y = vy + g.top + g.headerH + row * g.rowH + g.rowH / 2;
      const focus = row === RL && step >= 2;
      label(ctx, palette, compact ? m.short : m.name, vx + g.nameX, y, {
        size: compact ? 10 : 11.5,
        color: focus ? palette.accent : palette.fg,
        alpha: step >= 2 && row !== RL && row !== RETRAINED ? 0.4 : 0.9,
      });
      // Hairline between rows, like the table's.
      ctx.strokeStyle = rgba(palette.muted, 0.14);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(vx + g.nameX, y + g.rowH / 2);
      ctx.lineTo(vx + g.colX[3] + g.colW, y + g.rowH / 2);
      ctx.stroke();

      COLUMNS.forEach((column, c) => {
        const reveal = this.reveal(c, p);
        const accent = row === RL && c === 3 && step === 3;
        label(
          ctx,
          palette,
          column.text(m),
          vx + g.colX[c] + g.barW + (compact ? 5 : 9),
          y,
          {
            size,
            color: accent ? palette.accent : palette.fg,
            alpha: reveal * this.emphasis(row, c, step) * 0.9,
          },
        );
      });
    });

    // Random Labeling and retraining share every accuracy number.
    if (step === 2) {
      const a = smoothstep(STEP_AT[2], STEP_AT[2] + 0.04, p);
      this.box(ctx, palette, vx, vy, RETRAINED, 0, 1, a * 0.5, false);
      this.box(ctx, palette, vx, vy, RL, 0, 1, a, true);
    }
    // Then privacy tells them apart, retraining's 1 against its 0.003.
    if (step === 3) {
      const a = smoothstep(0.9, 0.95, p);
      this.box(ctx, palette, vx, vy, RETRAINED, 3, 3, a * 0.7, false);
      this.box(ctx, palette, vx, vy, RL, 3, 3, a, true);
    }
    resetText(ctx);
  }

  private box(
    ctx: CanvasRenderingContext2D,
    palette: Palette,
    vx: number,
    vy: number,
    row: number,
    from: number,
    to: number,
    alpha: number,
    accent: boolean,
  ) {
    const g = this.g;
    if (!g || alpha < 0.01) return;
    const y = vy + g.top + g.headerH + row * g.rowH;
    const x0 = vx + g.colX[from] - 8;
    const x1 = vx + g.colX[to] + g.colW - 6;
    ctx.strokeStyle = rgba(accent ? palette.accent : palette.fg, alpha * 0.9);
    ctx.lineWidth = 1;
    ctx.strokeRect(x0, y + 6, x1 - x0, g.rowH - 12);
  }
}
