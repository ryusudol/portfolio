import { clamp, mulberry32, rgba, smoothstep, TAU } from "../math";
import { dust } from "../shapes";
import type { Field, Frame, Palette, RGB, Scene } from "../types";

type Cluster = {
  label: string;
  x: number;
  y: number;
  sx: number;
  sy: number;
  cos: number;
  sin: number;
};

/** CIFAR-10, alphabetical, each with its Tableau 10 colour. */
const CLASSES: [number, number, string, RGB][] = [
  [0.14, 0.2, "airplane", [78, 121, 167]],
  [0.4, 0.1, "automobile", [242, 142, 43]],
  [0.7, 0.14, "bird", [225, 87, 89]],
  [0.52, 0.47, "cat", [118, 183, 178]],
  [0.9, 0.36, "deer", [89, 161, 79]],
  [0.2, 0.56, "dog", [237, 201, 72]],
  [0.86, 0.7, "frog", [176, 122, 161]],
  [0.34, 0.86, "horse", [255, 157, 167]],
  [0.66, 0.88, "ship", [156, 117, 95]],
  [0.08, 0.88, "truck", [186, 176, 172]],
];
const FORGET = 3;
const FORGET_POINTS = 200;
const START = 0.2;

/**
 * A UMAP-like embedding of 2,000 activations across ten classes, coloured by
 * label. Scrolling unlearns one class: its points leave their cluster,
 * scatter into the others, and take on their colours, while the rest of the
 * embedding stays put — the
 * question the Machine Unlearning Comparator answers.
 */
export class UnlearningScene implements Scene {
  private clusters: Cluster[] = [];
  private clusterN = 0;
  /** Where each forgotten point ends up, weighted toward nearby classes. */
  private destinations: number[] = [];
  private hover = -1;
  private remaining = -1;
  private counter: HTMLElement | null = null;
  private progress = 0;

  layout(f: Field, fr: Frame) {
    const { w, h } = fr.visual;
    const base = Math.min(w, h) * (fr.compact ? 0.06 : 0.05);
    const rand = mulberry32(5);
    this.clusters = CLASSES.map(([u, v, label]) => {
      const angle = rand() * Math.PI;
      return {
        label,
        x: u * w,
        y: v * h,
        sx: base * (0.8 + rand() * 0.5),
        sy: base * (0.5 + rand() * 0.35),
        cos: Math.cos(angle),
        sin: Math.sin(angle),
      };
    });
    const [fu, fv] = CLASSES[FORGET];
    this.destinations = [];
    CLASSES.forEach(([u, v], k) => {
      if (k === FORGET) return;
      const share = Math.round(6 / (Math.hypot(u - fu, v - fv) + 0.2));
      for (let s = 0; s < share; s++) this.destinations.push(k);
    });
    f.classColors = CLASSES.map((c) => c[3]);
    this.clusterN = Math.round(f.n * 0.86);
    this.counter = fr.section.querySelector<HTMLElement>(
      '[data-counter="forget"]',
    );
    this.remaining = -1;
  }

  private position(
    f: Field,
    i: number,
    c: Cluster,
    out: [number, number],
    spread = 1,
  ) {
    // Independent 2-D Gaussian (Box–Muller pair) so blobs aren't streaked.
    const outlier = f.r3[i] < 0.08 ? 2.2 : 1;
    const radius =
      Math.sqrt(-2 * Math.log(Math.max(f.r1[i], 1e-6))) * outlier * spread;
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
    this.progress = smoothstep(START, 0.92, p);
    const forget = clusters[FORGET];

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
    const to: [number, number] = [0, 0];
    let stayed = 0;
    let total = 0;
    for (let i = 0; i < f.n; i++) {
      if (i >= this.clusterN) {
        dust(f, i, fr, 0.12);
        continue;
      }
      const k = i % clusters.length;
      this.position(f, i, clusters[k], pos);
      f.gc[i] = k + 1;
      f.gh[i] = 0;
      const lift = this.hover === k ? 1.35 : 1;

      if (k !== FORGET) {
        f.gx[i] = vx + pos[0];
        f.gy[i] = vy + pos[1];
        f.ga[i] = Math.min(1, (0.42 + f.r3[i] * 0.4) * lift);
        continue;
      }

      // A few points resist unlearning and stay behind.
      total++;
      const f0 = f.r0[i];
      // (r1 near 1 = a small Gaussian radius, so they hold the cluster's core.)
      if (f.r1[i] > 0.94) {
        f.gx[i] = vx + pos[0];
        f.gy[i] = vy + pos[1];
        f.ga[i] = 0.55 + 0.4 * f.r3[i];
        stayed++;
        continue;
      }
      const dest = this.destinations[Math.floor(f0 * this.destinations.length)];
      this.position(f, i, clusters[dest], to, 1.25);
      const leaveAt = 0.36 + f.r3[i] * 0.54;
      const e = clamp((p - START) / (leaveAt - START));
      const eased = e * e * (3 - 2 * e);
      // Travel on a gentle arc rather than a straight line.
      const dx = to[0] - pos[0];
      const dy = to[1] - pos[1];
      const bend = Math.sin(Math.PI * eased) * (f.r1[i] - 0.5) * 0.5;
      f.gx[i] = vx + pos[0] + dx * eased - dy * bend;
      f.gy[i] = vy + pos[1] + dy * eased + dx * bend;
      // Once past halfway, the point takes on the class it now sits in.
      if (eased > 0.5) f.gc[i] = dest + 1;
      f.ga[i] = 0.6 + 0.35 * f.r3[i];
      if (e < 0.5) stayed++;
    }

    const remaining = Math.round((FORGET_POINTS * stayed) / Math.max(1, total));
    if (remaining !== this.remaining && this.counter) {
      this.remaining = remaining;
      this.counter.textContent = remaining.toLocaleString("en-US");
    }
    fr.section.style.setProperty("--cx", `${forget.x.toFixed(1)}px`);
    fr.section.style.setProperty("--cy", `${forget.y.toFixed(1)}px`);
    fr.section.style.setProperty("--collapse", this.progress.toFixed(3));
  }

  draw(ctx: CanvasRenderingContext2D, fr: Frame, palette: Palette) {
    const vx = fr.visual.x;
    const vy = fr.visual.y;
    const s = this.progress;
    ctx.font = `10px ${palette.mono}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    this.clusters.forEach((c, k) => {
      const forget = k === FORGET;
      let alpha = this.hover === k ? 1 : 0.7;
      if (forget) alpha *= 1 - smoothstep(0.05, 0.25, s);
      if (alpha <= 0.01) return;
      ctx.fillStyle = rgba(CLASSES[k][3], alpha);
      const label = forget ? `${c.label} · forget` : c.label;
      ctx.fillText(label, vx + c.x, vy + c.y + c.sy * 2.4 + 6);
    });
    ctx.textAlign = "start";
  }
}
