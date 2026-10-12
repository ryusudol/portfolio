import { lerp, smoothstep } from "../math";
import {
  APP_COLORS,
  type AppLayout,
  AppType,
  appLayout,
  type Box,
  DotGlobe,
  drawAtmosphere,
  drawChrome,
  drawLayersMenu,
  drawWindow,
  EARTH_LEGEND,
  GROUP_CLASS,
  GROUP_SIZE,
  ink,
  stars,
  sunDirection,
  through,
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
  project,
  RE,
  STARLINK,
  type View,
  view,
} from "../orbit-data";
import { flyFrom, loadWorlds, type Worlds } from "../orbit-worlds";
import { fmt, freeArea, Readouts, StageSize, Steps, stepAt } from "../story";
import type { Field, Frame, Scene } from "../types";

const GEO = 42_164;
const LEO_TOP = 2000;
const STEP_AT = [0, 0.2, 0.4, 0.6, 0.78] as const;
/** The app opens looking down on North America. */
const OPEN = { lat: 36, lon: -96 };
const DEG = Math.PI / 180;
/** The first few encounters the screen finds, for the timeline's markers (s). */
const MARKERS = [281, 1373, 1672, 1823, 2208];

/**
 * The app's opening view, in dots: the catalogue sample on two-body orbits
 * from the snapshot, around an Earth lit by the real Sun with its night side
 * in city lights, the Fly to list on the right. The camera pulls back until
 * the geostationary ring is in frame and comes in again for the groups. The
 * last step opens Layers and switches the reference frame: fixed to the
 * stars, the orbital planes hold still and the ground turns beneath them, at
 * the app's hour-a-second warp so the turn shows.
 */
export class EarthScene implements Scene {
  private cat: Catalog | null = null;
  private earth: Earth | null = null;
  private worlds: Worlds | null = null;
  private globe = new DotGlobe();
  private globeN = 0;
  private dots = 0;
  private t = 0;
  private theta0 = 0;
  /** The inertial camera yaw while the view is fixed to the stars. */
  private yawStars: number | null = null;
  private frame: Box = { x: 0, y: 0, w: 1, h: 1 };
  private l: AppLayout = appLayout({ x: 0, y: 0, w: 1, h: 1 }, false);
  private v: View = view(0, 0, 1, 0, 0);
  private type = new AppType();
  private steps = new Steps();
  private readouts = new Readouts();
  private size = new StageSize();
  private step = 0;
  private zoom = 0;
  private menu = 0;
  private pt = new Float64Array(3);
  private sp = new Float64Array(3);
  private sun = new Float64Array(3);

  layout(f: Field, fr: Frame) {
    this.frame = freeArea(fr, 14);
    this.globeN = Math.round(f.n * 0.4);
    this.globe.build(this.globeN, this.earth);
    loadEarth().then((earth) => {
      if (!earth || this.earth) return;
      this.earth = earth;
      this.globe.build(this.globeN, earth);
    });
    loadCatalog().then((cat) => {
      this.cat = cat;
      if (cat) {
        this.dots = catalogueDots(cat, f.n * 0.6);
        this.theta0 = gmst(cat.jd);
      }
    });
    loadWorlds().then((w) => {
      this.worlds = w;
    });
    this.type.read(fr.section);
    this.steps.collect(fr.section);
    this.readouts.collect(fr.section);
  }

  update(f: Field, fr: Frame) {
    if (this.size.changed(fr)) this.layout(f, fr);
    const p = fr.progress;
    const step = stepAt(p, STEP_AT);
    this.step = step;
    this.steps.set(step);
    const fixed = step === 4;
    // Ten minutes a second, an hour a second once the frame is fixed to the stars.
    if (!fr.reduced) this.t += fr.dt * (fixed ? 3600 : 600);
    f.classColors = APP_COLORS;

    const b = this.frame;
    this.l = appLayout(
      { x: fr.visual.x + b.x, y: fr.visual.y + b.y, w: b.w, h: b.h },
      false,
    );
    const l = this.l;
    const vw = l.view;
    // The camera: pulled back to the geostationary ring and in again, on a
    // log scale so the move feels steady.
    const out = smoothstep(0.42, 0.56, p) * (1 - smoothstep(0.62, 0.74, p));
    this.zoom = out;
    this.menu = smoothstep(STEP_AT[4], STEP_AT[4] + 0.04, p);
    const near = Math.min(vw.w, vw.h) * (l.wide ? 0.34 : 0.3);
    const far = (Math.min(vw.w * 0.47, vw.h * 0.62) * RE) / GEO;
    const r = Math.exp(lerp(Math.log(near), Math.log(far), out));
    const lon = OPEN.lon + (fr.reduced ? 0 : Math.min(p, STEP_AT[4]) * 40);
    const lat = lerp(OPEN.lat, 22, out);
    const cat = this.cat;
    const theta = this.theta0 + OMEGA_EARTH * this.t;
    const yawEarth = -Math.PI / 2 - lon * DEG;
    // Fixed to the stars: the satellites keep the inertial yaw they had at the
    // switch, and the ground turns by the Earth's rotation since.
    if (fixed && this.yawStars === null) this.yawStars = yawEarth - theta;
    if (!fixed) this.yawStars = null;
    const cx = vw.x + vw.w / 2 - (l.wide ? 40 * (1 - out) : 0);
    const cy = vw.y + vw.h / 2 + (l.wide ? 6 : 0);
    this.v =
      this.yawStars === null
        ? view(cx, cy, r / RE, yawEarth, lat * DEG)
        : view(cx, cy, r / RE, this.yawStars + theta, lat * DEG);
    const v = this.v;
    const sats =
      this.yawStars === null
        ? v
        : view(cx, cy, r / RE, this.yawStars, lat * DEG);
    const ct = Math.cos(theta);
    const st = Math.sin(theta);
    sunDirection((cat?.jd ?? 2461323.39) + this.t / 86400, theta, this.sun);
    const R2 = r * r;
    const pt = this.pt;
    const sp = this.sp;
    const dots = cat ? this.dots : 0;
    const globeN = this.globe.n;
    const isolate =
      step === 3 ? smoothstep(STEP_AT[3], STEP_AT[3] + 0.04, p) : 0;

    for (let i = 0; i < f.n; i++) {
      if (cat && i < dots) {
        orbitPosition(cat, i, this.t, pt);
        if (this.yawStars === null) {
          // Into the Earth-fixed frame.
          const x = pt[0] * ct + pt[1] * st;
          const y = -pt[0] * st + pt[1] * ct;
          project(sats, x, y, pt[2], sp);
        } else {
          project(sats, pt[0], pt[1], pt[2], sp);
        }
        const dx = sp[0] - v.cx;
        const dy = sp[1] - v.cy;
        const behind = sp[2] < 0 && dx * dx + dy * dy < R2;
        const g = cat.group[i];
        const leo = cat.alt[i] < LEO_TOP;
        let a = 0.55 + f.r3[i] * 0.4;
        // Farther dots fade a little, as they do through the app's haze.
        a *= 0.7 + 0.3 * Math.max(-1, Math.min(1, sp[2] / (RE * 1.3)));
        if (step === 1) a *= leo ? 1 : 0.25;
        if (step === 2) a *= leo ? 0.45 : 1;
        if (isolate > 0 && g !== STARLINK) a *= 1 - 0.8 * isolate;
        f.gx[i] = sp[0];
        f.gy[i] = sp[1];
        f.ga[i] = behind ? 0 : Math.min(1, a) * through(l, sp[0], sp[1]);
        f.gc[i] = GROUP_CLASS[g];
        f.gz[i] =
          GROUP_SIZE[g] * (fr.compact ? 0.85 : 1) * (1 + 0.25 * (1 - out));
        f.gh[i] = 0;
        f.gj[i] = 0.05;
        continue;
      }
      if (cat && i < dots + globeN) continue;
      stars(f, i, l, { cx: v.cx, cy: v.cy, r }, 0.9);
    }
    if (cat) {
      this.globe.place(f, dots, v, this.sun, fr);
      for (let k = 0; k < globeN; k++) {
        const i = dots + k;
        if (i < f.n) f.ga[i] *= through(l, f.gx[i], f.gy[i]);
      }
      this.readouts.write("dots", fmt(dots));
      this.readouts.write(
        "frame",
        fixed ? "Fixed to stars" : "Rotate with Earth",
      );
    }
  }

  /** A dashed circle in the equatorial plane, skipping the arc behind the globe. */
  private ring(ctx: CanvasRenderingContext2D, radius: number) {
    const v = this.v;
    const R = RE * v.scale;
    const sp = this.sp;
    ctx.beginPath();
    let pen = false;
    for (let k = 0; k <= 160; k++) {
      const a = (k / 160) * Math.PI * 2;
      project(v, Math.cos(a) * radius, Math.sin(a) * radius, 0, sp);
      if (sp[2] < 0 && Math.hypot(sp[0] - v.cx, sp[1] - v.cy) < R) {
        pen = false;
        continue;
      }
      if (pen) ctx.lineTo(sp[0], sp[1]);
      else ctx.moveTo(sp[0], sp[1]);
      pen = true;
    }
    ctx.stroke();
  }

  /** The Sun's direction on screen, for the day-side haze. */
  private sunOnScreen() {
    const v = this.v;
    const s = this.sun;
    const x1 = s[0] * v.cosYaw - s[1] * v.sinYaw;
    const y1 = s[0] * v.sinYaw + s[1] * v.cosYaw;
    return [x1, -(y1 * v.sinPitch + s[2] * v.cosPitch)];
  }

  draw(ctx: CanvasRenderingContext2D) {
    const l = this.l;
    const v = this.v;
    const r = RE * v.scale;
    const type = this.type;
    ctx.save();
    ctx.beginPath();
    ctx.rect(
      l.frame.x,
      l.frame.y + l.header,
      l.frame.w,
      l.frame.h - l.header - l.dock,
    );
    ctx.clip();
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);
    if (this.step === 1) {
      ctx.strokeStyle = ink(0.55);
      this.ring(ctx, RE + LEO_TOP);
      type.text(ctx, "2,000 KM", v.cx + (RE + LEO_TOP) * v.scale + 8, v.cy, {
        size: 8.5,
        spacing: 0.14,
        alpha: 0.85,
      });
    }
    if (this.zoom > 0.3) {
      const a = smoothstep(0.3, 0.9, this.zoom);
      ctx.strokeStyle = ink(0.4 * a);
      this.ring(ctx, GEO);
      type.text(
        ctx,
        "GEOSTATIONARY · 35,786 KM",
        v.cx,
        v.cy + GEO * v.scale * v.sinPitch + 16,
        { size: 8.5, spacing: 0.14, align: "center", alpha: 0.85 * a },
      );
    }
    ctx.setLineDash([]);
    ctx.restore();

    drawChrome(ctx, type, l, {
      mode: "Explore",
      t: this.t,
      warp: this.step === 4 ? "1H" : "10M",
      markers: MARKERS,
      legend: EARTH_LEGEND.map((row, k) => ({
        ...row,
        lit: this.step === 3 && k === 0,
      })),
      flyTo: {
        here: "earth",
        km: flyFrom(this.worlds, "earth"),
        alpha: 1 - this.menu,
      },
    });
    drawLayersMenu(
      ctx,
      type,
      l,
      { stars: this.yawStars !== null, on: { sky: true } },
      this.menu,
    );
    const [sx, sy] = this.sunOnScreen();
    drawAtmosphere(ctx, v.cx, v.cy, r, sx, sy);
    drawWindow(ctx, l);
  }
}
