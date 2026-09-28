import { clamp, lerp, rgba, smoothstep } from "../math";
import { dust } from "../shapes";
import { freeArea, label, Readouts, resetText } from "../story";
import type { Field, Frame, Palette, Scene } from "../types";

/** Commits per day, as days since Jan 1, 2026 (from `git log`). */
// biome-ignore format: pairs of [day, commits]
const COMMITS: [number, number][] = [
  [2, 1], [3, 1], [4, 5], [5, 16], [7, 3], [8, 9], [9, 5], [11, 2], [13, 6],
  [14, 7], [15, 3], [17, 6], [18, 15], [19, 22], [20, 2], [21, 6], [22, 1],
  [23, 2], [26, 2], [28, 12], [30, 4], [31, 4], [216, 1], [217, 12], [220, 3],
  [232, 1], [243, 2],
];
/** PyPI releases by day. */
const RELEASES: [string, number][] = [
  ["0.1.0", 9],
  ["0.1.1", 18],
  ["0.1.2", 19],
  ["0.1.3", 19],
  ["1.0.0", 31],
  ["1.0.1", 31],
  ["1.0.2", 216],
  ["1.1.0", 217],
  ["1.1.1", 218],
  ["1.1.2", 220],
  ["1.1.3", 220],
];
const NAMED_RELEASES = new Set(["0.1.0", "1.0.0", "1.1.3"]);
/** How many releases came earlier the same day, so same-day dots stack. */
const STACKED = RELEASES.map(
  ([, day], r) => RELEASES.slice(0, r).filter(([, d]) => d === day).length,
);
const MILESTONES: { day: number; text: string; compact: boolean }[] = [
  { day: 3, text: "first estimator", compact: true },
  { day: 7, text: "first benchmark, only 2.1×", compact: false },
  { day: 15, text: "one einsum for all pairs", compact: true },
  { day: 31, text: "v1.0 on PyPI", compact: true },
  { day: 217, text: "cka_from_features", compact: false },
  { day: 232, text: "100% test coverage", compact: true },
];
/** The two stretches of work drawn to scale; the months between are elided. */
const PANELS = [
  {
    from: 0,
    to: 34,
    months: [
      ["Jan", 0],
      ["Feb", 31],
    ],
  },
  {
    from: 212,
    to: 247,
    months: [
      ["Aug", 212],
      ["Sep", 243],
    ],
  },
] as const;

type Commit = { day: number; level: number };

/**
 * The library's history, one dot-block per commit, stacked by day: a
 * month-long build in January, six quiet months on PyPI, and an August return
 * for a new API and full test coverage. A cursor sweeps the calendar;
 * commits drop in as it passes, releases tick below the axis.
 */
export class TimelineScene implements Scene {
  private commits: Commit[] = [];
  private commitN = 0;
  private releaseN = 0;
  private axisN = 0;
  private dayW = 10;
  private unit = 8;
  private base = 0;
  private panelX: number[] = [];
  private breakW = 80;
  private cursor = -1;
  private cursorX = 0;
  private p = 0;
  private readouts = new Readouts();

  constructor() {
    for (const [day, count] of COMMITS) {
      for (let level = 0; level < count; level++)
        this.commits.push({ day, level });
    }
  }

  layout(f: Field, fr: Frame) {
    const area = freeArea(fr, 16);
    const days = PANELS.reduce((s, p) => s + (p.to - p.from), 0);
    this.breakW = fr.compact ? 42 : 96;
    this.dayW = (area.w - this.breakW) / days;
    this.panelX = [
      area.x,
      area.x + (PANELS[0].to - PANELS[0].from) * this.dayW + this.breakW,
    ];
    const labels = fr.compact ? 46 : 64;
    this.base = area.y + area.h - (fr.compact ? 44 : 60);
    const tallest = Math.max(...COMMITS.map(([, c]) => c));
    this.unit = Math.min((this.base - area.y - labels) / tallest, this.dayW);
    this.commitN = Math.round(f.n * 0.46);
    this.releaseN = Math.round(f.n * 0.03);
    this.axisN = Math.round(f.n * 0.04);
    this.readouts.collect(fr.section);
  }

  /** Stage x for a day, or -1 inside the elided months. */
  private dayX(day: number) {
    for (let k = 0; k < PANELS.length; k++) {
      const panel = PANELS[k];
      if (day >= panel.from && day <= panel.to)
        return this.panelX[k] + (day - panel.from + 0.5) * this.dayW;
    }
    return -1;
  }

  update(f: Field, fr: Frame) {
    const p = fr.progress;
    this.p = p;
    // The cursor crosses both panels and the break at an even pace.
    const s = clamp((p - 0.05) / 0.8);
    const firstW = (PANELS[0].to - PANELS[0].from) * this.dayW;
    const secondW = (PANELS[1].to - PANELS[1].from) * this.dayW;
    const x = s * (firstW + this.breakW + secondW);
    if (x < firstW) this.cursor = PANELS[0].from + x / this.dayW;
    else if (x < firstW + this.breakW)
      this.cursor = lerp(
        PANELS[0].to,
        PANELS[1].from,
        (x - firstW) / this.breakW,
      );
    else this.cursor = PANELS[1].from + (x - firstW - this.breakW) / this.dayW;
    this.cursorX = this.panelX[0] + x;
    if (p < 0.05) this.cursor = -1;

    const vx = fr.visual.x;
    const vy = fr.visual.y;
    const commitsEnd = this.commitN;
    const releasesEnd = commitsEnd + this.releaseN;
    const axisEnd = releasesEnd + this.axisN;
    const blockW = Math.max(1.5, this.dayW * 0.72);
    const blockH = Math.max(1.5, this.unit * 0.8);

    for (let i = 0; i < f.n; i++) {
      if (i < commitsEnd) {
        const c = this.commits[i % this.commits.length];
        const cx = this.dayX(c.day);
        const shown = c.day <= this.cursor;
        const x = vx + cx + (f.r1[i] - 0.5) * blockW;
        const y =
          vy +
          this.base -
          (c.level + 0.5) * this.unit +
          (f.r2[i] - 0.5) * blockH;
        f.gx[i] = x;
        f.gy[i] = shown ? y : y - 60 - f.r3[i] * 30;
        f.ga[i] = shown ? 0.62 + f.r3[i] * 0.3 : 0;
        f.gh[i] = c.day >= 212 ? 0.25 : 0;
        f.gj[i] = 0.3;
        continue;
      }
      if (i < releasesEnd) {
        // One small accent dot per release, stacked when a day had two.
        const r = (i - commitsEnd) % RELEASES.length;
        const [, day] = RELEASES[r];
        const nth = STACKED[r];
        const shown = day <= this.cursor;
        const a = f.r0[i] * Math.PI * 2;
        const rad = 2.4 * Math.sqrt(f.r1[i]);
        f.gx[i] = vx + this.dayX(day) + Math.cos(a) * rad;
        f.gy[i] = vy + this.base + 12 + nth * 7 + Math.sin(a) * rad;
        f.ga[i] = shown ? 1 : 0;
        f.gh[i] = 1;
        f.gj[i] = 0.2;
        continue;
      }
      if (i < axisEnd) {
        // The two dated stretches of axis.
        const k = (i - releasesEnd) % 2;
        const panel = PANELS[k];
        const w = (panel.to - panel.from) * this.dayW;
        f.gx[i] = vx + this.panelX[k] + f.r0[i] * w;
        f.gy[i] = vy + this.base + 3 + (f.r1[i] - 0.5) * 1.5;
        f.ga[i] = 0.45;
        f.gh[i] = 0;
        f.gj[i] = 0.2;
        continue;
      }
      dust(f, i, fr, 0.1);
    }

    const commits = COMMITS.filter(([d]) => d <= this.cursor).reduce(
      (s, [, c]) => s + c,
      0,
    );
    const releases = RELEASES.filter(([, d]) => d <= this.cursor).length;
    this.readouts.write("commits", String(commits));
    this.readouts.write("releases", String(releases));
  }

  draw(ctx: CanvasRenderingContext2D, fr: Frame, palette: Palette) {
    const vx = fr.visual.x;
    const vy = fr.visual.y;
    const size = fr.compact ? 9 : 10;
    const base = vy + this.base;

    for (const panel of PANELS) {
      for (const [name, day] of panel.months) {
        const x = vx + this.dayX(day) - this.dayW / 2;
        ctx.strokeStyle = rgba(palette.muted, 0.35);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, base + 3);
        ctx.lineTo(x, base + 9);
        ctx.stroke();
        label(ctx, palette, name, x + 3, base + (fr.compact ? 40 : 48), {
          size,
          alpha: 0.75,
        });
      }
    }

    // The elided months.
    const gapX = vx + this.panelX[1] - this.breakW / 2;
    label(ctx, palette, "≈", gapX, base + 3, {
      align: "center",
      size: 14,
      alpha: 0.6,
    });
    if (!fr.compact) {
      label(ctx, palette, "Feb – Jul", gapX, base - 34, {
        align: "center",
        size,
        alpha: 0.7,
      });
      label(ctx, palette, "stable on PyPI", gapX, base - 20, {
        align: "center",
        size,
        alpha: 0.7,
      });
    }

    for (const [name, day] of RELEASES) {
      if (!NAMED_RELEASES.has(name) || day > this.cursor) continue;
      if (fr.compact && name === "1.1.3") continue;
      const nth = STACKED.filter((_, r) => RELEASES[r][1] === day).length;
      label(
        ctx,
        palette,
        name,
        vx + this.dayX(day) + 6,
        base + 12 + (nth - 1) * 7,
        {
          align: "left",
          size: 9,
          color: palette.accent,
          alpha: 0.9,
        },
      );
    }

    // Milestones: leader lines up from each day's stack to a staggered label.
    let row = 0;
    for (const m of MILESTONES) {
      if (fr.compact && !m.compact) continue;
      const shown = smoothstep(m.day, m.day + 1.5, this.cursor);
      const stack = COMMITS.find(([d]) => d === m.day)?.[1] ?? 0;
      const x = vx + this.dayX(m.day);
      const top = base - stack * this.unit - 6;
      const y = vy + (fr.compact ? 12 + (row % 3) * 14 : 16 + (row % 2) * 18);
      row++;
      if (shown <= 0) continue;
      ctx.strokeStyle = rgba(palette.muted, 0.4 * shown);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y + 7);
      ctx.lineTo(x, Math.max(y + 7, top));
      ctx.stroke();
      const rightEdge =
        vx + this.panelX[1] + (PANELS[1].to - PANELS[1].from) * this.dayW;
      const align = x > rightEdge - 140 ? "right" : "left";
      label(ctx, palette, m.text, x + (align === "left" ? -3 : 3), y, {
        align,
        size,
        color: palette.fg,
        alpha: shown * 0.9,
      });
    }

    if (this.cursor >= 0 && this.p < 0.86) {
      const x = vx + this.cursorX;
      ctx.strokeStyle = rgba(palette.accent, 0.45);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, vy + 8);
      ctx.lineTo(x, base + 6);
      ctx.stroke();
    }
    resetText(ctx);
  }
}
