import {
  type Bezier,
  bezierAt,
  bezierLength,
  clamp,
  gauss,
  mulberry32,
  rgba,
  sCurve,
  TAU,
} from "../math";
import { dots } from "../runtime";
import { dust } from "../shapes";
import type { Field, Frame, Palette, Scene } from "../types";

type TreeNode = { x: number; y: number; depth: number; parent: number };
type Edge = { curve: Bezier; depth: number; child: number };
type Request = {
  id: number;
  leaf: number;
  start: number;
  end: number;
  state: "queued" | "flying" | "done" | "dropped";
};

const DURATION = 1.3;
const ROLE_EDGE = 1;
const ROLE_NODE = 2;
const ROLE_SPRAY = 3;

/**
 * A request tree. Hovering a branch emits a request toward that leaf; the
 * selected RxJS flattening operator decides what happens to requests that are
 * still in flight — the same decisions behind a profile page that never shows
 * stale data.
 */
export class RequestsScene implements Scene {
  private nodes: TreeNode[] = [];
  private edges: Edge[] = [];
  private leaves: number[] = [];
  private paths: number[][] = [];
  private depth = 4;
  private role = new Uint8Array(0);
  private ref = new Int16Array(0);
  private head = new Float32Array(0);
  private glow = new Float32Array(0);
  private fade = new Float32Array(0);
  private preview = new Float32Array(0);
  private flash = new Float32Array(0);
  private requests: Request[] = [];
  private nextId = 1;
  private hoverLeaf = -1;
  private lastEmit = -10;
  private lastUser = -10;
  private stats = { emitted: 0, completed: 0, dropped: 0 };
  private pt: [number, number] = [0, 0];

  layout(f: Field, fr: Frame) {
    const { w, h } = fr.visual;
    const branching = fr.compact ? [2, 2, 2, 2] : [3, 2, 2, 2];
    this.depth = branching.length;
    const cols = [0.02, 0.25, 0.48, 0.7, 0.9];
    const rand = mulberry32(11);

    // Build the tree top-down, then place leaves evenly and centre parents.
    const nodes: TreeNode[] = [
      { x: cols[0] * w, y: h / 2, depth: 0, parent: -1 },
    ];
    let level = [0];
    for (let d = 0; d < branching.length; d++) {
      const next: number[] = [];
      for (const parent of level) {
        for (let c = 0; c < branching[d]; c++) {
          nodes.push({
            x: (cols[d + 1] + (rand() - 0.5) * 0.02) * w,
            y: 0,
            depth: d + 1,
            parent,
          });
          next.push(nodes.length - 1);
        }
      }
      level = next;
    }
    const leaves = level;
    const gap = (h * 0.92) / Math.max(1, leaves.length - 1);
    leaves.forEach((id, k) => {
      nodes[id].y = h * 0.04 + k * gap + (rand() - 0.5) * gap * 0.3;
    });
    for (let d = this.depth - 1; d >= 1; d--) {
      for (const node of nodes) {
        if (node.depth !== d) continue;
        const id = nodes.indexOf(node);
        const kids = nodes.filter((n) => n.parent === id);
        node.y = kids.reduce((s, n) => s + n.y, 0) / kids.length;
        node.y += (rand() - 0.5) * gap * 0.6;
      }
    }

    const edges: Edge[] = [];
    const edgeOfChild = new Map<number, number>();
    nodes.forEach((node, id) => {
      if (node.parent < 0) return;
      const p = nodes[node.parent];
      edges.push({
        curve: sCurve(p.x, p.y, node.x, node.y, 0.5),
        depth: p.depth,
        child: id,
      });
      edgeOfChild.set(id, edges.length - 1);
    });
    this.paths = leaves.map((leaf) => {
      const path: number[] = [];
      let id = leaf;
      while (nodes[id].parent >= 0) {
        path.unshift(edgeOfChild.get(id) ?? 0);
        id = nodes[id].parent;
      }
      return path;
    });
    this.nodes = nodes;
    this.edges = edges;
    this.leaves = leaves;
    this.head = new Float32Array(edges.length);
    this.glow = new Float32Array(edges.length);
    this.fade = new Float32Array(edges.length);
    this.preview = new Float32Array(edges.length);
    this.flash = new Float32Array(leaves.length);

    // Particle roles: edges get most of the ink, weighted by length.
    this.role = new Uint8Array(f.n);
    this.ref = new Int16Array(f.n);
    const edgeN = Math.round(f.n * 0.6);
    const nodeN = Math.round(f.n * 0.05);
    const sprayN = Math.round(f.n * 0.17);
    const lengths = edges.map((e) => bezierLength(e.curve));
    const total = lengths.reduce((a, b) => a + b, 0);
    let e = 0;
    let acc = lengths[0];
    for (let i = 0; i < edgeN; i++) {
      const at = ((i + 0.5) / edgeN) * total;
      while (at > acc && e < edges.length - 1) acc += lengths[++e];
      this.role[i] = ROLE_EDGE;
      this.ref[i] = e;
    }
    for (let i = edgeN; i < edgeN + nodeN; i++) {
      this.role[i] = ROLE_NODE;
      this.ref[i] = (i - edgeN) % nodes.length;
    }
    for (let i = edgeN + nodeN; i < edgeN + nodeN + sprayN; i++) {
      this.role[i] = ROLE_SPRAY;
      this.ref[i] = (i - edgeN - nodeN) % leaves.length;
    }
  }

  leave() {
    this.hoverLeaf = -1;
  }

  private publish() {
    const inFlight = this.requests.filter(
      (r) => r.state === "flying" || r.state === "queued",
    ).length;
    dots.set({ stats: { ...this.stats, inFlight } });
  }

  private emit(leaf: number, time: number) {
    const op = dots.getSnapshot().operator;
    const live = this.requests.filter(
      (r) => r.state === "flying" || r.state === "queued",
    );
    const flying = live.filter((r) => r.state === "flying");
    if (op === "concatMap" && live.length >= 6) return;
    this.lastEmit = time;
    this.stats.emitted++;
    const request: Request = {
      id: this.nextId++,
      leaf,
      start: time,
      end: 0,
      state: "flying",
    };

    if (op === "switchMap") {
      for (const r of live) {
        r.state = "dropped";
        r.end = time;
        this.stats.dropped++;
      }
    } else if (op === "exhaustMap" && flying.length > 0) {
      request.state = "dropped";
      request.end = time;
      this.stats.dropped++;
    } else if (op === "concatMap" && live.length > 0) {
      request.state = "queued";
    } else if (op === "mergeMap" && flying.length >= 8) {
      const oldest = flying[0];
      oldest.state = "dropped";
      oldest.end = time;
      this.stats.dropped++;
    }
    this.requests.push(request);
    this.publish();
  }

  update(f: Field, fr: Frame) {
    const { time, pointer: p } = fr;
    const vx = fr.visual.x;
    const vy = fr.visual.y;
    const nodes = this.nodes;
    if (nodes.length === 0) return;

    // Pointer: the nearest leaf row under the cursor becomes the request target.
    const inside =
      p.active &&
      p.x > vx + nodes[0].x + 12 &&
      p.x < vx + fr.visual.w + 40 &&
      p.y > vy - 30 &&
      p.y < vy + fr.visual.h + 30;
    if (inside) {
      let best = -1;
      let bestD = Number.POSITIVE_INFINITY;
      for (let k = 0; k < this.leaves.length; k++) {
        const d = Math.abs(vy + nodes[this.leaves[k]].y - p.y);
        if (d < bestD) {
          bestD = d;
          best = k;
        }
      }
      if (best !== this.hoverLeaf && time - p.lastMove < 0.25) {
        this.hoverLeaf = best;
        if (time - this.lastEmit > 0.09) {
          this.emit(best, time);
          this.lastUser = time;
        }
      }
    } else {
      this.hoverLeaf = -1;
      if (
        !fr.reduced &&
        time - this.lastUser > 3 &&
        time - this.lastEmit > 1.7
      ) {
        this.emit(Math.floor(Math.random() * this.leaves.length), time);
      }
    }

    // Advance request lifecycles.
    let changed = false;
    const flying = this.requests.some((r) => r.state === "flying");
    if (!flying) {
      const queued = this.requests.find((r) => r.state === "queued");
      if (queued) {
        queued.state = "flying";
        queued.start = time;
      }
    }
    for (const r of this.requests) {
      if (r.state === "flying" && time - r.start >= DURATION) {
        r.state = "done";
        r.end = time;
        this.stats.completed++;
        changed = true;
      }
    }
    this.requests = this.requests.filter(
      (r) => r.state === "flying" || r.state === "queued" || time - r.end < 1.2,
    );
    if (changed) this.publish();

    // Light edges.
    const D = this.depth;
    this.head.fill(-1);
    this.glow.fill(0);
    this.fade.fill(0);
    this.preview.fill(0);
    this.flash.fill(0);
    for (const r of this.requests) {
      const path = this.paths[r.leaf];
      if (r.state === "flying") {
        const q = clamp((time - r.start) / DURATION);
        for (let d = 0; d < path.length; d++) {
          const local = clamp(q * D - d);
          if (local > 0) {
            this.head[path[d]] = Math.max(this.head[path[d]], local);
            this.glow[path[d]] = 1;
          }
        }
      } else if (r.state === "done") {
        const life = 1 - (time - r.end) / 1.2;
        for (const e of path) {
          this.head[e] = Math.max(this.head[e], 1);
          this.glow[e] = Math.max(this.glow[e], life);
        }
        this.flash[r.leaf] = Math.max(this.flash[r.leaf], life);
      } else if (r.state === "dropped") {
        const life = clamp(1 - (time - r.end) / 0.6);
        for (const e of path) this.fade[e] = Math.max(this.fade[e], life);
      }
    }
    if (this.hoverLeaf >= 0)
      for (const e of this.paths[this.hoverLeaf]) this.preview[e] = 1;

    // Place particles.
    const pt = this.pt;
    for (let i = 0; i < f.n; i++) {
      const role = this.role[i];
      if (role === ROLE_EDGE) {
        const e = this.ref[i];
        const edge = this.edges[e];
        const lit = this.glow[e];
        const drift = fr.reduced ? 0 : time * (lit > 0 ? 0.09 : 0.012);
        const t = (f.r0[i] + drift) % 1;
        bezierAt(edge.curve, t, pt);
        const onHead = this.head[e] >= 0 && t <= this.head[e];
        const fade = this.fade[e];
        f.gx[i] =
          vx + pt[0] + (f.r1[i] - 0.5) * 1.6 + (f.r2[i] - 0.5) * 16 * fade;
        f.gy[i] =
          vy +
          pt[1] +
          gauss(f.r1[i], f.r2[i]) * 0.9 +
          (f.r3[i] - 0.5) * 16 * fade;
        if (onHead && lit > 0) {
          f.gh[i] = lit;
          f.ga[i] = 0.55 + 0.45 * lit;
        } else {
          f.gh[i] = fade * 0.35;
          f.ga[i] =
            (0.3 + f.r3[i] * 0.25) * (1 - fade * 0.4) + this.preview[e] * 0.25;
        }
      } else if (role === ROLE_NODE) {
        const node = this.nodes[this.ref[i]];
        const radius = node.depth === 0 ? 4.5 : 2.6;
        const angle = f.r0[i] * TAU;
        f.gx[i] = vx + node.x + Math.cos(angle) * radius;
        f.gy[i] = vy + node.y + Math.sin(angle) * radius;
        f.ga[i] = 0.75;
        f.gh[i] = node.depth === 0 ? 1 : 0;
      } else if (role === ROLE_SPRAY) {
        const k = this.ref[i];
        const leaf = this.nodes[this.leaves[k]];
        const flash = this.flash[k];
        const reach = 18 + 30 * flash;
        f.gx[i] =
          vx +
          leaf.x +
          Math.abs(gauss(f.r1[i], f.r2[i])) * reach * (0.3 + f.r0[i]);
        f.gy[i] = vy + leaf.y + gauss(f.r2[i], f.r0[i]) * (3 + 5 * flash);
        f.ga[i] = 0.22 + 0.2 * f.r3[i] + 0.5 * flash;
        f.gh[i] = flash;
      } else {
        dust(f, i, fr, 0.14);
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, fr: Frame, palette: Palette) {
    const vx = fr.visual.x;
    const vy = fr.visual.y;
    const D = this.depth;
    const pt = this.pt;
    ctx.font = `10px ${palette.mono}`;
    ctx.textBaseline = "middle";
    for (const r of this.requests) {
      const path = this.paths[r.leaf];
      const leaf = this.nodes[this.leaves[r.leaf]];
      if (r.state === "flying") {
        const q = clamp((fr.time - r.start) / DURATION);
        const d = Math.min(D - 1, Math.floor(q * D));
        bezierAt(this.edges[path[d]].curve, clamp(q * D - d), pt);
        const x = vx + pt[0];
        const y = vy + pt[1];
        const g = ctx.createRadialGradient(x, y, 0, x, y, 14);
        g.addColorStop(0, rgba(palette.accent, 0.9));
        g.addColorStop(1, rgba(palette.accent, 0));
        ctx.fillStyle = g;
        ctx.fillRect(x - 14, y - 14, 28, 28);
      } else if (r.state === "done") {
        const life = clamp(1 - (fr.time - r.end) / 1.2);
        ctx.fillStyle = rgba(palette.accent, life);
        ctx.fillText(`200 · #${r.id}`, vx + leaf.x + 34, vy + leaf.y);
      } else if (r.state === "dropped") {
        const life = clamp(1 - (fr.time - r.end) / 0.9);
        ctx.fillStyle = rgba(palette.muted, life);
        ctx.fillText(`× #${r.id}`, vx + leaf.x + 34, vy + leaf.y);
      }
    }
    const root = this.nodes[0];
    if (root) {
      ctx.beginPath();
      ctx.arc(vx + root.x, vy + root.y, 9, 0, TAU);
      ctx.strokeStyle = rgba(palette.accent, 0.55);
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
}
