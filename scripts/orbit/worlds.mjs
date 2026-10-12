/**
 * Exports what the Orbit Explorer case study needs from beyond Earth orbit, by
 * running the app's own `web/src/sim` modules (VSOP87, the Moon and Mars
 * series, the JPL Horizons snapshots, the relay planner) in a browser against
 * its Vite dev server, at the catalogue snapshot's instant.
 *
 *     pnpm --dir ../orbit-explorer dev      # serves http://localhost:5173
 *     node scripts/orbit/worlds.mjs [app url] [out dir]
 *
 * Writes `worlds.json` (orientation, moons, relay passes, Starlink generations),
 * `solar.bin` (planet orbits, the Kuiper belt, the Voyagers' paths) and
 * `maps.bin` (palette-quantised surface maps of the worlds drawn in dots).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const app = process.argv[2] ?? "http://localhost:5173";
const out = process.argv[3] ?? "public/orbit";

/** The catalogue snapshot: Space-Track, generated 2026-10-09 21:25:56 UTC. */
const SNAPSHOT_MS = Date.UTC(2026, 9, 9, 21, 25, 56);

const browser = await chromium.launch();
const page = await browser.newPage();
// Any document on the dev server's origin can import its modules.
await page.goto(`${app}/data/catalog.json`);

const data = await page.evaluate(async (snapshotMs) => {
  const load = (p) => import(/* @vite-ignore */ p);
  const [bodiesMod, eph, planets, solar, relay, catalog] = await Promise.all([
    load("/src/sim/bodies.ts"),
    load("/src/sim/ephemeris.ts"),
    load("/src/sim/planets.ts"),
    load("/src/sim/solar.ts"),
    load("/src/sim/relay.ts"),
    load("/src/sim/catalog.ts"),
  ]);
  const { BODIES } = bodiesMod;
  const jd = snapshotMs / 864e5 + 2440587.5;
  const AU = solar.AU_KM;
  const bin = (url) => fetch(url).then((r) => r.arrayBuffer());
  // ICRF -> ecliptic J2000, for the solar system seen from above.
  const E = solar.ECLIPTIC_J2000;
  const toEcl = (v) => [
    E[0] * v[0] + E[3] * v[1] + E[6] * v[2],
    E[1] * v[0] + E[4] * v[1] + E[7] * v[2],
    E[2] * v[0] + E[5] * v[1] + E[8] * v[2],
  ];
  const round = (x, d = 6) => Number(x.toPrecision(d));

  // Starlink generations, from the NORAD ids in the app's own snapshot.
  const cat = catalog.decodeCatalog(await bin("/data/catalog.bin"));
  const generations = { 1: 0, 2: 0, 3: 0 };
  for (let i = 0; i < cat.count; i++) {
    if (cat.category[i] === catalog.Category.Starlink)
      generations[catalog.starlinkVersion(cat.ids[i])]++;
  }

  // Each world: where it is, which way it faces, what orbits it.
  const worlds = {};
  for (const id of ["moon", "mars", "jupiter", "saturn", "uranus", "neptune"]) {
    const b = BODIES[id];
    const file = eph.decodeEphemeris(await bin(`/data/ephemeris-${id}.bin`));
    const st = new Float64Array(6);
    const moons = [];
    for (const o of file.objects) {
      if (!eph.objectState(o, jd, st)) continue;
      const el = eph.elementsFromState(st, b.mu, jd);
      if (!el) continue;
      const listed = b.orbiters.find((x) => x.id === o.id);
      moons.push({
        id: o.id,
        name: listed?.name ?? o.name,
        kind: o.kind,
        r: o.radiusKm ?? (listed?.radii ? listed.radii[0] : undefined),
        found: o.found?.year,
        // Body-centred ICRF, km and radians, at the snapshot.
        el: [el.a, el.e, el.i, el.node, el.peri, el.M].map((x) => round(x, 9)),
        n: round(el.n, 9),
      });
    }
    const helio = planets.heliocentric(id, jd);
    const fromEarth = relay.bodyFromEarth(id, jd);
    worlds[id] = {
      radius: b.radiusKm,
      polar: b.polarKm,
      // Body-fixed -> ICRF.
      orient: planets.orientationOf(id, jd).map((x) => round(x, 9)),
      sun: helio.map((x) => round(-x, 9)),
      earth: fromEarth.map((x) => round(-x, 9)),
      lightS: round(relay.lightTimeS(id, jd), 6),
      moons,
    };
  }

  // Relay passes over each landing site, the next 24 h, as the app plans them.
  const relayPlans = {};
  for (const id of ["moon", "mars"]) {
    const file = eph.decodeEphemeris(await bin(`/data/ephemeris-${id}.bin`));
    relayPlans[id] = BODIES[id].sites.map((site) => {
      const plan = relay.relayPlan(id, site, file.tracks, jd, 24, 30);
      const name = (key) =>
        key === "sun"
          ? "Daylight"
          : key === "earth"
            ? "Earth, direct"
            : BODIES[id].orbiters.find((o) => o.id === key)?.name;
      return {
        site: site.id,
        short: site.short,
        name: site.name,
        what: site.what,
        lat: site.lat,
        lon: site.lon,
        lightS: round(plan.lightTimeS, 6),
        localH: round(plan.localSolarH, 4),
        rows: plan.rows.map((r) => ({
          name: name(r.key),
          now: round(r.now, 4),
          passes: r.passes.map((p) => [
            round((p.start - jd) * 24, 6),
            round((p.end - jd) * 24, 6),
            round(p.peak, 4),
          ]),
        })),
      };
    });
  }

  // How far each world is from each other one, as the Fly to list shows them.
  const order = [
    "mercury",
    "venus",
    "earth",
    "moon",
    "mars",
    "jupiter",
    "saturn",
    "uranus",
    "neptune",
  ];
  const distances = {
    order,
    km: order.map((a) =>
      order.map((b) => (a === b ? 0 : Math.round(relay.distanceKm(a, b, jd)))),
    ),
  };

  // The Earth–Moon pair at the snapshot, equatorial of date, for the flight.
  const P = solar.precession(jd);
  const moonGeo = solar.moonGeocentric(jd);
  const sunGeo = solar.sunGeocentric(jd, P);

  // The planets' orbits and where each is, heliocentric ecliptic, au.
  const ORBIT_N = 180;
  const ids = [
    "mercury",
    "venus",
    "earth",
    "mars",
    "jupiter",
    "saturn",
    "uranus",
    "neptune",
  ];
  const orbits = ids.map((id) => {
    const days = planets.ORBIT_DAYS[id];
    const pts = [];
    for (let k = 0; k < ORBIT_N; k++) {
      const t = jd + (days * k) / ORBIT_N;
      const v = toEcl(
        id === "earth"
          ? planets.embHeliocentric(t)
          : planets.heliocentric(id, t),
      );
      pts.push(v[0] / AU, v[1] / AU, v[2] / AU);
    }
    const now = toEcl(planets.heliocentric(id, jd)).map((x) => x / AU);
    return { id, pts, now };
  });

  // The Kuiper belt: every trans-Neptunian object in JPL's Small-Body
  // Database, placed by two-body motion (heliosphere.ts' decoder, inlined).
  const tbuf = await bin("/data/tno.bin");
  const dv = new DataView(tbuf);
  const tn = dv.getUint32(4, true);
  const tbase = dv.getFloat64(8, true);
  const tf = new Float32Array(tbuf, 24, tn * 8);
  const named = JSON.parse(
    new TextDecoder().decode(new Uint8Array(tbuf, 24 + tn * 32)),
  );
  const DEG = Math.PI / 180;
  const tno = [];
  const tdb = jd + 69.184 / 86400;
  for (let k = 0; k < tn; k++) {
    const a = tf[8 * k],
      e = tf[8 * k + 1],
      i = tf[8 * k + 2] * DEG,
      node = tf[8 * k + 3] * DEG,
      peri = tf[8 * k + 4] * DEG;
    const n = 0.01720209895 / a ** 1.5;
    const M = tf[8 * k + 5] * DEG + n * (tdb - (tbase + tf[8 * k + 6]));
    const Ea = eph.eccentricAnomaly(M, e);
    const x = a * (Math.cos(Ea) - e),
      y = a * Math.sqrt(1 - e * e) * Math.sin(Ea);
    const cw = Math.cos(peri),
      sw = Math.sin(peri),
      cO = Math.cos(node),
      sO = Math.sin(node),
      cI = Math.cos(i),
      sI = Math.sin(i);
    tno.push(
      (cw * cO - sw * sO * cI) * x + (-sw * cO - cw * sO * cI) * y,
      (cw * sO + sw * cO * cI) * x + (-sw * sO + cw * cO * cI) * y,
      sw * sI * x + cw * sI * y,
      // Scattered and detached objects, as the app colours them warmer.
      a > 50 || e > 0.25 ? 1 : 0,
    );
  }

  // The Voyagers' paths since launch, from the Oort cloud's Horizons file.
  const oort = eph.decodeEphemeris(await bin("/data/ephemeris-oort.bin"));
  const voyagers = oort.objects
    .filter((o) => o.path)
    .map((o) => {
      const p = o.path;
      const pts = [];
      const step = Math.max(1, Math.floor(p.count / 600));
      for (let k = 0; k < p.count; k += step) {
        const v = toEcl([p.data[3 * k], p.data[3 * k + 1], p.data[3 * k + 2]]);
        pts.push(v[0] / AU, v[1] / AU, v[2] / AU);
      }
      const last = p.count - 1;
      const v = toEcl([
        p.data[3 * last],
        p.data[3 * last + 1],
        p.data[3 * last + 2],
      ]);
      pts.push(v[0] / AU, v[1] / AU, v[2] / AU);
      return { name: o.name, jd0: p.jd0, stepS: p.stepS * step, pts };
    });

  // Surface maps, read from the app's own 2k textures.
  const maps = {};
  for (const id of ["moon", "mars", "jupiter", "saturn"]) {
    const img = new Image();
    img.src = `/textures/${id}-color-2k.jpg`;
    await img.decode();
    const W = 256,
      H = 128;
    const c = new OffscreenCanvas(W, H);
    const g = c.getContext("2d");
    g.imageSmoothingQuality = "high";
    g.drawImage(img, 0, 0, W, H);
    maps[id] = { w: W, h: H, rgb: Array.from(g.getImageData(0, 0, W, H).data) };
  }

  return {
    jd,
    generations,
    distances,
    worlds,
    relay: relayPlans,
    flight: { moon: moonGeo, sun: sunGeo },
    orbits,
    tno: {
      n: tn,
      xyzc: tno,
      named: named.map((x) => ({ index: x.index, name: x.name })),
    },
    voyagers,
    maps,
  };
}, SNAPSHOT_MS);
await browser.close();

// ------------------------------------------------------------------ pack
mkdirSync(out, { recursive: true });

/**
 * k-means in RGB, seeded from the image's own spread, so a world's dots get
 * its few real colours and brightness rides on alpha.
 */
function quantise(rgb, k) {
  const n = rgb.length / 4;
  const centres = [];
  const lum = (i) =>
    0.3 * rgb[4 * i] + 0.59 * rgb[4 * i + 1] + 0.11 * rgb[4 * i + 2];
  const order = [...Array(n).keys()].sort((a, b) => lum(a) - lum(b));
  for (let c = 0; c < k; c++) {
    const i = order[Math.floor(((c + 0.5) / k) * n)];
    centres.push([rgb[4 * i], rgb[4 * i + 1], rgb[4 * i + 2]]);
  }
  const label = new Uint8Array(n);
  for (let it = 0; it < 24; it++) {
    const sum = centres.map(() => [0, 0, 0, 0]);
    for (let i = 0; i < n; i++) {
      let best = 0;
      let bd = Infinity;
      // Compare chroma more than brightness: alpha carries the shading.
      const r = rgb[4 * i],
        g = rgb[4 * i + 1],
        b = rgb[4 * i + 2];
      const l = (r + g + b) / 3 || 1;
      for (let c = 0; c < k; c++) {
        const [R, G, B] = centres[c];
        const L = (R + G + B) / 3 || 1;
        const d =
          ((r / l - R / L) ** 2 + (g / l - G / L) ** 2 + (b / l - B / L) ** 2) *
            9000 +
          ((l - L) / 255) ** 2 * 400;
        if (d < bd) {
          bd = d;
          best = c;
        }
      }
      label[i] = best;
      sum[best][0] += r;
      sum[best][1] += g;
      sum[best][2] += b;
      sum[best][3]++;
    }
    for (let c = 0; c < k; c++) {
      if (sum[c][3]) centres[c] = sum[c].slice(0, 3).map((v) => v / sum[c][3]);
    }
  }
  return { centres: centres.map((c) => c.map(Math.round)), label };
}

// maps.bin: u8 count | per map: u8 id length + id, u16 w, u16 h, u8 k, k × rgb,
// then w × h bytes, palette index in the top 3 bits and brightness (0-31) below.
const MAP_COLOURS = { moon: 2, mars: 4, jupiter: 5, saturn: 3 };
const chunks = [Uint8Array.of(Object.keys(data.maps).length)];
for (const [id, m] of Object.entries(data.maps)) {
  const k = MAP_COLOURS[id];
  const { centres, label } = quantise(m.rgb, k);
  const head = new Uint8Array(1 + id.length + 5 + 3 * k);
  const dv = new DataView(head.buffer);
  head[0] = id.length;
  head.set(new TextEncoder().encode(id), 1);
  dv.setUint16(1 + id.length, m.w, true);
  dv.setUint16(3 + id.length, m.h, true);
  head[5 + id.length] = k;
  centres.forEach((c, j) => {
    head.set(c, 6 + id.length + 3 * j);
  });
  const px = new Uint8Array(m.w * m.h);
  let peak = 1;
  for (let i = 0; i < px.length; i++) {
    peak = Math.max(
      peak,
      (m.rgb[4 * i] + m.rgb[4 * i + 1] + m.rgb[4 * i + 2]) / 3,
    );
  }
  for (let i = 0; i < px.length; i++) {
    const l = (m.rgb[4 * i] + m.rgb[4 * i + 1] + m.rgb[4 * i + 2]) / 3 / peak;
    px[i] = (label[i] << 5) | Math.min(31, Math.round(l * 31));
  }
  chunks.push(head, px);
  console.log(
    `maps.bin ${id}: ${k} colours`,
    centres.map((c) => `rgb(${c})`).join(" "),
  );
}
writeFileSync(join(out, "maps.bin"), Buffer.concat(chunks));

// solar.bin (little-endian, au, heliocentric ecliptic J2000):
//   u8 planets | per planet: u16 n, f32 now xyz, n × f32 xyz
//   u32 tno | tno × (f32 xyz, u8 scattered)  [as SoA: x, y, z then flags]
//   u8 voyagers | per path: u16 n, n × f32 xyz
const f32 = (arr) => Buffer.from(new Float32Array(arr).buffer);
const u8 = (...v) => Buffer.from(Uint8Array.from(v));
const u16 = (v) => Buffer.from(new Uint16Array([v]).buffer);
const u32 = (v) => Buffer.from(new Uint32Array([v]).buffer);
const solar = [u8(data.orbits.length)];
for (const o of data.orbits)
  solar.push(u16(o.pts.length / 3), f32(o.now), f32(o.pts));
const t = data.tno.xyzc;
const tx = [],
  ty = [],
  tz = [],
  tc = [];
for (let k = 0; k < t.length; k += 4) {
  tx.push(t[k]);
  ty.push(t[k + 1]);
  tz.push(t[k + 2]);
  tc.push(t[k + 3]);
}
solar.push(
  u32(tx.length),
  f32(tx),
  f32(ty),
  f32(tz),
  Buffer.from(Uint8Array.from(tc)),
);
solar.push(u8(data.voyagers.length));
for (const v of data.voyagers) solar.push(u16(v.pts.length / 3), f32(v.pts));
writeFileSync(join(out, "solar.bin"), Buffer.concat(solar));

const named = data.tno.named;
const json = {
  jd: data.jd,
  generations: data.generations,
  distances: data.distances,
  flight: data.flight,
  worlds: data.worlds,
  relay: data.relay,
  planets: data.orbits.map((o) => o.id),
  voyagers: data.voyagers.map((v) => v.name),
  dwarfs: named,
};
writeFileSync(join(out, "worlds.json"), JSON.stringify(json));

console.log("jd", data.jd);
console.log("Starlink generations", data.generations);
for (const [id, w] of Object.entries(data.worlds)) {
  console.log(
    id,
    w.moons.length,
    "orbiting;",
    "light time",
    w.lightS.toFixed(1),
    "s",
  );
}
console.log(
  "tno",
  tx.length,
  "voyagers",
  data.voyagers.map((v) => `${v.name} ${v.pts.length / 3}`).join(", "),
);
for (const [id, plans] of Object.entries(data.relay)) {
  for (const p of plans) {
    console.log(
      id,
      p.short,
      `light ${p.lightS.toFixed(3)} s, local ${p.localH.toFixed(2)} h,`,
      p.rows.map((r) => `${r.name}:${r.passes.length}`).join(" "),
    );
  }
}
