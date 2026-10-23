import { decodeShell } from "./orbit-mesh";

/**
 * Real data behind the Orbit Explorer story. The binaries in `public/orbit`
 * are exported from the app's own Rust engine, run natively on its snapshot
 * of the full Space-Track catalog (32,583 objects, October 9, 2026), and
 * packed small (see the case study's data notes in the README). The engine
 * reproduces the README's figures from them: seven Starlink shells, 17,719
 * laser links, and 2,981 encounters under 5 km in the hour after the snapshot.
 */
export const SNAPSHOT = {
  objects: 32_583,
  starlink: 11_131,
  /** Debris (11,635) and spent rocket bodies (2,109), as the app groups them. */
  debris: 13_744,
  other: 7_708,
};

export const MU = 398600.8;
export const RE = 6378.135;
export const OMEGA_EARTH = 7.292115146706979e-5;
const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

/** Display groups, in the app's order. */
export const STARLINK = 0;
export const DEBRIS = 1;
export const OTHER = 2;

/**
 * Loads and decodes `url` once. Resolves null, never rejects, when the file
 * can't be fetched (retried on the next call) or can't be decoded (kept, since
 * the same bytes would fail again).
 */
export function loader<T>(url: string, decode: (buffer: ArrayBuffer) => T) {
  let decoded: Promise<T | null> | null = null;
  return () => {
    if (decoded) return decoded;
    const pending = fetch(url)
      .then((res) => (res.ok ? res.arrayBuffer() : null))
      .catch(() => null)
      .then((buffer) => {
        if (!buffer) {
          if (decoded === pending) decoded = null;
          return null;
        }
        try {
          return decode(buffer);
        } catch (error) {
          console.error(`[dots] couldn't decode ${url}`, error);
          return null;
        }
      });
    decoded = pending;
    return pending;
  };
}

export type Catalog = {
  n: number;
  jd: number;
  /** Mean semi-major axis and altitude (km). */
  a: Float32Array;
  alt: Float32Array;
  e: Float32Array;
  /** Mean inclination (rad). */
  incl: Float32Array;
  raan: Float32Array;
  argp: Float32Array;
  /** Mean anomaly at the snapshot (rad). */
  m0: Float32Array;
  /** Mean motion (rad/s). */
  rate: Float32Array;
  group: Uint8Array;
};

const LOG_LO = Math.log(6400);
const LOG_HI = Math.log(420000);

/**
 * `catalog.bin`: a random 8,192 of the catalog in shuffled order, so any
 * prefix is a random sample too. u32 n, f64 jd, then u16 arrays of log
 * semi-major axis, eccentricity, inclination, node, perigee and mean anomaly,
 * and a u8 group.
 */
function decodeCatalog(buffer: ArrayBuffer): Catalog {
  const dv = new DataView(buffer);
  const n = dv.getUint32(0, true);
  const jd = dv.getFloat64(4, true);
  const col = (k: number) => new Uint16Array(buffer, 12 + 2 * n * k, n);
  const angle = (q: Uint16Array) =>
    Float32Array.from(q, (v) => (v / 65536) * TAU);
  const a = Float32Array.from(col(0), (v) =>
    Math.exp(LOG_LO + (v / 65535) * (LOG_HI - LOG_LO)),
  );
  return {
    n,
    jd,
    a,
    alt: a.map((v) => v - RE),
    e: Float32Array.from(col(1), (v) => v / 65535),
    incl: Float32Array.from(col(2), (v) => (v / 65535) * Math.PI),
    raan: angle(col(3)),
    argp: angle(col(4)),
    m0: angle(col(5)),
    rate: a.map((v) => Math.sqrt(MU / (v * v * v))),
    group: new Uint8Array(buffer, 12 + 12 * n, n),
  };
}

export const loadCatalog = loader("/orbit/catalog.bin", decodeCatalog);
export const loadShell = loader("/orbit/shell.bin", decodeShell);

/**
 * Two-body position (TEME, km) of object `k`, `t` seconds after the
 * snapshot. Good to a few kilometers over the hours a scene runs for, far
 * below a pixel at the scales drawn.
 */
export function orbitPosition(
  cat: Catalog,
  k: number,
  t: number,
  out: Float64Array,
  o = 0,
) {
  const e = cat.e[k];
  const M = cat.m0[k] + cat.rate[k] * t;
  let E = M;
  for (let it = 0; it < (e > 0.1 ? 8 : 3); it++) {
    E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  }
  const cE = Math.cos(E);
  const r = cat.a[k] * (1 - e * cE);
  const nu = Math.atan2(Math.sqrt(1 - e * e) * Math.sin(E), cE - e);
  const u = cat.argp[k] + nu;
  const cu = Math.cos(u);
  const su = Math.sin(u);
  const cn = Math.cos(cat.raan[k]);
  const sn = Math.sin(cat.raan[k]);
  const ci = Math.cos(cat.incl[k]);
  out[o] = r * (cu * cn - su * ci * sn);
  out[o + 1] = r * (cu * sn + su * ci * cn);
  out[o + 2] = r * su * Math.sin(cat.incl[k]);
  return out;
}

/** Greenwich mean sidereal angle (rad) at a Julian date, as SGP4's `gstime`. */
export function gmst(jd: number) {
  const t = (jd - 2451545) / 36525;
  const seconds =
    -6.2e-6 * t * t * t +
    0.093104 * t * t +
    (876600 * 3600 + 8640184.812866) * t +
    67310.54841;
  return ((((seconds * DEG) / 240) % TAU) + TAU) % TAU;
}

/**
 * How many catalog objects get a dot: the story's sky and its unfolded
 * map share this, so the same dot is the same object in both.
 */
export const catalogDots = (cat: Catalog, particles: number) =>
  Math.min(cat.n, Math.round(particles * 0.74));

export type Earth = {
  /**
   * One byte per 1° cell, row 0 at 90°N, column 0 at 180°W: the surface
   * class in the low 2 bits (see `Surface`) and city lights, 0 to 63, above.
   */
  surface: Uint8Array;
  /**
   * How many of Starlink's 10,847 linked satellites each 2° cell sees above
   * 25°, from the engine's `coverage_grid`. Row 0 at 90°S.
   */
  coverage: Uint8Array;
};

/** Surface classes, from the app's own day texture and ocean-mask rule. */
export const Surface = { Ocean: 0, Green: 1, Arid: 2, Ice: 3 } as const;

/**
 * `earth.bin`: 360 × 180 surface bytes (from Blue Marble for the class and
 * Black Marble for the lights, the app's textures), then 90 × 180 coverage.
 */
function decodeEarth(buffer: ArrayBuffer): Earth {
  return {
    surface: new Uint8Array(buffer, 0, 360 * 180),
    coverage: new Uint8Array(buffer, 360 * 180, 90 * 180),
  };
}

export const loadEarth = loader("/orbit/earth.bin", decodeEarth);

const wrapLon = (lon: number) => ((((lon + 180) % 360) + 360) % 360) - 180;

function cell(earth: Earth, lat: number, lon: number) {
  const row = Math.min(179, Math.max(0, Math.floor(90 - lat)));
  const col = Math.min(359, Math.floor(wrapLon(lon) + 180));
  return earth.surface[row * 360 + col];
}

export const surfaceAt = (earth: Earth, lat: number, lon: number) =>
  cell(earth, lat, lon) & 3;

/** City lights at night, 0 to 1. */
export const lightsAt = (earth: Earth, lat: number, lon: number) =>
  (cell(earth, lat, lon) >> 2) / 63;

export function coverageAt(earth: Earth, lat: number, lon: number) {
  const row = Math.min(89, Math.max(0, Math.floor((lat + 90) / 2)));
  const col = Math.min(179, Math.floor((wrapLon(lon) + 180) / 2));
  return earth.coverage[row * 180 + col];
}

export type Encounters = {
  n: number;
  /** Relative speed (km/s), miss distance (km), seconds after the snapshot. */
  speed: Float32Array;
  miss: Float32Array;
  tca: Float32Array;
  /** Who meets whom, as a display group (see `pairGroup`). */
  pair: Uint8Array;
  /** Where: the first object at closest approach (deg, km). */
  lat: Float32Array;
  lon: Float32Array;
  alt: Float32Array;
};

/** The engine's object categories (`data/fetch-tles.mjs`). */
const CAT_STARLINK = 1;
const CAT_ROCKET_BODY = 3;
const CAT_DEBRIS = 4;

/**
 * Starlink meeting Starlink, anything involving debris or a rocket body, and
 * every other pairing, colored as the groups they're named after.
 */
function pairGroup(a: number, b: number) {
  const junk = (c: number) => c === CAT_DEBRIS || c === CAT_ROCKET_BODY;
  if (junk(a) || junk(b)) return DEBRIS;
  if (a === CAT_STARLINK && b === CAT_STARLINK) return STARLINK;
  return OTHER;
}

/**
 * `encounters.bin`: u32 n, then u16 speed (m/s), miss (m), TCA (s), u8
 * categories, and i16 latitude, longitude (0.01°) and u16 altitude (0.1 km),
 * in TCA order.
 */
function decodeEncounters(buffer: ArrayBuffer): Encounters {
  const n = new DataView(buffer).getUint32(0, true);
  const col = (k: number) => new Uint16Array(buffer, 4 + 2 * n * k, n);
  const catA = new Uint8Array(buffer, 4 + 6 * n, n);
  const catB = new Uint8Array(buffer, 4 + 7 * n, n);
  return {
    n,
    speed: Float32Array.from(col(0), (v) => v / 1000),
    miss: Float32Array.from(col(1), (v) => v / 1000),
    tca: Float32Array.from(col(2)),
    pair: Uint8Array.from(catA, (a, k) => pairGroup(a, catB[k])),
    lat: Float32Array.from(
      new Int16Array(buffer.slice(4 + 8 * n, 4 + 10 * n)),
      (v) => v / 100,
    ),
    lon: Float32Array.from(
      new Int16Array(buffer.slice(4 + 10 * n, 4 + 12 * n)),
      (v) => v / 100,
    ),
    alt: Float32Array.from(
      new Uint16Array(buffer.slice(4 + 12 * n, 4 + 14 * n)),
      (v) => v / 10,
    ),
  };
}

export const loadEncounters = loader("/orbit/encounters.bin", decodeEncounters);

/**
 * An orthographic view: `yaw` turns the scene about the polar axis, `pitch`
 * raises the viewer above the equator. Writes screen x, y (down) and depth
 * (toward the viewer), all in the scene's units times `scale`.
 */
export type View = {
  cx: number;
  cy: number;
  scale: number;
  cosYaw: number;
  sinYaw: number;
  cosPitch: number;
  sinPitch: number;
};

export function view(
  cx: number,
  cy: number,
  scale: number,
  yaw: number,
  pitch: number,
): View {
  return {
    cx,
    cy,
    scale,
    cosYaw: Math.cos(yaw),
    sinYaw: Math.sin(yaw),
    cosPitch: Math.cos(pitch),
    sinPitch: Math.sin(pitch),
  };
}

/** Faces the point at (lat, lon) toward the viewer. */
export function viewFacing(
  cx: number,
  cy: number,
  scale: number,
  latDeg: number,
  lonDeg: number,
) {
  return view(cx, cy, scale, -Math.PI / 2 - lonDeg * DEG, latDeg * DEG);
}

export function project(
  v: View,
  x: number,
  y: number,
  z: number,
  out: Float64Array,
) {
  const x1 = x * v.cosYaw - y * v.sinYaw;
  const y1 = x * v.sinYaw + y * v.cosYaw;
  out[0] = v.cx + x1 * v.scale;
  out[1] = v.cy - (y1 * v.sinPitch + z * v.cosPitch) * v.scale;
  out[2] = -y1 * v.cosPitch + z * v.sinPitch;
  return out;
}

/** Unit vector (Earth-fixed) of a latitude and longitude in degrees. */
export function unit(latDeg: number, lonDeg: number, out: Float64Array, o = 0) {
  const lat = latDeg * DEG;
  const lon = lonDeg * DEG;
  out[o] = Math.cos(lat) * Math.cos(lon);
  out[o + 1] = Math.cos(lat) * Math.sin(lon);
  out[o + 2] = Math.sin(lat);
  return out;
}

/** Benchmarks on an Apple M1, release build (`docs/benchmarks-native.json`). */
export const SIEVE = {
  objects: 32_583,
  gridMs: 1.507,
  bruteMs: 638.14,
  scaling: [
    { n: 10_000, gridMs: 0.431, bruteMs: 60.1 },
    { n: 30_000, gridMs: 1.344, bruteMs: 545.52 },
    { n: 100_000, gridMs: 3.995, bruteMs: 6081.36 },
  ],
};

/**
 * Orbit Explorer's SGP4 against satellite.js on 2,507 catalog objects at
 * 7 times each (`docs/validation/satellitejs-diff.csv`): how many of the
 * 17,549 states match bit for bit, and the rest by half-decade of |Δr| in mm.
 * Rewriting the reference's slow steps as exact identities moved most states
 * off bit-identical by a few nanometers; the large differences didn't move.
 */
export const SATJS = {
  states: 17549,
  identical: 547,
  /** States within 1 µm of satellite.js. */
  within1um: 15737,
  bins: [
    [-15.5, 1],
    [-14, 3],
    [-13.5, 8],
    [-13, 28],
    [-12.5, 60],
    [-12, 32],
    [-11.5, 11],
    [-11, 3],
    [-10.5, 7],
    [-10, 12],
    [-9.5, 139],
    [-9, 295],
    [-8.5, 55],
    [-8, 61],
    [-7.5, 39],
    [-7, 368],
    [-6.5, 2253],
    [-6, 6194],
    [-5.5, 1249],
    [-5, 18],
    [-4.5, 2758],
    [-4, 1472],
    [-3.5, 124],
    [-3, 362],
    [-2.5, 735],
    [-2, 460],
    [-1.5, 132],
    [-1, 88],
    [-0.5, 11],
    [0, 15],
    [0.5, 7],
    [1, 2],
  ] as const,
};

/**
 * Position error (mm, as log10 × 1000) of each of the 666 states in the
 * Vallado et al. (2006) verification set, from Orbit Explorer's
 * `docs/validation/vallado-errors.csv`, in the file's order.
 */
export const VALLADO_LOG = [
  -2166, -2227, -2186, -2300, -2365, -2530, -2289, -2295, -2559, -2198, -2403,
  -2410, -2177, -2393, -2231, -2224, -2367, -2337, -2252, -2139, -2486, -2423,
  -2591, -2173, -2491, -2369, -2268, -2328, -2368, -2137, -2218, -2306, -2404,
  -2229, -2148, -2254, -2343, -2284, -2350, -2660, -2918, -2260, -2363, -2203,
  -2375, -2444, -2500, -2706, -2442, -2223, -2416, -2310, -2307, -2322, -2253,
  -2278, -2309, -2515, -2270, -2240, -2309, -2368, -2304, -2291, -2213, -2510,
  -2383, -2222, -2201, -2354, -2239, -2456, -2226, -2199, -2298, -2182, -2327,
  -2240, -2410, -2261, -2222, -2424, -2153, -2601, -2283, -2185, -2741, -2235,
  -2298, -2356, -2441, -2290, -2502, -2537, -2103, -2461, -2287, -2389, -2263,
  -2522, -2467, -2285, -2394, -2173, -2430, -2269, -2152, -2162, -2276, -2293,
  -2304, -2164, -2497, -2202, -2158, -2384, -2554, -2430, -2191, -2304, -2168,
  -2454, -2446, -2314, -2174, -2241, -2265, -2293, -2518, -2253, -2249, -2302,
  -2335, -2206, -2331, -2164, -2237, -2541, -2215, -2243, -2185, -2092, -2376,
  -2409, -2263, -2352, -2303, -2295, -2241, -2275, -2116, -2210, -2174, -2365,
  -2764, -2276, -2200, -2146, -2171, -2109, -2199, -2898, -2443, -2261, -2460,
  -2288, -2334, -2338, -2435, -2172, -2173, -2491, -2258, -2440, -2158, -2209,
  -2374, -2120, -2630, -2312, -2746, -2313, -2279, -2217, -2288, -2627, -2367,
  -2287, -2596, -2264, -2125, -2369, -2245, -2342, -2356, -2258, -2302, -2552,
  -2326, -2635, -2283, -2392, -2304, -2342, -2353, -2454, -2380, -2663, -2308,
  -2420, -2376, -2259, -2300, -2222, -2272, -2209, -2294, -2446, -2691, -2401,
  -2189, -2271, -2333, -2365, -2231, -2140, -2209, -2385, -2286, -2235, -2294,
  -2324, -2441, -2198, -2338, -2564, -2594, -2161, -2309, -2263, -2226, -2231,
  -2192, -2547, -2209, -2335, -2366, -2274, -2214, -2157, -2204, -2244, -2349,
  -2235, -2336, -2231, -2252, -2250, -2552, -2148, -2542, -2804, -2218, -2478,
  -2291, -2300, -2321, -2219, -2150, -2334, -2310, -2156, -2414, -2367, -2234,
  -2350, -2904, -2329, -2255, -2534, -2562, -2115, -2300, -2185, -2374, -2510,
  -2243, -2370, -2168, -2631, -2661, -2334, -2297, -2178, -2145, -2700, -2426,
  -2393, -2324, -3028, -2504, -2159, -2586, -2305, -2388, -2289, -2217, -2303,
  -2216, -2330, -2242, -2300, -2704, -2209, -2191, -2234, -2218, -2539, -2378,
  -2400, -2501, -2620, -2205, -2297, -2189, -2206, -2188, -2421, -2364, -2282,
  -2327, -2547, -2494, -2434, -2745, -2196, -2438, -2273, -2122, -2289, -2421,
  -2463, -2847, -2253, -2157, -2473, -2455, -2283, -2350, -2311, -2348, -2340,
  -2267, -2284, -2550, -2320, -2255, -2239, -2160, -2294, -2172, -2353, -2241,
  -2290, -2118, -2371, -2536, -2268, -2385, -2358, -2403, -2185, -2354, -2275,
  -2223, -2197, -2603, -2504, -2245, -2153, -2338, -2352, -2438, -2507, -2170,
  -2218, -2661, -2569, -2555, -2248, -2247, -2326, -2357, -2218, -2260, -2344,
  -2313, -2300, -2389, -2264, -2312, -2195, -2169, -2270, -2243, -2378, -2361,
  -2391, -2276, -2251, -2135, -2218, -2330, -2285, -2266, -2195, -2378, -2336,
  -2164, -2303, -2341, -2316, -2382, -2224, -2462, -2741, -2222, -2335, -2195,
  -2237, -2400, -2434, -2411, -2355, -2730, -2314, -2211, -2552, -2348, -2604,
  -2339, -2219, -2388, -2308, -2362, -2222, -2272, -2396, -2428, -2332, -2240,
  -2610, -2171, -2281, -2301, -2154, -2239, -2735, -2361, -2261, -2190, -2549,
  -2429, -2292, -2258, -2209, -2341, -2136, -2440, -2542, -2346, -2459, -2287,
  -2417, -2193, -2286, -2177, -2349, -2208, -2799, -2372, -2297, -2386, -2439,
  -2457, -2361, -2327, -2198, -2198, -2176, -2392, -2433, -2263, -2149, -2280,
  -2453, -2649, -2387, -2218, -2224, -2527, -2317, -2470, -2175, -2453, -2403,
  -2377, -2379, -2330, -2504, -2194, -2329, -2382, -2483, -2212, -2683, -2264,
  -2382, -2374, -2150, -2327, -2314, -2308, -2343, -2627, -2338, -2550, -2573,
  -2478, -2644, -2455, -2491, -2166, -2537, -2324, -2575, -2380, -2330, -2291,
  -2240, -2188, -2267, -2315, -2232, -2358, -2271, -2251, -2124, -2236, -2285,
  -2277, -2343, -2302, -2395, -2493, -2203, -2527, -2306, -2224, -2286, -2199,
  -2280, -2743, -2488, -2091, -2099, -2307, -2308, -2288, -2305, -2149, -2203,
  -2614, -2234, -2161, -2454, -2268, -2405, -2472, -2486, -2123, -2293, -2285,
  -2435, -2549, -2411, -2133, -2259, -2216, -2270, -2423, -2309, -2203, -2330,
  -2480, -2507, -2116, -1630, -2049, -2059, -1612, -1562, -2084, -2152, -1571,
  -1520, -1518, -2325, -1593, -1510, -1500, -1405, -2141, -2008, -2052, -2166,
  -1987, -2021, -2294, -1922, -1933, -2143, -2299, -2109, -1934, -2003, -1901,
  -1949, -1544, -1908, -1868, -2016, -1489, -2113, -1969, -2105, -1407, -1431,
  -1985, -1809, -1449, -1424, -2011, -1885, -1388, -1360, -1344, -1173, -1299,
  -1328, -1324, -1835, -1279, -1282, -1994, -1791, -1886, -1930, -1712, -1833,
  -1797, -1690, -1821, -1753, -1014, -1621,
];

/**
 * Mean-altitude histograms as the app's Catalog card draws them: 46 log
 * bins from 150 to 45,000 km, per group (Starlink, debris and rocket bodies,
 * other satellites), from the snapshot's mean motions (`drawAltitude` in the
 * app's `panels/charts.ts`).
 */
export const ALTITUDE = {
  lo: 150,
  hi: 45_000,
  counts: [
    [
      0, 0, 2, 2, 11, 45, 442, 442, 199, 9536, 452, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0,
    ],
    [
      1, 1, 5, 5, 32, 9, 31, 61, 148, 434, 473, 719, 1567, 2650, 1913, 1222,
      578, 669, 751, 275, 78, 33, 27, 17, 22, 55, 12, 16, 29, 31, 40, 68, 70,
      111, 45, 54, 110, 132, 312, 347, 173, 19, 6, 59, 323, 1,
    ],
    [
      3, 0, 0, 5, 7, 19, 37, 94, 222, 729, 494, 917, 249, 459, 337, 499, 923,
      48, 642, 44, 15, 12, 3, 3, 6, 17, 4, 3, 3, 7, 4, 7, 38, 5, 4, 5, 8, 7, 12,
      292, 83, 6, 5, 34, 1373, 4,
    ],
  ],
};
