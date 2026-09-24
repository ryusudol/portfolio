import { clamp, mulberry32, rgba, smoothstep, TAU } from "../math";
import { dust } from "../shapes";
import type { Field, Frame, Palette, Scene } from "../types";

type Cluster = {
  u: number;
  v: number;
  label: string;
  x: number;
  y: number;
  sx: number;
  sy: number;
  cos: number;
  sin: number;
};

const CLASSES: [number, number, string][] = [
  [0.14, 0.2, "airplane"],
  [0.4, 0.1, "automobile"],
  [0.7, 0.14, "bird"],
  [0.9, 0.36, "deer"],
  [0.16, 0.56, "dog"],
  [0.52, 0.47, "cat"],
  [0.86, 0.7, "frog"],
  [0.34, 0.86, "horse"],
  [0.66, 0.88, "ship"],
  [0.08, 0.88, "truck"],
];
const FORGET = 5;
const FORGET_POINTS = 200;
const START = 0.2;

/**
 * A UMAP-like embedding of 2,000 activations across ten classes. Scrolling
 * unlearns one class: its points spiral into a singularity while the rest of
 * the embedding barely moves — the question the Unlearning Comparator answers.
 */
export class UnlearningScene implements Scene {
  private clusters: Cluster[] = [];
  private clusterN = 0;
  private phase = new Float32Array(0);
  private hover = -1;
  private remaining = -1;
  private core = { x: 0, y: 0 };
  private counter: HTMLElement | null = null;
  private collapse = 0;

  layout(f: Field, fr: Frame) {
    const { w, h } = fr.visual;
    const base = Math.min(w, h) * (fr.compact ? 0.06 : 0.05);
    const rand = mulberry32(5);
    this.clusters = CLASSES.map(([u, v, label]) => {
      const angle = rand() * Math.PI;
      return {
        u,
        v,
        label,
        x: u * w,
        y: v * h,
        sx: base * (0.8 + rand() * 0.5),
        sy: base * (0.5 + rand() * 0.35),
        cos: Math.cos(angle),
        sin: Math.sin(angle),
      };
    });
    this.clusterN = Math.round(f.n * 0.86);
    if (this.phase.length !== f.n) this.phase = new Float32Array(f.n);
    this.counter = fr.section.querySelector<HTMLElement>(
      '[data-counter="forget"]',
    );
    this.remaining = -1;
  }

  private position(f: Field, i: number, c: Cluster, out: [number, number]) {
    // Independent 2-D Gaussian (Box–Muller pair) so blobs aren't streaked.
    const outlier = f.r3[i] < 0.08 ? 2.2 : 1;
    const radius = Math.sqrt(-2 * Math.log(Math.max(f.r1[i], 1e-6))) * outlier;
    const gx = radius * Math.cos(TAU * f.r2[i]) * c.sx;
    const gy = radius * Math.sin(TAU * f.r2[i]) * c.sy;
    out[0] = c.x + gx * c.cos - gy * c.sin;
    out[1] = c.y + gx * c.sin + gy * c.cos;
    return out;
  }

  update(f: Field, fr: Frame) {
    const vx = fr.visual.x;
    const vy = fr.visual.y;
    const clusters = this.clusters;
    if (clusters.length === 0) return;
    const p = fr.progress;
    const s = smoothstep(START, 0.92, p);
    this.collapse = s;
    const forget = clusters[FORGET];
    const cx = forget.x;
    const cy = forget.y;
    this.core.x = vx + cx;
    this.core.y = vy + cy;

    // Hovered cluster (like a D3 hover, but on 8,000 dots).
    const ptr = fr.pointer;
    this.hover = -1;
    if (ptr.active) {
      let best = 90;
      clusters.forEach((c, k) => {
        const d = Math.hypot(vx + c.x - ptr.x, vy + c.y - ptr.y);
        if (d < best) {
          best = d;
          this.hover = k;
        }
      });
    }

    const pos: [number, number] = [0, 0];
    let alive = 0;
    let total = 0;
    for (let i = 0; i < f.n; i++) {
      if (i >= this.clusterN) {
        dust(f, i, fr, 0.12);
        continue;
      }
      const k = i % clusters.length;
      const c = clusters[k];
      this.position(f, i, c, pos);
      const hovered = this.hover === k;

      if (k !== FORGET) {
        // Everything else only feels a faint gravitational tug.
        const pull = s * 0.06;
        f.gx[i] = vx + pos[0] + (cx - pos[0]) * pull;
        f.gy[i] = vy + pos[1] + (cy - pos[1]) * pull;
        f.ga[i] = (0.32 + f.r3[i] * 0.4) * (hovered ? 1.6 : 1) * (1 - s * 0.2);
        f.gh[i] = 0;
        continue;
      }

      total++;
      const survivor = f.r2[i] < 0.07;
      const absorbAt = 0.36 + f.r3[i] * 0.54;
      const e = clamp((p - START) / (absorbAt - START));
      const dx = pos[0] - cx;
      const dy = pos[1] - cy;
      const r0 = Math.hypot(dx, dy) + 18;
      const eased = e * e * (3 - 2 * e);
      const ring = survivor ? 16 + f.r1[i] * 5 : 0;
      const radius = r0 + (ring - r0) * eased;
      if (p > START && !fr.reduced) {
        this.phase[i] += fr.dt * (0.35 + 70 / (radius + 14));
      }
      const base = Math.atan2(dy, dx);
      const angle = base + this.phase[i];
      const tilt = 0.36 + (1 - eased) * 0.64;
      const orbitX = cx + Math.cos(angle) * radius;
      const orbitY = cy + Math.sin(angle) * radius * tilt;
      const mixIn = smoothstep(0, 0.12, e);
      f.gx[i] = vx + pos[0] + (orbitX - pos[0]) * mixIn;
      f.gy[i] = vy + pos[1] + (orbitY - pos[1]) * mixIn;
      const absorbed = !survivor && e >= 1;
      f.ga[i] = absorbed ? 0 : 0.5 + 0.5 * f.r3[i];
      f.gh[i] = 0.55 + 0.45 * eased;
      if (e < 1) alive++;
    }

    const remaining = Math.round((FORGET_POINTS * alive) / Math.max(1, total));
    if (remaining !== this.remaining && this.counter) {
      this.remaining = remaining;
      this.counter.textContent = remaining.toLocaleString("en-US");
    }
    fr.section.style.setProperty("--cx", `${cx.toFixed(1)}px`);
    fr.section.style.setProperty("--cy", `${cy.toFixed(1)}px`);
    fr.section.style.setProperty("--collapse", s.toFixed(3));
  }

  draw(ctx: CanvasRenderingContext2D, fr: Frame, palette: Palette) {
    const vx = fr.visual.x;
    const vy = fr.visual.y;
    const s = this.collapse;
    ctx.font = `10px ${palette.mono}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    this.clusters.forEach((c, k) => {
      const forget = k === FORGET;
      let alpha = this.hover === k ? 0.95 : 0.42;
      if (forget) alpha = 0.9 * (1 - smoothstep(0.05, 0.25, s));
      if (alpha <= 0.01) return;
      ctx.fillStyle = rgba(forget ? palette.accent : palette.muted, alpha);
      const label = forget ? `${c.label} · forget` : c.label;
      ctx.fillText(label, vx + c.x, vy + c.y + c.sy * 2.4 + 6);
    });
    ctx.textAlign = "start";

    if (s > 0.001) {
      const { x, y } = this.core;
      const radius = 10 + 34 * s;
      const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
      g.addColorStop(
        0,
        rgba(palette.ink ? [255, 246, 236] : palette.accent, 0.95 * s),
      );
      g.addColorStop(0.25, rgba(palette.accent, 0.55 * s));
      g.addColorStop(1, rgba(palette.accent, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, TAU);
      ctx.fill();
    }
  }
}
