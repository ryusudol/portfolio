import {
  boostFor,
  type Mode,
  type Outcome,
  outcomeClass,
  outcomeColor,
  outcomeColors,
  SAMPLES,
} from "../invoice-data";
import { type Mark, Marks } from "../marks";
import { bezierAt, clamp, sCurve, smoothstep } from "../math";
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
const MODES: Mode[] = ["reject", "human_review", "strict", "standard"];
const ENDS: Outcome[] = ["rejected", "review", "paid", "duplicate"];
const END_LABEL: Record<Outcome, string> = {
  rejected: "rejected",
  review: "needs_review",
  paid: "paid",
  duplicate: "duplicate",
};
/** Which outcome each mode leads to in the samples (strict could go any way). */
const MODE_END: Record<Mode, Outcome> = {
  reject: "rejected",
  human_review: "review",
  strict: "paid",
  standard: "paid",
};
const LAUNCH = 0.62;
const TRAVEL = 3.4;
const HOLD = 2.4;
const CYCLE = SAMPLES.length * LAUNCH + TRAVEL + HOLD;

const count = <T>(list: T[], pick: (s: (typeof SAMPLES)[number]) => T) =>
  list.map((v) => SAMPLES.filter((s) => pick(s) === v).length);
const MODE_N = count(MODES, (s) => s.mode);
const END_N = count(ENDS, (s) => s.outcome);
const NEW_N = SAMPLES.filter((s) => s.outcome !== "duplicate").length;

type Bar = { mark: Mark; x: number; y: number; h: number };
type Band = { mark: Mark; from: Bar; to: Bar; fromY: number; toY: number };

/**
 * The 20 sample invoices through the policy gate, in batch order. Duplicates
 * leave first; the rest are sorted by their findings into four modes before
 * any approval agent runs. Only standard and strict leave the outcome open.
 */
export class GateScene implements Scene {
  private marks = new Marks();
  private received: Bar | null = null;
  private fresh: Bar | null = null;
  private modes: Bar[] = [];
  private ends: Bar[] = [];
  private bands: Band[] = [];
  private chips: Mark[] = [];
  private unit = 10;
  private barW = 8;
  private step = 0;
  private arrived = new Uint8Array(ENDS.length);
  private steps = new Steps();
  private readouts = new Readouts();
  private size = new StageSize();
  private ink = true;
  private pt: [number, number] = [0, 0];

  layout(f: Field, fr: Frame) {
    const area = freeArea(fr, 18);
    const m = this.marks;
    m.clear();
    const top = area.y + 18;
    const height = area.h - 34;
    const gaps = 3;
    const gap = Math.min(22, height * 0.06);
    this.unit = (height - gaps * gap) / SAMPLES.length;
    this.barW = fr.compact ? 6 : 8;
    const cols = (
      fr.compact ? [0.02, 0.22, 0.47, 0.7] : [0.02, 0.27, 0.56, 0.86]
    ).map((t) => area.x + area.w * t);
    const bar = (x: number, y: number, n: number): Bar => ({
      mark: m.add(
        "fill",
        { x, y, w: this.barW, h: Math.max(3, n * this.unit) },
        0.3,
      ),
      x,
      y,
      h: Math.max(3, n * this.unit),
    });
    const u = this.unit;
    this.received = bar(
      cols[0],
      top + (height - SAMPLES.length * u) / 2,
      SAMPLES.length,
    );
    this.fresh = bar(cols[1], top, NEW_N);
    let y = top;
    this.modes = MODES.map((_, k) => {
      const b = bar(cols[2], y, MODE_N[k]);
      y += b.h + gap;
      return b;
    });
    y = top;
    this.ends = ENDS.map((_, k) => {
      const b = bar(cols[3], y, END_N[k]);
      y += b.h + gap;
      return b;
    });

    const band = (
      from: Bar,
      fromY: number,
      to: Bar,
      toY: number,
      n: number,
    ) => {
      const mark = m.add(
        "curve",
        {
          x: from.x + this.barW + 2,
          y: fromY,
          x2: to.x - 2,
          y2: toY,
          spread: Math.max(0.6, (n * u) / 7),
        },
        0.9 + n * 0.22,
      );
      return { mark, from, to, fromY, toY };
    };
    const rec = this.received;
    const fresh = this.fresh;
    const dup = this.ends[3];
    this.bands = [
      band(rec, rec.y + (NEW_N * u) / 2, fresh, fresh.y + fresh.h / 2, NEW_N),
      band(
        rec,
        rec.y + rec.h - (END_N[3] * u) / 2,
        dup,
        dup.y + dup.h / 2,
        END_N[3],
      ),
    ];
    let off = 0;
    MODES.forEach((_, k) => {
      const n = MODE_N[k];
      const to = this.modes[k];
      this.bands.push(
        band(
          fresh,
          fresh.y + off + (n * u) / 2,
          to,
          to.y + to.h / 2,
          Math.max(n, 0.4),
        ),
      );
      off += n * u;
    });
    MODES.forEach((mode, k) => {
      const to = this.ends[ENDS.indexOf(MODE_END[mode])];
      const from = this.modes[k];
      this.bands.push(
        band(
          from,
          from.y + from.h / 2,
          to,
          to.y + to.h / 2,
          Math.max(MODE_N[k], 0.4),
        ),
      );
    });
    this.chips = SAMPLES.map(() =>
      m.add("disc", { r: fr.compact ? 3.5 : 5 }, 1.4),
    );
    m.fit(f);
    this.steps.collect(fr.section);
    this.readouts.collect(fr.section);
  }

  update(f: Field, fr: Frame) {
    if (this.size.changed(fr)) this.layout(f, fr);
    f.classColors = outcomeColors(this.ink);
    const step = stepAt(fr.progress, STEP_AT);
    this.step = step;
    this.steps.set(step);
    const clock = fr.reduced
      ? CYCLE - HOLD
      : ((fr.time % CYCLE) + CYCLE) % CYCLE;
    const lit = MODES[step];
    this.arrived.fill(0);

    const rec = this.received;
    const fresh = this.fresh;
    if (!rec || !fresh) return;
    const pt = this.pt;
    SAMPLES.forEach((s, k) => {
      const chip = this.chips[k];
      const t = clamp((clock - k * LAUNCH) / TRAVEL);
      const end = ENDS.indexOf(s.outcome);
      const isDup = s.outcome === "duplicate";
      chip.a = t > 0 && t < 1 ? 1 : 0;
      chip.cls = 0;
      chip.tint = 0;
      if (t >= 1) this.arrived[end]++;
      if (isDup) {
        bezierAt(curveOf(this.bands[1]), smoothstep(0, 1, t), pt);
        if (t > 0.35) chip.cls = outcomeClass("duplicate");
      } else {
        const mode = MODES.indexOf(s.mode as Mode);
        const legs = [
          this.bands[0],
          this.bands[2 + mode],
          this.bands[6 + mode],
        ];
        const leg = Math.min(2, Math.floor(t * 3));
        bezierAt(curveOf(legs[leg]), smoothstep(0, 1, t * 3 - leg), pt);
        if (leg === 2) chip.cls = outcomeClass(s.outcome);
        if (leg >= 1 && s.mode === lit) chip.tint = 1;
      }
      chip.x = pt[0];
      chip.y = pt[1];
    });

    rec.mark.a = 0.7;
    fresh.mark.a = 0.7;
    this.modes.forEach((b, k) => {
      b.mark.a = MODES[k] === lit ? 1 : 0.45;
      b.mark.tint = MODES[k] === lit ? 1 : 0;
    });
    this.ends.forEach((b, k) => {
      b.mark.a = 0.25 + 0.7 * (this.arrived[k] / Math.max(1, END_N[k]));
      b.mark.cls = outcomeClass(ENDS[k]);
    });
    this.bands.forEach((b, k) => {
      const mode = k >= 6 ? k - 6 : k >= 2 ? k - 2 : -1;
      const hot = mode >= 0 && MODES[mode] === lit;
      b.mark.a = hot ? 0.75 : mode >= 0 && MODE_N[mode] === 0 ? 0.12 : 0.36;
      b.mark.tint = hot ? 1 : 0;
      b.mark.flow = hot ? 0.18 : 0.05;
    });
    this.marks.apply(f, fr, { boost: boostFor(this.ink), dustAlpha: 0.06 });

    ENDS.forEach((o, k) => {
      this.readouts.write(o, String(this.arrived[k]));
    });
  }

  draw(ctx: CanvasRenderingContext2D, fr: Frame, palette: Palette) {
    this.ink = palette.ink;
    const vx = fr.visual.x;
    const vy = fr.visual.y;
    const size = fr.compact ? 8.5 : 10;
    const rec = this.received;
    const fresh = this.fresh;
    if (!rec || !fresh) return;
    const lit = MODES[this.step];
    const above = (b: Bar, text: string, color = palette.muted, alpha = 0.8) =>
      label(ctx, palette, text, vx + b.x, vy + b.y - 9, { size, color, alpha });

    above(rec, `${SAMPLES.length} received`);
    above(fresh, `${NEW_N} new`);
    label(
      ctx,
      palette,
      "policy_gate",
      vx + this.modes[0].x,
      vy + this.modes[0].y - 24,
      {
        size: size - 1,
        alpha: 0.6,
      },
    );
    this.modes.forEach((b, k) => {
      const on = MODES[k] === lit;
      label(
        ctx,
        palette,
        `${MODES[k]} · ${MODE_N[k]}`,
        vx + b.x + this.barW + 8,
        vy + b.y + b.h / 2,
        {
          size,
          color: on ? palette.accent : palette.fg,
          alpha: on ? 1 : 0.7,
        },
      );
    });
    this.ends.forEach((b, k) => {
      const o = ENDS[k];
      label(
        ctx,
        palette,
        END_LABEL[o],
        vx + b.x + this.barW + 8,
        vy + b.y + b.h / 2,
        {
          size,
          color: outcomeColor(o, palette),
          alpha: 0.95,
        },
      );
    });
    const std = this.bands[6 + MODES.indexOf("standard")];
    if (std && (lit === "standard" || lit === "strict")) {
      const m = std.mark;
      label(
        ctx,
        palette,
        "VP + critic",
        vx + (m.x + m.x2) / 2,
        vy + (m.y + m.y2) / 2 - 12,
        {
          size: size - 1,
          align: "center",
          color: palette.accent,
        },
      );
    }
    if (lit === "strict") {
      const b = this.modes[MODES.indexOf("strict")];
      label(
        ctx,
        palette,
        "none in this batch; INV-2001 in the extras",
        vx + b.x + this.barW + 8,
        vy + b.y + b.h / 2 + 14,
        {
          size: size - 1.5,
          alpha: 0.75,
        },
      );
    }
    resetText(ctx);
  }
}

function curveOf(b: Band) {
  return sCurve(b.mark.x, b.mark.y, b.mark.x2, b.mark.y2);
}
