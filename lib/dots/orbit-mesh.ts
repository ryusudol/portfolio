/**
 * Starlink's laser mesh as Orbit Explorer builds it (its `engine/src/isl.rs`),
 * ported to TypeScript for the case study. The satellites are the 53° shell
 * the engine recovers from the October 9, 2026, catalog, flown on circular
 * orbits from their state at that instant, so the page can move them without
 * SGP4. Everything is Earth-fixed (ECEF, km), so the ground stays put while
 * the shell sweeps over it.
 *
 * No imports, so the same file runs under Node to check it against the engine.
 */

/** WGS-72 μ (km³/s²) and equatorial radius, as SGP4 uses them. */
const MU = 398600.8;
const RE = 6378.135;
const J2 = 0.001082616;
const OMEGA_EARTH = 7.292115146706979e-5;
const WGS84_A = 6378.137;
const WGS84_F = 1 / 298.257223563;
const WGS84_E2 = WGS84_F * (2 - WGS84_F);
const DEG = Math.PI / 180;
const TAU = Math.PI * 2;

export const C_KM_S = 299_792.458;
/** Refractive index of the fiber the engine compares against. */
export const FIBER_INDEX = 1.4682;

/** The engine's `IslConfig::default()`. */
const MAX_IN_PLANE_KM = 2600;
const MAX_CROSS_PLANE_KM = 1500;
const MIN_LINK_RADIUS = WGS84_A + 80;
const MAX_PLANE_GAP = 25 * DEG;
const MAX_PHASE_GAP = 40 * DEG;

export type Shell = {
  n: number;
  /** Julian date and Greenwich sidereal angle (rad) of the snapshot. */
  jd: number;
  gmst: number;
  planes: number;
  /** Satellites are grouped by plane, planes ordered by RAAN, then by phase. */
  planeOf: Uint8Array;
  planeStart: Int32Array;
  raan: Float64Array;
  /** Argument of latitude at the snapshot (rad). */
  phase: Float64Array;
  radius: Float64Array;
  cosI: Float64Array;
  sinI: Float64Array;
  /** Rates of the argument of latitude and of the node (rad/s). */
  rate: Float64Array;
  nodeRate: Float64Array;
  planeRate: Float64Array;
  /** Circular mean of each plane's node at the snapshot (rad). */
  planeRaan: Float64Array;
  /** Mean altitude (km) and inclination (deg) of the whole shell. */
  altitude: number;
  inclination: number;
};

/** Decodes `public/orbit/shell.bin` (see the case study's data notes). */
export function decodeShell(buffer: ArrayBuffer): Shell {
  const dv = new DataView(buffer);
  const n = dv.getUint32(0, true);
  const jd = dv.getFloat64(4, true);
  const gmst = dv.getFloat64(12, true);
  const planes = dv.getUint16(20, true);
  let off = 22;
  const planeOf = new Uint8Array(n);
  for (let k = 0; k < n; k++) planeOf[k] = dv.getUint8(off + k);
  off += n;
  const u16 = () => {
    const out = new Float64Array(n);
    for (let k = 0; k < n; k++) out[k] = dv.getUint16(off + 2 * k, true);
    off += 2 * n;
    return out;
  };
  const raan = u16().map((v) => (v / 65536) * TAU);
  const phase = u16().map((v) => (v / 65536) * TAU);
  const altitude = u16().map((v) => v / 100);
  const incl = u16().map((v) => (v / 65535) * Math.PI);
  const revs = u16().map((v) => 14 + v / 16384);

  const radius = altitude.map((h) => RE + h);
  const cosI = incl.map(Math.cos);
  const sinI = incl.map(Math.sin);
  const rate = revs.map((r) => (r * TAU) / 86400);
  // Secular J2 drift of the node, the only perturbation big enough to see.
  const nodeRate = new Float64Array(n);
  for (let k = 0; k < n; k++) {
    const a = Math.cbrt(MU / (rate[k] * rate[k]));
    nodeRate[k] = -1.5 * J2 * rate[k] * (RE / a) ** 2 * cosI[k];
  }
  const planeStart = new Int32Array(planes + 1);
  for (let k = 0; k < n; k++) planeStart[planeOf[k] + 1]++;
  for (let p = 0; p < planes; p++) planeStart[p + 1] += planeStart[p];
  const planeRate = new Float64Array(planes);
  const planeRaan = new Float64Array(planes);
  for (let p = 0; p < planes; p++) {
    let s = 0;
    let sin = 0;
    let cos = 0;
    for (let k = planeStart[p]; k < planeStart[p + 1]; k++) {
      s += rate[k];
      sin += Math.sin(raan[k]);
      cos += Math.cos(raan[k]);
    }
    planeRate[p] = s / Math.max(1, planeStart[p + 1] - planeStart[p]);
    planeRaan[p] = (Math.atan2(sin, cos) + TAU) % TAU;
  }
  let hSum = 0;
  let iSum = 0;
  for (let k = 0; k < n; k++) {
    hSum += altitude[k];
    iSum += incl[k];
  }
  return {
    n,
    jd,
    gmst,
    planes,
    planeOf,
    planeStart,
    raan,
    phase,
    radius,
    cosI,
    sinI,
    rate,
    nodeRate,
    planeRate,
    planeRaan,
    altitude: hSum / n,
    inclination: iSum / n / DEG,
  };
}

/** Earth-fixed positions `t` seconds after the snapshot, xyz-interleaved. */
export function shellPositions(shell: Shell, t: number, out: Float64Array) {
  const theta = shell.gmst + OMEGA_EARTH * t;
  for (let k = 0; k < shell.n; k++) {
    const u = shell.phase[k] + shell.rate[k] * t;
    const node = shell.raan[k] + shell.nodeRate[k] * t - theta;
    const cu = Math.cos(u);
    const su = Math.sin(u);
    const cn = Math.cos(node);
    const sn = Math.sin(node);
    const r = shell.radius[k];
    out[3 * k] = r * (cu * cn - su * shell.cosI[k] * sn);
    out[3 * k + 1] = r * (cu * sn + su * shell.cosI[k] * cn);
    out[3 * k + 2] = r * su * shell.sinI[k];
  }
  return out;
}

export type Terminal = {
  pos: [number, number, number];
  up: [number, number, number];
};

export function terminal(latDeg: number, lonDeg: number): Terminal {
  const lat = latDeg * DEG;
  const lon = lonDeg * DEG;
  const sl = Math.sin(lat);
  const cl = Math.cos(lat);
  const so = Math.sin(lon);
  const co = Math.cos(lon);
  const n = WGS84_A / Math.sqrt(1 - WGS84_E2 * sl * sl);
  return {
    pos: [n * cl * co, n * cl * so, n * (1 - WGS84_E2) * sl],
    up: [cl * co, cl * so, sl],
  };
}

const dist = (p: Float64Array, a: number, b: number) =>
  Math.hypot(
    p[3 * a] - p[3 * b],
    p[3 * a + 1] - p[3 * b + 1],
    p[3 * a + 2] - p[3 * b + 2],
  );

/** The straight segment between two satellites stays above 80 km. */
function lineOfSight(p: Float64Array, a: number, b: number) {
  const ax = p[3 * a];
  const ay = p[3 * a + 1];
  const az = p[3 * a + 2];
  const dx = p[3 * b] - ax;
  const dy = p[3 * b + 1] - ay;
  const dz = p[3 * b + 2] - az;
  const dd = dx * dx + dy * dy + dz * dz;
  const t =
    dd === 0
      ? 0
      : Math.min(1, Math.max(0, -(ax * dx + ay * dy + az * dz) / dd));
  return Math.hypot(ax + dx * t, ay + dy * t, az + dz * t) > MIN_LINK_RADIUS;
}

const wrapPi = (a: number) => ((((a + Math.PI) % TAU) + TAU) % TAU) - Math.PI;

export type Mesh = {
  /** Links as satellite index pairs, `count` of them. */
  edges: Int32Array;
  count: number;
  offsets: Int32Array;
  targets: Int32Array;
  weights: Float64Array;
};

export function createMesh(shell: Shell): Mesh {
  return {
    edges: new Int32Array(shell.n * 6),
    count: 0,
    offsets: new Int32Array(shell.n + 1),
    targets: new Int32Array(shell.n * 6),
    weights: new Float64Array(shell.n * 6),
  };
}

/**
 * +Grid: each satellite links to the satellites ahead of and behind it in its
 * plane, and to the nearest satellite of the next plane east. Links longer
 * than the engine's limits, or that would graze the atmosphere, are dropped.
 */
export function buildMesh(
  shell: Shell,
  pos: Float64Array,
  t: number,
  mesh: Mesh,
) {
  const { planeStart, planes } = shell;
  let count = 0;
  const link = (a: number, b: number, max: number) => {
    if (a === b) return;
    if (dist(pos, a, b) <= max && lineOfSight(pos, a, b)) {
      mesh.edges[2 * count] = a;
      mesh.edges[2 * count + 1] = b;
      count++;
    }
  };

  for (let p = 0; p < planes; p++) {
    const s = planeStart[p];
    const len = planeStart[p + 1] - s;
    if (len < 2) continue;
    for (let k = 0; k < len; k++) {
      if (len === 2 && k === 1) break;
      link(s + k, s + ((k + 1) % len), MAX_IN_PLANE_KM);
    }
  }

  for (let p = 0; p < planes && planes > 1; p++) {
    const q = (p + 1) % planes;
    const gap = (shell.planeRaan[q] - shell.planeRaan[p] + TAU) % TAU;
    if (gap > MAX_PLANE_GAP) continue;
    const qs = planeStart[q];
    const qn = planeStart[q + 1] - qs;
    if (qn < 1) continue;
    // The next plane's phases at t, as offsets into its snapshot order.
    const shift = shell.planeRate[q] * t;
    for (let m = planeStart[p]; m < planeStart[p + 1]; m++) {
      const um = shell.phase[m] + shell.rate[m] * t;
      const want = (((um - shift) % TAU) + TAU) % TAU;
      let lo = 0;
      let hi = qn;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (shell.phase[qs + mid] < want) lo = mid + 1;
        else hi = mid;
      }
      let best = -1;
      let bestD = Number.POSITIVE_INFINITY;
      for (let off = -2; off <= 2; off++) {
        const e = qs + ((((lo + off) % qn) + qn) % qn);
        const ue = shell.phase[e] + shell.rate[e] * t;
        if (Math.abs(wrapPi(ue - um)) > MAX_PHASE_GAP) continue;
        const d = dist(pos, m, e);
        if (d < bestD) {
          bestD = d;
          best = e;
        }
      }
      if (best >= 0) link(m, best, MAX_CROSS_PLANE_KM);
    }
  }
  mesh.count = count;

  // Adjacency for routing, in compressed rows.
  const { offsets, targets, weights } = mesh;
  offsets.fill(0);
  for (let e = 0; e < count; e++) {
    offsets[mesh.edges[2 * e] + 1]++;
    offsets[mesh.edges[2 * e + 1] + 1]++;
  }
  for (let k = 0; k < shell.n; k++) offsets[k + 1] += offsets[k];
  const fill = offsets.slice(0, shell.n);
  for (let e = 0; e < count; e++) {
    const a = mesh.edges[2 * e];
    const b = mesh.edges[2 * e + 1];
    const w = dist(pos, a, b);
    targets[fill[a]] = b;
    weights[fill[a]++] = w;
    targets[fill[b]] = a;
    weights[fill[b]++] = w;
  }
  return mesh;
}

export type Route = {
  /** Satellites from the uplink to the downlink. */
  path: number[];
  km: number;
  uplinkKm: number;
  downlinkKm: number;
};

function elevationSin(t: Terminal, p: Float64Array, k: number) {
  const dx = p[3 * k] - t.pos[0];
  const dy = p[3 * k + 1] - t.pos[1];
  const dz = p[3 * k + 2] - t.pos[2];
  return (dx * t.up[0] + dy * t.up[1] + dz * t.up[2]) / Math.hypot(dx, dy, dz);
}

const groundDist = (t: Terminal, p: Float64Array, k: number) =>
  Math.hypot(
    p[3 * k] - t.pos[0],
    p[3 * k + 1] - t.pos[1],
    p[3 * k + 2] - t.pos[2],
  );

/**
 * Dijkstra from one ground terminal to the other, through satellites at
 * least `minElevDeg` above each. Every hop weighs its length, so the
 * latency is the path length over c.
 */
export function route(
  shell: Shell,
  pos: Float64Array,
  mesh: Mesh,
  src: Terminal,
  dst: Terminal,
  minElevDeg = 25,
): Route | null {
  const n = shell.n;
  const minSin = Math.sin(minElevDeg * DEG);
  const best = new Float64Array(n + 1).fill(Number.POSITIVE_INFINITY);
  const prev = new Int32Array(n + 1).fill(-1);
  const down = new Float64Array(n).fill(Number.NaN);
  const SRC = -2;
  const DST = n;
  const heap = new Heap();
  for (let k = 0; k < n; k++) {
    if (elevationSin(dst, pos, k) >= minSin) down[k] = groundDist(dst, pos, k);
    if (elevationSin(src, pos, k) >= minSin) {
      best[k] = groundDist(src, pos, k);
      prev[k] = SRC;
      heap.push(best[k], k);
    }
  }
  while (heap.size > 0) {
    const d = heap.topKey();
    const u = heap.pop();
    if (d > best[u]) continue;
    if (u === DST) break;
    if (!Number.isNaN(down[u]) && d + down[u] < best[DST]) {
      best[DST] = d + down[u];
      prev[DST] = u;
      heap.push(best[DST], DST);
    }
    for (let e = mesh.offsets[u]; e < mesh.offsets[u + 1]; e++) {
      const v = mesh.targets[e];
      const nd = d + mesh.weights[e];
      if (nd < best[v]) {
        best[v] = nd;
        prev[v] = u;
        heap.push(nd, v);
      }
    }
  }
  if (!Number.isFinite(best[DST])) return null;
  const path: number[] = [];
  for (let cur = prev[DST]; cur !== SRC; cur = prev[cur]) path.push(cur);
  path.reverse();
  return {
    path,
    km: best[DST],
    uplinkKm: groundDist(src, pos, path[0]),
    downlinkKm: down[path[path.length - 1]],
  };
}

/** Great-circle distance (km) on a sphere of the mean Earth radius. */
export function greatCircleKm(a: [number, number], b: [number, number]) {
  const [la1, lo1] = [a[0] * DEG, a[1] * DEG];
  const [la2, lo2] = [b[0] * DEG, b[1] * DEG];
  const h =
    Math.sin((la2 - la1) / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin((lo2 - lo1) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** A binary min-heap of (key, node). */
class Heap {
  private keys: number[] = [];
  private nodes: number[] = [];

  get size() {
    return this.keys.length;
  }

  topKey() {
    return this.keys[0];
  }

  push(key: number, node: number) {
    const keys = this.keys;
    const nodes = this.nodes;
    let i = keys.length;
    keys.push(key);
    nodes.push(node);
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (keys[parent] <= key) break;
      keys[i] = keys[parent];
      nodes[i] = nodes[parent];
      i = parent;
    }
    keys[i] = key;
    nodes[i] = node;
  }

  pop() {
    const keys = this.keys;
    const nodes = this.nodes;
    const top = nodes[0];
    const lastKey = keys.pop() as number;
    const lastNode = nodes.pop() as number;
    const n = keys.length;
    if (n > 0) {
      let i = 0;
      for (;;) {
        let c = 2 * i + 1;
        if (c >= n) break;
        if (c + 1 < n && keys[c + 1] < keys[c]) c++;
        if (keys[c] >= lastKey) break;
        keys[i] = keys[c];
        nodes[i] = nodes[c];
        i = c;
      }
      keys[i] = lastKey;
      nodes[i] = lastNode;
    }
    return top;
  }
}
