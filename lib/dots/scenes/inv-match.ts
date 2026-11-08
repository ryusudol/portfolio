import { arrow, boostFor } from "../invoice-data";
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

/** invoice_1016.json's lines, and the seeded inventory table. */
const LINES = [
  { item: "WidgetA", qty: 4, price: "$250.00" },
  { item: "WidgetB", qty: 2, price: "$500.00" },
  { item: "WidgetC", qty: 3, price: "$350.00" },
];
const CATALOG = [
  { sku: "WidgetA", stock: 15, price: "$250" },
  { sku: "WidgetB", stock: 10, price: "$500" },
  { sku: "GadgetX", stock: 5, price: "$750" },
  { sku: "FakeItem", stock: 0, price: "no price" },
];
/** The agent's proposal in the test, and code's exact match. */
const PROPOSED = [0, 1, 0];
const EXACT = [0, 1, -1];
const TOOLS = [
  "lookup_item('WidgetA') → stock 15, $250",
  "check_stock('WidgetA', 4) → sufficient",
  "lookup_item('WidgetC') → found: false",
  "search_inventory('WidgetC') → WidgetA, WidgetB",
];

type Card = {
  box: Mark;
  bar: Mark | null;
  x: number;
  y: number;
  w: number;
  h: number;
};

/**
 * Item matching, replaying test_wrong_agent_match_is_blocked: the Validation
 * agent maps WidgetC to WidgetA, the nearest name in the catalog. Code's
 * exact-name match disagrees, keeps its own answer, and records the
 * disagreement, so WidgetC reaches the rules as an unknown item.
 */
export class MatchScene implements Scene {
  private marks = new Marks();
  private lines: Card[] = [];
  private catalog: Card[] = [];
  private proposals: Mark[] = [];
  private exact: Mark[] = [];
  private step = 0;
  private toolAt = 0;
  private steps = new Steps();
  private readouts = new Readouts();
  private size = new StageSize();
  private ink = true;

  layout(f: Field, fr: Frame) {
    const area = freeArea(fr, 16);
    const m = this.marks;
    m.clear();
    const cardW = area.w * (fr.compact ? 0.36 : 0.32);
    const cardH = clamp(area.h * 0.12, 34, 56);
    const gapL = (area.h - cardH * 3) / 4;
    const gapR = (area.h - cardH * 4) / 5;
    const lx = area.x;
    const rx = area.x + area.w - cardW;
    this.lines = LINES.map((_, k) => {
      const y = area.y + gapL + k * (cardH + gapL);
      return {
        box: m.add("box", { x: lx, y, w: cardW, h: cardH }, 0.5),
        bar: null,
        x: lx,
        y,
        w: cardW,
        h: cardH,
      };
    });
    this.catalog = CATALOG.map((c, k) => {
      const y = area.y + gapR + k * (cardH + gapR);
      const box = m.add("box", { x: rx, y, w: cardW, h: cardH }, 0.5);
      const bar = m.add(
        "fill",
        {
          x: rx + 10,
          y: y + cardH - 9,
          w: Math.max(1, (cardW - 20) * (c.stock / 15)),
          h: 3,
        },
        0.6,
      );
      return { box, bar, x: rx, y, w: cardW, h: cardH };
    });
    const link = (from: Card, to: Card, lift: number) =>
      m.add(
        "line",
        {
          x: from.x + from.w + 8,
          y: from.y + from.h / 2 + lift,
          x2: to.x - 10,
          y2: to.y + to.h / 2 + lift,
        },
        0.32,
      );
    this.proposals = PROPOSED.map((c, k) =>
      link(this.lines[k], this.catalog[c], -4),
    );
    this.exact = EXACT.map((c, k) =>
      c >= 0
        ? link(this.lines[k], this.catalog[c], 4)
        : link(this.lines[k], this.lines[k], 0),
    );
    m.fit(f);
    this.steps.collect(fr.section);
    this.readouts.collect(fr.section);
  }

  update(f: Field, fr: Frame) {
    if (this.size.changed(fr)) this.layout(f, fr);
    const p = fr.progress;
    const step = stepAt(p, STEP_AT);
    this.step = step;
    this.steps.set(step);
    this.toolAt = fr.reduced ? 3 : Math.floor(fr.time / 1.1) % TOOLS.length;

    const grow = smoothstep(STEP_AT[1], STEP_AT[2] - 0.02, p);
    const cut = smoothstep(STEP_AT[3], STEP_AT[3] + 0.06, p);
    this.lines.forEach((c, k) => {
      const bad = k === 2 && step >= 4;
      c.box.a = bad ? 0.95 : 0.75;
      c.box.tint = bad ? 1 : 0;
    });
    this.catalog.forEach((c, k) => {
      c.box.a = step >= 1 && k === 3 ? 0.4 : 0.7;
      if (c.bar) c.bar.a = 0.8;
    });
    this.proposals.forEach((l, k) => {
      const wrong = k === 2;
      l.show = step >= 1 ? (step === 1 ? grow : 1) : 0;
      l.a =
        step < 1
          ? 0
          : wrong
            ? step >= 3
              ? 0.7 * (1 - cut)
              : 0.85
            : step >= 3
              ? 0.2
              : 0.55;
      l.tint = wrong && step >= 2 ? 1 : 0;
      l.spread = wrong ? 0.6 : 0;
      l.flow = step === 2 && wrong ? 0.8 : 0;
    });
    this.exact.forEach((l, k) => {
      const has = EXACT[k] >= 0;
      l.show = cut;
      l.a = has && step >= 3 ? 0.8 : 0;
    });
    this.marks.apply(f, fr, { boost: boostFor(this.ink), dustAlpha: 0.07 });

    this.readouts.write(
      "proposed",
      step >= 2 ? "WidgetA" : step >= 1 ? "…" : "—",
    );
    this.readouts.write("kept", step >= 3 ? "none" : "—");
    this.readouts.write("override", step >= 3 ? "1" : "0");
  }

  draw(ctx: CanvasRenderingContext2D, fr: Frame, palette: Palette) {
    this.ink = palette.ink;
    const vx = fr.visual.x;
    const vy = fr.visual.y;
    const step = this.step;
    const size = fr.compact ? 8.5 : 10;
    const pad = fr.compact ? 7 : 11;

    const first = this.lines[0];
    const cat = this.catalog[0];
    if (!first || !cat) return;
    label(
      ctx,
      palette,
      "invoice_1016.json",
      vx + first.x,
      vy + this.lines[0].y - 16,
      { size, alpha: 0.75 },
    );
    label(ctx, palette, "inventory", vx + cat.x, vy + cat.y - 16, {
      size,
      alpha: 0.75,
    });

    this.lines.forEach((c, k) => {
      const l = LINES[k];
      const bad = k === 2 && step >= 4;
      label(ctx, palette, l.item, vx + c.x + pad, vy + c.y + c.h * 0.36, {
        size,
        color: bad ? palette.accent : palette.fg,
      });
      label(
        ctx,
        palette,
        `${l.qty} × ${l.price}`,
        vx + c.x + pad,
        vy + c.y + c.h * 0.7,
        { size: size - 1 },
      );
    });
    this.catalog.forEach((c, k) => {
      const item = CATALOG[k];
      label(ctx, palette, item.sku, vx + c.x + pad, vy + c.y + c.h * 0.34, {
        size,
        color: palette.fg,
      });
      // Narrow cards move the stock line under the name.
      label(
        ctx,
        palette,
        fr.compact
          ? `stock ${item.stock}`
          : `stock ${item.stock} · ${item.price}`,
        fr.compact ? vx + c.x + pad : vx + c.x + c.w - pad,
        fr.compact ? vy + c.y + c.h * 0.62 : vy + c.y + c.h * 0.34,
        {
          size: size - 1.5,
          align: fr.compact ? "left" : "right",
        },
      );
    });

    const midX = vx + (first.x + first.w + cat.x) / 2;
    if (step === 1) {
      label(
        ctx,
        palette,
        TOOLS[this.toolAt],
        midX,
        vy + this.lines[2].y + this.lines[2].h + 26,
        {
          size: size - 1,
          align: "center",
          color: palette.fg,
        },
      );
    }
    const wrong = this.proposals[2];
    if (wrong && step >= 2) {
      // A third of the way along, clear of WidgetB's link.
      const tx = vx + wrong.x + (wrong.x2 - wrong.x) * 0.3;
      const ty = vy + wrong.y + (wrong.y2 - wrong.y) * 0.3;
      if (step === 2)
        label(ctx, palette, "agent: WidgetC → WidgetA", tx, ty + 16, {
          size: size - 1,
          align: "center",
          color: palette.accent,
        });
      if (step >= 3) {
        label(ctx, palette, "✗", tx, ty, {
          size: size + 3,
          align: "center",
          color: palette.accent,
        });
        label(
          ctx,
          palette,
          fr.compact
            ? "match_override"
            : "match_override: not an exact catalog name",
          tx,
          ty + 18,
          {
            size: size - 1.5,
            align: "center",
            color: palette.accent,
          },
        );
      }
    }
    for (const l of this.exact) {
      if (l.show < 0.98 || l.a < 0.1) continue;
      arrow(
        ctx,
        vx + l.x2 - 6,
        vy + l.y2,
        vx + l.x2,
        vy + l.y2,
        palette.fg,
        0.8,
        { head: 4.5 },
      );
    }
    if (step >= 4) {
      const c = this.lines[2];
      label(
        ctx,
        palette,
        "unknown_item · error",
        vx + c.x,
        vy + c.y + c.h + 16,
        {
          size: size - 1,
          color: palette.accent,
        },
      );
      if (!fr.compact)
        label(
          ctx,
          palette,
          "did you mean WidgetA or WidgetB?",
          vx + c.x,
          vy + c.y + c.h + 30,
          {
            size: size - 1.5,
            alpha: 0.75,
          },
        );
    }
    resetText(ctx);
  }
}
