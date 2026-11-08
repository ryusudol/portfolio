import { boostFor, outcomeClass, outcomeColors } from "../invoice-data";
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

const STEP_AT = [0, 0.2, 0.4, 0.6, 0.8] as const;

/** The core fields both INV-1012 files reduce to, as `_core()` builds them. */
const CORE = [
  "number    INV-1012",
  "vendor    quickship distributers",
  "date      2026-01-26",
  "lines     12×WidgetA@250 · 7×WidgetB@500 · 4×GadgetX@750",
  "total     997500 cents · USD",
];
const CORE_SHORT = [
  "number  INV-1012",
  "vendor  quickship…",
  "date    2026-01-26",
  "lines   12 · 7 · 4",
  "total   997500 USD",
];
const FINGERPRINT = "6d751f33753066a3";
/** Word lengths per line, so the PDF and the text file look different. */
const PDF_LINES = [
  [9],
  [5, 4, 8],
  [3, 6],
  [6, 6, 5],
  [6, 6, 5],
  [6, 6, 5],
  [4, 7],
];
const TXT_LINES = [
  [2, 9],
  [],
  [5, 11],
  [3, 4, 4],
  [],
  [4, 3, 5, 5],
  [4, 3, 5, 5],
  [4, 3, 5, 5],
  [8, 6],
];
const PAID = 1890;
const REVISED = 5940;

type Doc = {
  box: Mark;
  words: Mark[];
  x: number;
  y: number;
  w: number;
  h: number;
};

/**
 * Duplicates and payment. Two files of INV-1012 hash to one fingerprint, so
 * the second is a duplicate. INV-1004 comes back revised: same key, new
 * fingerprint, so a human approves it, and payment sends only the difference
 * under its own idempotency key.
 */
export class LedgerScene implements Scene {
  private marks = new Marks();
  private docs: Doc[] = [];
  private core: Mark | null = null;
  private feeds: Mark[] = [];
  private paid: Mark | null = null;
  private due: Mark | null = null;
  private dueFill: Mark | null = null;
  private track = { x: 0, y: 0, w: 0, h: 10 };
  private coreBox = { x: 0, y: 0, w: 0, h: 0, lh: 14 };
  private step = 0;
  private steps = new Steps();
  private readouts = new Readouts();
  private size = new StageSize();
  private ink = true;

  layout(f: Field, fr: Frame) {
    const area = freeArea(fr, 18);
    const m = this.marks;
    m.clear();
    const topH = area.h * 0.58;
    const dw = clamp(area.w * 0.15, 52, 92);
    const dh = Math.min(dw * 1.15, (topH - 50) / 2);
    const doc = (y: number, lines: number[][]): Doc => {
      const x = area.x;
      const box = m.add("box", { x, y, w: dw, h: dh }, 0.5);
      const cw = (dw - 14) / 22;
      const lh = (dh - 12) / lines.length;
      const words: Mark[] = [];
      lines.forEach((ws, l) => {
        let col = 0;
        for (const len of ws) {
          words.push(
            m.add(
              "fill",
              {
                x: x + 7 + col * cw,
                y: y + 6 + l * lh + lh * 0.3,
                w: len * cw,
                h: Math.max(1.6, lh * 0.36),
              },
              0.55,
            ),
          );
          col += len + 1;
        }
      });
      return { box, words, x, y, w: dw, h: dh };
    };
    this.docs = [
      doc(area.y + 14, PDF_LINES),
      doc(area.y + 14 + dh + 40, TXT_LINES),
    ];

    const cx = area.x + dw + area.w * (fr.compact ? 0.08 : 0.12);
    const cwid = area.x + area.w - cx;
    const lh = Math.min(20, (topH - 30) / (CORE.length + 1));
    const cy = area.y + 14 + (dh * 2 + 40 - lh * CORE.length) / 2;
    this.coreBox = { x: cx, y: cy, w: cwid, h: lh * CORE.length, lh };
    this.core = m.add(
      "box",
      { x: cx - 10, y: cy - 8, w: cwid + 10, h: lh * CORE.length + 16 },
      0.35,
    );
    this.feeds = this.docs.map((d) =>
      m.add(
        "curve",
        {
          x: d.x + d.w + 6,
          y: d.y + d.h / 2,
          x2: cx - 14,
          y2: cy + (lh * CORE.length) / 2,
        },
        0.35,
      ),
    );

    const ty = area.y + topH + (area.h - topH) * 0.55;
    const tw = area.w;
    const th = clamp(area.h * 0.05, 10, 18);
    this.track = { x: area.x, y: ty, w: tw, h: th };
    m.add("box", { x: area.x, y: ty, w: tw, h: th }, 0.25);
    const xPaid = (PAID / REVISED) * tw;
    this.paid = m.add("fill", { x: area.x, y: ty, w: xPaid, h: th }, 0.5);
    this.due = m.add(
      "box",
      { x: area.x + xPaid, y: ty, w: tw - xPaid, h: th },
      0.45,
    );
    this.dueFill = m.add(
      "fill",
      { x: area.x + xPaid, y: ty, w: tw - xPaid, h: th },
      0.5,
    );
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
    const top = step <= 2;

    this.docs.forEach((d, k) => {
      const dupe = k === 1 && step === 2;
      d.box.a = top ? 0.85 : 0.3;
      d.box.cls = dupe ? outcomeClass("duplicate") : 0;
      for (const w of d.words) {
        w.a = top ? 0.6 : 0.2;
        w.cls = dupe ? outcomeClass("duplicate") : 0;
      }
    });
    this.feeds.forEach((l) => {
      l.flow = step === 1 ? 0.5 : 0;
      l.a = step === 1 ? 0.7 : top ? 0.25 : 0.08;
      l.show = step >= 1 ? 1 : 0;
    });
    if (this.core) this.core.a = step >= 1 && top ? 0.7 : 0.2;

    const fill = smoothstep(STEP_AT[4], STEP_AT[4] + 0.08, p);
    if (this.paid) {
      this.paid.a = step >= 3 ? 0.75 : 0.15;
      this.paid.cls = step >= 3 ? outcomeClass("paid") : 0;
    }
    if (this.due) {
      this.due.a = step >= 3 ? 0.8 : 0;
      this.due.cls = step === 3 ? outcomeClass("review") : 0;
      this.due.tint = step >= 4 ? 1 : 0;
    }
    if (this.dueFill) {
      const t = this.track;
      this.dueFill.w = Math.max(1, t.w * (1 - PAID / REVISED) * fill);
      this.dueFill.a = step >= 4 ? 0.85 : 0;
      this.dueFill.tint = 1;
    }
    this.marks.apply(f, fr, { boost: boostFor(this.ink), dustAlpha: 0.07 });

    this.readouts.write(
      "fingerprint",
      step >= 2 ? "6d751f33… ×2" : step >= 1 ? "hashing…" : "—",
    );
    this.readouts.write(
      "paid",
      step >= 4 ? "$5,940.00" : step >= 3 ? "$1,890.00" : "—",
    );
    this.readouts.write(
      "payments",
      step >= 4 ? "2 rows" : step >= 3 ? "1 row" : "—",
    );
  }

  draw(ctx: CanvasRenderingContext2D, fr: Frame, palette: Palette) {
    this.ink = palette.ink;
    const vx = fr.visual.x;
    const vy = fr.visual.y;
    const step = this.step;
    const top = step <= 2;
    const size = fr.compact ? 8.5 : 10;
    const c0 = fr.compact;
    const names = c0
      ? ["1012.pdf", "1012.txt"]
      : ["invoice_1012.pdf", "invoice_1012.txt"];
    // Narrow stages only label the half the story is on, so nothing overlaps.
    const showTop = top || !c0;
    const showLedger = !top || !c0;

    this.docs.forEach((d, k) => {
      if (!showTop) return;
      label(ctx, palette, names[k], vx + d.x, vy + d.y - 8, {
        size: size - 1,
        alpha: top ? 0.8 : 0.35,
      });
      if (step >= 2 && top) {
        label(
          ctx,
          palette,
          c0
            ? k === 0
              ? "6d751f33…"
              : "= duplicate"
            : k === 0
              ? FINGERPRINT
              : `${FINGERPRINT} = duplicate`,
          vx + d.x,
          vy + d.y + d.h + 11,
          {
            size: size - 1.5,
            color: k === 1 ? palette.accent : palette.fg,
          },
        );
      }
    });
    const c = this.coreBox;
    (showTop ? (c0 ? CORE_SHORT : CORE) : []).forEach((line, k) => {
      label(ctx, palette, line, vx + c.x, vy + c.y + (k + 0.5) * c.lh, {
        size: size - 1,
        color: step >= 1 && top ? palette.fg : palette.muted,
        alpha: step >= 1 && top ? 0.95 : 0.35,
      });
    });
    if (showTop)
      label(ctx, palette, "sha256(core)[:16]", vx + c.x, vy + c.y - 18, {
        size: size - 1.5,
        alpha: step >= 1 && top ? 0.75 : 0.3,
      });
    if (!showLedger) {
      resetText(ctx);
      return;
    }

    const t = this.track;
    const xPaid = t.x + (PAID / REVISED) * t.w;
    const on = step >= 3;
    label(
      ctx,
      palette,
      c0 ? "INV-1004" : "INV-1004/precision parts ltd",
      vx + t.x,
      vy + t.y - 34,
      {
        size,
        color: on ? palette.fg : palette.muted,
        alpha: on ? 1 : 0.4,
      },
    );
    label(
      ctx,
      palette,
      c0 ? "$1,890 paid" : "$1,890 paid · 1004.json",
      vx + t.x,
      vy + t.y - 14,
      {
        size: size - 1,
        alpha: on ? 0.85 : 0.3,
      },
    );
    label(
      ctx,
      palette,
      c0 ? "total $5,940" : "revised total $5,940",
      vx + t.x + t.w,
      vy + t.y - 14,
      {
        size: size - 1,
        align: "right",
        alpha: on ? 0.85 : 0.3,
      },
    );
    if (step === 3)
      label(
        ctx,
        palette,
        c0 ? "+5 × GadgetX" : "+5 × GadgetX · needs_review",
        (vx + xPaid + vx + t.x + t.w) / 2,
        vy + t.y + t.h + 16,
        {
          size: size - 1,
          align: "center",
          color: palette.fg,
        },
      );
    if (step >= 4) {
      label(
        ctx,
        palette,
        "pays $4,050",
        (vx + xPaid + vx + t.x + t.w) / 2,
        vy + t.y + t.h + 16,
        {
          size,
          align: "center",
          color: palette.accent,
        },
      );
      label(
        ctx,
        palette,
        c0 ? "…:delta:1890.00->5940.00" : "key …:delta:1890.00->5940.00",
        (vx + xPaid + vx + t.x + t.w) / 2,
        vy + t.y + t.h + 32,
        {
          size: size - 1.5,
          align: "center",
          alpha: 0.8,
        },
      );
    }
    resetText(ctx);
  }
}
