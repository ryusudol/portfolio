import { boostFor } from "../invoice-data";
import { type Mark, Marks, textMarks } from "../marks";
import { clamp, lerp, smoothstep } from "../math";
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

const STEP_AT = [0, 0.2, 0.42, 0.6, 0.8] as const;

/** invoice_1010.txt, as it arrives. */
const DOC = [
  "INVOICE #INV-1010",
  "",
  "Bill To: Acme Corp Manufacturing Division",
  "",
  "Vendor: Consolidated Materials Group",
  "Date: January 27, 2026",
  "Due Date: February 26, 2026",
  "",
  "Description                Qty     Rate        Amount",
  "-------------------------------------------------------",
  "WidgetA                     8      $250.00     $2,000.00",
  "WidgetB                     4      $500.00     $2,000.00",
  "GadgetX                     2      $750.00     $1,500.00",
  "WidgetA (rush order)        4      $300.00     $1,200.00",
  "                                           -----------",
  "                               Subtotal:     $6,700.00",
  "                               Sales Tax:      $335.00",
  "                               Shipping:       $150.00",
  "                               TOTAL:        $7,185.00",
  "",
  "Payment Terms: Net 30",
];
const COLS = 56;

/** Fields of the Invoice Grok returns, and where code finds each value. */
const FIELDS: { name: string; value: string; line: number; find: string }[] = [
  { name: "invoice_number", value: "INV-1010", line: 0, find: "INV-1010" },
  {
    name: "vendor",
    value: "Consolidated Materials…",
    line: 4,
    find: "Consolidated Materials Group",
  },
  {
    name: "invoice_date",
    value: "January 27, 2026",
    line: 5,
    find: "January 27, 2026",
  },
  {
    name: "line 1",
    value: "WidgetA · 8 · 250.0",
    line: 10,
    find: "WidgetA                     8      $250.00",
  },
  {
    name: "line 2",
    value: "WidgetB · 4 · 500.0",
    line: 11,
    find: "WidgetB                     4      $500.00",
  },
  {
    name: "line 3",
    value: "GadgetX · 2 · 750.0",
    line: 12,
    find: "GadgetX                     2      $750.00",
  },
  {
    name: "line 4",
    value: "WidgetA (rush order) · 4 · 300.0",
    line: 13,
    find: "WidgetA (rush order)        4      $300.00",
  },
  { name: "stated_subtotal", value: "6700.0", line: 15, find: "$6,700.00" },
  { name: "stated_tax_rate", value: "0.05", line: -1, find: "" },
  { name: "stated_tax_amount", value: "335.0", line: 16, find: "$335.00" },
  { name: "stated_shipping", value: "150.0", line: 17, find: "$150.00" },
  { name: "stated_total", value: "7185.0", line: 18, find: "$7,185.00" },
];
const TAX = FIELDS.findIndex((f) => f.name === "stated_tax_rate");
const TOTAL = FIELDS.length - 1;

type Word = { mark: Mark; line: number; col: number; text: string };

/**
 * The Intake agent's output validator, replaying the test that pins it: the
 * first extraction of invoice 1010 states a 5% tax rate the document never
 * writes. Code looks for every value in the source text, finds no 0.05 and no
 * 5, and raises ModelRetry; the second attempt returns null and passes.
 */
export class IntakeScene implements Scene {
  private marks = new Marks();
  private words: Word[] = [];
  private links: Mark[] = [];
  private search: Mark | null = null;
  private doc = { x: 0, y: 0, cw: 6, lh: 14 };
  private list = { x: 0, y: 0, rowH: 18 };
  private span: { x: number; y: number; w: number }[] = [];
  private step = 0;
  private p = 0;
  private checked = 0;
  private sweep = 0;
  private steps = new Steps();
  private readouts = new Readouts();
  private size = new StageSize();
  private ink = true;

  layout(f: Field, fr: Frame) {
    const area = freeArea(fr, 16);
    const m = this.marks;
    m.clear();
    const docW = area.w * (fr.compact ? 0.5 : 0.54);
    const cw = docW / COLS;
    const lh = Math.min(area.h / (DOC.length + 1), cw * 2.6);
    const docY = area.y + (area.h - lh * DOC.length) / 2;
    this.doc = { x: area.x, y: docY, cw, lh };
    m.add(
      "box",
      { x: area.x - 10, y: docY - 10, w: docW + 20, h: lh * DOC.length + 20 },
      0.3,
    );
    this.words = textMarks(m, DOC, area.x, docY, cw, lh, 0.32);

    const listX = area.x + docW + area.w * 0.08;
    const rowH = Math.min(area.h / (FIELDS.length + 1), 30);
    const listY = area.y + (area.h - rowH * FIELDS.length) / 2;
    this.list = { x: listX, y: listY, rowH };
    this.span = FIELDS.map((fd) => {
      if (fd.line < 0) return { x: 0, y: 0, w: 0 };
      const col = DOC[fd.line].indexOf(fd.find);
      return {
        x: area.x + col * cw,
        y: docY + (fd.line + 0.47) * lh,
        w: fd.find.length * cw,
      };
    });
    this.links = FIELDS.map((fd, k) => {
      const y = listY + (k + 0.5) * rowH;
      const s = this.span[k];
      return m.add(
        "line",
        fd.line < 0
          ? { x: listX - 8, y, x2: area.x + docW, y2: docY }
          : { x: listX - 8, y, x2: s.x + s.w + 4, y2: s.y },
        0.22,
      );
    });
    this.search = m.add(
      "line",
      { x: listX - 8, y: listY + (TAX + 0.5) * rowH },
      0.3,
    );
    m.fit(f);
    this.steps.collect(fr.section);
    this.readouts.collect(fr.section);
  }

  update(f: Field, fr: Frame) {
    if (this.size.changed(fr)) this.layout(f, fr);
    const p = fr.progress;
    this.p = p;
    const step = stepAt(p, STEP_AT);
    this.step = step;
    this.steps.set(step);

    // Step 1 checks the fields top to bottom; the tax rate waits for step 2.
    const u = clamp((p - STEP_AT[1]) / (STEP_AT[2] - STEP_AT[1] - 0.02));
    this.checked = step >= 2 ? FIELDS.length : Math.floor(u * FIELDS.length);
    const sweepT = fr.reduced ? 0.9 : (fr.time * 0.45) % 1;
    this.sweep = step === 2 ? sweepT : 0;

    const { x, y, lh, cw } = this.doc;
    for (const w of this.words) {
      const hit = FIELDS.findIndex((fd, k) => {
        if (fd.line !== w.line || !this.isChecked(k)) return false;
        const s = DOC[fd.line].indexOf(fd.find);
        return w.col >= s && w.col < s + fd.find.length;
      });
      const scanned =
        step === 2 &&
        Math.abs(y + (w.line + 0.5) * lh - this.sweepY()) < lh * 0.8;
      w.mark.a = hit >= 0 ? 0.95 : scanned ? 0.7 : 0.42;
      w.mark.tint =
        hit >= 0 ? (step === 4 && hit === TOTAL ? 1 : 0.6) : scanned ? 0.3 : 0;
    }
    this.links.forEach((link, k) => {
      const on = k !== TAX && this.isChecked(k);
      link.a = on ? (step === 4 && k === TOTAL ? 0.9 : 0.4) : 0;
      link.tint = step === 4 && k === TOTAL ? 1 : 0;
    });
    if (this.search) {
      const s = this.search;
      s.x2 = x + COLS * cw;
      s.y2 = this.sweepY();
      s.a = step === 2 ? 0.85 : 0;
      s.tint = 1;
      s.flow = 0;
    }
    this.marks.apply(f, fr, { boost: boostFor(this.ink), dustAlpha: 0.07 });
    this.readouts.write("attempt", step >= 3 ? "2 of 3" : "1 of 3");
    this.readouts.write(
      "problems",
      step === 2
        ? "tax_rate 0.05"
        : step >= 3
          ? "none"
          : this.checked > 0
            ? "none so far"
            : "—",
    );
  }

  private isChecked(k: number) {
    return k < this.checked;
  }

  private sweepY() {
    const { y, lh } = this.doc;
    return y + lerp(0.2, DOC.length - 0.2, this.sweep) * lh;
  }

  draw(ctx: CanvasRenderingContext2D, fr: Frame, palette: Palette) {
    this.ink = palette.ink;
    const vx = fr.visual.x;
    const vy = fr.visual.y;
    const step = this.step;
    const size = fr.compact ? 8 : 9.5;
    const { x: lx, y: ly, rowH } = this.list;
    const shown =
      step === 0
        ? Math.ceil(smoothstep(0, STEP_AT[1] - 0.04, this.p) * FIELDS.length)
        : FIELDS.length;

    label(
      ctx,
      palette,
      "invoice_1010.txt",
      vx + this.doc.x - 10,
      vy + this.doc.y - 22,
      {
        size,
        alpha: 0.75,
      },
    );
    label(
      ctx,
      palette,
      `Invoice · attempt ${step >= 3 ? 2 : 1}`,
      vx + lx,
      vy + ly - rowH * 0.6,
      {
        size,
        color: palette.fg,
      },
    );

    FIELDS.forEach((fd, k) => {
      if (k >= shown) return;
      const y = vy + ly + (k + 0.5) * rowH;
      const isTax = k === TAX;
      const bad = isTax && step === 2;
      const fixed = isTax && step >= 3;
      const ok = (isTax ? fixed : this.isChecked(k)) && !bad;
      const value = fixed ? "null" : fd.value;
      const color = bad ? palette.accent : palette.muted;
      // Short rows (narrow screens) drop the field name and trim the value.
      const twoLine = rowH >= 24 && !fr.compact;
      if (twoLine) {
        label(ctx, palette, fd.name, vx + lx + 14, y - 6, {
          size: size - 1,
          alpha: 0.7,
          color,
        });
      }
      const text = twoLine
        ? value
        : isTax
          ? `tax_rate ${value}`
          : value.length > 14
            ? `${value.slice(0, 13)}…`
            : value;
      label(ctx, palette, text, vx + lx + 14, y + (twoLine ? 6 : 0), {
        size,
        color: bad ? palette.accent : palette.fg,
        alpha: 0.95,
      });
      const mark = bad ? "✗" : ok ? "✓" : "·";
      label(ctx, palette, mark, vx + lx, y, {
        size: size + 1,
        color: bad ? palette.accent : ok ? palette.fg : palette.muted,
        alpha: ok || bad ? 1 : 0.5,
      });
    });

    if (step === 2) {
      const y = vy + ly + (TAX + 0.5) * rowH;
      const twoLine = rowH >= 24 && !fr.compact;
      label(
        ctx,
        palette,
        twoLine ? "← not in the document: ModelRetry" : "← ModelRetry",
        vx + lx + 14 + size * (twoLine ? 4 : 8.6),
        y + (twoLine ? 6 : 0),
        {
          size: size - 1,
          color: palette.accent,
        },
      );
    }
    if (step === 4) {
      const s = this.span[TOTAL];
      label(
        ctx,
        palette,
        "on the page, so it passes; math is checked later",
        vx + s.x + s.w + 10,
        vy + s.y - this.doc.lh * 1.2,
        {
          size: size - 1,
          align: "right",
          color: palette.accent,
        },
      );
    }
    resetText(ctx);
  }
}
