import {
  boostFor,
  outcomeClass,
  outcomeColor,
  outcomeColors,
  SAMPLES,
} from "../invoice-data";
import { type Mark, Marks } from "../marks";
import { clamp, smoothstep } from "../math";
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

const STEP_AT = [0, 0.25, 0.5, 0.75] as const;
const AGENTS = ["intake", "validation", "vp", "critic"];
const CHECKS = ["status", "paid", "codes"];
/** Width of one answer-key column, room for its header. */
const COL_W = 40;

/**
 * How the pipeline is tested without a key. A live run's agent outputs are
 * recorded per invoice; in tests every agent is a FunctionModel that replays
 * its queue, so the whole batch runs offline against the answer key. The
 * same key, run against live Grok, is the live test.
 */
export class ReplayScene implements Scene {
  private marks = new Marks();
  private fixture: {
    box: Mark;
    keys: Mark[];
    x: number;
    y: number;
    w: number;
    h: number;
  } | null = null;
  private agents: { ring: Mark; feed: Mark; x: number; y: number }[] = [];
  private cells: Mark[] = [];
  private grid = { x: 0, y: 0, cell: 8, gap: 3, labels: false };
  private R = 12;
  private step = 0;
  private done = 0;
  private steps = new Steps();
  private readouts = new Readouts();
  private size = new StageSize();
  private ink = true;

  layout(f: Field, fr: Frame) {
    const area = freeArea(fr, 18);
    const m = this.marks;
    m.clear();
    const fw = area.w * 0.24;
    const fh = Math.min(area.h * 0.62, fw * 1.6);
    const fx = area.x;
    const fy = area.y + (area.h - fh) / 2;
    const box = m.add("box", { x: fx, y: fy, w: fw, h: fh }, 0.45);
    const keys = AGENTS.map((_, k) =>
      m.add(
        "fill",
        {
          x: fx + 10,
          y: fy + 22 + k * ((fh - 30) / 4),
          w: fw * 0.55,
          h: (fh - 30) / 4 - 14,
        },
        0.12,
      ),
    );
    this.fixture = { box, keys, x: fx, y: fy, w: fw, h: fh };

    this.R = clamp(area.h * 0.04, 9, 15);
    const ax = area.x + area.w * 0.44;
    const pitch = Math.min(area.h / 4.4, 90);
    const ay = area.y + (area.h - pitch * 3) / 2;
    this.agents = AGENTS.map((_, k) => {
      const y = ay + k * pitch;
      const key = keys[k];
      return {
        ring: m.add("ring", { x: ax, y, r: this.R }, 0.9),
        feed: m.add(
          "curve",
          { x: fx + fw + 6, y: key.y + key.h / 2, x2: ax - this.R - 8, y2: y },
          0.3,
        ),
        x: ax,
        y,
      };
    });

    const labels = !fr.compact && area.w > 520;
    const gx = area.x + area.w * (labels ? 0.7 : 0.66);
    const cell = Math.max(4, Math.min(11, (area.h - 40) / SAMPLES.length - 3));
    const gap = 3;
    const gy = area.y + (area.h - SAMPLES.length * (cell + gap)) / 2 + 8;
    this.grid = { x: gx, y: gy, cell, gap, labels };
    const colX = labels ? gx + 92 : gx;
    this.cells = [];
    SAMPLES.forEach((_, r) => {
      CHECKS.forEach((__, c) => {
        this.cells.push(
          m.add(
            "fill",
            {
              x: colX + c * COL_W,
              y: gy + r * (cell + gap),
              w: COL_W - 8,
              h: cell,
            },
            0.7,
          ),
        );
      });
    });
    m.fit(f);
    this.steps.collect(fr.section);
    this.readouts.collect(fr.section);
  }

  update(f: Field, fr: Frame) {
    if (this.size.changed(fr)) this.layout(f, fr);
    f.classColors = outcomeColors(this.ink);
    const p = fr.progress;
    const step = stepAt(p, STEP_AT);
    this.step = step;
    this.steps.set(step);
    const replay = smoothstep(STEP_AT[2], STEP_AT[3] - 0.04, p);
    this.done =
      step >= 3 ? SAMPLES.length : Math.floor(replay * SAMPLES.length);

    const fx = this.fixture;
    if (!fx) return;
    fx.box.a = step <= 1 ? 0.85 : 0.45;
    fx.keys.forEach((k, i) => {
      k.show = step === 0 ? smoothstep(i * 0.05, i * 0.05 + 0.08, p) : 1;
      k.a = step <= 1 ? 0.7 : 0.35;
    });
    this.agents.forEach((a) => {
      a.ring.a = step >= 1 ? 0.9 : 0.35;
      a.ring.tint =
        step === 1 || (step === 2 && this.done < SAMPLES.length) ? 0.8 : 0;
      a.feed.a = step === 1 ? 0.7 : step === 2 ? 0.35 : 0.1;
      a.feed.flow = step === 1 || step === 2 ? 0.7 : 0;
    });
    this.cells.forEach((c, i) => {
      const r = Math.floor(i / CHECKS.length);
      const on = r < this.done;
      c.a = on ? 0.9 : 0.14;
      c.cls = on && step < 3 ? outcomeClass(SAMPLES[r].outcome) : 0;
      c.tint = on && step >= 3 ? 1 : 0;
    });
    this.marks.apply(f, fr, { boost: boostFor(this.ink), dustAlpha: 0.07 });

    this.readouts.write(
      "model",
      step >= 3
        ? "grok (live)"
        : step >= 1
          ? "FunctionModel"
          : "grok (recording)",
    );
    this.readouts.write(
      "matched",
      step >= 2 ? `${this.done} / ${SAMPLES.length}` : "—",
    );
  }

  draw(ctx: CanvasRenderingContext2D, fr: Frame, palette: Palette) {
    this.ink = palette.ink;
    const vx = fr.visual.x;
    const vy = fr.visual.y;
    const step = this.step;
    const size = fr.compact ? 8.5 : 10;
    const fx = this.fixture;
    if (!fx) return;

    label(ctx, palette, "invoice_1010.txt.json", vx + fx.x, vy + fx.y - 10, {
      size: size - 1,
      alpha: 0.8,
    });
    fx.keys.forEach((k, i) => {
      label(ctx, palette, `"${AGENTS[i]}": [ … ]`, vx + k.x, vy + k.y - 7, {
        size: size - 1.5,
        color: step <= 1 ? palette.fg : palette.muted,
        alpha: 0.85,
      });
    });
    this.agents.forEach((a, k) => {
      label(ctx, palette, AGENTS[k], vx + a.x + this.R + 10, vy + a.y - 6, {
        size,
        color: palette.fg,
      });
      label(
        ctx,
        palette,
        step >= 3 ? "grok" : step >= 1 ? "FunctionModel" : "agent",
        vx + a.x + this.R + 10,
        vy + a.y + 8,
        {
          size: size - 1.5,
          color: step >= 3 ? palette.accent : palette.muted,
        },
      );
    });

    const g = this.grid;
    label(ctx, palette, "ANSWER_KEY", vx + g.x, vy + g.y - 24, {
      size: size - 0.5,
      color: palette.fg,
    });
    if (g.labels) {
      CHECKS.forEach((c, i) => {
        label(
          ctx,
          palette,
          c,
          vx + g.x + 92 + i * COL_W + (COL_W - 8) / 2,
          vy + g.y - 9,
          {
            size: 8,
            align: "center",
            alpha: 0.65,
          },
        );
      });
      SAMPLES.forEach((s, r) => {
        const on = r < this.done;
        label(
          ctx,
          palette,
          s.file,
          vx + g.x,
          vy + g.y + r * (g.cell + g.gap) + g.cell / 2,
          {
            size: 8,
            color: on ? outcomeColor(s.outcome, palette) : palette.muted,
            alpha: on ? 0.95 : 0.45,
          },
        );
      });
    }
    if (step >= 3)
      label(
        ctx,
        palette,
        "live: 20 / 20",
        vx + g.x,
        vy + g.y + SAMPLES.length * (g.cell + g.gap) + 14,
        {
          size,
          color: palette.accent,
        },
      );
    resetText(ctx);
  }
}
