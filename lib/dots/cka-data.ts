import { clamp, mix, mulberry32 } from "./math";
import type { RGB } from "./types";

/** ResNet-18's layers: stem, four stages of four convs, and the classifier. */
export const LAYERS = 18;

/** Matplotlib's inferno, sampled at t = 0, 0.1, …, 1. */
const INFERNO: RGB[] = [
  [0, 0, 4],
  [22, 11, 57],
  [66, 10, 104],
  [106, 23, 110],
  [147, 38, 103],
  [188, 55, 84],
  [221, 81, 58],
  [243, 120, 25],
  [252, 165, 10],
  [246, 215, 70],
  [252, 255, 164],
];

export const inferno = (t: number): RGB => {
  const x = clamp(t) * (INFERNO.length - 1);
  const k = Math.min(INFERNO.length - 2, Math.floor(x));
  return mix(INFERNO[k], INFERNO[k + 1], x - k);
};

/** Color steps; the engine draws at most ten classes. */
export const STEPS = 10;
const ramp = (from: number, to: number) =>
  Array.from({ length: STEPS }, (_, k) =>
    inferno(from + ((to - from) * k) / (STEPS - 1)),
  );
/**
 * Inferno's ends vanish into the page (near-black on ink, pale yellow on
 * paper), so each theme uses the slice that stays visible on it.
 */
export const INK_RAMP = ramp(0.36, 1);
export const PAPER_RAMP = ramp(0, 0.74);

/** 1-based class index into the ramp for a similarity in [0.03, 0.95]. */
export const rampClass = (v: number, dither: number) => {
  const t = clamp((v - 0.03) / 0.92 + (dither - 0.5) * 0.12);
  return 1 + Math.min(STEPS - 1, Math.floor(t * STEPS));
};

/**
 * Relative layer-by-layer CKA for ResNet-18 on CIFAR-10 (0 = least similar
 * pair, 1 = a layer with itself), traced from a real run. Row 0 is `conv1`,
 * row 17 is `fc`. Each stage's layers agree with one another, and early layers
 * share little with the deepest ones.
 */
// biome-ignore format: one row per layer keeps the grid readable
const TRACED = [
  [1.00, 0.52, 0.71, 0.43, 0.40, 0.37, 0.24, 0.27, 0.14, 0.24, 0.18, 0.09, 0.01, 0.08, 0.00, 0.10, 0.05, 0.00],
  [0.52, 1.00, 0.87, 0.83, 0.46, 0.49, 0.49, 0.51, 0.33, 0.44, 0.32, 0.25, 0.11, 0.22, 0.14, 0.18, 0.15, 0.06],
  [0.71, 0.87, 1.00, 0.68, 0.53, 0.56, 0.48, 0.53, 0.34, 0.43, 0.32, 0.23, 0.10, 0.21, 0.10, 0.19, 0.14, 0.05],
  [0.43, 0.83, 0.68, 1.00, 0.69, 0.70, 0.60, 0.61, 0.43, 0.53, 0.44, 0.32, 0.19, 0.29, 0.19, 0.26, 0.26, 0.21],
  [0.40, 0.46, 0.53, 0.69, 1.00, 0.70, 0.51, 0.55, 0.39, 0.46, 0.34, 0.23, 0.13, 0.21, 0.11, 0.18, 0.16, 0.09],
  [0.37, 0.49, 0.56, 0.70, 0.70, 1.00, 0.61, 0.59, 0.40, 0.35, 0.21, 0.17, 0.06, 0.14, 0.05, 0.06, 0.05, 0.01],
  [0.24, 0.49, 0.48, 0.60, 0.51, 0.61, 1.00, 0.88, 0.61, 0.63, 0.48, 0.46, 0.26, 0.36, 0.26, 0.22, 0.21, 0.14],
  [0.27, 0.51, 0.53, 0.61, 0.55, 0.59, 0.88, 1.00, 0.83, 0.69, 0.50, 0.47, 0.28, 0.36, 0.24, 0.22, 0.21, 0.15],
  [0.14, 0.33, 0.34, 0.43, 0.39, 0.40, 0.61, 0.83, 1.00, 0.65, 0.48, 0.49, 0.34, 0.36, 0.26, 0.20, 0.19, 0.10],
  [0.24, 0.44, 0.43, 0.53, 0.46, 0.35, 0.63, 0.69, 0.65, 1.00, 0.90, 0.71, 0.48, 0.63, 0.46, 0.49, 0.46, 0.34],
  [0.18, 0.32, 0.32, 0.44, 0.34, 0.21, 0.48, 0.50, 0.48, 0.90, 1.00, 0.85, 0.55, 0.83, 0.58, 0.66, 0.62, 0.49],
  [0.09, 0.25, 0.23, 0.32, 0.23, 0.17, 0.46, 0.47, 0.49, 0.71, 0.85, 1.00, 0.83, 0.86, 0.65, 0.57, 0.54, 0.42],
  [0.01, 0.11, 0.10, 0.19, 0.13, 0.06, 0.26, 0.28, 0.34, 0.48, 0.55, 0.83, 1.00, 0.69, 0.65, 0.49, 0.49, 0.37],
  [0.08, 0.22, 0.21, 0.29, 0.21, 0.14, 0.36, 0.36, 0.36, 0.63, 0.83, 0.86, 0.69, 1.00, 0.91, 0.71, 0.65, 0.54],
  [0.00, 0.14, 0.10, 0.19, 0.11, 0.05, 0.26, 0.24, 0.26, 0.46, 0.58, 0.65, 0.65, 0.91, 1.00, 0.69, 0.65, 0.53],
  [0.10, 0.18, 0.19, 0.26, 0.18, 0.06, 0.22, 0.22, 0.20, 0.49, 0.66, 0.57, 0.49, 0.71, 0.69, 1.00, 0.90, 0.65],
  [0.05, 0.15, 0.14, 0.26, 0.16, 0.05, 0.21, 0.21, 0.19, 0.46, 0.62, 0.54, 0.49, 0.65, 0.65, 0.90, 1.00, 0.88],
  [0.00, 0.06, 0.05, 0.21, 0.09, 0.01, 0.14, 0.15, 0.10, 0.34, 0.49, 0.42, 0.37, 0.54, 0.53, 0.65, 0.88, 1.00],
];

/**
 * Maps the traced map onto the drawn scale, with slight per-cell jitter so the
 * two networks' maps are not a perfect mirror image of each other.
 */
export function similarity() {
  const rand = mulberry32(18);
  const values = new Float32Array(LAYERS * LAYERS);
  for (let a = 0; a < LAYERS; a++) {
    for (let b = 0; b < LAYERS; b++) {
      const v = 0.05 + TRACED[a][b] * 0.88 + (rand() - 0.5) * 0.04;
      values[a * LAYERS + b] = clamp(v, 0.03, 0.95);
    }
  }
  return values;
}

/**
 * Assigns `count` particles to cells so denser cells hold more of them, which
 * lets density read as value. Returns each particle's cell.
 */
export function shareByValue(values: Float32Array, count: number) {
  const cells = values.length;
  const cumulative = new Float32Array(cells);
  let total = 0;
  for (let c = 0; c < cells; c++) {
    total += 0.35 + values[c] ** 1.2;
    cumulative[c] = total;
  }
  const cellOf = new Uint16Array(count);
  let c = 0;
  for (let i = 0; i < count; i++) {
    const t = ((i + 0.5) / count) * total;
    while (c < cells - 1 && cumulative[c] < t) c++;
    cellOf[i] = c;
  }
  return cellOf;
}
