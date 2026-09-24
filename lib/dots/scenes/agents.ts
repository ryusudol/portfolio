import {
  type Bezier,
  bezierAt,
  clamp,
  gauss,
  rgba,
  sCurve,
  smoothstep,
  TAU,
} from "../math";
import { dust } from "../shapes";
import type { Field, Frame, Palette, Scene } from "../types";

type Node = { x: number; y: number };

const AGENTS = [
  { name: "header", start: 0.04, span: 0.3 },
  { name: "details", start: 0.1, span: 0.44 },
  { name: "certifications", start: 0.07, span: 0.6 },
  { name: "media", start: 0.16, span: 0.5 },
  { name: "edit modal", start: 0.09, span: 0.38 },
];

const PLAN_DISC = 0;
const AGENT_DISC = 1;
const AGENT_RING = 2;
const MERGE_DISC = 3;
const MERGE_RING = 4;
const FAN = 5;
const JOIN = 6;
const DUST = 7;

/**
 * One plan fans out to parallel agents (one Git worktree each); each finishes
 * on its own schedule, then everything lands as one stacked, flag-gated merge.
 */
export class AgentsScene implements Scene {
  private plan: Node = { x: 0, y: 0 };
  private merge: Node = { x: 0, y: 0 };
  private agents: Node[] = [];
  private fan: Bezier[] = [];
  private join: Bezier[] = [];
  private radius = 14;
  private role = new Uint8Array(0);
  private ref = new Uint8Array(0);
  private progress = new Float32Array(AGENTS.length);
  private merged = 0;
  private pt: [number, number] = [0, 0];

  layout(f: Field, fr: Frame) {
    const { w, h } = fr.visual;
    const cy = h / 2;
    const gap = Math.min(h * 0.19, fr.compact ? 56 : 92);
    this.radius = clamp(Math.min(w, h) * 0.034, 10, 18);
    this.plan = { x: w * 0.07, y: cy };
    this.merge = { x: w * 0.93, y: cy };
    this.agents = AGENTS.map((_, k) => ({
      x: w * (fr.compact ? 0.46 : 0.56),
      y: cy + (k - 2) * gap,
    }));
    this.fan = this.agents.map((a) =>
      sCurve(this.plan.x, this.plan.y, a.x, a.y, 0.45),
    );
    this.join = this.agents.map((a) =>
      sCurve(a.x, a.y, this.merge.x, this.merge.y, 0.55),
    );

    this.role = new Uint8Array(f.n);
    this.ref = new Uint8Array(f.n);
    const shares: [number, number][] = [
      [PLAN_DISC, 0.05],
      [AGENT_DISC, 0.15],
      [AGENT_RING, 0.09],
      [MERGE_DISC, 0.06],
      [MERGE_RING, 0.03],
      [FAN, 0.3],
      [JOIN, 0.14],
    ];
    let i = 0;
    for (const [role, share] of shares) {
      const count = Math.round(f.n * share);
      for (let c = 0; c < count && i < f.n; c++, i++) {
        this.role[i] = role;
        this.ref[i] = c % AGENTS.length;
      }
    }
    for (; i < f.n; i++) this.role[i] = DUST;
  }

  update(f: Field, fr: Frame) {
    const vx = fr.visual.x;
    const vy = fr.visual.y;
    const p = fr.progress;
    const time = fr.reduced ? 0 : fr.time;
    const R = this.radius;
    let done = 0;
    AGENTS.forEach((agent, k) => {
      this.progress[k] = clamp((p - agent.start) / agent.span);
      if (this.progress[k] >= 1) done++;
    });
    this.merged = smoothstep(0.72, 0.84, p) * (done === AGENTS.length ? 1 : 0);
    const mergeFill = (done / AGENTS.length) * 0.6 + this.merged * 0.4;
    const pt = this.pt;

    const disc = (i: number, node: Node, radius: number) => {
      const r = radius * Math.sqrt(f.r1[i]);
      f.gx[i] = vx + node.x + Math.cos(f.r0[i] * TAU) * r;
      f.gy[i] = vy + node.y + Math.sin(f.r0[i] * TAU) * r;
    };
    const ring = (i: number, node: Node, radius: number) => {
      const a = -Math.PI / 2 + f.r0[i] * TAU;
      const r = radius + gauss(f.r1[i], f.r2[i]) * 0.8;
      f.gx[i] = vx + node.x + Math.cos(a) * r;
      f.gy[i] = vy + node.y + Math.sin(a) * r;
    };

    for (let i = 0; i < f.n; i++) {
      const k = this.ref[i];
      const prog = this.progress[k];
      switch (this.role[i]) {
        case PLAN_DISC:
          disc(i, this.plan, R);
          f.ga[i] = 0.4 + f.r3[i] * 0.4;
          f.gh[i] = 0;
          break;
        case AGENT_DISC:
          disc(i, this.agents[k], R * 0.92);
          f.ga[i] = 0.35 + f.r3[i] * 0.35;
          f.gh[i] = prog >= 1 ? 0.25 : 0;
          break;
        case AGENT_RING: {
          ring(i, this.agents[k], R + 4);
          const lit = f.r0[i] <= prog;
          f.ga[i] = lit ? 0.95 : 0.22;
          f.gh[i] = lit ? 1 : 0;
          break;
        }
        case MERGE_DISC:
          disc(i, this.merge, R * 1.05);
          f.ga[i] = f.r3[i] < mergeFill ? 0.4 + f.r3[i] * 0.5 : 0;
          f.gh[i] = this.merged;
          break;
        case MERGE_RING:
          ring(i, this.merge, R + 4);
          f.ga[i] = 0.6 + 0.35 * this.merged;
          f.gh[i] = this.merged;
          break;
        case FAN: {
          const working = prog > 0 && prog < 1;
          const t = working ? (f.r0[i] + time * 0.28) % 1 : f.r0[i];
          bezierAt(this.fan[k], t, pt);
          const width = 1 + 3.2 * Math.sin(Math.PI * t);
          f.gx[i] = vx + pt[0];
          f.gy[i] = vy + pt[1] + gauss(f.r1[i], f.r2[i]) * width;
          f.ga[i] = working ? 0.5 + f.r3[i] * 0.3 : 0.16;
          f.gh[i] = 0;
          break;
        }
        case JOIN: {
          if (prog < 1) {
            const a = this.agents[k];
            f.gx[i] = vx + a.x;
            f.gy[i] = vy + a.y;
            f.ga[i] = 0;
            f.gh[i] = 1;
            break;
          }
          const t = (f.r0[i] + time * 0.24) % 1;
          bezierAt(this.join[k], t, pt);
          f.gx[i] = vx + pt[0];
          f.gy[i] = vy + pt[1] + gauss(f.r1[i], f.r2[i]) * 1.4;
          f.ga[i] = 0.35 + f.r3[i] * 0.35;
          f.gh[i] = 1;
          break;
        }
        default:
          dust(f, i, fr, 0.12);
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, fr: Frame, palette: Palette) {
    const vx = fr.visual.x;
    const vy = fr.visual.y;
    const R = this.radius;
    ctx.font = `10px ${palette.mono}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    ctx.fillStyle = rgba(palette.muted, 0.85);
    ctx.fillText("plan", vx + this.plan.x, vy + this.plan.y + R + 10);

    this.agents.forEach((a, k) => {
      const prog = this.progress[k];
      const x = vx + a.x;
      const y = vy + a.y;
      if (prog >= 1) {
        const g = ctx.createRadialGradient(x, y, 0, x, y, R * 2.4);
        g.addColorStop(0, rgba(palette.accent, 0.35));
        g.addColorStop(1, rgba(palette.accent, 0));
        ctx.fillStyle = g;
        ctx.fillRect(x - R * 2.4, y - R * 2.4, R * 4.8, R * 4.8);
      }
      const pct = `${Math.round(prog * 100)}%`;
      ctx.textAlign = "left";
      ctx.fillStyle = rgba(palette.muted, 0.9);
      ctx.fillText(AGENTS[k].name, x + R + 12, y - 11);
      ctx.fillStyle = rgba(
        prog >= 1 ? palette.accent : palette.fg,
        prog >= 1 ? 1 : 0.7,
      );
      ctx.fillText(pct, x + R + 12, y + 2);
      ctx.textAlign = "center";
    });

    const label = this.merged > 0.5 ? "merged · flag on" : "stacked PRs";
    ctx.fillStyle = rgba(
      this.merged > 0.5 ? palette.accent : palette.muted,
      0.9,
    );
    ctx.fillText(label, vx + this.merge.x, vy + this.merge.y + R + 10);
    if (this.merged > 0) {
      const x = vx + this.merge.x;
      const y = vy + this.merge.y;
      const g = ctx.createRadialGradient(x, y, 0, x, y, R * 3);
      g.addColorStop(0, rgba(palette.accent, 0.45 * this.merged));
      g.addColorStop(1, rgba(palette.accent, 0));
      ctx.fillStyle = g;
      ctx.fillRect(x - R * 3, y - R * 3, R * 6, R * 6);
    }
    ctx.textAlign = "start";
  }
}
