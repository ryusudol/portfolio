import { lerp, smoothstep, TAU } from "../math";
import {
  APP_COLORS,
  type AppLayout,
  AppType,
  appLayout,
  type Box,
  drawAtmosphere,
  drawChrome,
  drawWindow,
  earthSampler,
  GROUP_CLASS,
  GROUP_SIZE,
  type LegendRow,
} from "../orbit-app";
import {
  type Catalog,
  catalogueDots,
  type Earth,
  gmst,
  loadCatalog,
  loadEarth,
  OMEGA_EARTH,
  orbitPosition,
  RE,
} from "../orbit-data";
import {
  arrivalDirection,
  Camera,
  DotWorld,
  ellipsePoint,
  flyFrom,
  inBox,
  loadMaps,
  loadWorlds,
  type Mat3,
  mapSampler,
  moonAt,
  norm,
  type SurfaceMap,
  skyStar,
  skyTag,
  type TravelPlan,
  travelPose,
  unitOf,
  type Vec3,
  type Worlds,
} from "../orbit-worlds";
import { fmt, freeArea, Readouts, StageSize, Steps, stepAt } from "../story";
import type { Field, Frame, RGB, Scene } from "../types";

const STEP_AT = [0, 0.18, 0.4, 0.58, 0.8] as const;
/** Scroll to eased flight progress: a slow start, a dwell at halfway, an arrival. */
const KNOTS: [number, number][] = [
  [0.16, 0],
  [0.4, 0.37],
  [0.58, 0.47],
  [0.8, 1],
];
const DEG = Math.PI / 180;
/** The app opens over North America; the flight leaves from there. */
const OPEN = { lat: 36, lon: -96 };
/** The app's Moon flight takes about 2.6 s (its README). */
const FLIGHT_S = 2.6;
const MOON_R = 1737.4;
const MOON_SLOT = APP_COLORS.length + 1;
const CRAFT: RGB = [226, 182, 74];
const MOON_MODES = ["Explore", "Orbiters", "Link to Earth"] as const;

function knot(p: number) {
  if (p <= KNOTS[0][0]) return 0;
  for (let k = 1; k < KNOTS.length; k++) {
    const [p0, k0] = KNOTS[k - 1];
    const [p1, k1] = KNOTS[k];
    if (p <= p1) return lerp(k0, k1, smoothstep(p0, p1, p));
  }
  return 1;
}

const rotZ = (a: number): Mat3 => [
  Math.cos(a),
  -Math.sin(a),
  0,
  Math.sin(a),
  Math.cos(a),
  0,
  0,
  0,
  1,
];

/**
 * Fly to the Moon, in dots, on the app's own flight plan (`travel.ts`). The
 * camera leaves the opening view over North America with the catalogue round
 * the Earth, rises in log-distance while swinging round to face the Moon,
 * passes halfway at 192,000 km, and falls to the Moon's lit side, 50° off
 * the Sun. The stars are fixed on the sky, so they wheel as the camera turns.
 * On arrival the catalogue's dots become the five lunar orbiters' tracks,
 * from the JPL Horizons snapshot, at ten minutes a second.
 */
export class FlightScene implements Scene {
  private cat: Catalog | null = null;
  private earth: Earth | null = null;
  private worlds: Worlds | null = null;
  private moonMap: SurfaceMap | null = null;
  private earthWorld = new DotWorld();
  private moonWorld = new DotWorld();
  private cam = new Camera();
  private colors: RGB[] = APP_COLORS;
  private dots = 0;
  private t = 0;
  private k = 0;
  private step = 0;
  private orbitsIn = 0;
  private frame: Box = { x: 0, y: 0, w: 1, h: 1 };
  private l: AppLayout = appLayout({ x: 0, y: 0, w: 1, h: 1 }, false);
  private type = new AppType();
  private steps = new Steps();
  private readouts = new Readouts();
  private size = new StageSize();
  private pt = new Float64Array(3);
  private sp = new Float64Array(3);
  private moonPos: Vec3 = [-381_071, -36_405, -39_082];
  private sun: Vec3 = [-0.96, -0.26, -0.11];

  layout(f: Field, fr: Frame) {
    this.frame = freeArea(fr, 14);
    loadCatalog().then((cat) => {
      this.cat = cat;
      if (cat) this.dots = catalogueDots(cat, f.n * 0.4);
    });
    loadEarth().then((e) => {
      this.earth = e;
    });
    loadWorlds().then((w) => {
      this.worlds = w;
      if (w) {
        this.moonPos = w.flight.moon;
        this.sun = unitOf(w.flight.sun);
      }
    });
    loadMaps().then((m) => {
      this.moonMap = m?.moon ?? null;
      if (this.moonMap) this.colors = [...APP_COLORS, ...this.moonMap.palette];
    });
    this.type.read(fr.section);
    this.steps.collect(fr.section);
    this.readouts.collect(fr.section);
  }

  leave() {
    this.t = 0;
  }

  /** The flight plan, from the opening view to the Moon's lit side. */
  private plan(): TravelPlan {
    const theta = gmst(this.worlds?.jd ?? 2461323.393) + OMEGA_EARTH * this.t;
    const lat = OPEN.lat * DEG;
    const lon = OPEN.lon * DEG + theta;
    const cam = this.cam;
    const vw = this.l.view;
    const r0 =
      RE * Math.sqrt(1 + (cam.focal / (Math.min(vw.w, vw.h) * 0.34)) ** 2);
    const from: Vec3 = [
      Math.cos(lat) * Math.cos(lon) * r0,
      Math.cos(lat) * Math.sin(lon) * r0,
      Math.sin(lat) * r0,
    ];
    const pole = this.worlds
      ? unitOf([
          this.worlds.worlds.moon.orient[2],
          this.worlds.worlds.moon.orient[5],
          this.worlds.worlds.moon.orient[8],
        ])
      : ([0, 0, 1] as Vec3);
    const toDist =
      MOON_R * Math.sqrt(1 + (cam.focal / (Math.min(vw.w, vw.h) * 0.3)) ** 2);
    return {
      from,
      look: unitOf([-from[0], -from[1], -from[2]]),
      toDir: arrivalDirection(this.moonPos, this.sun, pole),
      toDist,
    };
  }

  update(f: Field, fr: Frame) {
    if (this.size.changed(fr)) this.layout(f, fr);
    const p = fr.progress;
    const step = stepAt(p, STEP_AT);
    this.step = step;
    this.steps.set(step);
    f.classColors = this.colors;
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
    this.orbitsIn = smoothstep(STEP_AT[4], STEP_AT[4] + 0.05, p);
    // Real time on the way, ten minutes a second once the orbiters show.
    if (!fr.reduced) this.t += fr.dt * (this.orbitsIn > 0 ? 600 : 1);

    const k = knot(p);
    this.k = k;
    const plan = this.plan();
    const B = this.moonPos;
    const pose = travelPose(plan, k, B);
    // Once arrived, the camera backs off so the ARTEMIS loops fit.
    const back = 1 + 3.4 * this.orbitsIn;
    const pos: Vec3 =
      this.orbitsIn > 0
        ? [
            B[0] + (pose.pos[0] - B[0]) * back,
            B[1] + (pose.pos[1] - B[1]) * back,
            B[2] + (pose.pos[2] - B[2]) * back,
          ]
        : pose.pos;
    cam.pos = pos;
    cam.lookAlong(pose.look, [0, 0, 1]);

    const cat = this.cat;
    const theta = gmst(this.worlds?.jd ?? 2461323.393) + OMEGA_EARTH * this.t;
    const C = cat ? this.dots : 0;
    const E = Math.round(f.n * 0.22);
    const Mo = Math.round(f.n * 0.3);
    const sp = this.sp;
    const pt = this.pt;
    const moons = this.worlds?.worlds.moon.moons ?? [];

    for (let i = 0; i < C && i < f.n; i++) {
      f.gh[i] = 0;
      f.gj[i] = 0.03;
      if (this.orbitsIn > 0 && moons.length) {
        // The catalogue's dots become the lunar orbiters' tracks.
        const m = moons[i % moons.length];
        const j = Math.floor(i / moons.length);
        const per = Math.ceil(C / moons.length);
        ellipsePoint(m.el, (j / per) * TAU, pt, 0, false);
        cam.project(B[0] + pt[0], B[1] + pt[1], B[2] + pt[2], sp);
        const behind = this.behindMoon(
          B[0] + pt[0],
          B[1] + pt[1],
          B[2] + pt[2],
        );
        f.gx[i] = sp[0];
        f.gy[i] = sp[1];
        f.gc[i] = 4;
        f.gz[i] = fr.compact ? 1 : 1.25;
        f.ga[i] =
          sp[2] > 0 && !behind && inBox(vw, sp[0], sp[1])
            ? 0.55 * this.orbitsIn
            : 0;
        continue;
      }
      if (!cat) {
        f.ga[i] = 0;
        continue;
      }
      orbitPosition(cat, i, this.t, pt);
      const scale = cam.project(pt[0], pt[1], pt[2], sp);
      const g = cat.group[i];
      const hidden = this.behindEarth(pt[0], pt[1], pt[2]);
      f.gx[i] = sp[0];
      f.gy[i] = sp[1];
      f.gc[i] = GROUP_CLASS[g];
      f.gz[i] = Math.max(0.8, Math.min(GROUP_SIZE[g] * 1.15, scale * 250));
      f.ga[i] =
        sp[2] > 0 && !hidden && inBox(vw, sp[0], sp[1])
          ? 0.55 + 0.4 * f.r3[i]
          : 0;
    }
    this.earthWorld.place(
      f,
      C,
      E,
      cam,
      [0, 0, 0],
      {
        radius: RE,
        polar: RE,
        orient: rotZ(theta),
        sun: this.sun,
        sample: earthSampler(this.earth),
      },
      vw,
      { maxSize: fr.compact ? 2.4 : 3.2 },
    );
    const moonOrient = this.worlds?.worlds.moon.orient ?? [
      1, 0, 0, 0, 1, 0, 0, 0, 1,
    ];
    this.moonWorld.place(
      f,
      C + E,
      Mo,
      cam,
      B,
      {
        radius: MOON_R,
        polar: MOON_R,
        orient: moonOrient,
        sun: this.sun,
        sample: mapSampler(this.moonMap, MOON_SLOT, {
          k: 0.5,
          night: 0,
          gain: 1.05,
        }),
      },
      vw,
      { maxSize: fr.compact ? 2.4 : 3.2 },
    );
    for (let i = C + E + Mo; i < f.n; i++) skyStar(f, i, cam, vw, 0.9);
    // Stars don't show through either world.
    for (const w of [this.earthWorld, this.moonWorld]) {
      if (!w.ahead || !Number.isFinite(w.r) || w.r < 2) continue;
      const r2 = (w.r * 1.02) ** 2;
      for (let i = C + E + Mo; i < f.n; i++) {
        const dx = f.gx[i] - w.cx;
        const dy = f.gy[i] - w.cy;
        if (dx * dx + dy * dy < r2) f.ga[i] = 0;
      }
    }

    const fromEarth = norm(pos);
    const fromMoon = norm([pos[0] - B[0], pos[1] - B[1], pos[2] - B[2]]);
    this.readouts.write("earth", `${fmt(fromEarth)} km`);
    this.readouts.write("moon", `${fmt(fromMoon)} km`);
    this.readouts.write("flight", `${(k * FLIGHT_S).toFixed(1)} s`);
  }

  /** Whether the Earth or the Moon hides a point from the camera. */
  private occluded(
    x: number,
    y: number,
    z: number,
    cx: number,
    cy: number,
    cz: number,
    R: number,
  ) {
    const c = this.cam.pos;
    const vx = x - c[0];
    const vy = y - c[1];
    const vz = z - c[2];
    const ox = c[0] - cx;
    const oy = c[1] - cy;
    const oz = c[2] - cz;
    const vv = vx * vx + vy * vy + vz * vz;
    const t = -(ox * vx + oy * vy + oz * vz) / vv;
    if (t <= 0 || t >= 1) return false;
    const px = ox + t * vx;
    const py = oy + t * vy;
    const pz = oz + t * vz;
    return px * px + py * py + pz * pz < R * R;
  }

  private behindEarth(x: number, y: number, z: number) {
    return this.occluded(x, y, z, 0, 0, 0, RE);
  }

  private behindMoon(x: number, y: number, z: number) {
    const B = this.moonPos;
    return this.occluded(x, y, z, B[0], B[1], B[2], MOON_R);
  }

  draw(ctx: CanvasRenderingContext2D) {
    const l = this.l;
    const type = this.type;
    const arrived = this.k > 0.5;
    const cam = this.cam;
    ctx.save();
    ctx.beginPath();
    ctx.rect(
      l.frame.x,
      l.frame.y + l.header,
      l.frame.w,
      l.frame.h - l.header - l.dock,
    );
    ctx.clip();
    // Each world's name where it hangs in the sky, while it is small.
    for (const [w, name] of [
      [this.moonWorld, "MOON"],
      [this.earthWorld, "EARTH"],
    ] as const) {
      const a = 1 - smoothstep(12, 40, w.r);
      if (w.ahead && Number.isFinite(w.r) && inBox(l.view, w.cx, w.cy))
        skyTag(ctx, type, name, w.cx + w.r, w.cy, a);
    }
    // The orbiters themselves, labelled as the app labels them.
    const moons = this.worlds?.worlds.moon.moons ?? [];
    if (this.orbitsIn > 0.05) {
      const B = this.moonPos;
      const q = new Float64Array(3);
      for (const m of moons) {
        moonAt(m, this.t, q);
        cam.project(B[0] + q[0], B[1] + q[1], B[2] + q[2], this.sp);
        if (
          this.sp[2] <= 0 ||
          this.behindMoon(B[0] + q[0], B[1] + q[1], B[2] + q[2])
        )
          continue;
        const a = this.orbitsIn;
        ctx.fillStyle = `rgba(${CRAFT.join(",")},${a.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(this.sp[0], this.sp[1], 2.6, 0, TAU);
        ctx.fill();
        type.text(ctx, m.name.toUpperCase(), this.sp[0] + 8, this.sp[1] - 7, {
          size: 7.5,
          spacing: 0.16,
          alpha: 0.9 * a,
        });
      }
    }
    ctx.restore();

    const here = arrived ? "moon" : "earth";
    const legend: LegendRow[] | undefined = arrived
      ? [
          { name: "Spacecraft", count: 5, color: CRAFT },
          { name: "Orbits", color: [240, 240, 250], off: this.orbitsIn < 0.5 },
        ]
      : undefined;
    drawChrome(ctx, type, l, {
      mode: "Explore",
      modes: arrived ? MOON_MODES : undefined,
      t: this.t,
      warp: this.orbitsIn > 0 ? "10M" : "1×",
      world: arrived ? "MOON" : "EARTH",
      subtitle: arrived ? "5 spacecraft in orbit" : undefined,
      legend,
      flyTo: {
        here,
        km: flyFrom(this.worlds, here),
        target: this.step < 4 && this.k < 0.98 ? "moon" : undefined,
        alpha: 1,
      },
    });
    // The Earth's atmosphere, while it is big enough to see.
    const ew = this.earthWorld;
    if (ew.r > 6 && ew.r < 4000) {
      const sx =
        this.sun[0] * cam.right[0] +
        this.sun[1] * cam.right[1] +
        this.sun[2] * cam.right[2];
      const sy = -(
        this.sun[0] * cam.up[0] +
        this.sun[1] * cam.up[1] +
        this.sun[2] * cam.up[2]
      );
      drawAtmosphere(ctx, ew.cx, ew.cy, ew.r, sx, sy, Math.min(1, ew.r / 30));
    }
    if (this.step === 2) {
      type.text(
        ctx,
        "HALFWAY · 192,000 KM FROM EACH",
        l.view.x + l.view.w / 2,
        l.view.y + l.view.h - 22,
        {
          size: 8,
          spacing: 0.16,
          align: "center",
          alpha: 0.85,
        },
      );
    }
    drawWindow(ctx, l);
  }
}
