import { lerp, rgba, smoothstep } from "../math";
import { EMERALD, METRIC, onPaper, PURPLE } from "../muc-colors";
import { dust } from "../shapes";
import { freeArea, label, resetText, StageSize, Steps, stepAt } from "../story";
import type { Field, Frame, Palette, RGB, Scene } from "../types";

const STEP_AT = [0, 0.27, 0.52, 0.76] as const;
const STAGES = ["Build", "Screen", "Contrast", "Attack"];
/** Original, retrained, then the six candidates the Build stage makes. */
const MODELS = 8;
/** Which candidates end up as Model A and Model B. */
const PICK_A = 4;
const PICK_B = 6;
/** Schematic screening scores (accuracy, efficiency, privacy) per model. */
const SCORES: [number, number, number][] = [
  [0.5, 0, 0],
  [1, 0.05, 1],
  [0.86, 0.9, 0.42],
  [0.94, 0.72, 0.55],
  [0.9, 0.8, 0.78],
  [0.7, 0.96, 0.35],
  [0.97, 0.6, 0.64],
  [0.8, 0.85, 0.2],
];
const COLORS: RGB[] = [EMERALD, PURPLE, ...METRIC];

const COLORS_PAPER = onPaper(COLORS);
const OUTLINE = 170;
const BAR = 32;
const HIST = 110;
const HIST_BINS = 14;

/** Bins and stack levels for two bell-shaped output distributions. */
const HIST_SLOTS = [0.38, 0.62].map((mean) => {
  const weights = Array.from({ length: HIST_BINS }, (_, b) =>
    Math.exp(-(((b + 0.5) / HIST_BINS - mean) ** 2) / (2 * 0.11 ** 2)),
  );
  const total = weights.reduce((a, w) => a + w, 0);
  const slots: { bin: number; level: number }[] = [];
  weights.forEach((w, bin) => {
    const count = Math.round((w / total) * HIST);
    // Two dots per level, so each bin reads as a column rather than a line.
    for (let k = 0; k < count && slots.length < HIST; k++)
      slots.push({ bin, level: Math.floor(k / 2) + (k % 2) * 0.001 });
  });
  while (slots.length < HIST) slots.push({ bin: 0, level: -99 });
  return slots;
});

type Panel = { x: number; y: number; w: number; h: number };

/**
 * The comparator's four-stage loop as a diagram the models move through.
 * Build turns one original into six candidates, Screen lists every model with
 * its accuracy, efficiency, and privacy, Contrast pulls two of them out as
 * Model A and Model B, and Attack pits Model B's outputs against the
 * retrained model's before the loop goes back to Build.
 */
export class WorkflowScene implements Scene {
  private panels: Panel[] = [];
  private chip = 20;
  private grid = 6;
  private p = 0;
  private stage = new StageSize();
  private steps = new Steps();
  private ink = true;

  layout(_f: Field, fr: Frame) {
    this.stage.changed(fr);
    const area = freeArea(fr, 0);
    const gap = fr.compact ? 34 : 58;
    const w = (area.w - gap) / 2;
    const h = Math.min((area.h - gap) / 2, w * 1.05);
    const top = area.y + (area.h - (2 * h + gap)) / 2;
    const at = (col: number, row: number): Panel => ({
      x: area.x + col * (w + gap),
      y: top + row * (h + gap),
      w,
      h,
    });
    // Clockwise, so the loop closes back at Build.
    this.panels = [at(0, 0), at(1, 0), at(1, 1), at(0, 1)];
    this.grid = fr.compact ? 5 : 6;
    this.chip = Math.max(12, Math.min(w, h) * (fr.compact ? 0.09 : 0.1));
    this.steps.collect(fr.section);
  }

  /** A model's row in the Screen stage, and the chip scale that fits it. */
  private row(order: number) {
    const screen = this.panels[1];
    const rowH = (screen.h - 58) / MODELS;
    return {
      y: screen.y + 46 + (order + 0.5) * rowH,
      x: screen.x + 22,
      scale: Math.min(1, (rowH * 0.72) / this.chip),
    };
  }

  /** Where model `m` sits at scroll `p`, and how large its chip is. */
  private place(m: number, p: number) {
    const [build, , contrast] = this.panels;
    const listed = this.row(m);
    const ranked = this.row(RANK[m]);
    let x: number;
    let y: number;
    let scale = 1;
    if (m === 0) {
      x = build.x + build.w * 0.2;
      y = build.y + build.h * 0.55;
    } else if (m === 1) {
      // The retrained model comes with the system and waits in Screen.
      x = listed.x + (this.chip * listed.scale) / 2;
      y = listed.y;
      scale = listed.scale;
    } else {
      // Build: one candidate per combination, fanning out from the original.
      const c = m - 2;
      const spawn = smoothstep(0.03 + c * 0.02, 0.13 + c * 0.02, p);
      const gx = build.x + build.w * (0.5 + (c % 3) * 0.17);
      const gy = build.y + build.h * (0.4 + Math.floor(c / 3) * 0.26);
      x = lerp(build.x + build.w * 0.2, gx, spawn);
      y = lerp(build.y + build.h * 0.55, gy, spawn);
    }
    // Screen: every model becomes a row, sorted by privacy once scored.
    const toScreen = smoothstep(0.27, 0.36, p);
    const sorted = smoothstep(0.38, 0.47, p);
    const sx = listed.x + (this.chip * listed.scale) / 2;
    const sy = lerp(listed.y, ranked.y, sorted);
    x = lerp(x, sx, toScreen);
    y = lerp(y, sy, toScreen);
    scale = lerp(scale, listed.scale, toScreen);
    // Contrast: Model A and Model B leave the table, enlarged.
    if (m === PICK_A || m === PICK_B) {
      const go = smoothstep(0.52, 0.62, p);
      const cx = contrast.x + contrast.w * (m === PICK_A ? 0.3 : 0.7);
      const cy = contrast.y + contrast.h * 0.55;
      x = lerp(x, cx, go);
      y = lerp(y, cy, go);
      scale = lerp(scale, 2.2, go);
    }
    return { x, y, scale };
  }

  update(f: Field, fr: Frame) {
    if (this.stage.changed(fr)) this.layout(f, fr);
    if (this.panels.length === 0) return;
    const p = fr.progress;
    this.p = p;
    const step = stepAt(p, STEP_AT);
    this.steps.set(step);
    f.classColors = this.ink ? COLORS : COLORS_PAPER;
    const boost = this.ink ? 1 : 1.35;
    const vx = fr.visual.x;
    const vy = fr.visual.y;
    const g = this.grid;
    const chipN = g * g;
    const chipsEnd = MODELS * chipN;
    const barsEnd = chipsEnd + MODELS * 3 * BAR;
    const histEnd = barsEnd + 2 * HIST;
    const outlineEnd = histEnd + 4 * OUTLINE;
    const [, screen, , attack] = this.panels;
    const s = this.chip;

    for (let i = 0; i < f.n; i++) {
      f.gh[i] = 0;
      f.gj[i] = 0.25;
      if (i < chipsEnd) {
        const m = Math.floor(i / chipN);
        const k = i - m * chipN;
        const { x, y, scale } = this.place(m, p);
        const size = s * scale;
        const col = k % g;
        const row = Math.floor(k / g);
        f.gx[i] = vx + x + ((col + 0.5) / g - 0.5) * size;
        f.gy[i] = vy + y + ((row + 0.5) / g - 0.5) * size;
        const visible = m < 2 ? 1 : smoothstep(0.02, 0.06, p);
        const picked = m === PICK_A || m === PICK_B;
        const dim = step >= 2 && !picked ? 0.35 : 1;
        f.ga[i] = Math.min(
          1,
          (m === 1 ? 0.45 : 0.75) * visible * dim * boost + f.r3[i] * 0.1,
        );
        const colored = smoothstep(0.54, 0.6, p);
        if (picked && colored > 0.5) f.gc[i] = m === PICK_A ? 1 : 2;
        f.gz[i] = Math.max(1.4, (size / g) * 0.62);
        continue;
      }
      if (i < barsEnd) {
        // Three short bars per screened model, in the metric colors.
        const k = i - chipsEnd;
        const m = Math.floor(k / (3 * BAR));
        const metric = Math.floor((k % (3 * BAR)) / BAR);
        const d = k % BAR;
        // Bars stay in the table, following each model's row as it sorts.
        const y = lerp(
          this.row(m).y,
          this.row(RANK[m]).y,
          smoothstep(0.38, 0.47, p),
        );
        const r = this.row(0);
        const x0 = r.x + this.chip * r.scale + 16;
        const width = (screen.x + screen.w - 14 - x0) / 3 - 12;
        const per = BAR / 2;
        const col = d % per;
        const line = Math.floor(d / per);
        const score = SCORES[m][metric];
        const on = col / per < score;
        const shown = smoothstep(0.3, 0.37, p) * (step >= 2 ? 0.45 : 1);
        f.gx[i] = vx + x0 + metric * (width + 12) + (col / per) * width;
        f.gy[i] = vy + y + (line - 0.5) * 3.4;
        f.gz[i] = 2;
        f.gj[i] = 0.1;
        f.ga[i] = on ? 0.85 * shown * boost : 0.07 * shown;
        if (on) f.gc[i] = 3 + metric;
        continue;
      }
      if (i < histEnd) {
        // Two output distributions, retrained against Model B.
        const k = i - barsEnd;
        const side = Math.floor(k / HIST);
        const { bin, level } = HIST_SLOTS[side][k % HIST];
        const binW = (attack.w * 0.8) / HIST_BINS;
        const pair = level % 1 > 0 ? 1 : 0;
        const x =
          attack.x +
          attack.w * 0.1 +
          (bin + (side ? 0.55 : 0.2)) * binW +
          pair * 3.6;
        const y = attack.y + attack.h * 0.84 - (Math.floor(level) + 0.5) * 3.8;
        const shown = smoothstep(
          0.76 + f.r0[i] * 0.04,
          0.84 + f.r0[i] * 0.04,
          p,
        );
        f.gx[i] = vx + x;
        f.gy[i] = vy + y;
        f.gz[i] = 2.6;
        f.gj[i] = 0.1;
        f.ga[i] = level < 0 ? 0 : (side ? 0.9 : 0.5) * shown * boost;
        if (side === 1) f.gc[i] = 2;
        continue;
      }
      if (i < outlineEnd) {
        // Each stage's frame, lit while it is the current one.
        const k = i - histEnd;
        const stage = Math.floor(k / OUTLINE);
        const panel = this.panels[stage];
        const u = (k % OUTLINE) / OUTLINE;
        const d = u * 2 * (panel.w + panel.h);
        let x = panel.x;
        let y = panel.y + panel.h - (d - 2 * panel.w - panel.h);
        if (d < panel.w) {
          x = panel.x + d;
          y = panel.y;
        } else if (d < panel.w + panel.h) {
          x = panel.x + panel.w;
          y = panel.y + d - panel.w;
        } else if (d < 2 * panel.w + panel.h) {
          x = panel.x + panel.w - (d - panel.w - panel.h);
          y = panel.y + panel.h;
        }
        f.gx[i] = vx + x;
        f.gy[i] = vy + y;
        f.ga[i] = (stage === step ? 0.55 : 0.16) * boost;
        f.gh[i] = stage === step ? 0.6 : 0;
        f.gj[i] = 0.1;
        continue;
      }
      dust(f, i, fr, 0.1);
    }
  }

  draw(ctx: CanvasRenderingContext2D, fr: Frame, palette: Palette) {
    this.ink = palette.ink;
    if (this.panels.length === 0) return;
    const vx = fr.visual.x;
    const vy = fr.visual.y;
    const p = this.p;
    const step = stepAt(p, STEP_AT);
    const size = fr.compact ? 9.5 : 10.5;
    const colors = palette.ink ? COLORS : COLORS_PAPER;

    this.panels.forEach((panel, k) => {
      label(
        ctx,
        palette,
        `0${k + 1}  ${STAGES[k]}`,
        vx + panel.x + 12,
        vy + panel.y + 16,
        {
          size: fr.compact ? 10 : 11,
          color: k === step ? palette.accent : palette.fg,
          alpha: k === step ? 1 : 0.55,
        },
      );
    });
    this.arrows(ctx, palette, vx, vy, step);

    const [build, screen, contrast, attack] = this.panels;
    const s = this.chip;
    const at = (panel: Panel, u: number, v: number) =>
      [vx + panel.x + panel.w * u, vy + panel.y + panel.h * v] as const;

    // Build.
    const [ox, oy] = at(build, 0.2, 0.56);
    label(ctx, palette, "original", ox, oy + s * 0.9, {
      align: "center",
      size,
      alpha: 0.85 * (1 - smoothstep(0.27, 0.3, p)),
    });
    if (!fr.compact) {
      const [hx, hy] = at(build, 0.67, 0.84);
      label(ctx, palette, "6 candidate models", hx, hy, {
        align: "center",
        size,
        alpha:
          smoothstep(0.08, 0.16, p) * (1 - smoothstep(0.27, 0.3, p)) * 0.85,
      });
    }

    // Screen.
    if (!fr.compact) {
      const r = this.row(0);
      const x0 = r.x + s * r.scale + 16;
      const width = (screen.x + screen.w - 14 - x0) / 3 - 12;
      ["accuracy", "efficiency", "privacy"].forEach((name, m) => {
        label(
          ctx,
          palette,
          name,
          vx + x0 + m * (width + 12),
          vy + screen.y + 36,
          {
            size: 9,
            color: colors[2 + m],
            alpha: smoothstep(0.3, 0.37, p) * 0.9,
          },
        );
      });
    }

    // Contrast.
    const shown = smoothstep(0.56, 0.62, p);
    const [ax, ay] = at(contrast, 0.3, 0.55);
    const [bx] = at(contrast, 0.7, 0.55);
    label(ctx, palette, "Model A", ax, ay + s * 1.6, {
      align: "center",
      size,
      color: colors[0],
      alpha: shown,
    });
    label(ctx, palette, "Model B", bx, ay + s * 1.6, {
      align: "center",
      size,
      color: colors[1],
      alpha: shown,
    });
    label(ctx, palette, "vs", (ax + bx) / 2, ay, {
      align: "center",
      size,
      alpha: shown * 0.7,
    });

    // Attack: the threshold an attacker draws between the two.
    const a = smoothstep(0.8, 0.88, p);
    if (a > 0.01) {
      const [tx, ty] = at(attack, 0.52, 0.3);
      ctx.strokeStyle = rgba(palette.fg, 0.7 * a);
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(tx, vy + attack.y + attack.h * 0.84);
      ctx.stroke();
      ctx.setLineDash([]);
      label(ctx, palette, "retrained", vx + attack.x + attack.w * 0.3, ty, {
        align: "center",
        size,
        alpha: a * 0.8,
      });
      label(ctx, palette, "Model B", vx + attack.x + attack.w * 0.74, ty, {
        align: "center",
        size,
        color: colors[1],
        alpha: a,
      });
    }
    resetText(ctx);
  }

  /** Clockwise arrows between the stages; the last one closes the loop. */
  private arrows(
    ctx: CanvasRenderingContext2D,
    palette: Palette,
    vx: number,
    vy: number,
    step: number,
  ) {
    const [b, s, c, a] = this.panels;
    const midY = (p: Panel) => vy + p.y + p.h / 2;
    const midX = (p: Panel) => vx + p.x + p.w / 2;
    const links: [number, number, number, number][] = [
      [vx + b.x + b.w + 8, midY(b), vx + s.x - 8, midY(s)],
      [midX(s), vy + s.y + s.h + 8, midX(c), vy + c.y - 8],
      [vx + c.x - 8, midY(c), vx + a.x + a.w + 8, midY(a)],
      [midX(a), vy + a.y - 8, midX(b), vy + b.y + b.h + 8],
    ];
    links.forEach(([x0, y0, x1, y1], k) => {
      const lit = k === step || (k === 3 && this.p > 0.9);
      ctx.strokeStyle = rgba(
        lit ? palette.accent : palette.muted,
        lit ? 0.9 : 0.4,
      );
      ctx.fillStyle = ctx.strokeStyle;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
      const angle = Math.atan2(y1 - y0, x1 - x0);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(
        x1 - 6 * Math.cos(angle - 0.45),
        y1 - 6 * Math.sin(angle - 0.45),
      );
      ctx.lineTo(
        x1 - 6 * Math.cos(angle + 0.45),
        y1 - 6 * Math.sin(angle + 0.45),
      );
      ctx.closePath();
      ctx.fill();
    });
    // The loop's return leg is where the method gets refined.
    const [x0, y0, , y1] = links[3];
    label(ctx, palette, "refine", x0 + 8, (y0 + y1) / 2, {
      size: 9.5,
      color: this.p > 0.9 ? palette.accent : palette.muted,
      alpha: 0.9,
    });
  }
}

/** Each model's row once the table is sorted by privacy, best first. */
const RANK = (() => {
  const order = Array.from({ length: MODELS }, (_, m) => m).sort(
    (a, b) => SCORES[b][2] - SCORES[a][2],
  );
  const rank = new Array<number>(MODELS);
  order.forEach((m, r) => {
    rank[m] = r;
  });
  return rank;
})();
