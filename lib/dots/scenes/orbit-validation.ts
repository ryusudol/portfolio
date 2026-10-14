import { rgba, smoothstep } from "../math";
import { SATJS, VALLADO_LOG } from "../orbit-data";
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
import type { Field, Frame, Palette, Scene } from "../types";

const STEP_AT = [0, 0.18, 0.36, 0.56, 0.78] as const;
/** The Vallado chart's axis, log10 mm. */
const V_LO = -3.5;
const V_HI = 0;
/** The satellite.js chart's axis, log10 mm. */
const S_LO = -16;
const S_HI = 1.5;
/** One dot per this many satellite.js states. */
const PER_DOT = 5;
/** log10 of satellite.js' differences, mm: a micrometer, and the median of 2.3 nm. */
const MICRON = -3;
const MEDIAN = Math.log10(2.3188e-6);
/** Error codes of the seven verification objects built to fail. */
const CODES = [1, 1, 6, 6, 4, 3, 6];
const MARK_DOTS = 18;

type Spot = { x: number; y: number };

/**
 * Two validations as dot histograms. First the 666 states of the Vallado
 * verification set, one dot each on a log axis of position error, with the
 * reference file's print rounding marked and the seven failure cases as
 * crosses. Then the same dots grow into a unit chart of the satellite.js
 * cross-check, five states a dot: a small block of bit-identical states and
 * a histogram of the rest across seventeen decades, with a micrometer and
 * the median marked.
 */
export class ValidationScene implements Scene {
  private vallado: Spot[] = [];
  private worst = 0;
  private marks: Spot[] = [];
  private markY = 0;
  private satjs: Spot[] = [];
  private identical = 0;
  private worstSatjs = 0;
  private axis = { x: 0, y: 0, w: 1 };
  private block = { x: 0, y: 0, w: 1, h: 1 };
  private hist = { x: 0, y: 0, w: 1 };
  private dotV = 3;
  private dotS = 3;
  private step = 0;
  private steps = new Steps();
  private readouts = new Readouts();
  private size = new StageSize();
  private ink = true;

  layout(_f: Field, fr: Frame) {
    const area = freeArea(fr, 20);
    const compact = fr.compact;

    // Vallado: bins one dot wide, stacked up from a baseline.
    const w = area.w * (compact ? 0.92 : 0.84);
    const x0 = area.x + (area.w - w) / 2;
    const base = area.y + area.h * 0.7;
    let s = compact ? 3.2 : 4.4;
    const order = VALLADO_LOG.map((v, k) => ({ v: v / 1000, k })).sort(
      (a, b) => a.v - b.v,
    );
    const stack = (spacing: number) => {
      const bins = Math.floor(w / spacing);
      const fill = new Int32Array(bins + 1);
      let tallest = 0;
      const out: Spot[] = new Array(VALLADO_LOG.length);
      for (const { v, k } of order) {
        const b = Math.max(
          0,
          Math.min(bins, Math.floor(((v - V_LO) / (V_HI - V_LO)) * bins)),
        );
        const row = fill[b]++;
        tallest = Math.max(tallest, row + 1);
        out[k] = {
          x: x0 + (b + 0.5) * spacing,
          y: base - (row + 0.5) * spacing,
        };
      }
      return { out, tallest };
    };
    let fit = stack(s);
    if (fit.tallest * s > area.h * 0.58) {
      s = Math.max(2, (area.h * 0.58) / fit.tallest);
      fit = stack(s);
    }
    this.vallado = fit.out;
    this.dotV = s;
    this.axis = { x: x0, y: base, w };
    this.worst = VALLADO_LOG.indexOf(Math.max(...VALLADO_LOG));

    // Seven crosses for the failure cases, in a row above the chart.
    const gap = compact ? 26 : 38;
    const arm = compact ? 6 : 8;
    const mx = x0 + w - gap * (CODES.length - 0.5);
    const my = area.y + area.h * 0.16;
    this.markY = my;
    this.marks = [];
    for (let c = 0; c < CODES.length; c++) {
      for (let d = 0; d < MARK_DOTS; d++) {
        const t = ((d % (MARK_DOTS / 2)) / (MARK_DOTS / 2 - 1)) * 2 - 1;
        const flip = d < MARK_DOTS / 2 ? 1 : -1;
        this.marks.push({ x: mx + c * gap + t * arm, y: my + t * arm * flip });
      }
    }

    // satellite.js: the identical block on the left, a histogram on the right.
    this.identical = Math.round(SATJS.identical / PER_DOT);
    const counts: number[] = [];
    let acc = 0;
    let shown = 0;
    for (const [, n] of SATJS.bins) {
      acc += n / PER_DOT;
      const c = Math.round(acc) - shown;
      counts.push(c);
      shown += c;
    }
    const total = this.identical + shown;
    const blockW = area.w * (compact ? 0.3 : 0.26);
    const histX = area.x + blockW + (compact ? 22 : 48);
    const histW = area.x + area.w - histX;
    const sBase = area.y + area.h * 0.78;
    let s2 = Math.min(
      compact ? 3 : 3.8,
      Math.sqrt((blockW * area.h * 0.6) / this.identical),
    );
    const binW = histW / ((S_HI - S_LO) * 2);
    const layoutSatjs = (spacing: number) => {
      const cols = Math.max(1, Math.floor(blockW / spacing));
      const rows = Math.ceil(this.identical / cols);
      const per = Math.max(1, Math.floor(binW / spacing));
      const out: Spot[] = [];
      for (let k = 0; k < this.identical; k++) {
        out.push({
          x: area.x + ((k % cols) + 0.5) * spacing,
          y: sBase - (Math.floor(k / cols) + 0.5) * spacing,
        });
      }
      let tallest = rows;
      SATJS.bins.forEach(([lg], b) => {
        const left = histX + ((lg - S_LO) / (S_HI - S_LO)) * histW;
        for (let k = 0; k < counts[b]; k++) {
          const row = Math.floor(k / per);
          tallest = Math.max(tallest, row + 1);
          out.push({
            x: left + ((k % per) + 0.5) * (binW / per),
            y: sBase - (row + 0.5) * spacing,
          });
        }
      });
      return { out, tallest, cols, rows };
    };
    let sat = layoutSatjs(s2);
    if (sat.tallest * s2 > area.h * 0.66) {
      s2 = Math.max(1.8, (area.h * 0.66) / sat.tallest);
      sat = layoutSatjs(s2);
    }
    this.satjs = sat.out;
    this.dotS = s2;
    this.worstSatjs = total - 1;
    this.block = {
      x: area.x,
      y: sBase - sat.rows * s2,
      w: sat.cols * s2,
      h: sat.rows * s2,
    };
    this.hist = { x: histX, y: sBase, w: histW };
    this.steps.collect(fr.section);
    this.readouts.collect(fr.section);
  }

  update(f: Field, fr: Frame) {
    if (this.size.changed(fr)) this.layout(f, fr);
    const step = stepAt(fr.progress, STEP_AT);
    this.step = step;
    this.steps.set(step);
    const vx = fr.visual.x;
    const vy = fr.visual.y;
    const boost = this.ink ? 1 : 1.25;
    const satjs = step >= 3;
    const grow = smoothstep(0, 0.06, fr.progress);

    for (let i = 0; i < f.n; i++) {
      f.gh[i] = 0;
      f.gj[i] = 0.15;
      if (!satjs) {
        if (i < this.vallado.length) {
          const p = this.vallado[i];
          const worst = i === this.worst && step >= 1;
          f.gx[i] = vx + p.x;
          f.gy[i] = vy + p.y;
          f.gz[i] = this.dotV * 0.72;
          // Past the rounding line the dots are the 4% that print can resolve.
          f.ga[i] = (worst ? 1 : 0.62 + f.r3[i] * 0.3) * grow * boost;
          f.gh[i] = worst ? 1 : 0;
          continue;
        }
        const m = i - this.vallado.length;
        if (step >= 2 && m < this.marks.length) {
          f.gx[i] = vx + this.marks[m].x;
          f.gy[i] = vy + this.marks[m].y;
          f.gz[i] = this.dotV * 0.6;
          f.ga[i] = 0.9 * boost;
          continue;
        }
      } else if (i < this.satjs.length) {
        const p = this.satjs[i];
        const worst = i === this.worstSatjs && step >= 4;
        const same = i < this.identical;
        f.gx[i] = vx + p.x;
        f.gy[i] = vy + p.y;
        f.gz[i] = this.dotS * 0.72;
        f.ga[i] =
          Math.min(
            1,
            (worst ? 1 : (same ? 0.5 : 0.7) + f.r3[i] * 0.25) * boost,
          ) * (step === 4 && same ? 0.6 : 1);
        f.gh[i] = worst ? 1 : 0;
        continue;
      }
      dust(f, i, fr, 0.08);
    }
    this.readouts.write("worst", satjs ? "13.5 mm" : "0.097 mm");
  }

  private ticks(
    ctx: CanvasRenderingContext2D,
    palette: Palette,
    fr: Frame,
    x0: number,
    y: number,
    w: number,
    lo: number,
    hi: number,
    marks: [number, string][],
  ) {
    ctx.strokeStyle = rgba(palette.muted, 0.35);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x0, y + 2);
    ctx.lineTo(x0 + w, y + 2);
    ctx.stroke();
    for (const [v, text] of marks) {
      const x = x0 + ((v - lo) / (hi - lo)) * w;
      ctx.beginPath();
      ctx.moveTo(x, y + 2);
      ctx.lineTo(x, y + 6);
      ctx.stroke();
      label(ctx, palette, text, x, y + 16, {
        size: fr.compact ? 9 : 9.5,
        align: "center",
        alpha: 0.75,
      });
    }
  }

  draw(ctx: CanvasRenderingContext2D, fr: Frame, palette: Palette) {
    this.ink = palette.ink;
    const vx = fr.visual.x;
    const vy = fr.visual.y;
    const size = fr.compact ? 9 : 10;
    if (this.step < 3) {
      const a = this.axis;
      const x0 = vx + a.x;
      const y = vy + a.y;
      this.ticks(ctx, palette, fr, x0, y, a.w, V_LO, V_HI, [
        [-3, "0.001"],
        [-2, "0.01"],
        [-1, "0.1"],
        [0, "1 mm"],
      ]);
      label(
        ctx,
        palette,
        "distance from the published position, mm (log)",
        x0 + a.w / 2,
        y + 34,
        {
          size,
          align: "center",
          alpha: 0.75,
        },
      );
      if (this.step >= 1) {
        const xr = x0 + ((-2 - V_LO) / (V_HI - V_LO)) * a.w;
        ctx.strokeStyle = rgba(palette.fg, 0.4);
        ctx.setLineDash([2, 3]);
        ctx.beginPath();
        ctx.moveTo(xr, y);
        ctx.lineTo(xr, y - fr.visual.h * 0.42);
        ctx.stroke();
        ctx.setLineDash([]);
        label(ctx, palette, "print rounding", xr + 6, y - fr.visual.h * 0.4, {
          size,
          color: palette.fg,
        });
        const w = this.vallado[this.worst];
        label(
          ctx,
          palette,
          "0.097 mm · 1,280 days out",
          vx + w.x,
          vy + w.y - 14,
          {
            size,
            align: "center",
            color: palette.accent,
          },
        );
      }
      if (this.step >= 2 && this.marks.length) {
        CODES.forEach((code, c) => {
          const m = this.marks[c * MARK_DOTS + MARK_DOTS / 2 - 1];
          const first = this.marks[c * MARK_DOTS];
          label(
            ctx,
            palette,
            String(code),
            vx + (first.x + m.x) / 2,
            vy + this.markY + (fr.compact ? 18 : 24),
            {
              size,
              align: "center",
              color: palette.fg,
            },
          );
        });
        const left = this.marks[0];
        label(
          ctx,
          palette,
          "error codes",
          vx + left.x - (fr.compact ? 14 : 20),
          vy + this.markY,
          {
            size,
            align: "right",
            alpha: 0.75,
          },
        );
      }
    } else {
      const h = this.hist;
      const b = this.block;
      this.ticks(ctx, palette, fr, vx + h.x, vy + h.y, h.w, S_LO, S_HI, [
        [-12, "10⁻¹²"],
        [-9, "10⁻⁹"],
        [-6, "10⁻⁶"],
        [-3, "10⁻³"],
        [0, "1 mm"],
      ]);
      label(
        ctx,
        palette,
        "differences, mm (log)",
        vx + h.x + h.w / 2,
        vy + h.y + 34,
        {
          size,
          align: "center",
          alpha: 0.75,
        },
      );
      label(
        ctx,
        palette,
        "bit-identical, 3.1%",
        vx + b.x + b.w / 2,
        vy + h.y + 16,
        {
          size,
          align: "center",
          color: palette.fg,
        },
      );
      label(ctx, palette, "1 dot = 5 states", vx + b.x, vy + b.y - 14, {
        size,
        alpha: 0.7,
      });
      // A micrometer: 89.7% of states agree at least that closely.
      const at = (lg: number) => vx + h.x + ((lg - S_LO) / (S_HI - S_LO)) * h.w;
      const line = (
        lg: number,
        text: string,
        color: typeof palette.fg,
        up: number,
      ) => {
        const x = at(lg);
        ctx.strokeStyle = rgba(color, 0.55);
        ctx.setLineDash([2, 3]);
        ctx.beginPath();
        ctx.moveTo(x, vy + h.y);
        ctx.lineTo(x, vy + h.y - up);
        ctx.stroke();
        ctx.setLineDash([]);
        label(ctx, palette, text, x + 6, vy + h.y - up + 6, { size, color });
      };
      line(MICRON, "1 µm · 89.7% within it", palette.fg, fr.visual.h * 0.52);
      if (this.step >= 4)
        line(MEDIAN, "median 2 nm", palette.accent, fr.visual.h * 0.4);
      if (this.step >= 4) {
        const w = this.satjs[this.worstSatjs];
        const top = vy + h.y - fr.visual.h * 0.3;
        ctx.strokeStyle = rgba(palette.accent, 0.6);
        ctx.beginPath();
        ctx.moveTo(vx + w.x, vy + w.y - 5);
        ctx.lineTo(vx + w.x, top + 8);
        ctx.stroke();
        label(ctx, palette, "13.5 mm · SPEKTR-R", vx + w.x, top, {
          size,
          align: "right",
          color: palette.accent,
        });
      }
    }
    resetText(ctx);
  }
}
