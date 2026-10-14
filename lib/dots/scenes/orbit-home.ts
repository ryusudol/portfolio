import { lerp, smoothstep } from "../math";
import {
  APP_COLORS,
  drawAtmosphere,
  earthSampler,
  GROUP_CLASS,
  GROUP_SIZE,
} from "../orbit-app";
import {
  type Catalog,
  catalogDots,
  type Earth,
  gmst,
  loadCatalog,
  loadEarth,
  OMEGA_EARTH,
  orbitPosition,
  RE,
} from "../orbit-data";
import {
  Camera,
  DotWorld,
  loadWorlds,
  type Mat3,
  norm,
  unitOf,
  type Vec3,
} from "../orbit-worlds";
import { dust } from "../shapes";
import { fmt, label, Readouts } from "../story";
import type { Field, Frame, Palette, Scene } from "../types";

const DEG = Math.PI / 180;
const GEO = 42_164;
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
 * Orbit Explorer on the home page, without the app around it: the sampled
 * catalog on its orbits at ten minutes a second, around a dot-matrix Earth
 * lit by the real Sun. Scrolling pulls the camera back in log-distance, out
 * past the navigation satellites to the geostationary ring.
 */
export class OrbitHomeScene implements Scene {
  private cat: Catalog | null = null;
  private earth: Earth | null = null;
  private earthWorld = new DotWorld();
  private cam = new Camera();
  private dots = 0;
  private t = 0;
  private ink = true;
  private sun: Vec3 = [-0.96, -0.26, -0.11];
  private jd = 2461323.393;
  private readouts = new Readouts();
  private sp = new Float64Array(3);
  private pt = new Float64Array(3);
  private zoom = 0;

  layout(f: Field, fr: Frame) {
    loadCatalog().then((cat) => {
      this.cat = cat;
      if (cat) {
        this.dots = catalogDots(cat, f.n * 0.66);
        this.jd = cat.jd;
      }
    });
    loadEarth().then((e) => {
      this.earth = e;
    });
    loadWorlds().then((w) => {
      if (w) this.sun = unitOf(w.flight.sun);
    });
    this.readouts.collect(fr.section);
  }

  update(f: Field, fr: Frame) {
    const p = fr.progress;
    if (!fr.reduced) this.t += fr.dt * 600;
    f.classColors = APP_COLORS;
    const { x, y, w, h } = fr.visual;
    const cam = this.cam;
    cam.cx = x + w / 2;
    cam.cy = y + h * (fr.compact ? 0.46 : 0.44);
    cam.focal = Math.min(w, h) * 1.6;
    // Close on the Earth and its halo, then back out to frame the geostationary ring.
    const zoom = smoothstep(0.35, 0.9, p);
    this.zoom = zoom;
    const near = RE * Math.sqrt(1 + (cam.focal / (Math.min(w, h) * 0.27)) ** 2);
    const far = (GEO * 1.08 * cam.focal) / (0.5 * Math.min(w, h));
    const dist = Math.exp(lerp(Math.log(near), Math.log(far), zoom));
    // Over North America, turning slowly, and rising a little on the way out.
    const az =
      (-96 + (fr.reduced ? 0 : fr.time * 3)) * DEG +
      gmst(this.jd) +
      OMEGA_EARTH * this.t;
    const el = lerp(28, 22, zoom) * DEG;
    const dir = [
      Math.cos(el) * Math.cos(az),
      Math.cos(el) * Math.sin(az),
      Math.sin(el),
    ];
    cam.lookAt(
      [dir[0] * dist, dir[1] * dist, dir[2] * dist],
      [0, 0, 0],
      [0, 0, 1],
    );

    const cat = this.cat;
    const C = cat ? this.dots : 0;
    const E = Math.round(f.n * 0.24);
    const sp = this.sp;
    const pt = this.pt;
    const theta = gmst(this.jd) + OMEGA_EARTH * this.t;
    for (let i = 0; i < C && i < f.n; i++) {
      orbitPosition(cat as Catalog, i, this.t, pt);
      const scale = cam.project(pt[0], pt[1], pt[2], sp);
      const g = (cat as Catalog).group[i];
      const hidden = this.behindEarth(pt[0], pt[1], pt[2]);
      f.gx[i] = sp[0];
      f.gy[i] = sp[1];
      f.gc[i] = GROUP_CLASS[g];
      f.gh[i] = 0;
      f.gj[i] = 0.05;
      f.gz[i] = Math.max(
        1,
        Math.min(GROUP_SIZE[g] * (this.ink ? 1.15 : 1.4), scale * 220),
      );
      f.ga[i] =
        sp[2] > 0 && !hidden
          ? (0.55 + 0.4 * f.r3[i]) * (this.ink ? 1 : 1.2)
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
      { x, y, w, h },
      // Light dots on paper cover less, so the globe gets a little more weight there.
      { maxSize: fr.compact ? 2.4 : 3, alpha: this.ink ? 1 : 1.35 },
    );
    for (let i = C + E; i < f.n; i++) dust(f, i, fr, 0.12);
    this.readouts.write("distance", `${fmt(norm(cam.pos))} km`);
  }

  private behindEarth(x: number, y: number, z: number) {
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

  draw(ctx: CanvasRenderingContext2D, _fr: Frame, palette: Palette) {
    this.ink = palette.ink;
    const ew = this.earthWorld;
    const cam = this.cam;
    if (this.ink && ew.ahead && ew.r > 6) {
      const s = this.sun;
      const sx =
        s[0] * cam.right[0] + s[1] * cam.right[1] + s[2] * cam.right[2];
      const sy = -(s[0] * cam.up[0] + s[1] * cam.up[1] + s[2] * cam.up[2]);
      drawAtmosphere(ctx, ew.cx, ew.cy, ew.r, sx, sy, Math.min(1, ew.r / 40));
    }
    // The geostationary ring, named once it is in frame.
    const a = smoothstep(0.7, 0.95, this.zoom);
    if (a > 0.01) {
      const sp = this.sp;
      let best = -Infinity;
      let at: [number, number] = [0, 0];
      // Under the ring's nearest point, clear of the page's edges.
      for (let k = 0; k < 64; k++) {
        const t = (k / 64) * Math.PI * 2;
        cam.project(GEO * Math.cos(t), GEO * Math.sin(t), 0, sp);
        if (sp[1] > best) {
          best = sp[1];
          at = [sp[0], sp[1]];
        }
      }
      label(ctx, palette, "GEOSTATIONARY · 35,786 KM", at[0], at[1] + 16, {
        align: "center",
        alpha: 0.85 * a,
      });
    }
  }
}
