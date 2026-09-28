import { clamp, gauss, lerp, rgba, smoothstep } from "../math";
import { dust } from "../shapes";
import { label, resetText } from "../story";
import type { Field, Frame, Palette, Scene } from "../types";

type Kind = "speed" | "memory" | "complexity" | "downloads";

type Chart = {
  el: HTMLElement;
  kind: Kind;
  rect: DOMRect | null;
  start: number;
  count: number;
};

/** Seconds for all 18 ResNet-18 layers on an H100. */
const SPEED = [
  { name: "torch_cka", seconds: 8.98 },
  { name: "pytorch-cka", seconds: 1.16 },
];
/** MB left allocated after one pass over CIFAR-10. */
const HELD = 4260.2;
const KEPT = 183.5;
/** PyPI downloads per month without mirrors (pypistats), April–August 2026. */
const MONTHS = [
  { name: "Apr", downloads: 53 },
  { name: "May", downloads: 489 },
  { name: "Jun", downloads: 384 },
  { name: "Jul", downloads: 105 },
  { name: "Aug", downloads: 704 },
];
const PEAK = 760;
/** Lattice points per cube edge. */
const G = 6;
/** Share of all particles each chart gets. */
const SHARE: Record<Kind, number> = {
  speed: 0.09,
  memory: 0.13,
  complexity: 0.12,
  downloads: 0.11,
};

/**
 * The case study's four results, each with a small particle chart of its own
 * evidence: two bars racing to 8.98 s and 1.16 s, a GPU memory tank draining
 * from 4,260 MB to 183.5 MB, a B × B × B cube of work flattening into a
 * B × B plane, and monthly downloads as stacked dots.
 */
export class CkaResultsScene implements Scene {
  private charts: Chart[] = [];
  private clock = 0;
  private ink = true;

  layout(f: Field, fr: Frame) {
    let start = 0;
    this.charts = Array.from(
      fr.section.querySelectorAll<HTMLElement>("[data-chart]"),
    ).map((el) => {
      const kind = el.dataset.chart as Kind;
      const count = Math.round(f.n * (SHARE[kind] ?? 0.1));
      const chart = { el, kind, rect: null, start, count };
      start += count;
      return chart;
    });
    this.clock = 0;
  }

  update(f: Field, fr: Frame) {
    this.clock = fr.reduced ? 10 : this.clock + fr.dt;
    // Charts build once the page settles, then hold (the cube keeps breathing).
    const t = smoothstep(0.4, 2.2, this.clock);
    const boost = this.ink ? 1 : 1.3;
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
      f.gj[i] = 0.3;
      if (!this.ink) f.gz[i] = f.size[i] * 1.3;
      switch (c.kind) {
        case "speed":
          this.speed(f, i, k, c, t);
          break;
        case "memory":
          this.memory(f, i, k, c, t);
          break;
        case "complexity":
          this.complexity(f, i, k, c, fr);
          break;
        case "downloads":
          this.downloads(f, i, k, c, t);
          break;
      }
      f.ga[i] = Math.min(1, f.ga[i] * boost);
    }
  }

  /** Two bars growing at the same rate; pytorch-cka's stops at 1.16 s. */
  private speed(f: Field, i: number, k: number, c: Chart, t: number) {
    const r = c.rect as DOMRect;
    const total = SPEED[0].seconds + SPEED[1].seconds;
    const row = k < c.count * (SPEED[0].seconds / total) ? 0 : 1;
    const run = SPEED[row];
    const span = r.width * 0.72;
    const T = t * SPEED[0].seconds;
    const at = f.r0[i] * run.seconds;
    const shown = at <= T;
    const px = span / SPEED[0].seconds;
    const bar = 9;
    f.gx[i] = r.left + Math.min(at, T) * px;
    f.gy[i] =
      r.top + r.height * (row === 0 ? 0.36 : 0.8) + (f.r1[i] - 0.5) * bar;
    f.ga[i] = shown ? 0.6 + f.r3[i] * 0.35 : 0;
    f.gh[i] = row === 1 ? 1 : 0;
  }

  /** A tank that fills to what torch_cka keeps, then drains to what pytorch-cka keeps. */
  private memory(f: Field, i: number, k: number, c: Chart, t: number) {
    const r = c.rect as DOMRect;
    const tank = this.tank(r);
    const edge = Math.round(c.count * 0.28);
    if (k < edge) {
      const d = f.r0[i] * 2 * (tank.w + tank.h);
      let x = tank.x;
      let y = tank.y + tank.h - (d - 2 * tank.w - tank.h);
      if (d < tank.w) {
        x = tank.x + d;
        y = tank.y;
      } else if (d < tank.w + tank.h) {
        x = tank.x + tank.w;
        y = tank.y + d - tank.w;
      } else if (d < 2 * tank.w + tank.h) {
        x = tank.x + tank.w - (d - tank.w - tank.h);
        y = tank.y + tank.h;
      }
      f.gx[i] = x;
      f.gy[i] = y;
      f.ga[i] = 0.4;
      return;
    }
    const m = k - edge;
    const fillN = c.count - edge;
    const cols = Math.max(4, Math.round(Math.sqrt((fillN * tank.w) / tank.h)));
    const rows = Math.ceil(fillN / cols);
    const col = m % cols;
    const row = Math.floor(m / cols);
    const level = this.level(t) / HELD;
    const filled = m < level * fillN;
    const y = tank.y + tank.h - ((row + 0.2 + f.r2[i] * 0.6) / rows) * tank.h;
    f.gx[i] = tank.x + ((col + 0.2 + f.r1[i] * 0.6) / cols) * tank.w;
    // Once drained, a faint ghost keeps the 4.26 GB torch_cka would still hold.
    const ghost = m < fillN && smoothstep(0.6, 0.9, t) > 0 ? 0.1 : 0;
    f.gy[i] = filled || ghost ? y : y - 16 - f.r3[i] * 24;
    f.ga[i] = filled ? 0.5 + f.r3[i] * 0.35 : ghost;
  }

  private tank(r: DOMRect) {
    return { x: r.left, y: r.top + 4, w: r.width * 0.34, h: r.height - 8 };
  }

  /** MB held: fills to torch_cka's 4,260, then drains to pytorch-cka's 183.5. */
  private level(t: number) {
    const fill = smoothstep(0, 0.45, t);
    const drain = smoothstep(0.55, 1, t);
    return lerp(HELD * fill, KEPT, drain);
  }

  /** A B × B × B lattice of multiply-adds that flattens to B × B, and back. */
  private complexity(f: Field, i: number, k: number, c: Chart, fr: Frame) {
    const r = c.rect as DOMRect;
    const flat = this.flatness(fr);
    const p = k % (G * G * G);
    const a = p % G;
    const b = Math.floor(p / G) % G;
    const d = Math.floor(p / (G * G));
    const step = 2 / (G - 1);
    const j = 0.02 * gauss(f.r1[i], f.r2[i]);
    const x = -1 + a * step + j;
    const y = (-1 + b * step + j) * (1 - flat);
    const z = -1 + d * step + j;
    const yaw = fr.reduced ? 0.7 : 0.6 + this.clock * 0.18;
    const pitch = 0.5;
    const x1 = x * Math.cos(yaw) - z * Math.sin(yaw);
    const z1 = x * Math.sin(yaw) + z * Math.cos(yaw);
    const y2 = y * Math.cos(pitch) - z1 * Math.sin(pitch);
    const size = Math.min(r.height * 0.36, r.width * 0.2);
    f.gx[i] = r.left + r.width * 0.3 + x1 * size;
    f.gy[i] = r.top + r.height * 0.5 + y2 * size;
    // Flattened, one layer of the lattice remains: the B² that is needed.
    f.ga[i] = (0.35 + f.r3[i] * 0.35) * (b === G - 1 ? 1 : 1 - flat);
    f.gh[i] = flat * 0.9;
  }

  private flatness(fr: Frame) {
    if (fr.reduced) return 1;
    // Hold the cube, flatten, hold the plane, then rebuild; about 8 s a cycle.
    const u = (Math.max(0, this.clock - 0.8) % 8) / 8;
    return smoothstep(0.2, 0.32, u) * (1 - smoothstep(0.86, 0.98, u));
  }

  /** Monthly downloads as columns of stacked dots. */
  private downloads(f: Field, i: number, k: number, c: Chart, t: number) {
    const r = c.rect as DOMRect;
    const total = MONTHS.reduce((s, m) => s + m.downloads, 0);
    let acc = 0;
    let month = 0;
    for (; month < MONTHS.length - 1; month++) {
      acc += MONTHS[month].downloads / total;
      if (k < acc * c.count) break;
    }
    const col = this.column(r, month);
    const height = (MONTHS[month].downloads / PEAK) * col.h * t;
    f.gx[i] = col.x + f.r0[i] * col.w;
    f.gy[i] = col.base - f.r1[i] * height;
    f.ga[i] = t > 0.02 ? 0.6 + f.r3[i] * 0.3 : 0;
  }

  private column(r: DOMRect, month: number) {
    const slot = (r.width * 0.86) / MONTHS.length;
    return {
      x: r.left + slot * month + slot * 0.22,
      w: slot * 0.56,
      base: r.top + r.height - 16,
      h: r.height - 22,
    };
  }

  draw(ctx: CanvasRenderingContext2D, fr: Frame, palette: Palette) {
    this.ink = palette.ink;
    const t = smoothstep(0.4, 2.2, this.clock);
    const size = 9.5;
    for (const c of this.charts) {
      const r = c.rect;
      if (!r || r.width < 1) continue;
      if (c.kind === "speed") {
        const span = r.width * 0.72;
        const px = span / SPEED[0].seconds;
        SPEED.forEach((run, row) => {
          const ours = row === 1;
          const y = r.top + r.height * (row === 0 ? 0.36 : 0.8);
          label(ctx, palette, run.name, r.left, y - 13, {
            size,
            color: ours ? palette.accent : palette.muted,
          });
          const done = t * SPEED[0].seconds >= run.seconds;
          const end = Math.min(t * SPEED[0].seconds, run.seconds) * px;
          label(
            ctx,
            palette,
            `${run.seconds.toFixed(2)} s`,
            r.left + end + 8,
            y,
            {
              size,
              color: ours ? palette.accent : palette.fg,
              alpha: done ? 0.9 : 0,
            },
          );
        });
      } else if (c.kind === "memory") {
        const tank = this.tank(r);
        const x = tank.x + tank.w + 10;
        const heldY = tank.y + tank.h * (1 - HELD / HELD);
        const level = this.level(t);
        const ly = tank.y + tank.h * (1 - level / HELD);
        const drained = smoothstep(0.9, 1, t);
        label(
          ctx,
          palette,
          `torch_cka  ${(HELD / 1000).toFixed(2)} GB`,
          x,
          heldY + 6,
          {
            size,
            alpha: smoothstep(0.35, 0.45, t) * 0.9,
          },
        );
        ctx.strokeStyle = rgba(palette.muted, 0.35 * smoothstep(0.35, 0.45, t));
        ctx.setLineDash([2, 3]);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(tank.x, heldY + 1);
        ctx.lineTo(tank.x + tank.w + 4, heldY + 1);
        ctx.stroke();
        ctx.setLineDash([]);
        label(
          ctx,
          palette,
          `pytorch-cka  ${KEPT} MB`,
          x,
          Math.min(ly, tank.y + tank.h - 6),
          {
            size,
            color: palette.accent,
            alpha: drained,
          },
        );
      } else if (c.kind === "complexity") {
        const flat = this.flatness(fr);
        const x = r.left + r.width * 0.62;
        const y = r.top + r.height * 0.5;
        label(ctx, palette, "torch_cka", x, y - 8, {
          size,
          alpha: 1 - flat,
        });
        label(ctx, palette, "B × B × B", x, y + 8, {
          size,
          color: palette.fg,
          alpha: 1 - flat,
        });
        label(ctx, palette, "pytorch-cka", x, y - 8, {
          size,
          color: palette.accent,
          alpha: flat,
        });
        label(ctx, palette, "B × B", x, y + 8, {
          size,
          color: palette.fg,
          alpha: flat,
        });
      } else {
        MONTHS.forEach((m, month) => {
          const col = this.column(r, month);
          label(ctx, palette, m.name, col.x + col.w / 2, col.base + 11, {
            align: "center",
            size: 9,
            alpha: 0.75,
          });
        });
        // The May–August mean, 420 a month.
        const avg = this.column(r, 0);
        const y = avg.base - (420 / PEAK) * avg.h * t;
        ctx.strokeStyle = rgba(palette.accent, 0.6 * clamp(t * 2));
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(r.left, y);
        ctx.lineTo(r.left + r.width * 0.86, y);
        ctx.stroke();
        ctx.setLineDash([]);
        label(ctx, palette, "avg", r.left + r.width * 0.88, y, {
          size,
          color: palette.accent,
          alpha: clamp(t * 2),
        });
      }
    }
    resetText(ctx);
  }
}
