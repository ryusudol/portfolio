import {
  boostFor,
  type Outcome,
  outcomeClass,
  outcomeColor,
  outcomeColors,
} from "../invoice-data";
import { type Mark, Marks } from "../marks";
import { clamp, lerp, rgba, smoothstep, TAU } from "../math";
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
const STAGES = [
  "load",
  "extract",
  "check_duplicate",
  "validate",
  "policy_gate",
  "approval",
  "needs_review",
];
const STAGE_T = 0.7;

type Box = { mark: Mark; x: number; y: number; w: number; h: number };
type Row = { box: Box; id: number; file: string };

/**
 * The CLI and the dashboard are two processes over one SQLite file in WAL
 * mode. A run is a row saved before every stage, so a review left in one can
 * be finished in the other; a conditional UPDATE decides who gets it; and a
 * run whose process died is found by its silence and cleaned up.
 */
export class ResumeScene implements Scene {
  private marks = new Marks();
  private cli: Box | null = null;
  private web: Box | null = null;
  private db: Box | null = null;
  private rows: Row[] = [];
  private toDb: Mark | null = null;
  private fromDb: Mark | null = null;
  private claims: Mark[] = [];
  private step = -1;
  private local = 0;
  private stage = 0;
  private race = 0;
  private stale = 0;
  private steps = new Steps();
  private readouts = new Readouts();
  private size = new StageSize();
  private ink = true;

  layout(f: Field, fr: Frame) {
    const area = freeArea(fr, 18);
    const m = this.marks;
    m.clear();
    const bw = area.w * 0.36;
    const bh = clamp(area.h * 0.14, 44, 72);
    const rowH = clamp(area.h * 0.075, 24, 34);
    const dbH = 3 * (rowH + 4) + 36;
    const gap = clamp(area.h * 0.2, 70, 150);
    const top = area.y + Math.max(8, (area.h - bh - gap - dbH) / 2);
    const box = (x: number, y: number, w: number, h: number, d = 0.5): Box => ({
      mark: m.add("box", { x, y, w, h }, d),
      x,
      y,
      w,
      h,
    });
    this.cli = box(area.x, top, bw, bh);
    this.web = box(area.x + area.w - bw, top, bw, bh);
    const dbY = top + bh + gap;
    const db = box(area.x + area.w * 0.08, dbY, area.w * 0.84, dbH, 0.35);
    this.db = db;
    this.rows = [
      { id: 11, file: "invoice_1010.txt" },
      { id: 12, file: "invoice_1011.pdf" },
      { id: 13, file: "invoice_1015.csv" },
    ].map((r, k) => ({
      ...r,
      box: box(db.x + 14, dbY + 28 + k * (rowH + 4), db.w - 28, rowH, 0.4),
    }));
    const row0 = this.rows[0].box;
    const cli = this.cli;
    const web = this.web;
    this.toDb = m.add(
      "curve",
      {
        x: cli.x + cli.w / 2,
        y: cli.y + cli.h + 6,
        x2: row0.x + row0.w * 0.3,
        y2: row0.y - 4,
      },
      0.35,
    );
    this.fromDb = m.add(
      "curve",
      {
        x: row0.x + row0.w * 0.7,
        y: row0.y - 4,
        x2: web.x + web.w / 2,
        y2: web.y + web.h + 6,
      },
      0.35,
    );
    this.claims = [cli, web].map(() => m.add("disc", { r: 5 }, 1.2));
    m.fit(f);
    this.steps.collect(fr.section);
    this.readouts.collect(fr.section);
    this.step = -1;
  }

  update(f: Field, fr: Frame) {
    if (this.size.changed(fr)) this.layout(f, fr);
    f.classColors = outcomeColors(this.ink);
    const step = stepAt(fr.progress, STEP_AT);
    if (step !== this.step) {
      this.step = step;
      this.local = 0;
    }
    this.steps.set(step);
    this.local += fr.dt;
    const t = fr.reduced ? 30 : this.local;
    this.stage =
      step === 0
        ? Math.min(
            STAGES.length - 1,
            Math.floor((t % (STAGES.length * STAGE_T + 1.6)) / STAGE_T),
          )
        : STAGES.length - 1;
    this.race = step === 2 ? (t % 4.2) / 4.2 : 0;
    this.stale = step === 3 ? clamp((t % 6) / 4.5) : 0;

    const [r0, r1, r2] = this.rows;
    const cli = this.cli;
    const web = this.web;
    if (!cli || !web || !this.db || !r0) return;
    cli.mark.a = step === 0 || step === 2 ? 0.9 : step === 1 ? 0.3 : 0.5;
    web.mark.a = step >= 1 ? 0.9 : 0.35;
    this.db.mark.a = 0.45;
    const waiting = this.stage === STAGES.length - 1;
    const claimed = step === 2 && this.race > 0.45;
    r0.box.mark.a = 0.85;
    r0.box.mark.cls = claimed ? 0 : waiting ? outcomeClass("review") : 0;
    r0.box.mark.tint = step === 0 && !waiting ? 0.7 : claimed ? 1 : 0;
    if (r1) {
      r1.box.mark.a = 0.5;
      r1.box.mark.cls = outcomeClass("paid");
    }
    if (r2) {
      r2.box.mark.a = step === 3 ? 0.85 : 0.3;
      r2.box.mark.cls =
        step === 3 && this.stale >= 1 ? outcomeClass("rejected") : 0;
      r2.box.mark.tint = 0;
    }
    if (this.toDb) {
      this.toDb.a = step === 0 ? 0.75 : 0.1;
      this.toDb.flow = step === 0 && !waiting ? 0.9 : 0;
    }
    if (this.fromDb) {
      this.fromDb.a = step === 1 ? 0.75 : 0.1;
      this.fromDb.flow = step === 1 ? 0.6 : 0;
    }
    // The race: both claims fly to the row; the dashboard's lands first.
    this.claims.forEach((c, k) => {
      const from = k === 0 ? cli : web;
      const target = {
        x: r0.box.x + r0.box.w * (k === 0 ? 0.3 : 0.7),
        y: r0.box.y + r0.box.h / 2,
      };
      const start = { x: from.x + from.w / 2, y: from.y + from.h };
      const r = this.race;
      const lag = k === 0 ? 0.06 : 0;
      let u = smoothstep(0.05 + lag, 0.45 + lag, r);
      if (k === 0 && r > 0.55) u = 1 - smoothstep(0.55, 0.85, r);
      c.x = lerp(start.x, target.x, u);
      c.y = lerp(start.y, target.y, u);
      c.a = step === 2 && r > 0.04 && r < 0.92 ? 1 : 0;
      c.tint = k === 1 ? 1 : 0;
    });
    this.marks.apply(f, fr, { boost: boostFor(this.ink), dustAlpha: 0.07 });

    this.readouts.write("row", step === 3 ? "#13" : "#11");
    this.readouts.write(
      "status",
      step === 3 ? (this.stale >= 1 ? "failed" : "processing") : this.status(),
    );
    this.readouts.write(
      "update",
      step === 2 && this.race > 0.45
        ? "web 1 · CLI 0"
        : step === 3
          ? this.stale >= 1
            ? "stale → failed"
            : "no events…"
          : "—",
    );
  }

  private status() {
    if (this.step === 2 && this.race > 0.45) return "processing";
    return this.stage === STAGES.length - 1 ? "needs_review" : "processing";
  }

  draw(ctx: CanvasRenderingContext2D, fr: Frame, palette: Palette) {
    this.ink = palette.ink;
    const vx = fr.visual.x;
    const vy = fr.visual.y;
    const step = this.step;
    const size = fr.compact ? 8.5 : 10;
    const cli = this.cli;
    const web = this.web;
    const db = this.db;
    if (!cli || !web || !db) return;
    const title = (b: Box, a: string, sub: string, lit: boolean) => {
      label(ctx, palette, a, vx + b.x + 12, vy + b.y + b.h * 0.36, {
        size,
        color: lit ? palette.fg : palette.muted,
      });
      if (!fr.compact)
        label(ctx, palette, sub, vx + b.x + 12, vy + b.y + b.h * 0.68, {
          size: size - 1.5,
          alpha: lit ? 0.8 : 0.45,
        });
    };
    title(
      cli,
      "CLI",
      step === 1 ? "exited" : "main.py · run_pipeline()",
      step === 0 || step === 2,
    );
    title(web, "dashboard", "FastAPI · one worker thread", step >= 1);
    label(ctx, palette, "inventory.db · WAL", vx + db.x + 14, vy + db.y + 14, {
      size: size - 0.5,
      alpha: 0.8,
    });

    this.rows.forEach((r, k) => {
      const b = r.box;
      const y = vy + b.y + b.h / 2;
      let status =
        k === 0
          ? this.status()
          : k === 1
            ? "paid"
            : step === 3 && this.stale >= 1
              ? "failed"
              : "processing";
      let stage =
        k === 0
          ? STAGES[this.stage]
          : k === 1
            ? "paid"
            : step === 3 && this.stale >= 1
              ? "failed"
              : "extract";
      if (k === 2 && step !== 3) {
        status = "—";
        stage = "";
      }
      const outcome: Outcome | null =
        status === "needs_review"
          ? "review"
          : status === "paid"
            ? "paid"
            : status === "failed"
              ? "rejected"
              : null;
      label(ctx, palette, `#${r.id}`, vx + b.x + 10, y, {
        size: size - 1,
        alpha: 0.7,
      });
      label(
        ctx,
        palette,
        fr.compact ? r.file.replace("invoice_", "") : r.file,
        vx + b.x + 44,
        y,
        {
          size: size - 1,
          color: palette.fg,
          alpha: k === 2 && step !== 3 ? 0.35 : 0.9,
        },
      );
      label(
        ctx,
        palette,
        `${status}${stage && stage !== status ? ` · ${stage}` : ""}`,
        vx + b.x + b.w - 10,
        y,
        {
          size: size - 1,
          align: "right",
          color: outcome ? outcomeColor(outcome, palette) : palette.muted,
        },
      );
    });

    if (step === 2) {
      const r0 = this.rows[0].box;
      const won = this.race > 0.45;
      if (won) {
        label(
          ctx,
          palette,
          "✓ claimed",
          vx + r0.x + r0.w * 0.7,
          vy + r0.y - 12,
          { size, align: "center", color: palette.accent },
        );
        if (this.race > 0.55)
          label(
            ctx,
            palette,
            "✗ not waiting for review",
            vx + r0.x + r0.w * 0.3,
            vy + r0.y - 12,
            {
              size: size - 1,
              align: "center",
            },
          );
      }
    }
    if (step === 3) {
      const r2 = this.rows[2].box;
      const x = vx + r2.x + r2.w * 0.55;
      const y = vy + r2.y + r2.h / 2;
      ctx.beginPath();
      ctx.arc(x, y, 7, -Math.PI / 2, -Math.PI / 2 + TAU * this.stale);
      ctx.strokeStyle = rgba(palette.accent, 0.9);
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.lineWidth = 1;
      label(ctx, palette, this.stale >= 1 ? "15 min silent" : "", x + 12, y, {
        size: size - 1.5,
        color: palette.accent,
      });
    }
    resetText(ctx);
  }
}
