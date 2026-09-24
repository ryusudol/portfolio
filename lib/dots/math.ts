import type { RGB } from "./types";

export const TAU = Math.PI * 2;

export const clamp = (v: number, lo = 0, hi = 1) =>
  v < lo ? lo : v > hi ? hi : v;

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const smoothstep = (e0: number, e1: number, v: number) => {
  const t = clamp((v - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};

export const easeInOut = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;

/** Deterministic Gaussian from two uniform seeds (Box–Muller). */
export const gauss = (u: number, v: number) =>
  Math.sqrt(-2 * Math.log(Math.max(u, 1e-6))) * Math.cos(TAU * v);

/** Small deterministic PRNG so layouts stay identical between visits. */
export function mulberry32(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Bezier = {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  x3: number;
  y3: number;
};

/** Horizontal S-curve between two points, like a node-link diagram edge. */
export function sCurve(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  bend = 0.5,
): Bezier {
  const mx = ax + (bx - ax) * bend;
  return { x0: ax, y0: ay, x1: mx, y1: ay, x2: mx, y2: by, x3: bx, y3: by };
}

export function bezierAt(b: Bezier, t: number, out: [number, number]) {
  const u = 1 - t;
  const uu = u * u;
  const tt = t * t;
  out[0] =
    uu * u * b.x0 + 3 * uu * t * b.x1 + 3 * u * tt * b.x2 + tt * t * b.x3;
  out[1] =
    uu * u * b.y0 + 3 * uu * t * b.y1 + 3 * u * tt * b.y2 + tt * t * b.y3;
  return out;
}

export function bezierLength(b: Bezier, steps = 16) {
  const p: [number, number] = [0, 0];
  let len = 0;
  let px = b.x0;
  let py = b.y0;
  for (let i = 1; i <= steps; i++) {
    bezierAt(b, i / steps, p);
    len += Math.hypot(p[0] - px, p[1] - py);
    px = p[0];
    py = p[1];
  }
  return len;
}

export function parseColor(input: string, fallback: RGB): RGB {
  const s = input.trim();
  if (s.startsWith("#")) {
    const hex =
      s.length === 4
        ? s
            .slice(1)
            .split("")
            .map((c) => c + c)
            .join("")
        : s.slice(1, 7);
    const n = Number.parseInt(hex, 16);
    if (Number.isNaN(n)) return fallback;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const m = s.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const [r, g, b] = m[1].split(/[\s,/]+/).map(Number);
    if ([r, g, b].every((v) => Number.isFinite(v))) return [r, g, b];
  }
  return fallback;
}

export const mix = (a: RGB, b: RGB, t: number): RGB => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

export const rgba = (c: RGB, alpha: number) =>
  `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${alpha.toFixed(3)})`;
