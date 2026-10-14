import { TAU } from "./math";
import {
  type Earth,
  lightsAt,
  RE,
  Surface,
  surfaceAt,
  type View,
} from "./orbit-data";
import type { Field, Frame, RGB } from "./types";

/**
 * Orbit Explorer's own look, for scenes that show the app: pure black, one
 * near-white ink in alpha steps, short uppercase letter-spaced labels,
 * square corners and hairlines, color only for data. The app is dark in
 * either theme, so these scenes draw a black window and color every dot by
 * class, which the engine renders the same on ink and paper.
 */
export const INK: RGB = [240, 240, 250];

/** `f.classColors` for app scenes, 1-based in `gc`. */
export const APP = {
  Starlink: 1,
  Debris: 2,
  Other: 3,
  Ink: 4,
  Green: 5,
  Arid: 6,
  Ice: 7,
  Ocean: 8,
  Lights: 9,
  Night: 10,
} as const;

export const APP_COLORS: RGB[] = [
  // Tol's high-contrast scheme, the blue lifted as the app lifts it.
  [70, 142, 230],
  [222, 112, 130],
  [226, 182, 74],
  INK,
  [104, 120, 84],
  [184, 158, 116],
  [226, 232, 238],
  [46, 86, 138],
  [255, 206, 122],
  [58, 62, 74],
];

/** Group index (Starlink, debris, other) to its app class. */
export const GROUP_CLASS = [APP.Starlink, APP.Debris, APP.Other];
/** The app sizes points by group: Starlink smallest, other satellites largest. */
export const GROUP_SIZE = [1.15, 1.25, 1.45];

export const rgbaOf = (c: RGB, a: number) =>
  `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a.toFixed(3)})`;

export const ink = (a: number) => rgbaOf(INK, a);

const DEG = Math.PI / 180;

/**
 * The Sun's direction (unit, Earth-fixed) at a Julian date, from the
 * Astronomical Almanac's low-precision series (about 0.01°).
 */
export function sunDirection(jd: number, gmst: number, out: Float64Array) {
  const n = jd - 2451545;
  const L = (280.46 + 0.9856474 * n) * DEG;
  const g = (357.528 + 0.9856003 * n) * DEG;
  const lambda = L + (1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * DEG;
  const eps = (23.439 - 0.0000004 * n) * DEG;
  const x = Math.cos(lambda);
  const y = Math.cos(eps) * Math.sin(lambda);
  const z = Math.sin(eps) * Math.sin(lambda);
  out[0] = x * Math.cos(gmst) + y * Math.sin(gmst);
  out[1] = -x * Math.sin(gmst) + y * Math.cos(gmst);
  out[2] = z;
  return out;
}

type TextOptions = {
  size?: number;
  weight?: number;
  spacing?: number;
  alpha?: number;
  color?: RGB;
  align?: CanvasTextAlign;
  baseline?: CanvasTextBaseline;
  mono?: boolean;
};

/** The app's type: Barlow, tracked out, in its ink. */
export class AppType {
  sans = "sans-serif";
  mono = "monospace";

  read(section: HTMLElement) {
    const cs = getComputedStyle(section);
    const sans = cs.getPropertyValue("--font-app").trim();
    const mono = cs.getPropertyValue("--font-mono").trim();
    if (sans) this.sans = `${sans}, "Helvetica Neue", Arial, sans-serif`;
    if (mono) this.mono = mono;
    document.fonts?.load(`500 10px ${this.sans}`).catch(() => {});
  }

  text(
    ctx: CanvasRenderingContext2D,
    s: string,
    x: number,
    y: number,
    {
      size = 10,
      weight = 500,
      spacing = 0,
      alpha = 1,
      color = INK,
      align = "left",
      baseline = "middle",
      mono = false,
    }: TextOptions = {},
  ) {
    if (alpha <= 0.01) return 0;
    ctx.font = `${weight} ${size}px ${mono ? this.mono : this.sans}`;
    const spaced = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
    if ("letterSpacing" in spaced) spaced.letterSpacing = `${spacing}em`;
    ctx.textAlign = align;
    ctx.textBaseline = baseline;
    ctx.fillStyle = rgbaOf(color, alpha);
    ctx.fillText(s, x, y);
    const w = ctx.measureText(s).width;
    if ("letterSpacing" in spaced) spaced.letterSpacing = "0em";
    return w;
  }
}

/** The Earth's modes; elsewhere the app swaps in the world's own. */
export const EARTH_MODES = [
  "Explore",
  "Routing",
  "Conjunctions",
  "Coverage",
  "Catalog",
] as const;
export type Mode = string;

export type Box = { x: number; y: number; w: number; h: number };

/** Where the app's pieces sit inside its window, all in screen pixels. */
export type AppLayout = {
  frame: Box;
  header: number;
  dock: number;
  /** The space the globe centers in, left of the panel. */
  view: Box;
  panel: Box | null;
  wide: boolean;
};

export function appLayout(frame: Box, panel: boolean): AppLayout {
  const wide = frame.w >= 620;
  const header = wide ? 36 : 30;
  const dock = wide ? 46 : 0;
  const pw = panel && wide ? Math.min(300, frame.w * 0.36) : 0;
  const p = pw
    ? {
        x: frame.x + frame.w - pw - 12,
        y: frame.y + header + 8,
        w: pw,
        h: frame.h - header - dock - 16,
      }
    : null;
  return {
    frame,
    header,
    dock,
    panel: p,
    wide,
    view: {
      x: frame.x,
      y: frame.y + header,
      w: frame.w - (pw ? pw + 12 : 0),
      h: frame.h - header - dock,
    },
  };
}

/** A row of the legend under the world's name. */
export type LegendRow = {
  name: string;
  count?: number;
  color: RGB;
  /** Drawn as a dashed ring and dimmed, as the app shows a layer that's off. */
  off?: boolean;
  /** Outlined, as the app marks the row whose layer is isolated. */
  lit?: boolean;
};

export const EARTH_LEGEND: LegendRow[] = [
  { name: "Starlink", count: 11_131, color: [70, 142, 230] },
  { name: "Other satellites", count: 7_708, color: [226, 182, 74] },
  { name: "Debris", count: 13_744, color: [222, 112, 130] },
];

/** The worlds the app can fly to, inside out, with the color each is listed in. */
export const WORLDS = [
  { id: "mercury", name: "MERCURY", hex: [165, 157, 148] },
  { id: "venus", name: "VENUS", hex: [232, 215, 168] },
  { id: "earth", name: "EARTH", hex: [111, 168, 255] },
  { id: "moon", name: "MOON", hex: [201, 196, 188], child: true },
  { id: "mars", name: "MARS", hex: [224, 122, 79] },
  { id: "jupiter", name: "JUPITER", hex: [216, 180, 140] },
  { id: "saturn", name: "SATURN", hex: [227, 207, 156] },
  { id: "uranus", name: "URANUS", hex: [169, 220, 227] },
  { id: "neptune", name: "NEPTUNE", hex: [91, 127, 224] },
  { id: "oort", name: "OORT CLOUD", hex: [159, 180, 216] },
] as const;

export type FlyTo = {
  /** Where the list measures from, and the world highlighted in it. */
  here: string;
  /** km to each world from `here`, keyed by id; the Oort cloud reads 2,000+ au. */
  km: Record<string, number>;
  /** A world being flown to, highlighted as it is clicked. */
  target?: string;
  alpha?: number;
};

export type ChromeState = {
  mode: Mode;
  /** The world's modes; the Earth's by default. */
  modes?: readonly string[];
  /** Seconds after the snapshot, for the clock. */
  t: number;
  warp: "1×" | "10×" | "1M" | "10M" | "1H";
  /** The headline: the world's name, and what is there. */
  world?: string;
  subtitle?: string;
  /** Legend rows under the headline, or false for none. */
  legend?: LegendRow[] | false;
  /** The Fly to list, shown on the right while no panel is open. */
  flyTo?: FlyTo | null;
  /** Fade for the whole window, 0 to 1. */
  alpha?: number;
  /** Conjunction markers on the timeline, seconds after the snapshot. */
  markers?: number[];
  paused?: boolean;
};

/** The snapshot's generation time, October 9, 2026, 21:25:56 UTC. */
export const SNAPSHOT_UTC = Date.UTC(2026, 9, 9, 21, 25, 56);

/**
 * The window behind the dots: black, drawn under everything already on the
 * canvas, so call it last in a scene's `draw`.
 */
export function drawWindow(
  ctx: CanvasRenderingContext2D,
  l: AppLayout,
  alpha = 1,
) {
  const f = l.frame;
  ctx.save();
  ctx.globalCompositeOperation = "destination-over";
  ctx.fillStyle = `rgba(2,3,6,${alpha.toFixed(3)})`;
  ctx.fillRect(f.x, f.y, f.w, f.h);
  ctx.restore();
}

const fixed = (n: number, d: number) =>
  n.toLocaleString("en-US", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });

/** As the app's Fly to column: "391,790 km", "45M km", "1.26B km". */
export const nearKm = (km: number) =>
  km >= 1e9
    ? `${fixed(km / 1e9, 2)}B km`
    : km > 3e6
      ? `${fixed(km / 1e6, 0)}M km`
      : `${Math.round(km).toLocaleString("en-US")} km`;

/** The app's line icons, drawn at a center in `s` pixels. */
const icon = {
  mark(ctx: CanvasRenderingContext2D, x: number, y: number, a: number) {
    ctx.strokeStyle = ink(0.9 * a);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, 3.6, 0, TAU);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(x, y, 7.4, 2.6, -0.42, 0, TAU);
    ctx.stroke();
  },
  search(ctx: CanvasRenderingContext2D, x: number, y: number, a: number) {
    ctx.strokeStyle = ink(0.7 * a);
    ctx.beginPath();
    ctx.arc(x - 1, y - 1, 3, 0, TAU);
    ctx.moveTo(x + 1.2, y + 1.2);
    ctx.lineTo(x + 3.6, y + 3.6);
    ctx.stroke();
  },
  layers(ctx: CanvasRenderingContext2D, x: number, y: number, a: number) {
    ctx.strokeStyle = ink(0.85 * a);
    ctx.fillStyle = ink(0.85 * a);
    ctx.beginPath();
    ctx.moveTo(x - 5, y - 2);
    ctx.lineTo(x + 5, y - 2);
    ctx.moveTo(x - 5, y + 2);
    ctx.lineTo(x + 5, y + 2);
    ctx.stroke();
    ctx.fillRect(x + 1, y - 3.5, 2, 3);
    ctx.fillRect(x - 3, y + 0.5, 2, 3);
  },
  help(
    ctx: CanvasRenderingContext2D,
    type: AppType,
    x: number,
    y: number,
    a: number,
  ) {
    ctx.strokeStyle = ink(0.7 * a);
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, TAU);
    ctx.stroke();
    type.text(ctx, "?", x, y + 0.5, {
      size: 7,
      align: "center",
      alpha: 0.8 * a,
    });
  },
  plus(ctx: CanvasRenderingContext2D, x: number, y: number, a: number) {
    ctx.strokeStyle = ink(0.7 * a);
    ctx.beginPath();
    ctx.moveTo(x - 3.5, y);
    ctx.lineTo(x + 3.5, y);
    ctx.moveTo(x, y - 3.5);
    ctx.lineTo(x, y + 3.5);
    ctx.stroke();
  },
  minus(ctx: CanvasRenderingContext2D, x: number, y: number, a: number) {
    ctx.strokeStyle = ink(0.7 * a);
    ctx.beginPath();
    ctx.moveTo(x - 3.5, y);
    ctx.lineTo(x + 3.5, y);
    ctx.stroke();
  },
  globe(ctx: CanvasRenderingContext2D, x: number, y: number, a: number) {
    ctx.strokeStyle = ink(0.7 * a);
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, TAU);
    ctx.moveTo(x - 4, y);
    ctx.lineTo(x + 4, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(x, y, 1.8, 4, 0, 0, TAU);
    ctx.stroke();
  },
  locate(ctx: CanvasRenderingContext2D, x: number, y: number, a: number) {
    ctx.strokeStyle = ink(0.7 * a);
    ctx.beginPath();
    ctx.arc(x, y, 3.4, 0, TAU);
    for (const [dx, dy] of [
      [0, -1],
      [0, 1],
      [-1, 0],
      [1, 0],
    ]) {
      ctx.moveTo(x + dx * 3.4, y + dy * 3.4);
      ctx.lineTo(x + dx * 5.2, y + dy * 5.2);
    }
    ctx.stroke();
    ctx.fillStyle = ink(0.7 * a);
    ctx.beginPath();
    ctx.arc(x, y, 1, 0, TAU);
    ctx.fill();
  },
  hide(ctx: CanvasRenderingContext2D, x: number, y: number, a: number) {
    ctx.strokeStyle = ink(0.7 * a);
    ctx.beginPath();
    ctx.ellipse(x, y, 5, 2.8, 0, 0, TAU);
    ctx.moveTo(x - 4.5, y - 4);
    ctx.lineTo(x + 4.5, y + 4);
    ctx.stroke();
  },
  pause(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    a: number,
    paused: boolean,
  ) {
    ctx.fillStyle = ink(a);
    if (paused) {
      ctx.beginPath();
      ctx.moveTo(x - 2.5, y - 4);
      ctx.lineTo(x + 4, y);
      ctx.lineTo(x - 2.5, y + 4);
      ctx.fill();
      return;
    }
    ctx.fillRect(x - 3, y - 4, 2, 8);
    ctx.fillRect(x + 1, y - 4, 2, 8);
  },
};

/**
 * Everything around the globe, as the app lays it out: the header (mark,
 * name, the world's modes, frame rate, search, layers, help), the world's
 * headline and legend, the Fly to list, the zoom and location controls, and
 * the time dock (pause, clock, mission timeline, warp, back to now).
 */
export function drawChrome(
  ctx: CanvasRenderingContext2D,
  type: AppType,
  l: AppLayout,
  s: ChromeState,
) {
  const a = s.alpha ?? 1;
  const f = l.frame;
  ctx.lineWidth = 1;
  ctx.strokeStyle = ink(0.18 * a);
  ctx.strokeRect(f.x + 0.5, f.y + 0.5, f.w - 1, f.h - 1);

  // Header: the mark and the name.
  const hy = f.y + l.header / 2;
  icon.mark(ctx, f.x + 18, hy, a);
  type.text(ctx, "ORBIT EXPLORER", f.x + 33, hy, {
    size: l.wide ? 10 : 9,
    spacing: 0.3,
    alpha: a,
  });
  const modes = s.modes ?? EARTH_MODES;
  if (l.wide) {
    // Right to left: help, layers, search, frame rate, each only if it fits.
    let x = f.x + f.w - 16;
    icon.help(ctx, type, x - 5, hy, a);
    x -= 22;
    const lw = type.text(ctx, "LAYERS", x, hy, {
      size: 8,
      spacing: 0.14,
      align: "right",
      alpha: 0.85 * a,
    });
    icon.layers(ctx, x - lw - 10, hy, a);
    x -= lw + 26;
    const gap = 14;
    const widths = modes.map((m) =>
      type.text(ctx, m.toUpperCase(), -999, -999, { size: 8.5, spacing: 0.16 }),
    );
    const total =
      widths.reduce((sum, w) => sum + w, 0) + gap * (modes.length - 1);
    const navRight = f.x + f.w / 2 + total / 2;
    const sw = Math.min(110, x - navRight - 70);
    if (sw > 64) {
      const bx = x - sw;
      ctx.strokeStyle = ink(0.22 * a);
      ctx.strokeRect(bx + 0.5, hy - 9.5, sw, 19);
      icon.search(ctx, bx + 11, hy, a);
      type.text(ctx, "SEARCH", bx + 21, hy, {
        size: 7.5,
        spacing: 0.14,
        alpha: 0.5 * a,
      });
      ctx.strokeStyle = ink(0.28 * a);
      ctx.strokeRect(bx + sw - 19.5, hy - 5.5, 15, 11);
      type.text(ctx, "⌘K", bx + sw - 12, hy, {
        size: 6,
        align: "center",
        alpha: 0.6 * a,
      });
      x = bx - 12;
    }
    const gw = type.text(ctx, "WEBGPU", -999, -999, {
      size: 7.5,
      spacing: 0.12,
    });
    const fw = type.text(ctx, "60 FPS", -999, -999, {
      size: 7.5,
      spacing: 0.12,
    });
    if (x - navRight > gw + fw + 30) {
      const fx = x - gw - fw - 8;
      ctx.fillStyle = ink(a);
      ctx.beginPath();
      ctx.arc(fx - 7, hy, 2.2, 0, TAU);
      ctx.fill();
      type.text(ctx, "60 FPS", fx, hy, { size: 7.5, spacing: 0.12, alpha: a });
      type.text(ctx, "WEBGPU", x - gw, hy, {
        size: 7.5,
        spacing: 0.12,
        alpha: 0.46 * a,
      });
    }
    let mx = f.x + f.w / 2 - total / 2;
    modes.forEach((m, k) => {
      const on = m === s.mode;
      type.text(ctx, m.toUpperCase(), mx, hy, {
        size: 8.5,
        spacing: 0.16,
        alpha: (on ? 1 : 0.46) * a,
      });
      if (on) {
        ctx.fillStyle = ink(a);
        ctx.fillRect(mx - 5, hy + 10, widths[k] + 8, 1);
      }
      mx += widths[k] + gap;
    });
  } else {
    type.text(ctx, s.mode.toUpperCase(), f.x + f.w - 12, hy, {
      size: 8.5,
      spacing: 0.16,
      align: "right",
      alpha: a,
    });
  }

  // The headline: the world's name, what is there, and the legend.
  const legend = s.legend === undefined ? EARTH_LEGEND : s.legend;
  if (l.wide) {
    const x = f.x + 16;
    let y = f.y + l.header + 28;
    type.text(ctx, s.world ?? "EARTH", x, y, {
      size: 24,
      weight: 400,
      spacing: 0.3,
      alpha: a,
    });
    y += 24;
    for (const line of (s.subtitle ?? "32,583 objects in orbit").split("\n")) {
      type.text(ctx, line, x, y, { size: 9.5, weight: 400, alpha: 0.75 * a });
      y += 14;
    }
    y += 9;
    for (const row of legend || []) {
      const ra = (row.off ? 0.4 : 1) * a;
      ctx.strokeStyle = rgbaOf(row.color, ra);
      ctx.fillStyle = rgbaOf(row.color, 0.6 * ra);
      ctx.setLineDash(row.off ? [1.5, 1.5] : []);
      ctx.beginPath();
      ctx.arc(x + 4, y, 3.2, 0, TAU);
      if (!row.off) ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
      type.text(ctx, row.name, x + 14, y, {
        size: 9.5,
        weight: 400,
        alpha: ra,
      });
      if (row.count !== undefined) {
        type.text(ctx, row.count.toLocaleString("en-US"), x + 152, y, {
          size: 9.5,
          weight: 400,
          align: "right",
          alpha: 0.46 * a,
        });
      }
      if (row.lit) {
        ctx.strokeStyle = ink(0.45 * a);
        ctx.strokeRect(x - 6.5, y - 9.5, 166, 19);
      }
      y += 18;
    }
  }

  // Fly to: every world, how far it is, the current one marked.
  if (s.flyTo && !l.panel && l.wide) drawFlyTo(ctx, type, l, s.flyTo, a);

  if (l.dock > 0) drawDock(ctx, type, l, s, a);
}

function drawFlyTo(
  ctx: CanvasRenderingContext2D,
  type: AppType,
  l: AppLayout,
  fly: FlyTo,
  alpha: number,
) {
  const a = alpha * (fly.alpha ?? 1);
  if (a < 0.01) return;
  const f = l.frame;
  const w = Math.min(150, f.w * 0.19);
  const x = f.x + f.w - w - 14;
  let y = f.y + l.header + 22;
  const here = WORLDS.find((wd) => wd.id === fly.here);
  type.text(ctx, "FLY TO", x, y, { size: 6.5, spacing: 0.16, alpha: 0.46 * a });
  const from =
    here?.id === "moon"
      ? "THE MOON"
      : here?.id === "oort"
        ? "THE OORT CLOUD"
        : (here?.name ?? "");
  type.text(ctx, `FROM ${from}`, x + w, y, {
    size: 6.5,
    spacing: 0.14,
    align: "right",
    alpha: 0.32 * a,
  });
  y += 8;
  ctx.fillStyle = ink(0.16 * a);
  ctx.fillRect(x, y, w, 1);
  y += 14;
  for (const wd of WORLDS) {
    if (wd.id === "oort") {
      ctx.fillStyle = ink(0.12 * a);
      ctx.fillRect(x, y - 6, w, 1);
      y += 6;
    }
    const on = wd.id === fly.here;
    const target = wd.id === fly.target;
    const child = "child" in wd && wd.child;
    const ix = x + (child ? 14 : 4);
    if (on || target) {
      ctx.fillStyle = ink((target ? 0.1 : 0.06) * a);
      ctx.fillRect(x - 2, y - 8, w + 4, 16);
      ctx.strokeStyle = ink((target ? 0.6 : 0.3) * a);
      ctx.strokeRect(x - 1.5, y - 7.5, w + 3, 15);
      ctx.fillStyle = ink(a);
      ctx.fillRect(x - 2, y - 8, 1.5, 16);
    }
    if (child) {
      ctx.strokeStyle = ink(0.2 * a);
      ctx.beginPath();
      ctx.moveTo(x + 5.5, y - 9);
      ctx.lineTo(x + 5.5, y);
      ctx.lineTo(x + 10, y);
      ctx.stroke();
    }
    ctx.fillStyle = rgbaOf(wd.hex as unknown as RGB, a);
    ctx.beginPath();
    ctx.arc(ix, y, child ? 1.6 : 2.2, 0, TAU);
    ctx.fill();
    type.text(ctx, wd.name, ix + 9, y, {
      size: child ? 6.5 : 7.5,
      spacing: 0.14,
      alpha: (on || target ? 1 : 0.72) * a,
    });
    const km = fly.km[wd.id];
    const far = wd.id === "oort" ? "2,000+ au" : on ? "" : km ? nearKm(km) : "";
    type.text(ctx, far, x + w, y, {
      size: 6.5,
      weight: 400,
      align: "right",
      alpha: 0.46 * a,
    });
    y += child ? 13 : 15;
  }
}

function drawDock(
  ctx: CanvasRenderingContext2D,
  type: AppType,
  l: AppLayout,
  s: ChromeState,
  a: number,
) {
  const f = l.frame;
  const dy = f.y + f.h - l.dock / 2;
  // The zoom and location controls, stacked over the hide button.
  const bx = f.x + 12;
  const bw = 22;
  const stack = ["plus", "minus", "globe", "locate"] as const;
  const top = f.y + f.h - l.dock - 8 - stack.length * bw;
  ctx.strokeStyle = ink(0.22 * a);
  ctx.strokeRect(bx + 0.5, top + 0.5, bw, stack.length * bw);
  stack.forEach((name, k) => {
    icon[name](ctx, bx + bw / 2 + 0.5, top + k * bw + bw / 2 + 0.5, a);
  });
  ctx.strokeRect(bx + 0.5, dy - bw / 2 + 0.5, bw, bw);
  icon.hide(ctx, bx + bw / 2 + 0.5, dy + 0.5, a);
  const px = bx + bw + 12;
  ctx.strokeStyle = ink(0.3 * a);
  ctx.strokeRect(px + 0.5, dy - 12.5, 25, 25);
  icon.pause(ctx, px + 13, dy, a, s.paused ?? false);

  const cx = px + 36;
  const now = new Date(SNAPSHOT_UTC + s.t * 1000);
  const hh = String(now.getUTCHours()).padStart(2, "0");
  const mm = String(now.getUTCMinutes()).padStart(2, "0");
  const ss = String(now.getUTCSeconds()).padStart(2, "0");
  const w = type.text(ctx, `${hh}:${mm}:${ss}`, cx, dy - 5, {
    size: 15,
    weight: 400,
    alpha: a,
  });
  type.text(ctx, "UTC", cx + w + 4, dy - 3, {
    size: 6.5,
    spacing: 0.12,
    alpha: 0.46 * a,
  });
  const hours = s.t / 3600;
  const live = Math.abs(hours) < 0.01;
  ctx.fillStyle = ink(a);
  ctx.beginPath();
  ctx.arc(cx + 2, dy + 11, 1.8, 0, TAU);
  ctx.fill();
  const tag = live
    ? "LIVE"
    : `${hours < 0 ? "−" : "+"}${Math.abs(hours).toFixed(1)} H`;
  const tw = type.text(ctx, tag, cx + 7, dy + 11, {
    size: 6.5,
    spacing: 0.14,
    alpha: a,
  });
  const date = now.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  type.text(ctx, date.replace(",", ""), cx + 13 + tw, dy + 11, {
    size: 6.5,
    weight: 400,
    alpha: 0.46 * a,
  });

  // The mission timeline: ±24 h around now, screened encounters marked.
  const tx0 = cx + 118;
  const tx1 = f.x + f.w - 196;
  ctx.strokeStyle = ink(0.28 * a);
  ctx.beginPath();
  ctx.moveTo(tx0, dy);
  ctx.lineTo(tx1, dy);
  ctx.stroke();
  const at = (sec: number) => tx0 + ((sec + 86400) / (2 * 86400)) * (tx1 - tx0);
  ctx.strokeStyle = rgbaOf([255, 120, 110], 0.8 * a);
  for (const m of s.markers ?? []) {
    ctx.beginPath();
    ctx.arc(at(m), dy - 13, 2.6, 0, TAU);
    ctx.stroke();
  }
  const nx = at(s.t);
  ctx.fillStyle = ink(a);
  ctx.strokeStyle = ink(a);
  ctx.beginPath();
  ctx.arc(nx, dy, 5, 0, TAU);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(nx, dy, 2.2, 0, TAU);
  ctx.fill();
  type.text(ctx, "NOW", at(0), dy + 13, {
    size: 6.5,
    spacing: 0.16,
    align: "center",
    alpha: 0.7 * a,
  });
  type.text(ctx, "−24 H", tx0, dy + 13, {
    size: 6.5,
    spacing: 0.12,
    alpha: 0.28 * a,
  });
  type.text(ctx, "+24 H", tx1, dy + 13, {
    size: 6.5,
    spacing: 0.12,
    align: "right",
    alpha: 0.28 * a,
  });

  // Time-warp chips, the current one underlined, then back to now.
  const chips = ["1×", "10×", "1M", "10M", "1H"];
  let wx = f.x + f.w - 176;
  for (const c of chips) {
    const on = c === s.warp;
    const cw = type.text(ctx, c, wx, dy, {
      size: 7.5,
      spacing: 0.1,
      alpha: (on ? 1 : 0.46) * a,
    });
    if (on) {
      ctx.fillStyle = ink(a);
      ctx.fillRect(wx - 3, dy + 9, cw + 6, 1);
    }
    wx += cw + 13;
  }
  const nb = f.x + f.w - 54;
  ctx.strokeStyle = ink(0.3 * a);
  ctx.strokeRect(nb + 0.5, dy - 10.5, 42, 21);
  ctx.fillStyle = ink((live ? 0.4 : 1) * a);
  ctx.beginPath();
  ctx.arc(nb + 9, dy, 1.6, 0, TAU);
  ctx.fill();
  type.text(ctx, "NOW", nb + 15, dy, {
    size: 7,
    spacing: 0.14,
    alpha: (live ? 0.4 : 1) * a,
  });
}

/**
 * A floating card: translucent black, a hairline, its title tracked out.
 * The backing goes under the dots (call `drawPanelBack` before
 * `drawAtmosphere`), so charts drawn in dots sit on top of it.
 */
export function drawPanel(
  ctx: CanvasRenderingContext2D,
  type: AppType,
  b: Box,
  title: string,
  subtitle: string,
  alpha = 1,
) {
  ctx.strokeStyle = ink(0.18 * alpha);
  ctx.lineWidth = 1;
  ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
  type.text(ctx, title, b.x + 16, b.y + 22, { size: 11, spacing: 0.14, alpha });
  type.text(ctx, "×", b.x + b.w - 18, b.y + 22, {
    size: 12,
    weight: 300,
    align: "center",
    alpha: 0.7 * alpha,
  });
  type.text(ctx, subtitle, b.x + 16, b.y + 40, {
    size: 8.5,
    weight: 400,
    alpha: 0.46 * alpha,
  });
  return b.y + 58;
}

export function drawPanelBack(
  ctx: CanvasRenderingContext2D,
  b: Box,
  alpha = 1,
) {
  ctx.save();
  ctx.globalCompositeOperation = "destination-over";
  ctx.fillStyle = `rgba(0,0,0,${(0.8 * alpha).toFixed(3)})`;
  ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.restore();
}

/** How much of a dot shows at (x, y): dimmed behind the panel, as through its glass. */
export function through(l: AppLayout, x: number, y: number) {
  const p = l.panel;
  if (p && x > p.x && x < p.x + p.w && y > p.y && y < p.y + p.h) return 0.22;
  const f = l.frame;
  if (
    x < f.x ||
    x > f.x + f.w ||
    y < f.y + l.header - 2 ||
    y > f.y + f.h - l.dock
  )
    return 0;
  return 1;
}

/**
 * The globe as a dot matrix: a hexagonal lattice over the visible disc, each
 * dot colored by what lies under it, from the app's day texture, lit by the
 * real Sun, with its night texture's city lights past the terminator. Dots
 * stay put on screen while the Earth turns or the camera moves; only their
 * colors change, like a display.
 */
export class DotGlobe {
  /** Lattice points in the unit disc, xy-interleaved. */
  private disc = new Float32Array(0);
  n = 0;
  private earth: Earth | null = null;
  private p = new Float64Array(3);

  build(n: number, earth: Earth | null) {
    this.earth = earth;
    const d = Math.sqrt((2 * Math.PI) / (Math.sqrt(3) * n));
    const pts: number[] = [];
    for (
      let row = 0, y = -1 + d / 2;
      y < 1;
      row++, y += (d * Math.sqrt(3)) / 2
    ) {
      for (let x = -1 + (row % 2 ? d / 2 : 0); x < 1; x += d) {
        if (x * x + y * y < 0.995) pts.push(x, y);
      }
    }
    this.disc = Float32Array.from(pts);
    this.n = pts.length / 2;
  }

  get loaded() {
    return this.earth !== null;
  }

  /**
   * Writes goals for particles [start, start + n). The view must be
   * Earth-fixed; `sun` is the Sun's Earth-fixed direction.
   */
  place(
    f: Field,
    start: number,
    v: View,
    sun: Float64Array,
    fr: Frame,
    alpha = 1,
    { coverage }: { coverage?: (lat: number, lon: number) => number } = {},
  ) {
    const earth = this.earth;
    const r = RE * v.scale;
    // Dots shrink and fade as the disc gets small, so it never turns to a blob.
    const pitch = r * Math.sqrt((2 * Math.PI) / (Math.sqrt(3) * this.n));
    const size = Math.min(fr.compact ? 2.4 : 3.4, pitch * 0.74);
    const thin = Math.min(1, (pitch / 2.6) ** 2);
    const q = this.p;
    for (let k = 0; k < this.n; k++) {
      const i = start + k;
      if (i >= f.n) break;
      const X = this.disc[2 * k];
      const Y = -this.disc[2 * k + 1];
      const D = Math.sqrt(Math.max(0, 1 - X * X - Y * Y));
      f.gx[i] = v.cx + X * r;
      f.gy[i] = v.cy - Y * r;
      f.gz[i] = size;
      f.gj[i] = 0;
      f.gh[i] = 0;
      // Back from the screen to the ground: undo the pitch, then the yaw.
      const y1 = Y * v.sinPitch - D * v.cosPitch;
      const z = Y * v.cosPitch + D * v.sinPitch;
      q[0] = X * v.cosYaw + y1 * v.sinYaw;
      q[1] = -X * v.sinYaw + y1 * v.cosYaw;
      q[2] = z;
      const lat = (Math.asin(Math.max(-1, Math.min(1, z))) * 180) / Math.PI;
      const lon = (Math.atan2(q[1], q[0]) * 180) / Math.PI;
      const limb = 0.4 + 0.6 * D ** 0.5;
      if (coverage) {
        const c = coverage(lat, lon);
        f.gc[i] = APP.Starlink;
        f.gh[i] = 0;
        f.ga[i] = (0.1 + 0.9 * c) * limb * alpha * thin;
        continue;
      }
      const c = earth ? surfaceAt(earth, lat, lon) : Surface.Ocean;
      const lights = earth ? lightsAt(earth, lat, lon) : 0;
      const day = Math.min(
        1,
        Math.max(0, (q[0] * sun[0] + q[1] * sun[1] + q[2] * sun[2]) * 5 + 0.5),
      );
      let cls: number;
      let a: number;
      if (day > 0.5) {
        cls =
          c === Surface.Ocean
            ? APP.Ocean
            : c === Surface.Ice
              ? APP.Ice
              : c === Surface.Arid
                ? APP.Arid
                : APP.Green;
        a = (c === Surface.Ocean ? 0.62 : 1) * (0.45 + 0.55 * day);
      } else if (lights > 0.06 && c !== Surface.Ocean) {
        cls = APP.Lights;
        a = 0.3 + 0.7 * lights;
      } else {
        cls = c === Surface.Ocean ? APP.Ocean : APP.Night;
        a = c === Surface.Ocean ? 0.1 : 0.5;
      }
      f.gc[i] = cls;
      f.ga[i] = a * limb * alpha * thin;
    }
    return this.n;
  }
}

/**
 * The atmosphere as the app draws it: a thin blue rim brightest on the day
 * side, and a dark disc so nothing behind the Earth shows through. Drawn
 * under the dots, so call it before `drawWindow`.
 */
export function drawAtmosphere(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  sunX: number,
  sunY: number,
  alpha = 1,
) {
  ctx.save();
  ctx.globalCompositeOperation = "destination-over";
  const glow = ctx.createRadialGradient(cx, cy, r * 0.9, cx, cy, r * 1.07);
  glow.addColorStop(0, "rgba(120,170,255,0)");
  glow.addColorStop(0.55, `rgba(150,195,255,${(0.34 * alpha).toFixed(3)})`);
  glow.addColorStop(0.62, `rgba(200,225,255,${(0.5 * alpha).toFixed(3)})`);
  glow.addColorStop(0.72, `rgba(110,160,255,${(0.14 * alpha).toFixed(3)})`);
  glow.addColorStop(1, "rgba(90,140,255,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.07, 0, TAU);
  ctx.fill();
  // Day-side haze, toward the Sun's direction on screen.
  const len = Math.hypot(sunX, sunY) || 1;
  const hx = cx + (sunX / len) * r * 0.55;
  const hy = cy + (sunY / len) * r * 0.55;
  const haze = ctx.createRadialGradient(hx, hy, 0, hx, hy, r * 1.05);
  haze.addColorStop(0, `rgba(70,110,170,${(0.32 * alpha).toFixed(3)})`);
  haze.addColorStop(1, "rgba(10,20,40,0)");
  ctx.fillStyle = haze;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TAU);
  ctx.fill();
  ctx.fillStyle = `rgba(3,6,14,${alpha.toFixed(3)})`;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/** Spare particles as the app's star field, inside its window, off the globe. */
export function stars(
  f: Field,
  i: number,
  l: AppLayout,
  globe: { cx: number; cy: number; r: number } | null,
  alpha = 1,
) {
  const b = l.frame;
  const x = b.x + 2 + f.r0[i] * (b.w - 4);
  const y = b.y + l.header + f.r1[i] * (b.h - l.header - l.dock);
  const inside = globe
    ? Math.hypot(x - globe.cx, y - globe.cy) < globe.r * 1.04
    : false;
  f.gx[i] = x;
  f.gy[i] = y;
  const bright = f.r2[i] ** 6;
  f.ga[i] = inside ? 0 : (0.12 + 0.7 * bright) * alpha;
  f.gz[i] = 0.7 + bright * 1.2;
  f.gc[i] = APP.Ink;
  f.gh[i] = 0;
  f.gj[i] = 0.02;
}

/**
 * The Layers popover under its button: the Earth's layer tiles, then the
 * reference frame, as a segmented choice.
 */
export function drawLayersMenu(
  ctx: CanvasRenderingContext2D,
  type: AppType,
  l: AppLayout,
  state: { stars: boolean; on: Record<string, boolean> },
  alpha = 1,
) {
  if (alpha < 0.01 || !l.wide) return;
  const f = l.frame;
  const w = 210;
  const x = f.x + f.w - w - 12;
  const y = f.y + l.header + 4;
  const tiles: [string, string, string][] = [
    ["links", "Laser links", "Starlink inter-satellite mesh"],
    ["route", "Route", "Fastest path and packets"],
    ["cones", "Visibility cones", "Where a terminal sees 25°+"],
    ["coverage", "Coverage", "Satellites in view, heatmap"],
    ["sky", "Milky Way & Sun", "NASA sky map, true Sun"],
  ];
  const h = 70 + tiles.length * 26 + 44;
  ctx.save();
  ctx.fillStyle = `rgba(4,6,10,${(0.94 * alpha).toFixed(3)})`;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
  ctx.strokeStyle = ink(0.22 * alpha);
  ctx.strokeRect(x + 0.5, y + 0.5, w, h);
  let ty = y + 16;
  type.text(ctx, "LAYERS", x + 12, ty, {
    size: 6.5,
    spacing: 0.16,
    alpha: 0.46 * alpha,
  });
  ty += 16;
  for (const [key, name, hint] of tiles) {
    const on = state.on[key] ?? false;
    type.text(ctx, name, x + 12, ty - 3, {
      size: 8,
      weight: 400,
      alpha: (on ? 1 : 0.6) * alpha,
    });
    type.text(ctx, hint, x + 12, ty + 7, {
      size: 6.5,
      weight: 400,
      alpha: 0.4 * alpha,
    });
    ctx.strokeStyle = ink((on ? 0.8 : 0.3) * alpha);
    ctx.strokeRect(x + w - 22.5, ty - 5.5, 10, 10);
    if (on) {
      ctx.fillStyle = ink(0.9 * alpha);
      ctx.fillRect(x + w - 20, ty - 3, 5, 5);
    }
    ty += 26;
  }
  ty += 4;
  type.text(ctx, "VIEW", x + 12, ty, {
    size: 6.5,
    spacing: 0.16,
    alpha: 0.46 * alpha,
  });
  ty += 18;
  const half = (w - 24) / 2;
  (["Rotate with Earth", "Fixed to stars"] as const).forEach((label, k) => {
    const on = state.stars === (k === 1);
    const bx = x + 12 + k * half;
    if (on) {
      ctx.fillStyle = ink(0.92 * alpha);
      ctx.fillRect(bx, ty - 9, half, 18);
    }
    ctx.strokeStyle = ink(0.3 * alpha);
    ctx.strokeRect(bx + 0.5, ty - 8.5, half - 1, 17);
    type.text(ctx, label, bx + half / 2, ty, {
      size: 7,
      weight: 500,
      align: "center",
      alpha,
      color: on ? [6, 8, 12] : INK,
    });
  });
}

/**
 * The Earth for `DotWorld`: what lies under each dot from the app's day
 * texture, lit by the Sun, with its night texture's city lights past the
 * terminator, in the same classes `DotGlobe` uses.
 */
export function earthSampler(earth: Earth | null) {
  return (
    lat: number,
    lon: number,
    mu0: number,
    _mu: number,
    out: { cls: number; a: number },
  ) => {
    const latD = (lat * 180) / Math.PI;
    const lonD = (lon * 180) / Math.PI;
    const c = earth ? surfaceAt(earth, latD, lonD) : Surface.Ocean;
    const lights = earth ? lightsAt(earth, latD, lonD) : 0;
    const day = Math.min(1, Math.max(0, mu0 * 5 + 0.5));
    if (day > 0.5) {
      out.cls =
        c === Surface.Ocean
          ? APP.Ocean
          : c === Surface.Ice
            ? APP.Ice
            : c === Surface.Arid
              ? APP.Arid
              : APP.Green;
      out.a = (c === Surface.Ocean ? 0.62 : 1) * (0.45 + 0.55 * day);
    } else if (lights > 0.06 && c !== Surface.Ocean) {
      out.cls = APP.Lights;
      out.a = 0.3 + 0.7 * lights;
    } else {
      out.cls = c === Surface.Ocean ? APP.Ocean : APP.Night;
      out.a = c === Surface.Ocean ? 0.1 : 0.5;
    }
  };
}
