import { lerp, smoothstep, TAU } from "../math";
import {
  APP,
  APP_COLORS,
  type AppLayout,
  AppType,
  appLayout,
  type Box,
  drawChrome,
  drawPanelBack,
  drawWindow,
  earthSampler,
  ink,
  rgbaOf,
  sunDirection,
} from "../orbit-app";
import {
  type Earth,
  loadEarth,
  loadShell,
  OMEGA_EARTH,
  RE,
} from "../orbit-data";
import { type Shell, shellPositions } from "../orbit-mesh";
import { Camera, DotWorld, slerp, unitOf, type Vec3 } from "../orbit-worlds";
import { freeArea, StageSize, Steps, stepAt } from "../story";
import type { Field, Frame, RGB, Scene } from "../types";

const STEP_AT = [0, 0.2, 0.42, 0.62, 0.8] as const;
/**
 * STARLINK-4290 (NORAD 53006), a V1.5 in the 53° shell, over the sunlit
 * eastern Pacific at the snapshot: its index in `shell.bin`, chosen from the
 * engine export as the V1.5 nearest 24°N 128°W.
 */
const FOLLOWED = { k: 2505, name: "STARLINK-4290", norad: 53006 };
const DEG = Math.PI / 180;
/** The overview looks down on the Pacific off California, on the day side. */
const FACE = { lat: 30, lon: -116 };
/** The camera's angle off the satellite once it rides along: behind, above, a little aside. */
const RIDE: Vec3 = [-0.55, 0.3, 0.78];

/** Each generation's model, metres in the satellite's frame (+x along track, +z up). */
type Part = {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  z: number;
  kind: "bus" | "panel" | "boom" | "dish";
};

const BOOM = 0.12;
function wing(
  side: 1 | -1,
  edge: number,
  boom: number,
  w: number,
  l: number,
  panels: number,
): Part[] {
  const root = side * (edge + boom);
  const parts: Part[] = [
    {
      x0: -BOOM,
      x1: BOOM,
      y0: Math.min(side * edge, root),
      y1: Math.max(side * edge, root),
      z: 0.1,
      kind: "boom",
    },
  ];
  for (let k = 0; k < panels; k++) {
    const a = root + side * (0.1 + k * (l + 0.2));
    const b = a + side * l;
    parts.push({
      x0: -w / 2,
      x1: w / 2,
      y0: Math.min(a, b),
      y1: Math.max(a, b),
      z: 0.1,
      kind: "panel",
    });
  }
  return parts;
}

/** The app's models (`scene/spacecraft.ts`): bus, laser terminals on top, array wings. */
const MODELS: {
  name: string;
  span: string;
  parts: Part[];
  dishes: [number, number][];
}[] = [
  {
    name: "V1.5",
    span: "8.1 M ARRAY",
    parts: [
      { x0: -1.4, x1: 1.4, y0: -0.7, y1: 0.7, z: 0.125, kind: "bus" },
      ...wing(-1, 0.7, 0.9, 2.8, 8.1, 1),
    ],
    dishes: [
      [-0.9, 0.35],
      [0.9, 0.35],
    ],
  },
  {
    name: "V2 MINI",
    span: "~30 M END TO END",
    parts: [
      { x0: -2.05, x1: 2.05, y0: -1.35, y1: 1.35, z: 0.175, kind: "bus" },
      ...wing(-1, 1.35, 1.55, 4.0, 12.4, 2),
    ],
    dishes: [
      [-1.5, -0.9],
      [0, -0.9],
      [1.5, -0.9],
    ],
  },
  {
    name: "V3",
    span: "~60 M ACROSS",
    parts: [
      { x0: -3.7, x1: 3.7, y0: -1.35, y1: 1.35, z: 0.3, kind: "bus" },
      ...wing(1, 1.35, 1.2, 4.4, 13.5, 2),
      ...wing(-1, 1.35, 1.2, 4.4, 13.5, 2),
    ],
    dishes: [
      [-3, -0.9],
      [-1, -0.9],
      [1, 0.9],
      [3, 0.9],
    ],
  },
];

/** Class slots: the app's ten, with the two this scene never shows given to the model. */
const PANEL = APP.Debris;
const BUS = APP.Other;
const FOLLOW_COLORS: RGB[] = APP_COLORS.map((c, k) =>
  k === PANEL - 1 ? [96, 104, 168] : k === BUS - 1 ? [150, 150, 160] : c,
);

/** Exactly `n` points over a model's top surfaces: x, y, z (m) and class. */
function sampleModel(m: (typeof MODELS)[number], n: number) {
  const area = m.parts.reduce((s, p) => s + (p.x1 - p.x0) * (p.y1 - p.y0), 0);
  const d = Math.sqrt(area / (n * 0.92));
  const pts: number[] = [];
  for (const p of m.parts) {
    const nx = Math.max(2, Math.round((p.x1 - p.x0) / d));
    const ny = Math.max(2, Math.round((p.y1 - p.y0) / d));
    for (let a = 0; a < nx; a++) {
      for (let b = 0; b < ny; b++) {
        const x = p.x0 + ((a + 0.5) / nx) * (p.x1 - p.x0);
        const y = p.y0 + ((b + 0.5) / ny) * (p.y1 - p.y0);
        let cls: number =
          p.kind === "panel" ? PANEL : p.kind === "bus" ? BUS : APP.Ink;
        // Busbars and frames: every fourth row and column of a panel, and its edges.
        if (
          p.kind === "panel" &&
          (a % 4 === 0 || b % 6 === 0 || a === nx - 1 || b === ny - 1)
        )
          cls = APP.Ink;
        if (
          p.kind === "bus" &&
          (a === 0 || b === 0 || a === nx - 1 || b === ny - 1)
        )
          cls = APP.Ink;
        pts.push(x, y, p.z, cls);
      }
    }
  }
  for (const [x, y] of m.dishes) {
    for (let k = 0; k < 10; k++)
      pts.push(
        x + 0.14 * Math.cos((k / 10) * TAU),
        y + 0.14 * Math.sin((k / 10) * TAU),
        m.parts[0].z + 0.15,
        APP.Ink,
      );
  }
  const have = pts.length / 4;
  const out = new Float32Array(4 * n);
  for (let i = 0; i < n; i++) {
    const j = Math.floor((i * have) / n);
    out.set(pts.slice(4 * j, 4 * j + 4), 4 * i);
  }
  return out;
}

/**
 * Select and Follow, in dots. The 53° shell over a perspective Earth, one
 * real V1.5 picked out with its selection card and its orbit, faint behind
 * and bright ahead. Follow flies the camera to it in log-distance along a
 * great-circle arc and rides 20 m off it, over the ocean. The shell's dots
 * then assemble its model, and swap to a V2 Mini and a V3, each framed to
 * fit as the app frames its close-ups.
 */
export class FollowScene implements Scene {
  private shell: Shell | null = null;
  private earth: Earth | null = null;
  private pos = new Float64Array(0);
  private models: Float32Array[] = [];
  private modelN = 0;
  private world = new DotWorld();
  private cam = new Camera();
  private t = 0;
  private p = 0;
  private flight = 0;
  private gen = 0;
  private frame: Box = { x: 0, y: 0, w: 1, h: 1 };
  private l: AppLayout = appLayout({ x: 0, y: 0, w: 1, h: 1 }, false);
  private type = new AppType();
  private steps = new Steps();
  private size = new StageSize();
  private sun = new Float64Array(3);
  private sat = new Float64Array(3);
  private sp = new Float64Array(3);
  private axes: Vec3[] = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];

  layout(f: Field, fr: Frame) {
    this.frame = freeArea(fr, 14);
    this.modelN = Math.round(f.n * 0.34);
    this.models = MODELS.map((m) => sampleModel(m, this.modelN));
    loadEarth().then((earth) => {
      this.earth = earth;
    });
    loadShell().then((shell) => {
      if (!shell || this.shell) return;
      this.shell = shell;
      this.pos = new Float64Array(3 * shell.n);
    });
    this.type.read(fr.section);
    this.steps.collect(fr.section);
  }

  leave() {
    // Each visit starts at the snapshot, over the Pacific.
    this.t = 0;
  }

  /** The followed satellite, Earth-fixed, `dt` seconds from now. */
  private satAt(dt: number, out: Float64Array) {
    const s = this.shell as Shell;
    const k = FOLLOWED.k;
    const t = this.t + dt;
    const theta = s.gmst + OMEGA_EARTH * t;
    const u = s.phase[k] + s.rate[k] * t;
    const node = s.raan[k] + s.nodeRate[k] * t - theta;
    const r = s.radius[k];
    out[0] =
      r *
      (Math.cos(u) * Math.cos(node) - Math.sin(u) * s.cosI[k] * Math.sin(node));
    out[1] =
      r *
      (Math.cos(u) * Math.sin(node) + Math.sin(u) * s.cosI[k] * Math.cos(node));
    out[2] = r * Math.sin(u) * s.sinI[k];
    return out;
  }

  /** Whether the Earth hides a point from the camera. */
  private hidden(x: number, y: number, z: number) {
    const c = this.cam.pos;
    const vx = x - c[0];
    const vy = y - c[1];
    const vz = z - c[2];
    const vv = vx * vx + vy * vy + vz * vz;
    const t = -(c[0] * vx + c[1] * vy + c[2] * vz) / vv;
    if (t <= 0 || t >= 1) return false;
    const px = c[0] + t * vx;
    const py = c[1] + t * vy;
    const pz = c[2] + t * vz;
    return px * px + py * py + pz * pz < RE * RE;
  }

  update(f: Field, fr: Frame) {
    if (this.size.changed(fr)) this.layout(f, fr);
    const p = fr.progress;
    const step = stepAt(p, STEP_AT);
    this.p = p;
    this.steps.set(step);
    f.classColors = FOLLOW_COLORS;
    const b = this.frame;
    this.l = appLayout(
      { x: fr.visual.x + b.x, y: fr.visual.y + b.y, w: b.w, h: b.h },
      false,
    );
    const l = this.l;
    const vw = l.view;
    const shell = this.shell;
    // A minute a second in the overview, real time once riding along.
    this.flight = smoothstep(STEP_AT[1] + 0.01, STEP_AT[2] - 0.03, p);
    if (!fr.reduced)
      this.t += fr.dt * lerp(10, 1, smoothstep(0, 0.4, this.flight));
    const cam = this.cam;
    cam.cx = vw.x + vw.w / 2;
    cam.cy = vw.y + vw.h / 2 + 6;
    cam.focal = vw.h * 1.15;
    const theta = (shell?.gmst ?? 0) + OMEGA_EARTH * this.t;
    sunDirection((shell?.jd ?? 2461323.39) + this.t / 86400, theta, this.sun);

    // Which close-up, and the distance that frames it: the span fills about
    // half the view, so the three aren't to scale.
    const genF =
      step < 3
        ? 0
        : step === 3
          ? smoothstep(STEP_AT[3], STEP_AT[3] + 0.06, p)
          : 1 + smoothstep(STEP_AT[4], STEP_AT[4] + 0.06, p);
    this.gen = Math.min(2, Math.round(genF));
    const spans = [10.6, 29.6, 60];
    const g0 = Math.min(1, Math.floor(genF));
    const span = Math.exp(
      lerp(Math.log(spans[g0]), Math.log(spans[g0 + 1]), genF - g0),
    );
    const rideKm = ((span * cam.focal) / (0.62 * vw.w)) * 1e-3;

    if (shell) {
      const sat = this.satAt(0, this.sat);
      // The satellite's own frame: along track, across, up.
      const ahead = this.satAt(1, new Float64Array(3));
      const zen = unitOf(sat);
      const along0 = unitOf([
        ahead[0] - sat[0],
        ahead[1] - sat[1],
        ahead[2] - sat[2],
      ]);
      const across = unitOf([
        zen[1] * along0[2] - zen[2] * along0[1],
        zen[2] * along0[0] - zen[0] * along0[2],
        zen[0] * along0[1] - zen[1] * along0[0],
      ]);
      const along = unitOf([
        across[1] * zen[2] - across[2] * zen[1],
        across[2] * zen[0] - across[0] * zen[2],
        across[0] * zen[1] - across[1] * zen[0],
      ]);
      this.axes = [along, across, zen];
      const rideDir = unitOf([
        RIDE[0] * along[0] + RIDE[1] * across[0] + RIDE[2] * zen[0],
        RIDE[0] * along[1] + RIDE[1] * across[1] + RIDE[2] * zen[1],
        RIDE[0] * along[2] + RIDE[1] * across[2] + RIDE[2] * zen[2],
      ]);
      // The overview: far out over the North Atlantic, the Earth's disc filling a third.
      const faceDir: Vec3 = [
        Math.cos(FACE.lat * DEG) * Math.cos(FACE.lon * DEG),
        Math.cos(FACE.lat * DEG) * Math.sin(FACE.lon * DEG),
        Math.sin(FACE.lat * DEG),
      ];
      const far =
        RE * Math.sqrt(1 + (cam.focal / (Math.min(vw.w, vw.h) * 0.4)) ** 2);
      const startPos: Vec3 = [
        faceDir[0] * far,
        faceDir[1] * far,
        faceDir[2] * far,
      ];
      const u = this.flight;
      // Flown in log-distance from the satellite, swinging round on a great circle.
      const fromSat: Vec3 = [
        startPos[0] - sat[0],
        startPos[1] - sat[1],
        startPos[2] - sat[2],
      ];
      const d0 = Math.hypot(...fromSat);
      const d = Math.exp(lerp(Math.log(d0), Math.log(rideKm), u));
      const dir = slerp(unitOf(fromSat), rideDir, smoothstep(0.05, 0.85, u));
      const pos: Vec3 = [
        sat[0] + dir[0] * d,
        sat[1] + dir[1] * d,
        sat[2] + dir[2] * d,
      ];
      const toEarth = unitOf([-pos[0], -pos[1], -pos[2]]);
      const toSat = unitOf([sat[0] - pos[0], sat[1] - pos[1], sat[2] - pos[2]]);
      const lookDir = slerp(toEarth, toSat, smoothstep(0.0, 0.45, u));
      cam.pos = pos;
      cam.lookAlong(lookDir, slerp([0, 0, 1], zen, u));

      shellPositions(shell, this.t, this.pos);
    }

    // Particles: the shell (and then the model), the Earth, stars.
    const M = this.modelN;
    const E = Math.round(f.n * 0.44);
    const model = this.models[this.gen];
    const assembled = this.flight > 0.9;
    const sp = this.sp;
    for (let i = 0; i < M && i < f.n; i++) {
      f.gh[i] = 0;
      if (!shell) {
        f.ga[i] = 0;
        continue;
      }
      if (assembled && model) {
        const [ax, ac, az] = this.axes;
        const mx = model[4 * (i % this.modelN)] * 1e-3;
        const my = model[4 * (i % this.modelN) + 1] * 1e-3;
        const mz = model[4 * (i % this.modelN) + 2] * 1e-3;
        const s = this.sat;
        cam.project(
          s[0] + mx * ax[0] + my * ac[0] + mz * az[0],
          s[1] + mx * ax[1] + my * ac[1] + mz * az[1],
          s[2] + mx * ax[2] + my * ac[2] + mz * az[2],
          sp,
        );
        const cls = model[4 * (i % this.modelN) + 3];
        f.gx[i] = sp[0];
        f.gy[i] = sp[1];
        f.gc[i] = cls;
        f.ga[i] = sp[2] > 0 ? (cls === APP.Ink ? 0.95 : 0.9) : 0;
        f.gz[i] = fr.compact ? 1.6 : 2.1;
        f.gj[i] = 0;
        continue;
      }
      const k = Math.floor((i * shell.n) / M);
      const x = this.pos[3 * k];
      const y = this.pos[3 * k + 1];
      const z = this.pos[3 * k + 2];
      const scale = cam.project(x, y, z, sp);
      const off = sp[2] <= 0 || this.hidden(x, y, z);
      f.gx[i] = sp[0];
      f.gy[i] = sp[1];
      f.gc[i] = APP.Starlink;
      f.ga[i] = off
        ? 0
        : (0.6 + 0.35 * f.r3[i]) * (1 - smoothstep(0.75, 0.9, this.flight));
      f.gz[i] = Math.min(3, Math.max(1.2, scale * 1.2));
      f.gj[i] = 0.02;
    }
    this.world.place(
      f,
      M,
      E,
      cam,
      [0, 0, 0],
      {
        radius: RE,
        polar: RE,
        orient: [1, 0, 0, 0, 1, 0, 0, 0, 1],
        sun: this.sun,
        sample: earthSampler(this.earth),
      },
      vw,
      { alpha: lerp(1, 0.85, this.flight), maxSize: fr.compact ? 2.4 : 3.2 },
    );
    // Dots behind the selection card show dimly, as through the app's glass.
    const card = this.cardBox();
    const cardIn = 1 - smoothstep(STEP_AT[2], STEP_AT[2] + 0.05, p);
    if (card && cardIn > 0.01) {
      for (let i = 0; i < M + E && i < f.n; i++) {
        const x = f.gx[i];
        const y = f.gy[i];
        if (
          x > card.x &&
          x < card.x + card.w &&
          y > card.y &&
          y < card.y + card.h
        )
          f.ga[i] *= 1 - 0.8 * cardIn;
      }
    }
    const fill = smoothstep(0.55, 0.85, this.flight);
    for (let i = M + E; i < f.n; i++) {
      const x = vw.x + 2 + f.r0[i] * (vw.w - 4);
      const y = vw.y + f.r1[i] * vw.h;
      const dx = x - this.world.cx;
      const dy = y - this.world.cy;
      const onDisc = dx * dx + dy * dy < (this.world.r * 1.03) ** 2;
      const bright = f.r2[i] ** 6;
      f.gx[i] = x;
      f.gy[i] = y;
      f.ga[i] = onDisc ? 0 : (0.12 + 0.7 * bright) * 0.9 * (1 - fill);
      f.gz[i] = 0.7 + bright * 1.2;
      f.gc[i] = APP.Ink;
      f.gh[i] = 0;
      f.gj[i] = 0.02;
    }
  }

  /** The selected orbit: samples densest at the satellite, bright ahead, faint behind. */
  private orbit(ctx: CanvasRenderingContext2D, alpha: number) {
    const s = this.shell;
    if (!s || alpha < 0.01) return;
    const period = TAU / s.rate[FOLLOWED.k];
    const q = new Float64Array(3);
    const sp = this.sp;
    let prev: [number, number] | null = null;
    ctx.lineWidth = 1.2;
    for (let j = -120; j <= 120; j++) {
      const u = j / 120;
      const dt = Math.sign(u) * Math.abs(u) ** 3 * period * 0.5;
      this.satAt(dt, q);
      this.cam.project(q[0], q[1], q[2], sp);
      const off = sp[2] <= 0 || this.hidden(q[0], q[1], q[2]);
      if (off) {
        prev = null;
        continue;
      }
      if (prev) {
        ctx.strokeStyle = ink((u > 0 ? 0.85 * (1 - u * 0.6) : 0.22) * alpha);
        ctx.beginPath();
        ctx.moveTo(prev[0], prev[1]);
        ctx.lineTo(sp[0], sp[1]);
        ctx.stroke();
      }
      prev = [sp[0], sp[1]];
    }
  }

  private cardBox(): Box | null {
    const l = this.l;
    if (!l.wide) return null;
    const w = 214;
    return {
      x: l.frame.x + l.frame.w - w - 14,
      y: l.frame.y + l.header + 10,
      w,
      h: 222,
    };
  }

  /** The selection card, as the app's: name, group, hero numbers, facts, Follow. */
  private card(ctx: CanvasRenderingContext2D, alpha: number) {
    const s = this.shell;
    const box = this.cardBox();
    if (!s || !box || alpha < 0.01) return;
    const k = FOLLOWED.k;
    const type = this.type;
    drawPanelBack(ctx, box, alpha);
    ctx.strokeStyle = ink(0.18 * alpha);
    ctx.strokeRect(box.x + 0.5, box.y + 0.5, box.w - 1, box.h - 1);
    const x = box.x + 14;
    let y = box.y + 20;
    ctx.fillStyle = rgbaOf(APP_COLORS[APP.Starlink - 1], alpha);
    ctx.fillRect(x, y - 6, 3, 12);
    type.text(ctx, FOLLOWED.name, x + 10, y - 1, {
      size: 10.5,
      weight: 500,
      spacing: 0.06,
      alpha,
    });
    type.text(ctx, `Starlink · LEO · #${FOLLOWED.norad}`, x + 10, y + 12, {
      size: 7.5,
      weight: 400,
      alpha: 0.5 * alpha,
    });
    type.text(ctx, "×", box.x + box.w - 16, y, {
      size: 11,
      weight: 300,
      align: "center",
      alpha: 0.6 * alpha,
    });
    y += 40;
    const alt = s.radius[k] - RE;
    const speed = s.radius[k] * s.rate[k];
    const hero: [string, string, string][] = [
      [Math.round(alt).toLocaleString("en-US"), "km", "altitude"],
      [speed.toFixed(2), "km/s", "speed"],
    ];
    hero.forEach(([v, unit, name], c) => {
      const hx = x + c * 96;
      const vw = type.text(ctx, v, hx, y, { size: 20, weight: 400, alpha });
      type.text(ctx, unit, hx + vw + 4, y + 3, {
        size: 7.5,
        weight: 400,
        alpha: 0.6 * alpha,
      });
      type.text(ctx, name.toUpperCase(), hx, y + 18, {
        size: 6.5,
        spacing: 0.14,
        alpha: 0.46 * alpha,
      });
    });
    y += 38;
    const sub = this.sat;
    const lat = Math.asin(sub[2] / Math.hypot(sub[0], sub[1], sub[2])) / DEG;
    const lon = Math.atan2(sub[1], sub[0]) / DEG;
    const facts: [string, string][] = [
      ["Period", `${(TAU / s.rate[k] / 60).toFixed(1)} min`],
      ["Inclination", `${(Math.acos(s.cosI[k]) / DEG).toFixed(1)}°`],
      [
        "Over",
        `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? "N" : "S"} ${Math.abs(lon).toFixed(2)}°${lon >= 0 ? "E" : "W"}`,
      ],
    ];
    for (const [name, v] of facts) {
      ctx.fillStyle = ink(0.08 * alpha);
      ctx.fillRect(x, y - 9, box.w - 28, 1);
      type.text(ctx, name, x, y + 1, {
        size: 8,
        weight: 400,
        alpha: 0.55 * alpha,
      });
      type.text(ctx, v, box.x + box.w - 14, y + 1, {
        size: 8.5,
        weight: 400,
        align: "right",
        alpha,
      });
      y += 19;
    }
    y += 10;
    const following = this.flight > 0.02;
    const by = box.y + box.h - 34;
    if (following) {
      ctx.strokeStyle = ink(0.4 * alpha);
      ctx.strokeRect(x + 0.5, by + 0.5, box.w - 29, 22);
    } else {
      ctx.fillStyle = ink(0.95 * alpha);
      ctx.fillRect(x, by, box.w - 28, 23);
    }
    type.text(
      ctx,
      following ? "Stop following" : "Follow",
      box.x + box.w / 2,
      by + 12,
      {
        size: 8.5,
        weight: 500,
        align: "center",
        alpha,
        color: following ? undefined : [6, 8, 12],
      },
    );
  }

  draw(ctx: CanvasRenderingContext2D) {
    const l = this.l;
    const type = this.type;
    const shell = this.shell;
    ctx.save();
    ctx.beginPath();
    ctx.rect(
      l.frame.x,
      l.frame.y + l.header,
      l.frame.w,
      l.frame.h - l.header - l.dock,
    );
    ctx.clip();
    if (shell) {
      this.orbit(ctx, 1 - smoothstep(0.92, 1, this.flight) * 0.4);
      const sp = this.sp;
      this.cam.project(this.sat[0], this.sat[1], this.sat[2], sp);
      if (this.flight < 0.9 && sp[2] > 0) {
        // The selection: a ring, as the app marks it, and the name.
        const a = 1 - smoothstep(0.7, 0.9, this.flight);
        ctx.strokeStyle = ink(0.95 * a);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(sp[0], sp[1], 7, 0, TAU);
        ctx.stroke();
        type.text(ctx, FOLLOWED.name, sp[0] + 12, sp[1] - 10, {
          size: 8,
          spacing: 0.14,
          alpha: a,
        });
      }
      if (this.flight > 0.9) this.dimension(ctx);
    }
    ctx.restore();
    drawChrome(ctx, type, l, {
      mode: "Explore",
      t: this.t,
      warp: this.flight > 0.2 ? "1×" : "10×",
      legend: this.flight > 0.5 ? false : undefined,
      flyTo: null,
    });
    this.card(ctx, 1 - smoothstep(STEP_AT[2], STEP_AT[2] + 0.05, this.p));
    drawWindow(ctx, l);
  }

  /** A dimension line along the array, with the model's name and span. */
  private dimension(ctx: CanvasRenderingContext2D) {
    const m = MODELS[this.gen];
    const ys = m.parts.flatMap((p) => [p.y0, p.y1]);
    const y0 = Math.min(...ys);
    const y1 = Math.max(...ys);
    const xEdge = Math.min(...m.parts.map((p) => p.x0)) - 1.2;
    const [ax, ac, az] = this.axes;
    const s = this.sat;
    const at = (x: number, y: number) => {
      const out = new Float64Array(3);
      this.cam.project(
        s[0] + (x * ax[0] + y * ac[0]) * 1e-3 + az[0] * 1e-4,
        s[1] + (x * ax[1] + y * ac[1]) * 1e-3 + az[1] * 1e-4,
        s[2] + (x * ax[2] + y * ac[2]) * 1e-3 + az[2] * 1e-4,
        out,
      );
      return out;
    };
    const a = at(xEdge, y0);
    const b = at(xEdge, y1);
    if (a[2] <= 0 || b[2] <= 0) return;
    ctx.strokeStyle = ink(0.7);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    const nx = -(b[1] - a[1]);
    const ny = b[0] - a[0];
    const nl = Math.hypot(nx, ny) || 1;
    for (const q of [a, b]) {
      ctx.moveTo(q[0] + (nx / nl) * 5, q[1] + (ny / nl) * 5);
      ctx.lineTo(q[0] - (nx / nl) * 5, q[1] - (ny / nl) * 5);
    }
    ctx.stroke();
    const mx = (a[0] + b[0]) / 2;
    const my = (a[1] + b[1]) / 2;
    // Outward, away from the model.
    const side = ny > 0 ? 1 : -1;
    this.type.text(
      ctx,
      `${m.name} · ${m.span}`,
      mx + side * (nx / nl) * 18,
      my + side * (ny / nl) * 18,
      {
        size: 8.5,
        spacing: 0.14,
        align: "center",
        alpha: 0.95,
      },
    );
  }
}
