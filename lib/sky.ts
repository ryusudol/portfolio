import { mix, mulberry32, smoothstep, TAU } from "./dots/math";
import type { RGB } from "./dots/types";

/**
 * The sky is planned once on a fixed field (CSS pixels) and the viewport is a
 * window onto its middle, so resizing uncovers more of the same sky instead
 * of reshuffling it, and every visit sees the same stars.
 */
const FIELD_W = 3600;
const FIELD_H = 2400;
const SEED = 20261110;
/** CSS pixels per pixel of the buffer the nebula is computed in. */
const CLOUD_SCALE = 4;

/** The galactic band: a line through this point of the field, rising rightward. */
const BAND_X = FIELD_W * 0.56;
const BAND_Y = FIELD_H * 0.47;
const BAND_ANGLE = -0.47;
const BAND_COS = Math.cos(BAND_ANGLE);
const BAND_SIN = Math.sin(BAND_ANGLE);
const BAND_WIDTH = 300;

type Star = {
  x: number;
  y: number;
  /** 0..1; most stars are faint, a few are bright. */
  bright: number;
  /** 0 (blue-white) .. 1 (warm). */
  warmth: number;
};

type Sky = {
  fbm: (x: number, y: number, octaves?: number, gain?: number) => number;
  stars: Star[];
  /** Unresolved stars crowding the band: smaller and fainter than the rest. */
  haze: Star[];
  beacons: Star[];
};

type Tones = {
  /** Nebula colors: the body of the clouds, two it shifts toward, and the core. */
  deep: RGB;
  light: RGB;
  patch: RGB;
  core: RGB;
  /** How strongly the nebula is laid on. */
  cloud: number;
  /** Star colors from cool to warm. */
  cool: RGB;
  white: RGB;
  warm: RGB;
  /** How strongly stars are drawn. */
  star: number;
  /** What the corners of the view fall off toward, and how far. */
  edge: RGB;
  falloff: number;
};

/** At night the nebula is light added to the dark. */
const NIGHT: Tones = {
  deep: [26, 44, 150],
  light: [24, 96, 176],
  patch: [62, 52, 168],
  core: [210, 120, 66],
  cloud: 0.26,
  cool: [196, 214, 255],
  white: [240, 244, 255],
  warm: [255, 222, 188],
  star: 1,
  edge: [1, 2, 6],
  falloff: 0.55,
};

/**
 * On the light theme the sky is a printed star chart: stars are dark specks
 * and the nebula a pale wash of ink taken out of the paper.
 */
const CHART: Tones = {
  deep: [150, 96, 60],
  light: [130, 88, 40],
  patch: [96, 130, 60],
  core: [20, 70, 120],
  cloud: 0.085,
  cool: [22, 34, 66],
  white: [18, 26, 48],
  warm: [70, 40, 26],
  star: 0.62,
  edge: [196, 204, 220],
  falloff: 0.5,
};

function makeFbm(seed: number) {
  const rand = mulberry32(seed);
  const lattice = new Float32Array(256 * 256);
  for (let i = 0; i < lattice.length; i++) lattice[i] = rand();
  const at = (x: number, y: number) => lattice[((y & 255) << 8) | (x & 255)];
  const noise = (x: number, y: number) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const fx = x - xi;
    const fy = y - yi;
    const u = fx * fx * (3 - 2 * fx);
    const v = fy * fy * (3 - 2 * fy);
    const a = at(xi, yi);
    const b = at(xi + 1, yi);
    const c = at(xi, yi + 1);
    const d = at(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  return (x: number, y: number, octaves = 5, gain = 0.5) => {
    let sum = 0;
    let amp = 0.5;
    let norm = 0;
    for (let o = 0; o < octaves; o++) {
      sum += noise(x, y) * amp;
      norm += amp;
      // Each octave is turned as well as doubled, which hides the lattice.
      const turned = x * 1.62 + y * 1.21 + 17.1;
      y = y * 1.62 - x * 1.21 + 9.7;
      x = turned;
      amp *= gain;
    }
    return sum / norm;
  };
}

/** How deep inside the galactic band a point of the field lies, 0..1. */
function band(x: number, y: number) {
  const across = -(x - BAND_X) * BAND_SIN + (y - BAND_Y) * BAND_COS;
  const d = across / BAND_WIDTH;
  return Math.exp(-d * d);
}

/**
 * How far a point of the view has fallen off toward its corners, 0..1: a
 * vignette, so the middle of the sky is where the light is.
 */
function falloff(x: number, y: number, width: number, height: number) {
  const dx = (x - width * 0.5) / (width * 1.2);
  const dy = (y - height * 0.46) / (height * 1.05);
  const t = (Math.sqrt(dx * dx + dy * dy) - 0.52) / 0.48;
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

let sky: Sky | null = null;

function plan(): Sky {
  if (sky) return sky;
  const rand = mulberry32(SEED);
  const fbm = makeFbm(SEED + 1);
  const stars: Star[] = [];
  const count = Math.round((FIELD_W * FIELD_H) / 1500);
  for (let i = 0; i < count; i++) {
    stars.push({
      x: rand() * FIELD_W,
      y: rand() * FIELD_H,
      bright: rand() ** 3.4,
      warmth: rand(),
    });
  }
  const haze: Star[] = [];
  for (let i = 0; i < 26000; i++) {
    const x = rand() * FIELD_W;
    const y = rand() * FIELD_H;
    // Clumped: the band is dense where the clouds are, thin between them.
    const clump = smoothstep(0.38, 0.66, fbm(x * 0.003 + 40, y * 0.003 + 80));
    if (rand() > band(x, y) * (0.25 + 0.75 * clump)) continue;
    haze.push({ x, y, bright: rand() ** 2, warmth: rand() });
  }
  const beacons: Star[] = [];
  for (let i = 0; i < 16; i++) {
    beacons.push({
      x: rand() * FIELD_W,
      y: rand() * FIELD_H,
      bright: 0.45 + rand() * 0.55,
      warmth: rand(),
    });
  }
  sky = { fbm, stars, haze, beacons };
  return sky;
}

const css = (c: RGB, a: number) =>
  `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a.toFixed(3)})`;

function starColor(tones: Tones, warmth: number): RGB {
  return warmth < 0.55
    ? mix(tones.cool, tones.white, warmth / 0.55)
    : mix(tones.white, tones.warm, ((warmth - 0.55) / 0.45) ** 2);
}

/**
 * The nebula: clouds along the galactic band, pulled into wisps, cut by dust
 * lanes, warm at the core. It is computed on a coarse grid in floating point
 * and interpolated up to one sample per CSS pixel, with a little noise added
 * before each value is rounded to eight bits. Without that the faint
 * gradients band into steps, and the coarse grid shows through as a mesh.
 */
function paintClouds(
  ctx: CanvasRenderingContext2D,
  s: Sky,
  tones: Tones,
  ground: RGB,
  ink: boolean,
  width: number,
  height: number,
  left: number,
  top: number,
  zoom: number,
) {
  const lw = Math.ceil(width / CLOUD_SCALE) + 2;
  const lh = Math.ceil(height / CLOUD_SCALE) + 2;
  const grid = new Float32Array(lw * lh * 3);
  const { fbm } = s;
  // By night the colors are light added to the ground; on the chart they are
  // ink taken away from it.
  const sign = ink ? 1 : -1;
  for (let j = 0; j < lh; j++) {
    for (let i = 0; i < lw; i++) {
      const x = (i * CLOUD_SCALE - left) / zoom;
      const y = (j * CLOUD_SCALE - top) / zoom;
      // Band coordinates: `a` runs along the band, `c` across it. Everything
      // below is sampled stretched along `a`, so clouds and rifts streak the
      // way the band runs.
      const a = (x - BAND_X) * BAND_COS + (y - BAND_Y) * BAND_SIN;
      const c = -(x - BAND_X) * BAND_SIN + (y - BAND_Y) * BAND_COS;
      const wide = BAND_WIDTH * (0.7 + 0.7 * fbm(a * 0.0006 + 5, 0.5, 2));
      const inBand = Math.exp(-((c / wide) ** 2));
      // Warping the lookup by two other fields pulls the clouds into wisps.
      const wx = fbm(a * 0.0008, c * 0.0014, 3) - 0.5;
      const wy = fbm(a * 0.0008 + 77, c * 0.0014 + 33, 3) - 0.5;
      const n = fbm(a * 0.0012 + wx * 2.6, c * 0.0026 + wy * 2.6, 6, 0.58);
      const body = smoothstep(0.36, 0.7, n);
      const ridge =
        1 - Math.abs(2 * fbm(a * 0.002 + wx * 4, c * 0.0044 + wy * 4, 5) - 1);
      const wisp = ridge * ridge * ridge;
      // Dust lanes: long dark rifts through the middle of the band.
      const lane = smoothstep(
        0.5,
        0.61,
        fbm(a * 0.0015 + 31 + wy * 1.6, c * 0.005 + 7 + wx * 1.6, 5, 0.56),
      );
      const core = Math.exp(-(((a - 240) / 600) ** 2) - (c / 200) ** 2);
      let density =
        inBand * (0.16 + 0.8 * body + 0.8 * body * wisp) +
        (1 - inBand) * body * wisp * 0.14;
      density *= 1 - 0.86 * lane * smoothstep(0.15, 0.8, inBand);
      const hue = fbm(a * 0.0009 + 51, c * 0.0012 + 13, 3);
      let color = mix(tones.deep, tones.light, smoothstep(0.4, 0.6, hue));
      const patch = smoothstep(0.52, 0.66, fbm(a * 0.0011 + 90, c * 0.0016, 3));
      color = mix(color, tones.patch, patch * 0.45);
      const glow = core * (0.16 + 0.5 * body) * (1 - 0.7 * lane);
      const fade =
        falloff(i * CLOUD_SCALE, j * CLOUD_SCALE, width, height) *
        tones.falloff;
      const k = (j * lw + i) * 3;
      for (let ch = 0; ch < 3; ch++) {
        const add = (color[ch] * density + tones.core[ch] * glow) * tones.cloud;
        const lit = ground[ch] + sign * add;
        grid[k + ch] = lit + (tones.edge[ch] - lit) * fade;
      }
    }
  }

  const buffer = document.createElement("canvas");
  buffer.width = width;
  buffer.height = height;
  const g = buffer.getContext("2d");
  if (!g) return;
  const image = g.createImageData(width, height);
  const data = image.data;
  // Two grid rows blended for the current line, then blended across.
  const line = new Float32Array(lw * 3);
  let seed = SEED;
  for (let y = 0; y < height; y++) {
    const gy = y / CLOUD_SCALE;
    const j = Math.floor(gy);
    const ty = gy - j;
    const upper = j * lw * 3;
    const lower = upper + lw * 3;
    for (let k = 0; k < lw * 3; k++) {
      line[k] = grid[upper + k] + (grid[lower + k] - grid[upper + k]) * ty;
    }
    let k = y * width * 4;
    for (let x = 0; x < width; x++) {
      const gx = x / CLOUD_SCALE;
      const i = Math.floor(gx);
      const tx = gx - i;
      const at = i * 3;
      // The same noise on all three channels: grain, not colored speckle.
      seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
      const noise = (seed >>> 8) / 8388608 - 1;
      data[k] = line[at] + (line[at + 3] - line[at]) * tx + noise;
      data[k + 1] = line[at + 1] + (line[at + 4] - line[at + 1]) * tx + noise;
      data[k + 2] = line[at + 2] + (line[at + 5] - line[at + 2]) * tx + noise;
      data[k + 3] = 255;
      k += 4;
    }
  }
  g.putImageData(image, 0, 0);
  ctx.drawImage(buffer, 0, 0, width, height);
}

/**
 * Paints the far sky onto `canvas`: a faint nebula along a galactic band, a
 * few thousand fixed stars, and a handful of bright ones with a glow. It is
 * drawn once per size and theme, never per frame; everything that moves on
 * the page is the particle engine's.
 */
export function paintSky(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  dpr: number,
  ink: boolean,
  /** The page color the sky is painted onto. */
  ground: RGB,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const s = plan();
  const tones = ink ? NIGHT : CHART;
  // The field covers any ordinary screen; a larger one zooms it to fit.
  const zoom = Math.max(1, width / FIELD_W, height / FIELD_H);
  const left = (width - FIELD_W * zoom) / 2;
  const top = (height - FIELD_H * zoom) / 2;

  paintClouds(ctx, s, tones, ground, ink, width, height, left, top, zoom);

  const seen = (star: Star) => {
    const x = left + star.x * zoom;
    const y = top + star.y * zoom;
    return x > -20 && y > -20 && x < width + 20 && y < height + 20;
  };
  /** Stars thin out toward the corners along with the sky behind them. */
  const dim = (x: number, y: number) =>
    tones.star * (1 - falloff(x, y, width, height) * tones.falloff * 0.8);

  for (const star of s.haze) {
    if (!seen(star)) continue;
    const x = left + star.x * zoom;
    const y = top + star.y * zoom;
    const size = 0.5 + star.bright * 0.5;
    ctx.fillStyle = css(
      starColor(tones, star.warmth),
      (0.07 + star.bright * 0.2) * dim(x, y),
    );
    ctx.fillRect(x, y, size, size);
  }

  for (const star of s.stars) {
    if (!seen(star)) continue;
    const x = left + star.x * zoom;
    const y = top + star.y * zoom;
    const size = 0.55 + star.bright * 1.25;
    ctx.fillStyle = css(
      starColor(tones, star.warmth),
      (0.14 + star.bright * 0.78) * dim(x, y),
    );
    if (size < 1.25) {
      ctx.fillRect(x - size / 2, y - size / 2, size, size);
    } else {
      ctx.beginPath();
      ctx.arc(x, y, size / 2, 0, TAU);
      ctx.fill();
    }
  }

  for (const star of s.beacons) {
    if (!seen(star)) continue;
    const x = left + star.x * zoom;
    const y = top + star.y * zoom;
    const color = starColor(tones, star.warmth);
    if (ink) {
      const radius = 5 + star.bright * 13;
      const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
      glow.addColorStop(0, css(color, 0.24 * star.bright));
      glow.addColorStop(0.35, css(color, 0.06 * star.bright));
      glow.addColorStop(1, css(color, 0));
      ctx.fillStyle = glow;
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
      if (star.bright > 0.86) {
        // Diffraction spikes on the very brightest: a thin cross that fades out.
        const reach = 6 + star.bright * 13;
        ctx.lineWidth = 0.6;
        for (const [dx, dy] of [
          [1, 0],
          [0, 1],
        ]) {
          const spike = ctx.createLinearGradient(
            x - dx * reach,
            y - dy * reach,
            x + dx * reach,
            y + dy * reach,
          );
          spike.addColorStop(0, css(color, 0));
          spike.addColorStop(0.5, css(color, 0.4 * star.bright));
          spike.addColorStop(1, css(color, 0));
          ctx.strokeStyle = spike;
          ctx.beginPath();
          ctx.moveTo(x - dx * reach, y - dy * reach);
          ctx.lineTo(x + dx * reach, y + dy * reach);
          ctx.stroke();
        }
      }
    }
    ctx.fillStyle = css(color, (ink ? 0.95 : 0.7) * (0.6 + 0.4 * star.bright));
    ctx.beginPath();
    ctx.arc(x, y, 0.75 + star.bright * (ink ? 0.75 : 1.1), 0, TAU);
    ctx.fill();
  }
}
