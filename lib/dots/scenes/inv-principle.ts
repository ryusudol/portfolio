import { boostFor } from "../invoice-data";
import { type Mark, Marks } from "../marks";
import { clamp, smoothstep } from "../math";
import { freeArea, label, resetText, StageSize, Steps, stepAt } from "../story";
import type { Field, Frame, Palette, Scene } from "../types";

const STEP_AT = [0, 0.22, 0.46, 0.7] as const;
const FORMATS = ["txt", "pdf", "json", "csv", "xml"];
const READS = [
  ["Intake", "extract every field as written"],
  ["Validation", "propose catalog matches"],
  ["VP + Critic", "draft and audit the decision"],
];
const DECIDES = [
  ["arithmetic", "integer cents, stated vs computed"],
  ["stock", "exact catalog match, quantity on hand"],
  ["duplicates", "content fingerprint per invoice"],
  ["policy gate", "which outcomes are allowed"],
  ["payment", "idempotent, pays only the difference"],
];

type Card = { mark: Mark; x: number; y: number; w: number; h: number };

/**
 * Five formats of invoice come in. The jobs split by what a mistake costs:
 * reading goes to the LLM agents, every decision with money on it to code,
 * and where the two meet, code overrides the agents.
 */
export class PrincipleScene implements Scene {
  private marks = new Marks();
  private docs: { box: Mark; bars: Mark[]; x: number; y: number }[] = [];
  private reads: Card[] = [];
  private decides: Card[] = [];
  private feeds: Mark[] = [];
  private hand: Mark | null = null;
  private veto: Mark | null = null;
  private col = { lx: 0, rx: 0, w: 0, top: 0 };
  private docW = 0;
  private step = 0;
  private steps = new Steps();
  private size = new StageSize();
  private ink = true;

  layout(f: Field, fr: Frame) {
    const area = freeArea(fr, 16);
    const m = this.marks;
    m.clear();
    const docW = clamp(area.w / 10, 30, 52);
    const docH = docW * 1.28;
    this.docW = docW;
    const gap = (area.w - docW * FORMATS.length) / (FORMATS.length + 1);
    const gapY = fr.compact ? 48 : 64;
    const rowsN = DECIDES.length;
    const cardGuess = clamp((area.h - docH - gapY - 20) / rowsN - 10, 26, 46);
    const total = docH + gapY + rowsN * (cardGuess + 10);
    const docY = area.y + Math.max(4, (area.h - total) / 2);
    this.docs = FORMATS.map((_, k) => {
      const x = area.x + gap + k * (docW + gap);
      const box = m.add("box", { x, y: docY, w: docW, h: docH }, 0.55);
      const bars = [0.22, 0.38, 0.54, 0.7].map((t, b) =>
        m.add(
          "fill",
          {
            x: x + docW * 0.18,
            y: docY + docH * t,
            w: docW * (b === 3 ? 0.4 : 0.64),
            h: 2.4,
          },
          0.5,
        ),
      );
      return { box, bars, x, y: docY };
    });

    const top = docY + docH + gapY;
    const colW = area.w * 0.44;
    const lx = area.x;
    const rx = area.x + area.w - colW;
    this.col = { lx, rx, w: colW, top };
    const rows = DECIDES.length;
    const cardH = clamp((area.y + area.h - top - 20) / rows - 10, 26, 46);
    const pitch = cardH + 10;
    const card = (x: number, k: number, offset: number): Card => {
      const y = top + offset + k * pitch;
      return {
        mark: m.add("box", { x, y, w: colW, h: cardH }, 0.45),
        x,
        y,
        w: colW,
        h: cardH,
      };
    };
    const lift = ((rows - READS.length) * pitch) / 2;
    this.reads = READS.map((_, k) => card(lx, k, lift));
    this.decides = DECIDES.map((_, k) => card(rx, k, 0));

    this.feeds = this.docs.map((d) =>
      m.add(
        "line",
        {
          x: d.x + docW / 2,
          y: d.y + docH + 6,
          x2: lx + colW * (0.2 + 0.15 * this.docs.indexOf(d)),
          y2: this.reads[0].y - 6,
        },
        0.28,
      ),
    );
    const midL = this.reads[1];
    this.hand = m.add(
      "line",
      {
        x: lx + colW + 8,
        y: midL.y + midL.h * 0.3,
        x2: rx - 8,
        y2: midL.y + midL.h * 0.3,
      },
      0.35,
    );
    this.veto = m.add(
      "line",
      {
        x: rx - 8,
        y: midL.y + midL.h * 0.75,
        x2: lx + colW + 8,
        y2: midL.y + midL.h * 0.75,
      },
      0.35,
    );
    m.fit(f);
    this.steps.collect(fr.section);
  }

  update(f: Field, fr: Frame) {
    if (this.size.changed(fr)) this.layout(f, fr);
    const step = stepAt(fr.progress, STEP_AT);
    this.step = step;
    this.steps.set(step);
    const p = fr.progress;

    for (const d of this.docs) {
      d.box.a = step === 0 ? 0.85 : 0.45;
      for (const b of d.bars) b.a = step === 0 ? 0.7 : 0.35;
    }
    const readOn = smoothstep(STEP_AT[1], STEP_AT[1] + 0.06, p);
    const codeOn = smoothstep(STEP_AT[2], STEP_AT[2] + 0.06, p);
    const vetoOn = smoothstep(STEP_AT[3], STEP_AT[3] + 0.06, p);
    for (const c of this.reads) {
      c.mark.a = 0.18 + 0.67 * readOn - 0.3 * vetoOn;
      c.mark.tint = 0;
    }
    for (const c of this.decides) {
      c.mark.a = 0.18 + 0.72 * codeOn;
      c.mark.tint = vetoOn;
    }
    for (const line of this.feeds) {
      line.flow = 0.35;
      line.show = 1;
      line.a = 0.12 + 0.55 * readOn;
    }
    if (this.hand) {
      this.hand.flow = 0.45;
      this.hand.a = 0.1 + 0.6 * codeOn;
    }
    if (this.veto) {
      this.veto.flow = 0.6;
      this.veto.a = 0.9 * vetoOn;
      this.veto.tint = 1;
    }
    this.marks.apply(f, fr, { boost: boostFor(this.ink), dustAlpha: 0.08 });
  }

  draw(ctx: CanvasRenderingContext2D, fr: Frame, palette: Palette) {
    this.ink = palette.ink;
    const vx = fr.visual.x;
    const vy = fr.visual.y;
    const step = this.step;
    const size = fr.compact ? 9 : 10;

    this.docs.forEach((d, k) => {
      label(
        ctx,
        palette,
        `.${FORMATS[k]}`,
        vx + d.x + this.docW / 2,
        vy + d.y + this.docW * 1.28 + 14,
        {
          align: "center",
          size,
          alpha: step === 0 ? 0.95 : 0.6,
          color: step === 0 ? palette.fg : palette.muted,
        },
      );
    });

    const { lx, rx, w, top } = this.col;
    const head = (text: string, x: number, lit: boolean, accent = false) =>
      label(ctx, palette, text, vx + x, vy + top - 14, {
        size,
        color: accent ? palette.accent : lit ? palette.fg : palette.muted,
        alpha: lit ? 1 : 0.6,
      });
    head("LLM agents · read", lx, step >= 1);
    head("code · decides", rx, step >= 2, step >= 3);

    const cards = (
      list: Card[],
      text: string[][],
      lit: boolean,
      accent: boolean,
    ) =>
      list.forEach((c, k) => {
        const pad = fr.compact ? 8 : 12;
        const twoLine = c.h >= 34 && !fr.compact;
        label(
          ctx,
          palette,
          text[k][0],
          vx + c.x + pad,
          vy + c.y + (twoLine ? c.h * 0.36 : c.h / 2),
          {
            size,
            color: accent ? palette.accent : lit ? palette.fg : palette.muted,
            alpha: lit ? 1 : 0.55,
          },
        );
        if (twoLine)
          label(
            ctx,
            palette,
            text[k][1],
            vx + c.x + pad,
            vy + c.y + c.h * 0.68,
            {
              size: size - 0.5,
              alpha: lit ? 0.85 : 0.4,
            },
          );
      });
    cards(this.reads, READS, step >= 1 && step < 3, false);
    cards(this.decides, DECIDES, step >= 2, step >= 3);

    const mid = this.reads[1];
    if (mid && step >= 2) {
      const cx = vx + (lx + w + rx) / 2;
      label(ctx, palette, "proposals", cx, vy + mid.y + mid.h * 0.3 - 10, {
        align: "center",
        size: size - 0.5,
        alpha: 0.8,
      });
      if (step >= 3)
        label(ctx, palette, "override", cx, vy + mid.y + mid.h * 0.75 + 12, {
          align: "center",
          size: size - 0.5,
          color: palette.accent,
        });
    }
    resetText(ctx);
  }
}
