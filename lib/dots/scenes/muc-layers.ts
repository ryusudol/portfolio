import { clamp, lerp, rgba, smoothstep } from "../math";
import { EMERALD, onPaper, PURPLE } from "../muc-colors";
import { LAYER_NAMES, SIMILARITY } from "../muc-data";
import { dust } from "../shapes";
import { freeArea, label, resetText, StageSize, Steps, stepAt } from "../story";
import type { Field, Frame, Palette, Scene } from "../types";

const STEP_AT = [0, 0.26, 0.5, 0.74] as const;
/** layer4.0, where retraining and Random Labeling part ways on airplanes. */
const ELBOW = 7;
const COLORS = [EMERALD, PURPLE];
const COLORS_PAPER = onPaper(COLORS);
const LINE = 340;
const MARK = 9;

type Series = {
  values: number[];
  /** 0 retrained (Model A color), 1 Random Labeling (Model B color). */
  model: number;
  forget: boolean;
  /** Scroll range over which the line draws itself left to right. */
  from: number;
  to: number;
};

const SERIES: Series[] = [
  {
    values: SIMILARITY.retrained.retain,
    model: 0,
    forget: false,
    from: 0.06,
    to: 0.36,
  },
  {
    values: SIMILARITY.rl.retain,
    model: 1,
    forget: false,
    from: 0.08,
    to: 0.38,
  },
  {
    values: SIMILARITY.retrained.forget,
    model: 0,
    forget: true,
    from: 0.5,
    to: 0.66,
  },
  {
    values: SIMILARITY.rl.forget,
    model: 1,
    forget: true,
    from: 0.74,
    to: 0.88,
  },
];

type Plot = { x: number; y: number; w: number; h: number };

/**
 * The Layer-wise Similarity chart with the demo's real CKA values: each layer
 * of the retrained model and of Random Labeling against the same layer of the
 * original, for the other classes (solid) and for airplanes (dashed). The
 * retain lines stay near 1; retraining's airplane line falls from layer4.0,
 * while Random Labeling's holds until the last two layers.
 */
export class LayersScene implements Scene {
  private plot: Plot = { x: 0, y: 0, w: 0, h: 0 };
  private p = 0;
  private stage = new StageSize();
  private steps = new Steps();
  private ink = true;

  layout(_f: Field, fr: Frame) {
    this.stage.changed(fr);
    const area = freeArea(fr, 18);
    const left = fr.compact ? 34 : 44;
    const below = fr.compact ? 56 : 64;
    const above = 58;
    this.plot = {
      x: area.x + left,
      y: area.y + above,
      w: area.w - left - 8,
      h: Math.min(area.h - above - below, (area.w - left) * 0.8),
    };
    this.steps.collect(fr.section);
  }

  private px(layer: number) {
    return this.plot.x + (layer / (LAYER_NAMES.length - 1)) * this.plot.w;
  }

  private py(v: number) {
    return this.plot.y + (1 - v) * this.plot.h;
  }

  /**
   * Point `u` of the way along a series' polyline by length, so steep drops
   * get as many dots as flat stretches. Returns the distance traveled.
   */
  private along(s: Series, u: number, out: [number, number]) {
    const last = s.values.length - 1;
    let total = 0;
    for (let k = 0; k < last; k++)
      total += Math.hypot(
        this.px(k + 1) - this.px(k),
        this.py(s.values[k + 1]) - this.py(s.values[k]),
      );
    let left = clamp(u) * total;
    for (let k = 0; k < last; k++) {
      const x0 = this.px(k);
      const y0 = this.py(s.values[k]);
      const x1 = this.px(k + 1);
      const y1 = this.py(s.values[k + 1]);
      const len = Math.hypot(x1 - x0, y1 - y0);
      if (left <= len || k === last - 1) {
        const t = len > 0 ? Math.min(1, left / len) : 0;
        out[0] = lerp(x0, x1, t);
        out[1] = lerp(y0, y1, t);
        break;
      }
      left -= len;
    }
    return clamp(u) * total;
  }

  update(f: Field, fr: Frame) {
    if (this.stage.changed(fr)) this.layout(f, fr);
    if (this.plot.w <= 0) return;
    const p = fr.progress;
    this.p = p;
    const step = stepAt(p, STEP_AT);
    this.steps.set(step);
    f.classColors = this.ink ? COLORS : COLORS_PAPER;
    const boost = this.ink ? 1 : 1.3;
    const vx = fr.visual.x;
    const vy = fr.visual.y;
    const per = LINE + LAYER_NAMES.length * MARK;
    const pt: [number, number] = [0, 0];

    for (let i = 0; i < f.n; i++) {
      const si = Math.floor(i / per);
      if (si >= SERIES.length) {
        dust(f, i, fr, 0.08);
        continue;
      }
      const s = SERIES[si];
      const k = i - si * per;
      const drawn = smoothstep(s.from, s.to, p);
      // Airplane lines dim the retain lines once they arrive.
      const dim = !s.forget && step >= 2 ? 0.45 : 1;
      f.gc[i] = s.model + 1;
      f.gh[i] = 0;
      f.gj[i] = 0.12;
      if (k < LINE) {
        const dist = this.along(s, k / LINE, pt);
        // Dashed for airplanes, as the chart draws its forget-class lines.
        const gap = s.forget && Math.floor(dist / 5) % 2 === 1;
        const shown = pt[0] <= this.plot.x + drawn * this.plot.w + 0.5;
        f.gx[i] = vx + pt[0];
        f.gy[i] = vy + pt[1];
        f.ga[i] = shown && !gap ? 0.85 * dim * boost : 0;
        f.gz[i] = 1.7;
        continue;
      }
      const layer = Math.floor((k - LINE) / MARK);
      const m = (k - LINE) % MARK;
      const u = layer / (LAYER_NAMES.length - 1);
      const angle = (m / MARK) * Math.PI * 2;
      const r = m === 0 ? 0 : 3.2;
      f.gx[i] = vx + this.px(layer) + Math.cos(angle) * r;
      f.gy[i] = vy + this.py(s.values[layer]) + Math.sin(angle) * r;
      const shown = u <= drawn + 1e-3 ? 1 : 0;
      f.ga[i] = s.forget ? 0 : 0.9 * shown * dim * boost;
      f.gz[i] = 1.5;
    }
  }

  draw(ctx: CanvasRenderingContext2D, fr: Frame, palette: Palette) {
    this.ink = palette.ink;
    const plot = this.plot;
    if (plot.w <= 0) return;
    const vx = fr.visual.x;
    const vy = fr.visual.y;
    const p = this.p;
    const step = stepAt(p, STEP_AT);
    const compact = fr.compact;
    const size = compact ? 9 : 10;
    const colors = palette.ink ? COLORS : COLORS_PAPER;

    // Axes and gridlines.
    ctx.lineWidth = 1;
    for (const v of [0, 0.2, 0.4, 0.6, 0.8, 1]) {
      const y = vy + this.py(v);
      ctx.strokeStyle = rgba(palette.muted, v === 0 ? 0.35 : 0.1);
      ctx.beginPath();
      ctx.moveTo(vx + plot.x, y);
      ctx.lineTo(vx + plot.x + plot.w, y);
      ctx.stroke();
      label(ctx, palette, v.toFixed(1), vx + plot.x - 8, y, {
        align: "right",
        size,
        alpha: 0.75,
      });
    }
    LAYER_NAMES.forEach((name, k) => {
      ctx.save();
      ctx.translate(vx + this.px(k), vy + plot.y + plot.h + 10);
      ctx.rotate(compact ? -Math.PI / 3 : -Math.PI / 5);
      label(ctx, palette, name, 0, 0, {
        align: "right",
        size,
        color: k === ELBOW && step >= 2 ? palette.accent : palette.muted,
        alpha: 0.9,
      });
      ctx.restore();
    });
    label(
      ctx,
      palette,
      "CKA vs. original",
      vx + plot.x - (compact ? 30 : 40),
      vy + plot.y - 40,
      {
        size,
        alpha: 0.75,
      },
    );

    // Legend: color is the model, dashes are airplanes.
    const legendY = vy + plot.y - 40;
    const right = vx + plot.x + plot.w;
    const items: [string, number][] = [
      ["Retrained", 0],
      ["Random Labeling", 1],
    ];
    ctx.font = `${size}px ${palette.mono}`;
    let x = right;
    for (let n = items.length - 1; n >= 0; n--) {
      const [name, model] = items[n];
      const w = ctx.measureText(name).width;
      label(ctx, palette, name, x, legendY, {
        align: "right",
        size,
        color: colors[model],
        alpha: 0.95,
      });
      x -= w + 18;
    }
    label(
      ctx,
      palette,
      "solid = other classes · dashed = airplanes ×",
      right,
      legendY + 16,
      {
        align: "right",
        size: size - 0.5,
        alpha: 0.7,
      },
    );

    // Airplane points as crosses, like the chart's forget-class markers.
    ctx.lineWidth = 1.2;
    SERIES.forEach((s) => {
      if (!s.forget) return;
      const drawn = smoothstep(s.from, s.to, p);
      ctx.strokeStyle = rgba(colors[s.model], 0.95);
      ctx.beginPath();
      s.values.forEach((v, k) => {
        if (k / (s.values.length - 1) > drawn + 1e-3) return;
        const cx = vx + this.px(k);
        const cy = vy + this.py(v);
        ctx.moveTo(cx - 3.5, cy - 3.5);
        ctx.lineTo(cx + 3.5, cy + 3.5);
        ctx.moveTo(cx + 3.5, cy - 3.5);
        ctx.lineTo(cx - 3.5, cy + 3.5);
      });
      ctx.stroke();
    });

    // The gap at layer4.0.
    if (step >= 2) {
      const a = smoothstep(0.62, 0.66, p);
      const ex = vx + this.px(ELBOW);
      ctx.strokeStyle = rgba(palette.accent, 0.35 * a);
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.moveTo(ex, vy + plot.y);
      ctx.lineTo(ex, vy + plot.y + plot.h);
      ctx.stroke();
      ctx.setLineDash([]);
      const retrained = SIMILARITY.retrained.forget[ELBOW];
      label(
        ctx,
        palette,
        retrained.toFixed(2),
        ex + 9,
        vy + this.py(retrained) - 12,
        {
          size: size + 1,
          color: colors[0],
          alpha: a,
        },
      );
      if (step >= 3) {
        const b = smoothstep(0.86, 0.9, p);
        const rl = SIMILARITY.rl.forget[ELBOW];
        label(ctx, palette, rl.toFixed(2), ex - 9, vy + this.py(rl) + 14, {
          align: "right",
          size: size + 1,
          color: colors[1],
          alpha: b,
        });
      }
    }
    resetText(ctx);
  }
}
