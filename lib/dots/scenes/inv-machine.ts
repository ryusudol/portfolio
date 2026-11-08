import {
  arrow,
  boostFor,
  type Outcome,
  outcomeClass,
  outcomeColor,
  outcomeColors,
} from "../invoice-data";
import { type Mark, Marks } from "../marks";
import { clamp, lerp, rgba, smoothstep, TAU } from "../math";
import { freeArea, label, Readouts, resetText, StageSize } from "../story";
import type { Field, Frame, Palette, Scene } from "../types";

type NodeId =
  | "load"
  | "extract"
  | "check_duplicate"
  | "validate"
  | "policy_gate"
  | "approval"
  | "payment"
  | "needs_review"
  | "rejection"
  | "paid"
  | "rejected"
  | "duplicate"
  | "failed";

/** Column (0–2) and row of each stage on the stage. */
const SPOTS: Record<NodeId, [number, number]> = {
  load: [0, 0],
  extract: [0, 1],
  check_duplicate: [0, 2],
  validate: [0, 3],
  policy_gate: [0, 4],
  approval: [0, 5],
  payment: [1, 4.1],
  needs_review: [1, 5],
  rejection: [1, 5.9],
  paid: [2, 4.1],
  rejected: [2, 5.9],
  duplicate: [2, 2],
  failed: [2, 0.3],
};

const TERMINAL: Partial<Record<NodeId, Outcome | "failed">> = {
  paid: "paid",
  rejected: "rejected",
  needs_review: "review",
  duplicate: "duplicate",
  failed: "failed",
};

const EDGES: [NodeId, NodeId, boolean][] = [
  ["load", "extract", false],
  ["extract", "check_duplicate", false],
  ["check_duplicate", "validate", false],
  ["check_duplicate", "duplicate", false],
  ["validate", "policy_gate", false],
  ["policy_gate", "approval", false],
  ["approval", "payment", false],
  ["approval", "needs_review", false],
  ["approval", "rejection", false],
  ["payment", "paid", false],
  ["rejection", "rejected", false],
  ["needs_review", "payment", true],
  ["needs_review", "rejection", true],
];

/** Four real runs from the sample batch, each a path through the table. */
const ROUTES: { file: string; path: NodeId[]; note: string }[] = [
  {
    file: "invoice_1001.txt",
    path: [
      "load",
      "extract",
      "check_duplicate",
      "validate",
      "policy_gate",
      "approval",
      "payment",
      "paid",
    ],
    note: "standard · VP + critic approve",
  },
  {
    file: "invoice_1011.txt",
    path: ["load", "extract", "check_duplicate", "duplicate"],
    note: "same fingerprint as 1011.pdf",
  },
  {
    file: "invoice_1002.txt",
    path: [
      "load",
      "extract",
      "check_duplicate",
      "validate",
      "policy_gate",
      "approval",
      "rejection",
      "rejected",
    ],
    note: "GadgetX: 20 requested, 5 in stock",
  },
  {
    file: "invoice_1010.txt",
    path: [
      "load",
      "extract",
      "check_duplicate",
      "validate",
      "policy_gate",
      "approval",
      "needs_review",
      "payment",
      "paid",
    ],
    note: "price above catalog · a human approves",
  },
];

const HOP = 0.62;
const DWELL = 0.32;
const REVIEW_WAIT = 1.6;
const HOLD = 1.4;

function routeTime(path: NodeId[]) {
  let t = 0;
  for (let k = 1; k < path.length; k++)
    t += HOP + DWELL + (path[k - 1] === "needs_review" ? REVIEW_WAIT : 0);
  return t + HOLD;
}
const TIMES = ROUTES.map((r) => routeTime(r.path));
const CYCLE = TIMES.reduce((a, b) => a + b, 0);

/**
 * The orchestrator's transition table as a graph. A token walks four real
 * runs through it; every stage it enters is a row saved to SQLite first, so
 * the run that waits at needs_review is resumed later by resolve_review().
 */
export class MachineScene implements Scene {
  private marks = new Marks();
  private pos = {} as Record<NodeId, { x: number; y: number }>;
  private nodes = {} as Record<NodeId, Mark>;
  private edges: { from: NodeId; to: NodeId; dash: boolean; mark: Mark }[] = [];
  private token: Mark | null = null;
  private R = 10;
  private clock = 0;
  private route = 0;
  private at: NodeId = "load";
  private visited = new Set<NodeId>();
  private hop: [NodeId, NodeId] | null = null;
  private saves = 0;
  private pulse = 0;
  private waiting = false;
  private readouts = new Readouts();
  private size = new StageSize();
  private ink = true;

  layout(f: Field, fr: Frame) {
    const area = freeArea(fr, fr.compact ? 14 : 22);
    const m = this.marks;
    m.clear();
    this.R = clamp(Math.min(area.w, area.h) * 0.026, 6, 11);
    // Narrow stages pull the outcome column in so its names still fit.
    const cols = (fr.compact ? [0.03, 0.42, 0.7] : [0.06, 0.48, 0.84]).map(
      (t) => area.x + area.w * t,
    );
    const rowH = (area.h - 2 * this.R - 8) / 5.9;
    for (const id of Object.keys(SPOTS) as NodeId[]) {
      const [c, r] = SPOTS[id];
      this.pos[id] = { x: cols[c], y: area.y + this.R + 4 + r * rowH };
    }
    this.edges = EDGES.map(([from, to, dash]) => {
      const a = this.pos[from];
      const b = this.pos[to];
      const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const ux = (b.x - a.x) / len;
      const uy = (b.y - a.y) / len;
      const gap = this.R + 5;
      return {
        from,
        to,
        dash,
        mark: m.add(
          "line",
          {
            x: a.x + ux * gap,
            y: a.y + uy * gap,
            x2: b.x - ux * gap,
            y2: b.y - uy * gap,
          },
          0.3,
        ),
      };
    });
    for (const id of Object.keys(SPOTS) as NodeId[]) {
      const { x, y } = this.pos[id];
      this.nodes[id] = TERMINAL[id]
        ? m.add("disc", { x, y, r: this.R }, 0.5)
        : m.add("ring", { x, y, r: this.R }, 0.9);
    }
    this.token = m.add("disc", { r: this.R * 0.55 }, 1.2);
    m.fit(f);
    this.readouts.collect(fr.section);
  }

  update(f: Field, fr: Frame) {
    if (this.size.changed(fr)) this.layout(f, fr);
    f.classColors = outcomeColors(this.ink);
    this.clock = fr.reduced ? TIMES[0] - HOLD * 0.5 : this.clock + fr.dt;
    let t = this.clock % CYCLE;
    let r = 0;
    while (t > TIMES[r]) t -= TIMES[r++];
    const route = ROUTES[r];
    if (r !== this.route) {
      this.route = r;
      this.saves = 0;
    }

    // Where the token is: dwelling on a node, or hopping along an edge.
    let x = this.pos.load.x;
    let y = this.pos.load.y;
    this.visited.clear();
    this.visited.add("load");
    this.at = "load";
    this.hop = null;
    this.waiting = false;
    let clock = t;
    let saves = 1;
    for (let k = 1; k < route.path.length; k++) {
      const from = route.path[k - 1];
      const to = route.path[k];
      const wait = DWELL + (from === "needs_review" ? REVIEW_WAIT : 0);
      if (clock < wait) {
        this.waiting = from === "needs_review";
        break;
      }
      clock -= wait;
      const a = this.pos[from];
      const b = this.pos[to];
      if (clock < HOP) {
        const u = smoothstep(0, 1, clock / HOP);
        x = lerp(a.x, b.x, u);
        y = lerp(a.y, b.y, u);
        this.hop = [from, to];
        break;
      }
      clock -= HOP;
      x = b.x;
      y = b.y;
      this.at = to;
      this.visited.add(to);
      saves++;
    }
    if (saves !== this.saves) {
      this.saves = saves;
      this.pulse = 1;
    }
    this.pulse = Math.max(0, this.pulse - fr.dt * 1.6);

    for (const e of this.edges) {
      const live = this.hop && this.hop[0] === e.from && this.hop[1] === e.to;
      const done = this.visited.has(e.from) && this.visited.has(e.to) && !live;
      e.mark.a = live ? 0.95 : done ? 0.5 : e.dash ? 0.12 : 0.2;
      e.mark.flow = live ? 1.4 : 0;
      e.mark.tint = live ? 1 : 0;
      e.mark.spread = e.dash ? 0.2 : 0;
    }
    for (const id of Object.keys(this.nodes) as NodeId[]) {
      const node = this.nodes[id];
      const term = TERMINAL[id];
      const on = this.visited.has(id);
      node.a = on ? 0.95 : 0.3;
      node.tint = id === this.at && !term ? 1 : 0;
      node.cls = term && term !== "failed" && on ? outcomeClass(term) : 0;
    }
    if (this.token) {
      this.token.x = x;
      this.token.y = y;
      this.token.a = 1;
      this.token.tint = 1;
    }
    this.marks.apply(f, fr, { boost: boostFor(this.ink), dustAlpha: 0.07 });

    this.readouts.write("file", route.file.replace("invoice_", ""));
    this.readouts.write("stage", this.at);
    this.readouts.write("saves", String(this.saves));
  }

  draw(ctx: CanvasRenderingContext2D, fr: Frame, palette: Palette) {
    this.ink = palette.ink;
    const vx = fr.visual.x;
    const vy = fr.visual.y;
    const R = this.R;
    const size = fr.compact ? 8.5 : 10;

    for (const id of Object.keys(this.pos) as NodeId[]) {
      const p = this.pos[id];
      const term = TERMINAL[id];
      const on = this.visited.has(id);
      const color =
        term && term !== "failed" && on
          ? outcomeColor(term, palette)
          : id === this.at
            ? palette.accent
            : on
              ? palette.fg
              : palette.muted;
      // Stages with edges leaving to the right get their name above the line.
      label(ctx, palette, id, vx + p.x + R + 6, vy + p.y - (term ? 0 : R + 2), {
        size,
        color,
        alpha: on ? 1 : 0.6,
      });
    }

    // Arrowheads only; the particles draw the edges.
    for (const e of this.edges) {
      const m = e.mark;
      const len = Math.hypot(m.x2 - m.x, m.y2 - m.y) || 1;
      const ux = (m.x2 - m.x) / len;
      const uy = (m.y2 - m.y) / len;
      arrow(
        ctx,
        vx + m.x2 - ux * 6,
        vy + m.y2 - uy * 6,
        vx + m.x2,
        vy + m.y2,
        palette.muted,
        0.55,
        {
          head: 4.5,
        },
      );
    }
    const nr = this.pos.needs_review;
    label(
      ctx,
      palette,
      "resolve_review()",
      vx + nr.x + R + 6,
      vy + nr.y + R + 4,
      {
        size: size - 1,
        color: this.waiting ? palette.accent : palette.muted,
        alpha: this.waiting ? 1 : 0.6,
      },
    );
    const fl = this.pos.failed;
    if (!fr.compact)
      label(
        ctx,
        palette,
        "← any exception",
        vx + fl.x + R + 8,
        vy + fl.y + 14,
        {
          size: size - 1,
          alpha: 0.55,
        },
      );

    // Each stage entered is a row written to SQLite before it runs.
    if (this.pulse > 0 && this.token) {
      const x = vx + this.token.x;
      const y = vy + this.token.y;
      const life = 1 - this.pulse;
      ctx.beginPath();
      ctx.arc(x, y, R * (1.1 + life * 1.8), 0, TAU);
      ctx.strokeStyle = rgba(palette.accent, 0.7 * this.pulse);
      ctx.lineWidth = 1;
      ctx.stroke();
      label(ctx, palette, "saved", x - R - 8, y - R - 4, {
        size: size - 1,
        align: "right",
        color: palette.accent,
        alpha: this.pulse,
      });
    }
    const route = ROUTES[this.route];
    if (!fr.compact)
      label(
        ctx,
        palette,
        route.note,
        vx + this.pos.payment.x - R,
        vy + this.pos.load.y,
        {
          size: size - 0.5,
          alpha: 0.75,
        },
      );
    resetText(ctx);
  }
}
