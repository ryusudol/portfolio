import { loader } from "./orbit-data";
import type { Field, RGB } from "./types";

/**
 * Orbit Explorer beyond Earth orbit. `scripts/orbit/worlds.mjs` runs the
 * app's own `sim` modules (VSOP87, the Moon and Mars series, the JPL Horizons
 * snapshots, the relay planner) at the catalog snapshot's instant, 9
 * October 2026 21:25:56 UTC, and writes what these scenes draw.
 */

export const AU = 149_597_870.7;
export const C_KM_S = 299_792.458;
const TAU = Math.PI * 2;

export type Mat3 = number[];
export type Vec3 = [number, number, number];

export type Moon = {
  id: number;
  name: string;
  kind: "moon" | "spacecraft";
  /** Radius, km, where JPL lists one. */
  r?: number;
  found?: number;
  /** Body-centered ICRF osculating elements at the snapshot: a (km), e, i, node, peri, M (rad). */
  el: number[];
  /** Mean motion, rad/s. */
  n: number;
};

export type World = {
  radius: number;
  polar: number;
  /** Body-fixed to ICRF, row-major. */
  orient: Mat3;
  /** The Sun and the Earth seen from the world's center, km, ICRF. */
  sun: Vec3;
  earth: Vec3;
  lightS: number;
  moons: Moon[];
};

export type Pass = [start: number, end: number, peak: number];

export type RelayPlan = {
  site: string;
  short: string;
  name: string;
  what: string;
  lat: number;
  lon: number;
  lightS: number;
  /** Local solar time at the site, hours. */
  localH: number;
  /** Daylight, the Earth direct, then each orbiter; passes in hours after the snapshot. */
  rows: { name: string; now: number; passes: Pass[] }[];
};

export type WorldId =
  | "moon"
  | "mars"
  | "jupiter"
  | "saturn"
  | "uranus"
  | "neptune";

export type Worlds = {
  jd: number;
  /** Starlinks by hardware generation (V1.x, V2 Mini, V3), from their NORAD ids. */
  generations: Record<"1" | "2" | "3", number>;
  distances: { order: string[]; km: number[][] };
  /** The Moon and the Sun from the Earth, km, equatorial of date. */
  flight: { moon: Vec3; sun: Vec3 };
  worlds: Record<WorldId, World>;
  relay: Record<"moon" | "mars", RelayPlan[]>;
  planets: string[];
  voyagers: string[];
  dwarfs: { index: number; name: string }[];
};

export const loadWorlds = loader<Worlds>("/orbit/worlds.json", (buffer) =>
  JSON.parse(new TextDecoder().decode(buffer)),
);

export type Solar = {
  /** Heliocentric ecliptic J2000, au: each planet now and its orbit. */
  planets: { now: Vec3; orbit: Float32Array }[];
  /** The Kuiper belt, au, and whether each is scattered or detached. */
  tno: {
    n: number;
    x: Float32Array;
    y: Float32Array;
    z: Float32Array;
    far: Uint8Array;
  };
  voyagers: Float32Array[];
};

/** `solar.bin`; see `scripts/orbit/worlds.mjs`. */
function decodeSolar(buffer: ArrayBuffer): Solar {
  const dv = new DataView(buffer);
  let o = 0;
  const f32 = (n: number) => {
    const out = new Float32Array(buffer.slice(o, o + 4 * n));
    o += 4 * n;
    return out;
  };
  const planets: Solar["planets"] = [];
  const np = dv.getUint8(o++);
  for (let k = 0; k < np; k++) {
    const n = dv.getUint16(o, true);
    o += 2;
    const now = Array.from(f32(3)) as Vec3;
    planets.push({ now, orbit: f32(3 * n) });
  }
  const n = dv.getUint32(o, true);
  o += 4;
  const x = f32(n);
  const y = f32(n);
  const z = f32(n);
  const far = new Uint8Array(buffer.slice(o, o + n));
  o += n;
  const voyagers: Float32Array[] = [];
  const nv = dv.getUint8(o++);
  for (let k = 0; k < nv; k++) {
    const m = dv.getUint16(o, true);
    o += 2;
    voyagers.push(f32(3 * m));
  }
  return { planets, tno: { n, x, y, z, far }, voyagers };
}

export const loadSolar = loader("/orbit/solar.bin", decodeSolar);

export type SurfaceMap = {
  w: number;
  h: number;
  palette: RGB[];
  /** Palette index in the top 3 bits, brightness 0–31 below. */
  px: Uint8Array;
};

/** `maps.bin`: each world's 2k texture, quantized to a few colors. */
function decodeMaps(buffer: ArrayBuffer): Record<string, SurfaceMap> {
  const bytes = new Uint8Array(buffer);
  const dv = new DataView(buffer);
  const maps: Record<string, SurfaceMap> = {};
  let o = 1;
  for (let m = 0; m < bytes[0]; m++) {
    const len = bytes[o];
    const id = new TextDecoder().decode(bytes.subarray(o + 1, o + 1 + len));
    o += 1 + len;
    const w = dv.getUint16(o, true);
    const h = dv.getUint16(o + 2, true);
    const k = bytes[o + 4];
    o += 5;
    const palette: RGB[] = [];
    for (let j = 0; j < k; j++) {
      palette.push([bytes[o], bytes[o + 1], bytes[o + 2]]);
      o += 3;
    }
    maps[id] = { w, h, palette, px: bytes.slice(o, o + w * h) };
    o += w * h;
  }
  return maps;
}

export const loadMaps = loader("/orbit/maps.bin", decodeMaps);

/** Row-major 3 × 3 times a vector. */
export function mul(
  m: Mat3,
  v: ArrayLike<number>,
  out: Float64Array | number[],
  o = 0,
) {
  const x = v[0];
  const y = v[1];
  const z = v[2];
  out[o] = m[0] * x + m[1] * y + m[2] * z;
  out[o + 1] = m[3] * x + m[4] * y + m[5] * z;
  out[o + 2] = m[6] * x + m[7] * y + m[8] * z;
  return out;
}

/** Transpose times a vector: ICRF back into a world's body-fixed frame. */
export function mulT(
  m: Mat3,
  v: ArrayLike<number>,
  out: Float64Array | number[],
  o = 0,
) {
  const x = v[0];
  const y = v[1];
  const z = v[2];
  out[o] = m[0] * x + m[3] * y + m[6] * z;
  out[o + 1] = m[1] * x + m[4] * y + m[7] * z;
  out[o + 2] = m[2] * x + m[5] * y + m[8] * z;
  return out;
}

export const norm = (v: ArrayLike<number>) => Math.hypot(v[0], v[1], v[2]);

export function unitOf(v: ArrayLike<number>): Vec3 {
  const l = norm(v) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}

/** Solves Kepler's equation, starting from ±π at high eccentricity as the app does. */
function eccentric(M: number, e: number) {
  const m = M - TAU * Math.round(M / TAU);
  let E = e < 0.8 ? m : m < 0 ? -Math.PI : Math.PI;
  for (let k = 0; k < 30; k++) {
    const d = (E - e * Math.sin(E) - m) / (1 - e * Math.cos(E));
    E -= d;
    if (Math.abs(d) < 1e-10) break;
  }
  return E;
}

/** Two-body position (km, ICRF about the world) of a moon `t` seconds after the snapshot. */
export function moonAt(
  m: Moon,
  t: number,
  out: Float64Array | number[],
  o = 0,
) {
  return ellipsePoint(m.el, m.el[5] + m.n * t, out, o, true);
}

/**
 * A point on an orbit at mean anomaly `M` (or eccentric anomaly when `mean`
 * is false, which spaces samples evenly around long, thin ellipses).
 */
export function ellipsePoint(
  el: number[],
  M: number,
  out: Float64Array | number[],
  o = 0,
  mean = true,
) {
  const [a, e, i, node, peri] = el;
  const E = mean ? eccentric(M, e) : M;
  const x = a * (Math.cos(E) - e);
  const y = a * Math.sqrt(Math.max(0, 1 - e * e)) * Math.sin(E);
  const cw = Math.cos(peri);
  const sw = Math.sin(peri);
  const cO = Math.cos(node);
  const sO = Math.sin(node);
  const cI = Math.cos(i);
  const sI = Math.sin(i);
  out[o] = (cw * cO - sw * sO * cI) * x + (-sw * cO - cw * sO * cI) * y;
  out[o + 1] = (cw * sO + sw * cO * cI) * x + (-sw * sO + cw * cO * cI) * y;
  out[o + 2] = sw * sI * x + cw * sI * y;
  return out;
}

/**
 * A pinhole camera for scenes that fly: position and a right-handed basis,
 * with `focal` the screen distance in pixels. Coordinates are whatever the
 * scene works in (km about a world, or au about the Sun).
 */
export class Camera {
  pos: Vec3 = [0, 0, 1];
  right: Vec3 = [1, 0, 0];
  up: Vec3 = [0, 1, 0];
  /** Toward what the camera looks. */
  fwd: Vec3 = [0, 0, -1];
  cx = 0;
  cy = 0;
  focal = 1;

  lookAt(
    pos: ArrayLike<number>,
    target: ArrayLike<number>,
    upHint: ArrayLike<number> = [0, 0, 1],
  ) {
    this.pos = [pos[0], pos[1], pos[2]];
    const f = unitOf([
      target[0] - pos[0],
      target[1] - pos[1],
      target[2] - pos[2],
    ]);
    this.lookAlong(f, upHint);
    return this;
  }

  lookAlong(f: ArrayLike<number>, upHint: ArrayLike<number> = [0, 0, 1]) {
    const fwd = unitOf(f);
    let r = cross(fwd, upHint);
    if (norm(r) < 1e-6) r = cross(fwd, [1, 0, 0]);
    r = unitOf(r);
    this.fwd = fwd;
    this.right = r;
    this.up = cross(r, fwd);
    return this;
  }

  /**
   * Screen x, y and depth along the view; depth ≤ 0 is behind the camera.
   * Returns the pixels per unit at that depth.
   */
  project(x: number, y: number, z: number, out: Float64Array) {
    const dx = x - this.pos[0];
    const dy = y - this.pos[1];
    const dz = z - this.pos[2];
    const depth = dx * this.fwd[0] + dy * this.fwd[1] + dz * this.fwd[2];
    const sx = dx * this.right[0] + dy * this.right[1] + dz * this.right[2];
    const sy = dx * this.up[0] + dy * this.up[1] + dz * this.up[2];
    out[2] = depth;
    if (depth <= 1e-9) {
      out[0] = -1e5;
      out[1] = -1e5;
      return 0;
    }
    const k = this.focal / depth;
    out[0] = this.cx + sx * k;
    out[1] = this.cy - sy * k;
    return k;
  }
}

export function cross(a: ArrayLike<number>, b: ArrayLike<number>): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

export const dot3 = (a: ArrayLike<number>, b: ArrayLike<number>) =>
  a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** Spherical interpolation between unit vectors. */
export function slerp(a: Vec3, b: Vec3, t: number): Vec3 {
  const c = Math.max(-1, Math.min(1, dot3(a, b)));
  if (c > 0.99999)
    return unitOf([
      a[0] + (b[0] - a[0]) * t,
      a[1] + (b[1] - a[1]) * t,
      a[2] + (b[2] - a[2]) * t,
    ]);
  let perp: Vec3;
  if (c < -0.99999)
    perp = unitOf(
      Math.abs(a[2]) < 0.9 ? cross(a, [0, 0, 1]) : cross(a, [1, 0, 0]),
    );
  else perp = unitOf([b[0] - a[0] * c, b[1] - a[1] * c, b[2] - a[2] * c]);
  const th = Math.acos(c) * t;
  const ct = Math.cos(th);
  const st = Math.sin(th);
  return [
    a[0] * ct + perp[0] * st,
    a[1] * ct + perp[1] * st,
    a[2] * ct + perp[2] * st,
  ];
}

/** What a world's surface is at a point: its class slot and how bright it shows. */
export type Shade = { cls: number; a: number };

/**
 * Colors a surface point. `mu0` is the cosine of the Sun's angle from the
 * vertical (negative at night), `mu` the cosine of the camera's.
 */
export type Sampler = (
  lat: number,
  lon: number,
  mu0: number,
  mu: number,
  out: Shade,
) => void;

/** A sampler for a world's quantized map, lit with Minnaert's law. */
export function mapSampler(
  map: SurfaceMap | null,
  slot: number,
  { k = 0.8, night = 0.03, gain = 1 } = {},
): Sampler {
  return (lat, lon, mu0, mu, out) => {
    let cls = 0;
    let bright = 0.7;
    if (map) {
      const col = Math.min(
        map.w - 1,
        Math.floor(((lon / TAU + 0.5) % 1) * map.w),
      );
      const row = Math.min(
        map.h - 1,
        Math.max(0, Math.floor((0.5 - lat / Math.PI) * map.h)),
      );
      const v = map.px[row * map.w + col];
      cls = v >> 5;
      bright = (v & 31) / 31;
    }
    // Minnaert: I = cos(i)^k cos(e)^(k−1).
    const lit = mu0 > 0 ? mu0 ** k * Math.max(0.08, mu) ** (k - 1) : 0;
    out.cls = slot + cls;
    out.a = Math.min(
      1,
      (0.2 + 0.9 * bright) * (Math.min(1.2, lit) * gain + night),
    );
  };
}

export type WorldLook = {
  /** Equatorial and polar radius, in the scene's units. */
  radius: number;
  polar: number;
  /** Body-fixed to the scene's frame, row-major. */
  orient: Mat3;
  /** The Sun's direction from the world (unit, the scene's frame). */
  sun: ArrayLike<number>;
  sample: Sampler;
};

const SQRT3 = Math.sqrt(3);

/**
 * A world as a dot matrix seen through a `Camera`: a hexagonal lattice laid
 * over the part of the screen the world covers, each dot ray-cast onto the
 * spheroid, colored by the world's sampler. The lattice is anchored on the
 * world's center and spaced from its disc, so it zooms with the world while
 * the whole disc is in view, and from the screen once the world fills it, so
 * a horizon a few hundred kilometers below gets as many dots as a far Moon.
 */
export class DotWorld {
  private o = new Float64Array(3);
  private d = new Float64Array(3);
  private q = new Float64Array(3);
  private sunB = new Float64Array(3);
  private shade: Shade = { cls: 0, a: 0 };
  /** Screen radius and center of the last world placed. */
  r = 0;
  cx = 0;
  cy = 0;
  /** Lattice spacing used, px. */
  spacing = 0;
  /**
   * The eased spacing that fits the visible part of a clipped world, px;
   * 0 once the world is hidden, so it starts fresh when it comes back.
   */
  private fit = 0;
  /** Whether the world's center is in front of the camera. */
  ahead = false;

  /** Distance along the ray (body frame, sphere scaled) to the surface, or -1. */
  private hit(dx: number, dy: number, dz: number, R: number) {
    const o = this.o;
    const b = o[0] * dx + o[1] * dy + o[2] * dz;
    const c = o[0] * o[0] + o[1] * o[1] + o[2] * o[2] - R * R;
    const a = dx * dx + dy * dy + dz * dz;
    const disc = b * b - a * c;
    if (disc < 0) return -1;
    const t = (-b - Math.sqrt(disc)) / a;
    return t > 0 ? t : -1;
  }

  /** The ray through screen point (x, y), in the world's scaled body frame. */
  private ray(
    cam: Camera,
    look: WorldLook,
    x: number,
    y: number,
    flat: number,
  ) {
    const u = (x - cam.cx) / cam.focal;
    const v = -(y - cam.cy) / cam.focal;
    const w: Vec3 = [
      cam.fwd[0] + u * cam.right[0] + v * cam.up[0],
      cam.fwd[1] + u * cam.right[1] + v * cam.up[1],
      cam.fwd[2] + u * cam.right[2] + v * cam.up[2],
    ];
    mulT(look.orient, w, this.d);
    this.d[2] /= flat;
  }

  /**
   * Writes goals for particles [start, start + count) for a world centered at
   * `center`, clipped to `box`; particles it doesn't need are hidden.
   * Returns how many it lit.
   */
  place(
    f: Field,
    start: number,
    count: number,
    cam: Camera,
    center: ArrayLike<number>,
    look: WorldLook,
    box: { x: number; y: number; w: number; h: number },
    { alpha = 1, maxSize = 3.2, minSize = 0.9 } = {},
  ) {
    const R = look.radius;
    const flat = look.polar / look.radius;
    const s = this.q;
    cam.project(center[0], center[1], center[2], s);
    const dist = Math.hypot(
      cam.pos[0] - center[0],
      cam.pos[1] - center[1],
      cam.pos[2] - center[2],
    );
    let lit = 0;
    // The camera in the body frame, the sphere scaled around it.
    mulT(
      look.orient,
      [cam.pos[0] - center[0], cam.pos[1] - center[1], cam.pos[2] - center[2]],
      this.o,
    );
    this.o[2] /= flat;
    mulT(look.orient, look.sun, this.sunB);
    const hide = (from: number) => {
      for (let k = from; k < count && start + k < f.n; k++) {
        const i = start + k;
        f.ga[i] = 0;
        f.gx[i] = this.cx;
        f.gy[i] = this.cy;
        f.gj[i] = 0;
      }
    };
    if (dist <= R * 1.000001 || count <= 0) {
      this.ahead = false;
      this.fit = 0;
      hide(0);
      return 0;
    }
    // The disc on screen: exact for a sphere whose center is ahead.
    const ahead = s[2] > 0;
    const rs = ahead
      ? (cam.focal * R) / Math.sqrt(Math.max(1e-9, dist * dist - R * R))
      : Infinity;
    this.cx = ahead ? s[0] : cam.cx;
    this.cy = ahead ? s[1] : cam.cy;
    this.r = rs;
    this.ahead = ahead;
    const x0 = Math.max(box.x, this.cx - rs);
    const x1 = Math.min(box.x + box.w, this.cx + rs);
    const y0 = Math.max(box.y, this.cy - rs);
    const y1 = Math.min(box.y + box.h, this.cy + rs);
    if (x1 <= x0 || y1 <= y0 || rs < 0.5) {
      this.fit = 0;
      hide(0);
      return 0;
    }
    // How much of that box the world covers, from a coarse grid of rays.
    let hits = 0;
    const G = 14;
    for (let gy = 0; gy < G; gy++) {
      for (let gx = 0; gx < G; gx++) {
        this.ray(
          cam,
          look,
          x0 + ((gx + 0.5) / G) * (x1 - x0),
          y0 + ((gy + 0.5) / G) * (y1 - y0),
          flat,
        );
        if (this.hit(this.d[0], this.d[1], this.d[2], R) > 0) hits++;
      }
    }
    if (hits === 0 && !ahead) {
      // Behind the camera and nowhere in view.
      this.fit = 0;
      hide(0);
      return 0;
    }
    const area = Math.max(
      1,
      (x1 - x0) * (y1 - y0) * Math.max(0.03, hits / (G * G)),
    );
    // While the whole disc is in view the spacing follows the disc exactly, so
    // the lattice zooms with the world and every particle keeps its slot; any
    // lag would change the slot count and reshuffle the globe mid-zoom. Once
    // the world overflows the view the spacing follows the part that shows,
    // eased so the estimate's noise can't jitter it, and never wider than the
    // disc's, so it meets the disc's exactly as the world fits back in view.
    const clipped =
      this.cx - rs < box.x ||
      this.cx + rs > box.x + box.w ||
      this.cy - rs < box.y ||
      this.cy + rs > box.y + box.h;
    const disc = rs * Math.sqrt((2 * Math.PI) / (SQRT3 * count));
    if (clipped) {
      const target = Math.sqrt((area * 2) / (SQRT3 * count)) * 1.04;
      const prev = this.fit;
      this.fit =
        prev > 0 && Math.abs(Math.log(target / prev)) < 0.7
          ? prev + (target - prev) * 0.2
          : target;
    } else {
      this.fit = disc;
    }
    const sp = Math.max(0.6, Math.min(this.fit, disc));
    this.spacing = sp;
    const size = Math.min(maxSize, Math.max(minSize, sp * 0.8));
    const thin = Math.min(1, (sp / 2.2) ** 2 + 0.3);
    const rowH = (sp * SQRT3) / 2;
    const sh = this.shade;
    const q = this.q;
    // Rows anchored on the center, so the lattice holds still as the world turns.
    const r0 = Math.ceil((y0 - this.cy) / rowH);
    for (let row = r0; ; row++) {
      const y = this.cy + row * rowH;
      if (y > y1 || lit >= count) break;
      const off = (((row % 2) + 2) % 2) * 0.5 * sp;
      const c0 = Math.ceil((x0 - this.cx - off) / sp);
      for (let col = c0; ; col++) {
        const x = this.cx + off + col * sp;
        if (x > x1 || lit >= count) break;
        this.ray(cam, look, x, y, flat);
        const t = this.hit(this.d[0], this.d[1], this.d[2], R);
        if (t < 0) continue;
        q[0] = this.o[0] + t * this.d[0];
        q[1] = this.o[1] + t * this.d[1];
        q[2] = this.o[2] + t * this.d[2];
        // Normal on the spheroid, from the scaled sphere's.
        let nx = q[0];
        let ny = q[1];
        let nz = q[2] / flat;
        const nl = Math.hypot(nx, ny, nz) || 1;
        nx /= nl;
        ny /= nl;
        nz /= nl;
        const dl = Math.hypot(this.d[0], this.d[1], this.d[2] * flat) || 1;
        const mu =
          -(nx * this.d[0] + ny * this.d[1] + nz * this.d[2] * flat) / dl;
        const mu0 = nx * this.sunB[0] + ny * this.sunB[1] + nz * this.sunB[2];
        const lat = Math.asin(Math.max(-1, Math.min(1, q[2] / R)));
        const lon = Math.atan2(q[1], q[0]);
        look.sample(lat, lon, mu0, mu, sh);
        const i = start + lit;
        if (i >= f.n) break;
        f.gx[i] = x;
        f.gy[i] = y;
        f.gz[i] = size;
        f.gj[i] = 0;
        f.gh[i] = 0;
        f.gc[i] = sh.cls;
        // The limb thins out, as the app's atmosphere-free worlds do.
        f.ga[i] = sh.a * alpha * thin * (0.55 + 0.45 * Math.min(1, mu * 3));
        lit++;
      }
    }
    hide(lit);
    return lit;
  }
}

/** km from `here` to every world, as the Fly to list reads them. */
export function flyFrom(
  w: Worlds | null,
  here: string,
): Record<string, number> {
  const km: Record<string, number> = {};
  if (!w) return km;
  const k = w.distances.order.indexOf(here);
  if (k < 0) return km;
  w.distances.order.forEach((id, j) => {
    km[id] = w.distances.km[k][j];
  });
  return km;
}

/**
 * Spare particles as stars at infinity: each keeps a fixed direction on the
 * sky (from its seeds), so the field wheels as the camera turns and holds
 * still while it only moves, as the app's Hipparcos stars do. Angles are
 * compressed by `spread`, so a narrow view still holds a field of stars.
 */
export function skyStar(
  f: Field,
  i: number,
  cam: Camera,
  box: { x: number; y: number; w: number; h: number },
  alpha = 1,
  ink = 4,
  spread = 2.6,
) {
  const z = f.r0[i] * 2 - 1;
  const t = f.r1[i] * TAU;
  const q = Math.sqrt(1 - z * z);
  const dx = q * Math.cos(t);
  const dy = q * Math.sin(t);
  const depth = dx * cam.fwd[0] + dy * cam.fwd[1] + z * cam.fwd[2];
  const sx = dx * cam.right[0] + dy * cam.right[1] + z * cam.right[2];
  const sy = dx * cam.up[0] + dy * cam.up[1] + z * cam.up[2];
  const bright = f.r2[i] ** 6;
  f.gc[i] = ink;
  f.gh[i] = 0;
  f.gj[i] = 0.02;
  f.gz[i] = 0.7 + bright * 1.2;
  if (depth <= 0.2) {
    f.ga[i] = 0;
    return;
  }
  const x = cam.cx + (Math.atan2(sx, depth) / spread) * cam.focal;
  const y = cam.cy - (Math.atan2(sy, depth) / spread) * cam.focal;
  f.gx[i] = x;
  f.gy[i] = y;
  const inside =
    x > box.x && x < box.x + box.w && y > box.y && y < box.y + box.h;
  f.ga[i] = inside ? (0.12 + 0.7 * bright) * alpha : 0;
}

/** Whether (x, y) falls in a box. */
export const inBox = (
  b: { x: number; y: number; w: number; h: number },
  x: number,
  y: number,
) => x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h;

/** A world's name where it hangs in the sky, as the app tags them: a dot and the name. */
export function skyTag(
  ctx: CanvasRenderingContext2D,
  type: {
    text: (
      ctx: CanvasRenderingContext2D,
      s: string,
      x: number,
      y: number,
      o?: object,
    ) => number;
  },
  name: string,
  x: number,
  y: number,
  alpha = 1,
) {
  if (alpha < 0.01) return;
  const w = type.text(ctx, name, -999, -999, { size: 7.5, spacing: 0.16 }) + 22;
  ctx.fillStyle = `rgba(0,0,0,${(0.78 * alpha).toFixed(3)})`;
  ctx.fillRect(x + 8, y - 8, w, 16);
  ctx.strokeStyle = `rgba(240,240,250,${(0.32 * alpha).toFixed(3)})`;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 8.5, y - 7.5, w - 1, 15);
  ctx.fillStyle = `rgba(240,240,250,${alpha.toFixed(3)})`;
  ctx.beginPath();
  ctx.arc(x + 16, y, 1.8, 0, TAU);
  ctx.fill();
  type.text(ctx, name, x + 23, y, { size: 7.5, spacing: 0.16, alpha });
}

/**
 * The app's flight between worlds (`scene/travel.ts`): planned in
 * log-distance, rising off world A while swinging around to face B, then
 * falling toward B and around to its lit side. Positions are relative to A.
 */
export type TravelPlan = {
  from: Vec3;
  look: Vec3;
  toDir: Vec3;
  toDist: number;
};

const easeInOut = (u: number) =>
  u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2;
const smooth = (e0: number, e1: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

/** The app eases flight time in and out; scroll-driven scenes pass their own `k`. */
export const travelEase = (u: number) => easeInOut(Math.max(0, Math.min(1, u)));

/** Camera position and look at eased progress `k` ∈ [0, 1], B relative to A. */
export function travelPose(plan: TravelPlan, k: number, B: Vec3) {
  const D = norm(B);
  const dir: Vec3 = [B[0] / D, B[1] / D, B[2] / D];
  const r0 = norm(plan.from);
  const r1 = plan.toDist;
  const half = D / 2;
  const L1 = Math.max(0.05, Math.log(half / r0));
  const L2 = Math.max(0.05, Math.log(half / r1));
  const tm = L1 / (L1 + L2);
  let pos: Vec3;
  if (k <= tm) {
    const f = k / tm;
    const d = slerp(unitOf(plan.from), dir, smooth(0, 0.85, f));
    const r = r0 * Math.exp(L1 * f);
    pos = [d[0] * r, d[1] * r, d[2] * r];
  } else {
    const f = (k - tm) / (1 - tm);
    const d = slerp(
      [-dir[0], -dir[1], -dir[2]],
      plan.toDir,
      smooth(0.15, 1, f),
    );
    const r = half * Math.exp(-L2 * f);
    pos = [B[0] + d[0] * r, B[1] + d[1] * r, B[2] + d[2] * r];
  }
  const toB = unitOf([B[0] - pos[0], B[1] - pos[1], B[2] - pos[2]]);
  const look = slerp(plan.look, toB, smooth(0.02, Math.min(0.45, tm), k));
  return { pos, look, k, tm };
}

/** Where to arrive: 50° off the Sun toward the side we came from, leaning to the sunlit pole. */
export function arrivalDirection(
  fromAtoB: Vec3,
  sunFromB: Vec3,
  pole: Vec3,
): Vec3 {
  const sun = unitOf(sunFromB);
  const back = unitOf([-fromAtoB[0], -fromAtoB[1], -fromAtoB[2]]);
  const bs = dot3(back, sun);
  let side: Vec3 = [
    back[0] - sun[0] * bs,
    back[1] - sun[1] * bs,
    back[2] - sun[2] * bs,
  ];
  if (norm(side) < 1e-3) side = cross(sun, pole);
  const d = slerp(sun, unitOf(side), 50 / 90);
  const lean = dot3(sun, pole) < 0 ? -0.3 : 0.3;
  return unitOf([
    d[0] + pole[0] * lean,
    d[1] + pole[1] * lean,
    d[2] + pole[2] * lean,
  ]);
}

/**
 * Osculating elements from a state vector (km, km/s) about a body with
 * gravitational parameter `mu`, as `ellipsePoint` takes them, with the mean
 * motion (rad/s). Bound orbits only.
 */
export function elementsFromState(s: ArrayLike<number>, mu: number) {
  const r = [s[0], s[1], s[2]];
  const v = [s[3], s[4], s[5]];
  const rn = Math.hypot(r[0], r[1], r[2]);
  const h = cross(r, v);
  const hn = norm(h);
  const v2 = v[0] * v[0] + v[1] * v[1] + v[2] * v[2];
  const a = 1 / (2 / rn - v2 / mu);
  const rv = r[0] * v[0] + r[1] * v[1] + r[2] * v[2];
  const ev = [0, 1, 2].map((k) => ((v2 - mu / rn) * r[k] - rv * v[k]) / mu);
  const e = norm(ev);
  const i = Math.acos(Math.max(-1, Math.min(1, h[2] / hn)));
  const nv = [-h[1], h[0], 0];
  const nn = Math.hypot(nv[0], nv[1]);
  const node = nn > 1e-12 ? Math.atan2(nv[1], nv[0]) : 0;
  const N = nn > 1e-12 ? [nv[0] / nn, nv[1] / nn, 0] : [1, 0, 0];
  const W = [h[0] / hn, h[1] / hn, h[2] / hn];
  const NxW = cross(W, N);
  const ang = (u: number[]) => Math.atan2(dot3(u, NxW), dot3(u, N));
  const u = ang(r);
  const peri = e > 1e-9 ? ang(ev) : 0;
  const nu = u - peri;
  const E =
    2 *
    Math.atan2(
      Math.sqrt(1 - e) * Math.sin(nu / 2),
      Math.sqrt(1 + e) * Math.cos(nu / 2),
    );
  return {
    el: [a, e, i, node, peri, E - e * Math.sin(E)],
    n: Math.sqrt(mu / (a * a * a)),
  };
}
