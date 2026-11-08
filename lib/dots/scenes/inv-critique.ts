import { boostFor } from "../invoice-data";
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

const STEP_AT = [0, 0.2, 0.42, 0.62, 0.8] as const;
const STOPS = ["approve", "needs_review", "reject"];
const MAX_ROUNDS = 3;

/** One round trip: the draft goes over, the critic reads it, issues come back. */
const GO = 1.0;
const READ = 0.7;
const BACK = 0.9;
const REVISE = 0.4;
const ROUND = GO + READ + BACK + REVISE;

type State = {
  /** 0 = at the VP, 1 = at the critic. */
  draft: number;
  /** Issues on their way back, 0–1 from the critic, or -1 when none. */
  issues: number;
  round: number;
  verdict: "" | "objects" | "agrees";
  /** Position on the outcome scale, and where the VP drafted it. */
  marker: number;
  drafted: number;
  locked: boolean;
  label: string;
};

const idle = (): State => ({
  draft: 0,
  issues: -1,
  round: 0,
  verdict: "",
  marker: -1,
  drafted: -1,
  locked: false,
  label: "",
});

/** Rounds of draft and critique; the critic agrees on round `agreeOn` (0 = never). */
function rounds(t: number, agreeOn: number, s: State) {
  const last = agreeOn || MAX_ROUNDS;
  for (let r = 1; r <= last; r++) {
    s.round = r;
    if (t < GO) {
      s.draft = smoothstep(0, 1, t / GO);
      return s;
    }
    t -= GO;
    s.draft = 1;
    if (t < READ) return s;
    t -= READ;
    if (r === agreeOn) {
      s.verdict = "agrees";
      s.marker = 0;
      s.label = `agreed in round ${r}: approve`;
      return s;
    }
    s.verdict = "objects";
    if (r === last) {
      s.marker = smoothstep(0, 0.8, t);
      s.label = `no agreement in ${MAX_ROUNDS} rounds: a human decides`;
      return s;
    }
    if (t < BACK) {
      s.issues = t / BACK;
      return s;
    }
    t -= BACK;
    if (t < REVISE) {
      s.draft = 0;
      return s;
    }
    t -= REVISE;
    s.verdict = "";
  }
  return s;
}

/**
 * The approval stage. The VP agent drafts from a case file code wrote; the
 * critic audits it, and objections come back as issues to revise, up to three
 * rounds under strict review. Code checks every draft against the policy, so
 * an agent can make an outcome stricter but never looser.
 */
export class CritiqueScene implements Scene {
  private marks = new Marks();
  private vp: Mark | null = null;
  private critic: Mark | null = null;
  private caseFile: Mark | null = null;
  private feed: Mark | null = null;
  private draftBox: Mark | null = null;
  private issue: Mark | null = null;
  private stops: Mark[] = [];
  private marker: Mark | null = null;
  private geo = {
    vx: 0,
    cx: 0,
    y: 0,
    lane: 20,
    sx0: 0,
    sx1: 0,
    sy: 0,
    R: 16,
    dw: 60,
    dh: 40,
  };
  private step = -1;
  private local = 0;
  private s = idle();
  private steps = new Steps();
  private readouts = new Readouts();
  private size = new StageSize();
  private ink = true;

  layout(f: Field, fr: Frame) {
    const area = freeArea(fr, 18);
    const m = this.marks;
    m.clear();
    const R = clamp(Math.min(area.w, area.h) * 0.055, 14, 26);
    const g = {
      vx: area.x + area.w * 0.14,
      cx: area.x + area.w * 0.86,
      y: area.y + area.h * 0.4,
      lane: R * 1.6,
      sx0: area.x + area.w * 0.14,
      sx1: area.x + area.w * 0.86,
      sy: area.y + area.h * 0.78,
      R,
      dw: clamp(area.w * 0.13, 44, 78),
      dh: clamp(area.w * 0.09, 30, 52),
    };
    this.geo = g;
    this.caseFile = m.add(
      "box",
      { x: g.vx - g.dw / 2, y: area.y + 2, w: g.dw, h: g.dh * 0.8 },
      0.5,
    );
    this.feed = m.add(
      "line",
      { x: g.vx, y: area.y + 6 + g.dh * 0.8, x2: g.vx, y2: g.y - R - 6 },
      0.35,
    );
    this.vp = m.add("ring", { x: g.vx, y: g.y, r: R }, 0.9);
    this.critic = m.add("ring", { x: g.cx, y: g.y, r: R }, 0.9);
    m.add(
      "line",
      { x: g.vx + R + 8, y: g.y - g.lane, x2: g.cx - R - 8, y2: g.y - g.lane },
      0.12,
    );
    m.add(
      "line",
      { x: g.cx - R - 8, y: g.y + g.lane, x2: g.vx + R + 8, y2: g.y + g.lane },
      0.12,
    );
    this.draftBox = m.add("box", { w: g.dw * 0.62, h: g.dh * 0.62 }, 0.7);
    this.issue = m.add("disc", { r: 5 }, 1.2);
    m.add("line", { x: g.sx0, y: g.sy, x2: g.sx1, y2: g.sy }, 0.25);
    this.stops = STOPS.map((_, k) =>
      m.add("ring", { x: lerp(g.sx0, g.sx1, k / 2), y: g.sy, r: 6 }, 1),
    );
    this.marker = m.add("disc", { r: 7 }, 1.2);
    m.fit(f);
    this.steps.collect(fr.section);
    this.readouts.collect(fr.section);
    this.step = -1;
  }

  update(f: Field, fr: Frame) {
    if (this.size.changed(fr)) this.layout(f, fr);
    const step = stepAt(fr.progress, STEP_AT);
    if (step !== this.step) {
      this.step = step;
      this.local = 0;
    }
    this.steps.set(step);
    this.local += fr.dt;
    const t = fr.reduced ? 60 : this.local;
    const s = idle();
    if (step === 0) {
      s.draft = 0;
      s.label = "case file → VP draft";
    } else if (step === 1) rounds(t % (ROUND + GO + READ + 2.4), 2, s);
    else if (step === 2) rounds(t % (ROUND * MAX_ROUNDS + 2.4), 0, s);
    else if (step === 3) {
      // 1002.txt: GadgetX 20 requested, 5 in stock. The policy fixed reject.
      const u = t % 5;
      s.drafted = 0;
      s.marker = u < 1.4 ? 0 : lerp(0, 2, smoothstep(1.4, 2.2, u));
      s.locked = u >= 2.2;
      s.label =
        u < 1.4 ? "VP drafts approve" : "policy_override: reject is fixed";
    } else {
      // A clean invoice: a VP reject is downgraded to needs_review.
      const u = t % 5;
      s.drafted = 2;
      s.marker = u < 1.4 ? 2 : lerp(2, 1, smoothstep(1.4, 2.2, u));
      s.label =
        u < 1.4
          ? "VP drafts reject"
          : "standard mode: reject becomes needs_review";
    }
    this.s = s;

    const g = this.geo;
    const draftOn = step <= 2;
    if (this.caseFile) this.caseFile.a = step === 0 ? 0.8 : 0.35;
    if (this.feed) {
      this.feed.flow = step === 0 ? 0.6 : 0;
      this.feed.a = step === 0 ? 0.7 : 0.15;
    }
    if (this.vp) {
      this.vp.a = 0.9;
      this.vp.tint = s.issues >= 0 || (step === 0 && !fr.reduced) ? 0.6 : 0;
    }
    if (this.critic) {
      this.critic.a = 0.9;
      this.critic.tint = s.verdict === "objects" ? 1 : 0;
    }
    if (this.draftBox) {
      const d = this.draftBox;
      d.x = lerp(g.vx, g.cx, s.draft) - d.w / 2;
      d.y = g.y - g.lane - d.h / 2;
      if (s.draft === 0) d.y = g.y - d.h / 2 - g.R - d.h * 0.2 - 4;
      d.a = draftOn ? 0.9 : 0;
    }
    if (this.issue) {
      this.issue.x = lerp(g.cx, g.vx, Math.max(0, s.issues));
      this.issue.y = g.y + g.lane;
      this.issue.a = s.issues >= 0 ? 1 : 0;
      this.issue.tint = 1;
    }
    this.stops.forEach((st, k) => {
      st.a = s.locked && k === 2 ? 1 : 0.6;
      st.tint = s.locked && k === 2 ? 1 : 0;
    });
    if (this.marker) {
      this.marker.x = lerp(g.sx0, g.sx1, Math.max(0, s.marker) / 2);
      this.marker.y = g.sy;
      this.marker.a = s.marker >= 0 ? 1 : 0;
      this.marker.tint = step >= 3 ? 1 : 0.5;
    }
    this.marks.apply(f, fr, { boost: boostFor(this.ink), dustAlpha: 0.07 });

    this.readouts.write(
      "mode",
      step === 3
        ? "reject (fixed)"
        : step === 4
          ? "standard"
          : step === 0
            ? "—"
            : "strict",
    );
    this.readouts.write(
      "round",
      s.round
        ? `${s.round} of ${step === 1 || step === 2 ? MAX_ROUNDS : 1}`
        : "—",
    );
    this.readouts.write(
      "decided",
      step === 3
        ? "policy"
        : step === 2 && s.marker > 0.5
          ? "human"
          : s.verdict === "agrees"
            ? "VP + critic"
            : "—",
    );
  }

  draw(ctx: CanvasRenderingContext2D, fr: Frame, palette: Palette) {
    this.ink = palette.ink;
    const vx = fr.visual.x;
    const vy = fr.visual.y;
    const g = this.geo;
    const s = this.s;
    const step = this.step;
    const size = fr.compact ? 9 : 10;

    label(ctx, palette, "VP", vx + g.vx, vy + g.y + g.R + 16, {
      size,
      align: "center",
      color: palette.fg,
    });
    label(ctx, palette, "critic", vx + g.cx, vy + g.y + g.R + 16, {
      size,
      align: "center",
      color: palette.fg,
    });
    label(
      ctx,
      palette,
      "case file",
      vx + g.vx + g.dw / 2 + 8,
      vy + this.caseTop(),
      {
        size: size - 1,
        alpha: step === 0 ? 0.9 : 0.5,
      },
    );
    if (step >= 1 && step <= 2) {
      label(
        ctx,
        palette,
        "draft",
        vx + (g.vx + g.cx) / 2,
        vy + g.y - g.lane - 30,
        {
          size: size - 1,
          align: "center",
          alpha: 0.6,
        },
      );
      label(
        ctx,
        palette,
        "issues",
        vx + (g.vx + g.cx) / 2,
        vy + g.y + g.lane + 18,
        {
          size: size - 1,
          align: "center",
          alpha: 0.6,
        },
      );
    }
    if (s.verdict) {
      const objects = s.verdict === "objects";
      label(
        ctx,
        palette,
        objects ? "✗ objects" : "✓ agrees",
        vx + g.cx,
        vy + g.y - g.lane - g.dh * 0.31 - 14,
        {
          size,
          align: "center",
          color: objects ? palette.accent : palette.fg,
        },
      );
    }
    if (s.round) {
      label(
        ctx,
        palette,
        `round ${s.round}`,
        vx + (g.vx + g.cx) / 2,
        vy + g.y,
        {
          size,
          align: "center",
          color: palette.fg,
        },
      );
    }

    STOPS.forEach((name, k) => {
      const x = vx + lerp(g.sx0, g.sx1, k / 2);
      label(ctx, palette, name, x, vy + g.sy + 20, {
        size,
        align: "center",
        color: s.locked && k === 2 ? palette.accent : palette.muted,
      });
    });
    label(ctx, palette, "stricter →", vx + g.sx1, vy + g.sy + 38, {
      size: size - 1.5,
      align: "right",
      alpha: 0.6,
    });
    if (s.drafted >= 0) {
      const x = vx + lerp(g.sx0, g.sx1, s.drafted / 2);
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = rgba(palette.muted, 0.8);
      ctx.beginPath();
      ctx.arc(x, vy + g.sy, 11, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      label(ctx, palette, "drafted", x, vy + g.sy - 18, {
        size: size - 1.5,
        align: "center",
        alpha: 0.75,
      });
    }
    if (s.label) {
      label(ctx, palette, s.label, vx + (g.sx0 + g.sx1) / 2, vy + g.sy - 42, {
        size,
        align: "center",
        color: step >= 3 ? palette.accent : palette.fg,
      });
    }
    resetText(ctx);
  }

  private caseTop() {
    return this.caseFile ? this.caseFile.y + this.caseFile.h / 2 : 0;
  }
}
