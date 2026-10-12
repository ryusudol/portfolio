import { lerp, smoothstep, TAU } from "../math";
import {
  type AppLayout,
  AppType,
  appLayout,
  type Box,
  drawChrome,
  drawWindow,
  INK,
  rgbaOf,
  WORLDS,
} from "../orbit-app";
import {
  AU,
  C_KM_S,
  Camera,
  inBox,
  loadSolar,
  type Solar,
  skyStar,
  unitOf,
  type Vec3,
} from "../orbit-worlds";
import { fmt, freeArea, Readouts, StageSize, Steps, stepAt } from "../story";
import type { Field, Frame, RGB, Scene } from "../types";

const STEP_AT = [0, 0.2, 0.4, 0.6, 0.78] as const;
const DEG = Math.PI / 180;
const VOYAGER: RGB = [221, 170, 51];
const SHELL: RGB = [140, 170, 230];
const CLASSICAL: RGB = [207, 217, 230];
const SCATTERED: RGB = [230, 195, 163];
/** Class slots: the eight planets, then ink, the belt's two, the Voyagers, the heliosphere. */
const PLANET_IDS = [
  "mercury",
  "venus",
  "earth",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
];
const PLANET_COLORS = PLANET_IDS.map(
  (id) => WORLDS.find((w) => w.id === id)?.hex as unknown as RGB,
);
const INKC = 9;
const BELT = 10;
const FAR_BELT = 11;
const VOY = 12;
const HELIO = 13;
const COLORS: RGB[] = [
  ...PLANET_COLORS,
  INK,
  CLASSICAL,
  SCATTERED,
  VOYAGER,
  SHELL,
];
const MODES = ["Explore", "Spacecraft"] as const;
/** Where the interstellar wind comes from (ecliptic λ 255.7°, β 5.1°): the heliosphere's nose. */
const NOSE: Vec3 = [
  Math.cos(5.1 * DEG) * Math.cos(255.7 * DEG),
  Math.cos(5.1 * DEG) * Math.sin(255.7 * DEG),
  Math.sin(5.1 * DEG),
];

/** The app's deterministic random numbers (`scene/heliosphere.ts`), so the cloud is its cloud. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Radii from a population whose number density goes as r^−3.5, between r0 and r1. */
const powerLawR = (u: number, r0: number, r1: number) => {
  const a = r0 ** -0.5;
  const b = r1 ** -0.5;
  return (a - u * (a - b)) ** -2;
};

/** The model Oort cloud as the app builds it, `n` points, ecliptic au. */
function oortCloud(n: number) {
  const rand = rng(1950);
  const inner = Math.round(n * 0.24);
  const out = new Float32Array(3 * n);
  for (let k = 0; k < n; k++) {
    const isInner = k < inner;
    const r = isInner
      ? powerLawR(rand(), 2_000, 20_000)
      : powerLawR(rand(), 20_000, 100_000);
    const z0 = rand() * 2 - 1;
    const t = rand() * TAU;
    const q = Math.sqrt(1 - z0 * z0);
    // The inner cloud is a thick disc near its inner edge, rounding out with distance.
    const flat = isInner ? 0.3 + 0.7 * Math.min(1, (r - 2_000) / 16_000) : 1;
    out[3 * k] = q * Math.cos(t) * r;
    out[3 * k + 1] = q * Math.sin(t) * r;
    out[3 * k + 2] = z0 * r * flat;
  }
  return out;
}

/** A boundary of the heliosphere: `nose` au toward the nose, opening into a tail up to `tail`. */
function shell(n: number, nose: number, flare: number, tail: number) {
  const e1 = unitOf([-NOSE[1], NOSE[0], 0]);
  const e2: Vec3 = [
    NOSE[1] * e1[2] - NOSE[2] * e1[1],
    NOSE[2] * e1[0] - NOSE[0] * e1[2],
    NOSE[0] * e1[1] - NOSE[1] * e1[0],
  ];
  const out = new Float32Array(3 * n);
  for (let k = 0; k < n; k++) {
    // A Fibonacci sphere, x along the nose.
    const cos = 1 - (2 * (k + 0.5)) / n;
    const sin = Math.sqrt(1 - cos * cos);
    const a = k * 2.399963;
    const r = Math.min(tail, nose * (2 / Math.max(1 + cos, 0.02)) ** flare);
    const y = sin * Math.cos(a);
    const z = sin * Math.sin(a);
    for (let c = 0; c < 3; c++)
      out[3 * k + c] = r * (cos * NOSE[c] + y * e1[c] + z * e2[c]);
  }
  return out;
}

const lightTime = (au: number) => {
  const s = (au * AU) / C_KM_S;
  const h = s / 3600;
  if (h < 1) return `${Math.round(s / 60)} light-minutes`;
  if (h < 48)
    return `${h < 1.5 ? "1 light-hour" : `${Math.round(h)} light-hours`}`;
  if (h < 24 * 365) return `${Math.round(h / 24)} light-days`;
  return `${(h / 24 / 365.25).toFixed(1)} light-years`;
};

/**
 * The solar system from outside, in dots: a log zoom of five decades, from
 * the planets' orbits through the real Kuiper belt (all 7,299 known
 * trans-Neptunian objects, sampled to fit), the Voyagers' paths and the
 * heliopause they crossed, out to the model Oort cloud the belt's dots
 * scatter into, with the app's light-time distance rings.
 */
export class HeliosphereScene implements Scene {
  private solar: Solar | null = null;
  private cam = new Camera();
  private oort = new Float32Array(0);
  private pause = new Float32Array(0);
  private shock = new Float32Array(0);
  private frame: Box = { x: 0, y: 0, w: 1, h: 1 };
  private l: AppLayout = appLayout({ x: 0, y: 0, w: 1, h: 1 }, false);
  private type = new AppType();
  private steps = new Steps();
  private readouts = new Readouts();
  private size = new StageSize();
  private E = 2;
  private dist = 1;
  private sp = new Float64Array(3);
  private fade = { orbits: 1, belt: 0, voyagers: 0, shells: 0, cloud: 0 };

  layout(f: Field, fr: Frame) {
    this.frame = freeArea(fr, 14);
    loadSolar().then((s) => {
      this.solar = s;
    });
    this.oort = oortCloud(Math.round(f.n * 0.62));
    const sh = Math.round(f.n * 0.15);
    this.pause = shell(Math.round(sh * 0.62), 122, 0.45, 380);
    this.shock = shell(sh - Math.round(sh * 0.62), 90, 0.25, 160);
    this.type.read(fr.section);
    this.steps.collect(fr.section);
    this.readouts.collect(fr.section);
  }

  update(f: Field, fr: Frame) {
    if (this.size.changed(fr)) this.layout(f, fr);
    const p = fr.progress;
    const step = stepAt(p, STEP_AT);
    this.steps.set(step);
    f.classColors = COLORS;
    const b = this.frame;
    this.l = appLayout(
      { x: fr.visual.x + b.x, y: fr.visual.y + b.y, w: b.w, h: b.h },
      false,
    );
    const vw = this.l.view;
    const cam = this.cam;
    cam.cx = vw.x + vw.w / 2;
    cam.cy = vw.y + vw.h / 2 + 6;
    cam.focal = vw.h * 1.15;
    // Five decades of zoom, eased step by step.
    const knots: [number, number][] = [
      [0, 1.9],
      [0.16, 33],
      [0.36, 62],
      [0.56, 190],
      [0.74, 420],
      [0.97, 140_000],
    ];
    let lg = Math.log(knots[0][1]);
    for (let k = 1; k < knots.length; k++) {
      const [p0, e0] = knots[k - 1];
      const [p1, e1] = knots[k];
      if (p >= p0) lg = lerp(Math.log(e0), Math.log(e1), smoothstep(p0, p1, p));
    }
    const E = Math.exp(lg);
    this.E = E;
    const dist = (E * cam.focal) / (0.46 * Math.min(vw.w, vw.h));
    this.dist = dist;
    // From above the ecliptic, slowly round toward the heliosphere's nose.
    const az = (200 + 70 * p) * DEG;
    const el = lerp(32, 22, p) * DEG;
    cam.lookAt(
      [
        Math.cos(el) * Math.cos(az) * dist,
        Math.cos(el) * Math.sin(az) * dist,
        Math.sin(el) * dist,
      ],
      [0, 0, 0],
      [0, 0, 1],
    );

    const ls = (x: number, a: number, c: number) =>
      smoothstep(Math.log(a), Math.log(c), Math.log(x));
    const fade = this.fade;
    fade.orbits = 1 - ls(E, 300, 1500);
    fade.belt = ls(E, 12, 30) * (1 - ls(E, 1200, 4000));
    fade.voyagers = ls(E, 50, 120) * (1 - ls(E, 2500, 9000));
    fade.shells = ls(E, 150, 330) * (1 - 0.7 * ls(E, 3000, 30_000));
    fade.cloud = ls(E, 900, 4000);

    const s = this.solar;
    const A = Math.round(f.n * 0.12);
    const B = Math.round(f.n * 0.45);
    const C = Math.round(f.n * 0.08);
    const D = Math.round(f.n * 0.15);
    const sp = this.sp;
    let shown = 0;
    const put = (
      i: number,
      x: number,
      y: number,
      z: number,
      cls: number,
      a: number,
      size: number,
    ) => {
      cam.project(x, y, z, sp);
      const vis = sp[2] > 0 && inBox(vw, sp[0], sp[1]) && a > 0.01;
      f.gx[i] = sp[0];
      f.gy[i] = sp[1];
      f.gc[i] = cls;
      f.ga[i] = vis ? Math.min(1, a) : 0;
      f.gz[i] = size;
      f.gh[i] = 0;
      f.gj[i] = 0.01;
      if (vis) shown++;
    };
    // The planets' orbits, dotted.
    for (let k = 0; k < A && k < f.n; k++) {
      if (!s) {
        f.ga[k] = 0;
        continue;
      }
      const per = A / s.planets.length;
      const pl = Math.min(s.planets.length - 1, Math.floor(k / per));
      const o = s.planets[pl].orbit;
      const m = o.length / 3;
      const j = Math.floor(((k - pl * per) / per) * m) % m;
      put(
        k,
        o[3 * j],
        o[3 * j + 1],
        o[3 * j + 2],
        pl + 1,
        0.55 * fade.orbits,
        1.1,
      );
    }
    // The Kuiper belt, then the Oort cloud: the belt's dots scatter out to the cloud.
    const cloudIn = smoothstep(0.3, 0.85, fade.cloud);
    for (let k = 0; k < B; k++) {
      const i = A + k;
      if (i >= f.n) break;
      if (cloudIn > 0.01 && 3 * k + 2 < this.oort.length) {
        const r = Math.hypot(
          this.oort[3 * k],
          this.oort[3 * k + 1],
          this.oort[3 * k + 2],
        );
        // From afar the inner edge would pile up; dim each point by its depth into the cloud.
        const dim = Math.min(1, (r / 20_000) ** (1.3 * ls(E, 25_000, 250_000)));
        put(
          i,
          this.oort[3 * k],
          this.oort[3 * k + 1],
          this.oort[3 * k + 2],
          INKC,
          (0.25 + 0.5 * f.r2[i]) * dim * cloudIn,
          1.2,
        );
        continue;
      }
      if (!s) {
        f.ga[i] = 0;
        continue;
      }
      const t = s.tno;
      const j = Math.floor((k * t.n) / B);
      put(
        i,
        t.x[j],
        t.y[j],
        t.z[j],
        t.far[j] ? FAR_BELT : BELT,
        (0.5 + 0.4 * f.r3[i]) * fade.belt,
        1.3,
      );
    }
    // The Voyagers' paths since 1977.
    for (let k = 0; k < C; k++) {
      const i = A + B + k;
      if (i >= f.n) break;
      if (!s || !s.voyagers.length) {
        f.ga[i] = 0;
        continue;
      }
      const v = s.voyagers[k % s.voyagers.length];
      const m = v.length / 3;
      const j = Math.floor(
        (Math.floor(k / s.voyagers.length) / (C / s.voyagers.length)) * m,
      );
      put(
        i,
        v[3 * j],
        v[3 * j + 1],
        v[3 * j + 2],
        VOY,
        0.85 * fade.voyagers,
        1.25,
      );
    }
    // The termination shock and the heliopause, rim-lit as the app draws them.
    const view = unitOf(cam.fwd);
    for (let k = 0; k < D; k++) {
      const i = A + B + C + k;
      if (i >= f.n) break;
      const pts = k < this.pause.length / 3 ? this.pause : this.shock;
      const j = k < this.pause.length / 3 ? k : k - this.pause.length / 3;
      const x = pts[3 * j];
      const y = pts[3 * j + 1];
      const z = pts[3 * j + 2];
      const r = Math.hypot(x, y, z) || 1;
      const facing = Math.abs((x * view[0] + y * view[1] + z * view[2]) / r);
      const rim = (1 - facing) ** 2.2;
      put(
        i,
        x,
        y,
        z,
        HELIO,
        (0.1 + 0.75 * rim) * fade.shells * (pts === this.shock ? 0.6 : 1),
        1.15,
      );
    }
    for (let i = A + B + C + D; i < f.n; i++)
      skyStar(f, i, cam, vw, 0.75, INKC);

    this.readouts.write("distance", `${fmt(dist)} au`);
    this.readouts.write("light", lightTime(dist));
    this.readouts.write("dots", fmt(shown));
  }

  draw(ctx: CanvasRenderingContext2D) {
    const l = this.l;
    const type = this.type;
    const cam = this.cam;
    const s = this.solar;
    const sp = this.sp;
    const fade = this.fade;
    const vw = l.view;
    ctx.save();
    ctx.beginPath();
    ctx.rect(vw.x, vw.y, vw.w, vw.h);
    ctx.clip();
    // Distance rings in the ecliptic, each while it is a sensible size.
    ctx.lineWidth = 1;
    for (const au of [1, 10, 100, 1_000, 10_000, 100_000]) {
      const px = (au / this.dist) * cam.focal;
      const a =
        smoothstep(18, 60, px) * (1 - smoothstep(vw.h * 0.7, vw.h * 1.4, px));
      if (a < 0.02) continue;
      ctx.strokeStyle = rgbaOf(SHELL, 0.32 * a);
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      for (let k = 0; k <= 128; k++) {
        const t = (k / 128) * TAU;
        cam.project(au * Math.cos(t), au * Math.sin(t), 0, sp);
        if (k) ctx.lineTo(sp[0], sp[1]);
        else ctx.moveTo(sp[0], sp[1]);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      cam.project(0, -au, 0, sp);
      type.text(
        ctx,
        `${au.toLocaleString("en-US")} au · ${lightTime(au)}`,
        sp[0] + 6,
        sp[1] + 10,
        {
          size: 7,
          spacing: 0.1,
          alpha: 0.6 * a,
        },
      );
    }
    // The Sun, and the planets where they are now.
    cam.project(0, 0, 0, sp);
    const glow = ctx.createRadialGradient(sp[0], sp[1], 0, sp[0], sp[1], 9);
    glow.addColorStop(0, "rgba(255,244,220,1)");
    glow.addColorStop(1, "rgba(255,220,170,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(sp[0], sp[1], 9, 0, TAU);
    ctx.fill();
    type.text(ctx, "SUN", sp[0] + 10, sp[1] + 1, {
      size: 7,
      spacing: 0.16,
      alpha: 0.85 * Math.max(fade.orbits, 0.4),
    });
    if (s && fade.orbits > 0.05) {
      s.planets.forEach((pl, k) => {
        cam.project(pl.now[0], pl.now[1], pl.now[2], sp);
        const r = Math.hypot(pl.now[0], pl.now[1]);
        const px = (r / this.dist) * cam.focal;
        if (px < 14 || !inBox(vw, sp[0], sp[1])) return;
        ctx.fillStyle = rgbaOf(PLANET_COLORS[k], fade.orbits);
        ctx.beginPath();
        ctx.arc(sp[0], sp[1], 2.6, 0, TAU);
        ctx.fill();
        type.text(ctx, PLANET_IDS[k].toUpperCase(), sp[0] + 6, sp[1] - 6, {
          size: 7,
          spacing: 0.16,
          alpha: 0.85 * fade.orbits,
        });
      });
    }
    // Region names, each at the scale where it means something.
    const region = (
      text: string,
      x: number,
      y: number,
      z: number,
      a: number,
    ) => {
      if (a < 0.02) return;
      cam.project(x, y, z, sp);
      if (!inBox(vw, sp[0], sp[1])) return;
      type.text(ctx, text, sp[0], sp[1], {
        size: 8.5,
        spacing: 0.22,
        align: "center",
        alpha: 0.9 * a,
      });
    };
    // The two boundaries are labelled on opposite flanks, where they are widest.
    const side = unitOf([-NOSE[1], NOSE[0], 0]);
    const kuiper = fade.belt * (1 - smoothstep(110, 200, this.E));
    region("KUIPER BELT", 0, 47, 5, kuiper);
    const bound = fade.shells * (1 - fade.cloud * 0.9);
    region(
      "HELIOPAUSE",
      -side[0] * 166,
      -side[1] * 166,
      -side[2] * 166 + 20,
      bound,
    );
    region(
      "TERMINATION SHOCK",
      side[0] * 107,
      side[1] * 107,
      side[2] * 107 - 14,
      bound * 0.85,
    );
    region(
      "INNER OORT CLOUD",
      9_000,
      0,
      0,
      fade.cloud *
        smoothstep(5_000, 15_000, this.E) *
        (1 - smoothstep(60_000, 120_000, this.E)),
    );
    region(
      "OUTER OORT CLOUD (MODELLED)",
      0,
      0,
      62_000,
      fade.cloud * smoothstep(30_000, 80_000, this.E),
    );
    if (s && fade.voyagers > 0.05) {
      s.voyagers.forEach((v, k) => {
        const m = v.length / 3 - 1;
        cam.project(v[3 * m], v[3 * m + 1], v[3 * m + 2], sp);
        if (!inBox(vw, sp[0], sp[1])) return;
        const r = Math.hypot(v[3 * m], v[3 * m + 1], v[3 * m + 2]);
        ctx.fillStyle = rgbaOf(VOYAGER, fade.voyagers);
        ctx.beginPath();
        ctx.arc(sp[0], sp[1], 2.4, 0, TAU);
        ctx.fill();
        type.text(
          ctx,
          `VOYAGER ${k + 1} · ${Math.round(r)} AU`,
          sp[0] + 7,
          sp[1] - 7,
          {
            size: 7,
            spacing: 0.16,
            alpha: 0.9 * fade.voyagers,
          },
        );
      });
    }
    ctx.restore();
    const km: Record<string, number> = {};
    if (s) {
      PLANET_IDS.forEach((id, k) => {
        km[id] = Math.hypot(...s.planets[k].now) * AU;
      });
      km.moon = km.earth;
    }
    drawChrome(ctx, type, l, {
      mode: "Explore",
      modes: MODES,
      t: 0,
      warp: "1×",
      world: "OORT CLOUD",
      subtitle:
        "The edge of the solar system, and the two Voyagers\non their way out",
      legend: [
        { name: "Spacecraft", count: 2, color: VOYAGER },
        { name: "Orbits", color: INK },
      ],
      flyTo: { here: "oort", km },
    });
    drawWindow(ctx, l);
  }
}
