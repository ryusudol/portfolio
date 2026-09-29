import { clamp, lerp, rgba, smoothstep } from "../math";
import { ZOOM_COST, ZOOM_IN_APP } from "../muc-data";
import { dust } from "../shapes";
import { freeArea, label, resetText, StageSize, Steps, stepAt } from "../story";
import type { Field, Frame, Palette, Scene } from "../types";

const STEP_AT = [0, 0.26, 0.52, 0.76] as const;
/** The chart's top, in milliseconds; SVG leaves it past 16,000 points. */
const TOP = 40;
/** One frame at 60 fps. */
const BUDGET = 1000 / 60;
const PLOT_POINTS = 2000;
const LINE = 320;
const MARK = 8;
const APP_RING = 14;

type Series = { ms: number[]; from: number; to: number; accent: boolean };

const SERIES: Series[] = [
  { ms: ZOOM_COST.svg, from: 0.04, to: 0.22, accent: true },
  { ms: ZOOM_COST.canvas, from: 0.3, to: 0.46, accent: false },
];

type Plot = { x: number; y: number; w: number; h: number };

/**
 * What a zoom frame costs in SVG and in canvas as the point count grows,
 * measured by replaying the embedding view's zoom outside the app. SVG pays
 * for every element it restyles; canvas redraws a bitmap. The comparator's
 * 2,000 points a plot sit well under a frame's budget either way, and the
 * last step adds the same zoom measured inside the app itself.
 */
export class RenderScene implements Scene {
  private plot: Plot = { x: 0, y: 0, w: 0, h: 0 };
  private lines: [number, number][][] = [];
  private p = 0;
  private compact = false;
  private stage = new StageSize();
  private steps = new Steps();
  private ink = true;

  layout(_f: Field, fr: Frame) {
    this.stage.changed(fr);
    const area = freeArea(fr, 18);
    const compact = fr.compact;
    this.compact = compact;
    const left = compact ? 30 : 40;
    const below = compact ? 40 : 44;
    const above = compact ? 34 : 30;
    this.plot = {
      x: area.x + left,
      y: area.y + above,
      w: area.w - left - (compact ? 10 : 24),
      h: Math.min(area.h - above - below, (area.w - left) * 0.85),
    };
    // Each series as a polyline in stage pixels, cut where it leaves the top.
    this.lines = SERIES.map((s) => {
      const pts: [number, number][] = [];
      for (let k = 0; k < s.ms.length; k++) {
        const x = this.px(ZOOM_COST.points[k]);
        if (s.ms[k] <= TOP) {
          pts.push([x, this.py(s.ms[k])]);
          continue;
        }
        const x0 = this.px(ZOOM_COST.points[k - 1]);
        const t = (TOP - s.ms[k - 1]) / (s.ms[k] - s.ms[k - 1]);
        pts.push([lerp(x0, x, t), this.py(TOP)]);
        break;
      }
      return pts;
    });
    this.steps.collect(fr.section);
  }

  private px(points: number) {
    return this.plot.x + (Math.log2(points / 1000) / 6) * this.plot.w;
  }

  private py(ms: number) {
    return this.plot.y + (1 - ms / TOP) * this.plot.h;
  }

  /** The point `u` of the way along a polyline, by length. */
  private along(pts: [number, number][], u: number, out: [number, number]) {
    let total = 0;
    for (let k = 1; k < pts.length; k++)
      total += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
    let left = clamp(u) * total;
    for (let k = 1; k < pts.length; k++) {
      const len = Math.hypot(
        pts[k][0] - pts[k - 1][0],
        pts[k][1] - pts[k - 1][1],
      );
      if (left <= len || k === pts.length - 1) {
        const t = len > 0 ? Math.min(1, left / len) : 0;
        out[0] = lerp(pts[k - 1][0], pts[k][0], t);
        out[1] = lerp(pts[k - 1][1], pts[k][1], t);
        return;
      }
      left -= len;
    }
  }

  update(f: Field, fr: Frame) {
    if (this.stage.changed(fr)) this.layout(f, fr);
    if (this.plot.w <= 0) return;
    const p = fr.progress;
    this.p = p;
    const step = stepAt(p, STEP_AT);
    this.steps.set(step);
    const boost = this.ink ? 1 : 1.3;
    const vx = fr.visual.x;
    const vy = fr.visual.y;
    const per = LINE + ZOOM_COST.points.length * MARK;
    const pt: [number, number] = [0, 0];
    const appEnd = SERIES.length * per + APP_RING;

    for (let i = 0; i < f.n; i++) {
      f.gj[i] = 0.1;
      f.gh[i] = 0;
      if (i < SERIES.length * per) {
        const si = Math.floor(i / per);
        const s = SERIES[si];
        const k = i - si * per;
        const drawn = smoothstep(s.from, s.to, p);
        // Once both lines are in, the one the step is about stays bright.
        const dim = step === 1 && si === 0 ? 0.45 : 1;
        f.gh[i] = s.accent ? 1 : 0;
        if (k < LINE) {
          this.along(this.lines[si], k / (LINE - 1), pt);
          const shown = pt[0] <= this.plot.x + drawn * this.plot.w + 0.5;
          f.gx[i] = vx + pt[0];
          f.gy[i] = vy + pt[1];
          f.gz[i] = 1.7;
          f.ga[i] = shown ? Math.min(1, 0.9 * dim * boost) : 0;
          continue;
        }
        // Rings on the measured points that fit under the chart's top.
        const m = Math.floor((k - LINE) / MARK);
        const q = (k - LINE) % MARK;
        const angle = (q / MARK) * Math.PI * 2;
        const ms = s.ms[m];
        const x = this.px(ZOOM_COST.points[m]);
        f.gx[i] = vx + x + Math.cos(angle) * 3.4;
        f.gy[i] = vy + this.py(Math.min(ms, TOP)) + Math.sin(angle) * 3.4;
        f.gz[i] = 1.4;
        const shown = ms <= TOP && x <= this.plot.x + drawn * this.plot.w + 0.5;
        f.ga[i] = shown ? Math.min(1, 0.95 * dim * boost) : 0;
        continue;
      }
      if (i < appEnd) {
        // The same zoom measured inside the comparator, 15 ms.
        const q = i - SERIES.length * per;
        const angle = (q / APP_RING) * Math.PI * 2;
        const shown = smoothstep(0.78, 0.84, p);
        f.gx[i] = vx + this.px(PLOT_POINTS) + Math.cos(angle) * 6;
        f.gy[i] = vy + this.py(ZOOM_IN_APP) + Math.sin(angle) * 6;
        f.gz[i] = 1.8;
        f.ga[i] = Math.min(1, shown * boost);
        f.gh[i] = 1;
        continue;
      }
      dust(f, i, fr, 0.08);
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
    const compact = this.compact;
    const size = compact ? 8.5 : 10;

    // Gridlines and the millisecond axis.
    ctx.lineWidth = 1;
    for (const ms of [0, 10, 20, 30, 40]) {
      const y = vy + this.py(ms);
      ctx.strokeStyle = rgba(palette.muted, ms === 0 ? 0.35 : 0.1);
      ctx.beginPath();
      ctx.moveTo(vx + plot.x, y);
      ctx.lineTo(vx + plot.x + plot.w, y);
      ctx.stroke();
      label(ctx, palette, `${ms}`, vx + plot.x - 8, y, {
        align: "right",
        size,
        alpha: 0.75,
      });
    }
    label(
      ctx,
      palette,
      "ms per zoom frame",
      vx + plot.x - (compact ? 26 : 36),
      vy + plot.y - 18,
      {
        size,
        alpha: 0.75,
      },
    );
    ZOOM_COST.points.forEach((n) => {
      label(
        ctx,
        palette,
        `${n / 1000}k`,
        vx + this.px(n),
        vy + plot.y + plot.h + 14,
        { align: "center", size, alpha: 0.75 },
      );
    });
    label(
      ctx,
      palette,
      "points in one plot",
      vx + plot.x + plot.w,
      vy + plot.y + plot.h + 32,
      { align: "right", size, alpha: 0.7 },
    );

    // Series names at the end of each line as it arrives.
    const svg = this.lines[0];
    const svgEnd = svg[svg.length - 1];
    const svgIn = smoothstep(0.18, 0.22, p);
    label(ctx, palette, "SVG", vx + svgEnd[0] + 8, vy + svgEnd[1] + 4, {
      size: size + 1,
      color: palette.accent,
      alpha: svgIn,
    });
    label(
      ctx,
      palette,
      "↑ 69 ms at 32k",
      vx + svgEnd[0] + 8,
      vy + svgEnd[1] + 18,
      { size, color: palette.accent, alpha: svgIn * 0.8 },
    );
    const cv = this.lines[1];
    const cvEnd = cv[cv.length - 1];
    label(ctx, palette, "canvas", vx + cvEnd[0] - 4, vy + cvEnd[1] - 12, {
      align: "right",
      size: size + 1,
      color: palette.fg,
      alpha: smoothstep(0.42, 0.46, p),
    });

    // One frame's budget, and where the comparator sits on the x axis.
    const b = smoothstep(0.52, 0.58, p);
    if (b > 0.02) {
      const y = vy + this.py(BUDGET);
      ctx.strokeStyle = rgba(palette.fg, 0.55 * b);
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(vx + plot.x, y);
      ctx.lineTo(vx + plot.x + plot.w, y);
      ctx.stroke();
      const x = vx + this.px(PLOT_POINTS);
      ctx.strokeStyle = rgba(palette.muted, 0.5 * b);
      ctx.beginPath();
      ctx.moveTo(x, vy + plot.y);
      ctx.lineTo(x, vy + plot.y + plot.h);
      ctx.stroke();
      ctx.setLineDash([]);
      label(
        ctx,
        palette,
        "16.7 ms, one frame at 60 fps",
        vx + this.px(PLOT_POINTS) + 8,
        y - 9,
        {
          size,
          color: palette.fg,
          alpha: b * 0.9,
        },
      );
      label(ctx, palette, "2,000", x + 6, vy + plot.y + 8, {
        size,
        alpha: b * 0.85,
      });
      label(ctx, palette, "a plot", x + 6, vy + plot.y + 21, {
        size,
        alpha: b * 0.7,
      });
    }
    if (step >= 3) {
      const a = smoothstep(0.8, 0.86, p);
      const x = vx + this.px(PLOT_POINTS);
      const y = vy + this.py(ZOOM_IN_APP);
      label(ctx, palette, `in the app, ${ZOOM_IN_APP} ms`, x + 12, y + 5, {
        size,
        color: palette.accent,
        alpha: a,
      });
    }
    resetText(ctx);
  }
}
