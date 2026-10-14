import { lerp, smoothstep, TAU } from "../math";
import {
  type AppLayout,
  AppType,
  appLayout,
  type Box,
  drawChrome,
  drawWindow,
  INK,
  ink,
  type LegendRow,
  rgbaOf,
} from "../orbit-app";
import {
  Camera,
  DotWorld,
  ellipsePoint,
  flyFrom,
  inBox,
  loadMaps,
  loadWorlds,
  type Moon,
  mapSampler,
  moonAt,
  mul,
  type SurfaceMap,
  skyStar,
  skyTag,
  slerp,
  unitOf,
  type Vec3,
  type World,
  type Worlds,
} from "../orbit-worlds";
import { freeArea, Readouts, StageSize, Steps, stepAt } from "../story";
import type { Field, Frame, RGB, Scene } from "../types";

const STEP_AT = [0, 0.2, 0.4, 0.6, 0.8] as const;
const MODES = ["Explore", "Moons & craft"] as const;
const CRAFT: RGB = [226, 182, 74];
/** sRGB of a linear albedo, for the rings' colors. */
const srgb = (c: number[]): RGB =>
  c.map((v) =>
    Math.round(
      255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055),
    ),
  ) as unknown as RGB;
/** Class slots: retrograde orbits, moons, craft, ink, Jupiter's five, Saturn's three, the rings' three. */
const BACKWARD = 1;
const CRAFTC = 3;
const INKC = 4;
const JUPITER_SLOT = 5;
const SATURN_SLOT = 10;
const RING_SLOT = 13;
const BASE: RGB[] = [[120, 160, 235], [220, 214, 204], CRAFT, INK];
const RING_COLORS: RGB[] = [
  srgb([0.78, 0.68, 0.52]),
  srgb([0.55, 0.5, 0.44]),
  srgb([0.42, 0.42, 0.42]),
];

/** Saturn's rings, from the app (`scene/giants.ts`): edges in km, optical depth, color. */
const BANDS: { r0: number; r1: number; tau: number; c: number }[] = [
  { r0: 66_900, r1: 74_510, tau: 0.002, c: 2 },
  { r0: 74_658, r1: 92_000, tau: 0.09, c: 1 },
  { r0: 92_000, r1: 99_000, tau: 1.0, c: 0 },
  { r0: 99_000, r1: 117_580, tau: 2.6, c: 0 },
  { r0: 117_580, r1: 122_170, tau: 0.12, c: 1 },
  { r0: 122_170, r1: 136_775, tau: 0.55, c: 0 },
  { r0: 140_150, r1: 140_250, tau: 0.5, c: 1 },
];
const GAPS: [number, number][] = [
  [77_770, 77_920],
  [87_350, 87_620],
  [117_540, 117_830],
  [133_420, 133_745],
  [136_485, 136_525],
];
const tauAt = (r: number) => {
  for (const [a, b] of GAPS) if (r >= a && r <= b) return 0;
  for (const band of BANDS) if (r >= band.r0 && r <= band.r1) return band.tau;
  return 0;
};

/** Which moons get a name tag up close. */
const NAMED = new Set([
  "Io",
  "Europa",
  "Ganymede",
  "Callisto",
  "Juno",
  "Titan",
  "Rhea",
  "Iapetus",
  "Dione",
  "Tethys",
  "Enceladus",
  "Mimas",
  "Hyperion",
]);

/**
 * Jupiter and Saturn with every known moon, in dots. Jupiter from Hubble's
 * map, the Galilean moons and Juno close in, then a pull back to the 110
 * irregular moons on their wide, tilted orbits, backward ones in blue. Then
 * Saturn: its rings as dots strewn by their measured optical depths, gaps
 * cut where Cassini found them, the planet's shadow across them; seen from
 * the Earth they open only 7°. Last, all 290 of its moons' orbits.
 */
export class GiantsScene implements Scene {
  private worlds: Worlds | null = null;
  private maps: Record<string, SurfaceMap> | null = null;
  private planet = new DotWorld();
  private cam = new Camera();
  private colors: RGB[] = [...BASE];
  private t = 0;
  private step = 0;
  /** The view's half-extent (km), and whether it is far enough to show every orbit. */
  private far = false;
  private frame: Box = { x: 0, y: 0, w: 1, h: 1 };
  private l: AppLayout = appLayout({ x: 0, y: 0, w: 1, h: 1 }, false);
  private type = new AppType();
  private steps = new Steps();
  private readouts = new Readouts();
  private size = new StageSize();
  private sp = new Float64Array(3);
  private q = new Float64Array(3);
  /** The rings as unit-free samples: radius (km) and angle, drawn in proportion to opacity. */
  private ring = new Float32Array(0);

  layout(f: Field, fr: Frame) {
    this.frame = freeArea(fr, 14);
    loadWorlds().then((w) => {
      this.worlds = w;
    });
    loadMaps().then((m) => {
      this.maps = m;
      if (m?.jupiter && m.saturn)
        this.colors = [
          ...BASE,
          ...m.jupiter.palette,
          ...m.saturn.palette,
          ...RING_COLORS,
        ];
    });
    this.sampleRings(Math.round(f.n * 0.4));
    this.type.read(fr.section);
    this.steps.collect(fr.section);
    this.readouts.collect(fr.section);
  }

  /** Ring dots by inverse CDF of opacity times area, so dense rings get more. */
  private sampleRings(n: number) {
    const R0 = 66_900;
    const R1 = 141_000;
    const N = 2000;
    const cdf = new Float64Array(N + 1);
    for (let k = 0; k < N; k++) {
      const r = R0 + ((k + 0.5) / N) * (R1 - R0);
      const tau = tauAt(r);
      cdf[k + 1] = cdf[k] + (1 - Math.exp(-tau * 2.2)) ** 0.8 * r;
    }
    const total = cdf[N];
    this.ring = new Float32Array(2 * n);
    let k = 0;
    for (let i = 0; i < n; i++) {
      // Stratified, so the bands come out even rather than clumped.
      const u = ((i + 0.5) / n) * total;
      while (k < N - 1 && cdf[k + 1] < u) k++;
      const frac = (u - cdf[k]) / Math.max(1e-9, cdf[k + 1] - cdf[k]);
      this.ring[2 * i] = R0 + ((k + frac) / N) * (R1 - R0);
      // Golden-angle spacing around the ring.
      this.ring[2 * i + 1] = (i * 2.399963) % TAU;
    }
  }

  leave() {
    this.t = 0;
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
    // An hour a second close in, so Io laps Jupiter in 42 s.
    if (!fr.reduced) this.t += fr.dt * 3600;
    const saturn = step >= 2;
    const id = saturn ? "saturn" : "jupiter";
    const W = this.worlds?.worlds[id];
    const R = W?.radius ?? (saturn ? 60_268 : 71_492);
    // The half-extent of the view, in km: close, out through the moons, far out.
    const E = saturn
      ? step < 4
        ? 2.75 * R
        : Math.exp(
            lerp(
              Math.log(2.75 * R),
              Math.log(3.6e7),
              smoothstep(STEP_AT[4], 0.97, p),
            ),
          )
      : step === 0
        ? Math.exp(
            lerp(
              Math.log(2.6 * R),
              Math.log(19 * R),
              smoothstep(0.04, STEP_AT[1], p),
            ),
          )
        : Math.exp(
            lerp(
              Math.log(19 * R),
              Math.log(3.3e7),
              smoothstep(STEP_AT[1], 0.37, p),
            ),
          );
    const dist = (E * cam.focal) / (0.46 * Math.min(vw.w, vw.h));
    this.far = E > 60 * R;
    if (W) {
      const pole: Vec3 = [W.orient[2], W.orient[5], W.orient[8]];
      const sun = unitOf(W.sun);
      const earth = unitOf(W.earth);
      // From the sunlit side, 25° above the equator; for the tilt, from the Earth.
      const sp = sun[0] * pole[0] + sun[1] * pole[1] + sun[2] * pole[2];
      const flat = unitOf([
        sun[0] - pole[0] * sp,
        sun[1] - pole[1] * sp,
        sun[2] - pole[2] * sp,
      ]);
      const tilt = 25 * (Math.PI / 180);
      const above = unitOf([
        flat[0] * Math.cos(tilt) + pole[0] * Math.sin(tilt),
        flat[1] * Math.cos(tilt) + pole[1] * Math.sin(tilt),
        flat[2] * Math.cos(tilt) + pole[2] * Math.sin(tilt),
      ]);
      // Swing around toward the Earth's view for the tilt step, and back out after.
      const toEarth = saturn
        ? smoothstep(STEP_AT[3], STEP_AT[3] + 0.08, p) *
          (1 - smoothstep(STEP_AT[4], STEP_AT[4] + 0.1, p))
        : 0;
      const dir = slerp(above, earth, toEarth);
      cam.lookAt(
        [dir[0] * dist, dir[1] * dist, dir[2] * dist],
        [0, 0, 0],
        pole,
      );
    }

    const P = Math.round(f.n * 0.3);
    const O = Math.round(f.n * 0.4);
    if (W) {
      const map = this.maps?.[id] ?? null;
      this.planet.place(
        f,
        0,
        P,
        cam,
        [0, 0, 0],
        {
          radius: R,
          polar: W.polar,
          orient: W.orient,
          sun: unitOf(W.sun),
          sample: mapSampler(map, saturn ? SATURN_SLOT : JUPITER_SLOT, {
            k: 0.9,
            night: 0.02,
            gain: 1.15,
          }),
        },
        vw,
        { maxSize: fr.compact ? 2.4 : 3 },
      );
      if (saturn && step < 4) this.rings(f, P, O, W, R);
      else this.orbits(f, P, O, W, R, E);
    } else {
      for (let i = 0; i < P + O && i < f.n; i++) f.ga[i] = 0;
    }
    for (let i = P + O; i < f.n; i++) {
      skyStar(f, i, cam, vw, 0.85);
      const dx = f.gx[i] - this.planet.cx;
      const dy = f.gy[i] - this.planet.cy;
      if (this.planet.ahead && dx * dx + dy * dy < (this.planet.r * 1.05) ** 2)
        f.ga[i] = 0;
    }

    if (W) {
      const moons = W.moons.filter((m) => m.kind === "moon").length;
      this.readouts.write("world", saturn ? "Saturn" : "Jupiter");
      this.readouts.write("moons", String(moons));
      const m = Math.round(W.lightS / 60);
      this.readouts.write(
        "light",
        m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`,
      );
    }
  }

  /** Whether the planet hides a point (a sphere test is close enough for this). */
  private hidden(x: number, y: number, z: number, R: number) {
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
    return px * px + py * py + pz * pz < R * R * 0.97;
  }

  /** Saturn's rings: each dot at its radius in the equatorial plane, dark in the planet's shadow. */
  private rings(f: Field, start: number, count: number, W: World, R: number) {
    const cam = this.cam;
    const sp = this.sp;
    const q = this.q;
    const sun = unitOf(W.sun);
    const vw = this.l.view;
    const n = Math.min(count, this.ring.length / 2);
    for (let k = 0; k < count; k++) {
      const i = start + k;
      if (i >= f.n) break;
      f.gh[i] = 0;
      f.gj[i] = 0;
      if (k >= n) {
        f.ga[i] = 0;
        continue;
      }
      const r = this.ring[2 * k];
      const a = this.ring[2 * k + 1];
      mul(W.orient, [r * Math.cos(a), r * Math.sin(a), 0], q);
      cam.project(q[0], q[1], q[2], sp);
      // In the planet's shadow: behind it from the Sun, within its radius of the axis.
      const along = q[0] * sun[0] + q[1] * sun[1] + q[2] * sun[2];
      const off2 = q[0] * q[0] + q[1] * q[1] + q[2] * q[2] - along * along;
      const shadow = along < 0 && off2 < R * R;
      const tau = tauAt(r);
      const band = BANDS.find((bd) => r >= bd.r0 && r <= bd.r1);
      f.gx[i] = sp[0];
      f.gy[i] = sp[1];
      f.gz[i] = 1.3;
      f.gc[i] = RING_SLOT + (band?.c ?? 2);
      const vis =
        sp[2] > 0 &&
        !this.hidden(q[0], q[1], q[2], R) &&
        inBox(vw, sp[0], sp[1]);
      f.ga[i] = vis
        ? Math.min(1, 0.3 + 0.55 * Math.min(1, tau)) * (shadow ? 0.12 : 1)
        : 0;
    }
  }

  /**
   * Up close, each big moon's and spacecraft's orbit as a dotted ellipse.
   * Far out, every moon trails a comet's tail of dots back along its orbit,
   * so the backward ones visibly run the other way; the orbits themselves are
   * faint lines, drawn in `draw`.
   */
  private orbits(
    f: Field,
    start: number,
    count: number,
    W: World,
    R: number,
    E: number,
  ) {
    const cam = this.cam;
    const sp = this.sp;
    const q = this.q;
    const vw = this.l.view;
    const list = this.far
      ? W.moons.filter((m) => m.kind === "moon")
      : W.moons.filter(
          (m) => m.el[0] * (1 + m.el[1]) > 1.2 * R && m.el[0] < E * 1.6,
        );
    const per = Math.max(6, Math.floor(count / Math.max(1, list.length)));
    for (let k = 0; k < count; k++) {
      const i = start + k;
      if (i >= f.n) break;
      f.gh[i] = 0;
      f.gj[i] = 0.01;
      const m = list[Math.floor(k / per)];
      if (!m) {
        f.ga[i] = 0;
        continue;
      }
      const j = k % per;
      const backward = m.el[2] > Math.PI / 2;
      let fade = 1;
      if (this.far) {
        // A tail 40° of mean anomaly long, brightest at the moon.
        const u = j / per;
        fade = (1 - u) ** 1.6;
        ellipsePoint(m.el, m.el[5] + m.n * this.t - u * 0.7, q, 0, true);
      } else {
        ellipsePoint(m.el, (j / per) * TAU, q, 0, false);
      }
      cam.project(q[0], q[1], q[2], sp);
      f.gx[i] = sp[0];
      f.gy[i] = sp[1];
      f.gz[i] = this.far ? 1.5 - 0.5 * (j / per) : 1.05;
      f.gc[i] = m.kind === "spacecraft" ? CRAFTC : backward ? BACKWARD : INKC;
      const vis =
        sp[2] > 0 &&
        !this.hidden(q[0], q[1], q[2], R) &&
        inBox(vw, sp[0], sp[1]);
      f.ga[i] = vis
        ? m.kind === "spacecraft"
          ? 0.75
          : this.far
            ? 0.95 * fade
            : backward
              ? 0.6
              : 0.5
        : 0;
    }
  }

  /** Far out, every orbit as a faint line, colored by its direction. */
  private orbitLines(ctx: CanvasRenderingContext2D, W: World) {
    const cam = this.cam;
    const q = this.q;
    const sp = this.sp;
    ctx.lineWidth = 0.7;
    for (const m of W.moons) {
      if (m.kind !== "moon") continue;
      const backward = m.el[2] > Math.PI / 2;
      ctx.strokeStyle = backward ? rgbaOf(BASE[BACKWARD - 1], 0.2) : ink(0.14);
      ctx.beginPath();
      for (let k = 0; k <= 72; k++) {
        ellipsePoint(m.el, (k / 72) * TAU, q, 0, false);
        cam.project(q[0], q[1], q[2], sp);
        if (k) ctx.lineTo(sp[0], sp[1]);
        else ctx.moveTo(sp[0], sp[1]);
      }
      ctx.stroke();
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    const l = this.l;
    const type = this.type;
    const saturn = this.step >= 2;
    const id = saturn ? "saturn" : "jupiter";
    const W = this.worlds?.worlds[id];
    const cam = this.cam;
    ctx.save();
    ctx.beginPath();
    ctx.rect(l.view.x, l.view.y, l.view.w, l.view.h);
    ctx.clip();
    if (W) {
      if (this.far) this.orbitLines(ctx, W);
      const q = this.q;
      const far = this.far;
      const tags: [Moon, number, number][] = [];
      for (const m of W.moons) {
        moonAt(m, this.t, q);
        cam.project(q[0], q[1], q[2], this.sp);
        if (
          this.sp[2] <= 0 ||
          this.hidden(q[0], q[1], q[2], W.radius) ||
          !inBox(l.view, this.sp[0], this.sp[1])
        )
          continue;
        const craft = m.kind === "spacecraft";
        const big = (m.r ?? 0) > 500;
        ctx.fillStyle = rgbaOf(
          craft ? CRAFT : [230, 226, 218],
          far && !big && !craft ? 0.75 : 1,
        );
        ctx.beginPath();
        ctx.arc(this.sp[0], this.sp[1], craft ? 2.4 : big ? 2.8 : 1.3, 0, TAU);
        ctx.fill();
        if (NAMED.has(m.name) && !far) tags.push([m, this.sp[0], this.sp[1]]);
      }
      for (const [m, x, y] of tags) {
        type.text(ctx, m.name.toUpperCase(), x + 7, y - 7, {
          size: 7,
          spacing: 0.16,
          alpha: 0.85,
        });
      }
      if (this.step === 3) {
        type.text(
          ctx,
          "SEEN FROM THE EARTH · RINGS OPEN 7.3°",
          l.view.x + l.view.w / 2,
          l.view.y + l.view.h - 22,
          {
            size: 8,
            spacing: 0.16,
            align: "center",
            alpha: 0.9,
          },
        );
      }
      if (far) {
        // The key: forward and backward orbits.
        const x = l.view.x + l.view.w - 170;
        const y = l.view.y + l.view.h - 30;
        ctx.fillStyle = ink(0.7);
        ctx.fillRect(x, y, 14, 1.5);
        type.text(ctx, "PROGRADE", x + 20, y, {
          size: 7,
          spacing: 0.14,
          alpha: 0.7,
        });
        ctx.fillStyle = rgbaOf(BASE[BACKWARD - 1], 0.9);
        ctx.fillRect(x + 82, y, 14, 1.5);
        type.text(ctx, "BACKWARD", x + 102, y, {
          size: 7,
          spacing: 0.14,
          alpha: 0.7,
        });
      }
      if (this.planet.ahead && this.planet.r < 10)
        skyTag(
          ctx,
          type,
          saturn ? "SATURN" : "JUPITER",
          this.planet.cx + 4,
          this.planet.cy,
          1,
        );
    }
    ctx.restore();
    const moons =
      W?.moons.filter((m) => m.kind === "moon").length ?? (saturn ? 290 : 115);
    const craft =
      W?.moons.filter((m) => m.kind === "spacecraft").length ??
      (saturn ? 0 : 1);
    const legend: LegendRow[] = [];
    if (craft) legend.push({ name: "Spacecraft", count: craft, color: CRAFT });
    legend.push({ name: "Moons", count: moons, color: [220, 214, 204] });
    legend.push({ name: "Orbits", color: [240, 240, 250] });
    drawChrome(ctx, type, l, {
      mode: "Explore",
      modes: MODES,
      t: this.t,
      warp: "1H",
      world: saturn ? "SATURN" : "JUPITER",
      subtitle: craft
        ? `${craft} spacecraft and ${moons} moons in orbit`
        : `${moons} moons in orbit`,
      legend,
      flyTo: { here: id, km: flyFrom(this.worlds, id) },
    });
    drawWindow(ctx, l);
  }
}
