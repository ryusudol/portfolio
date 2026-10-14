import { TAU } from "../math";
import {
  APP_COLORS,
  type AppLayout,
  AppType,
  appLayout,
  type Box,
  drawChrome,
  drawPanel,
  drawPanelBack,
  drawWindow,
  ink,
  type LegendRow,
  rgbaOf,
  through,
} from "../orbit-app";
import {
  Camera,
  DotWorld,
  flyFrom,
  inBox,
  loadMaps,
  loadWorlds,
  mapSampler,
  moonAt,
  mul,
  type RelayPlan,
  type SurfaceMap,
  skyStar,
  unitOf,
  type Vec3,
  type Worlds,
} from "../orbit-worlds";
import { freeArea, Readouts, StageSize, Steps, stepAt } from "../story";
import type { Field, Frame, RGB, Scene } from "../types";

const STEP_AT = [0, 0.25, 0.5, 0.75] as const;
/** Each step's world and site: Apollo 11, Chang'e 4, the south pole, then Jezero on Mars. */
const STOPS = [
  { world: "moon", site: 0 },
  { world: "moon", site: 1 },
  { world: "moon", site: 2 },
  { world: "mars", site: 0 },
] as const;
const DEG = Math.PI / 180;
const CRAFT: RGB = [226, 182, 74];
const MOON_SLOT = APP_COLORS.length + 1;
const MARS_SLOT = MOON_SLOT + 2;
const RADIUS = { moon: 1737.4, mars: 3389.5 };
const MODES = ["Explore", "Orbiters", "Link to Earth"] as const;
/** Ten minutes a second: LRO laps the Moon in 12 s, the chart's cursor crosses a day in 144 s. */
const WARP = 600;

/**
 * The app's Link to Earth mode, in dots. The world turns to face the site,
 * marked as the app marks it, with its orbiters flying their Horizons
 * trajectories; the panel's 24-hour chart of daylight, the Earth's direct
 * link and each orbiter's passes is drawn in particles from the app's own
 * relay planner, run at the snapshot (`scripts/orbit/worlds.mjs`).
 */
export class RelayScene implements Scene {
  private worlds: Worlds | null = null;
  private maps: Record<string, SurfaceMap> | null = null;
  private world = new DotWorld();
  private cam = new Camera();
  private colors: RGB[] = APP_COLORS;
  private t = 0;
  private stop: (typeof STOPS)[number] = STOPS[0];
  private frame: Box = { x: 0, y: 0, w: 1, h: 1 };
  private l: AppLayout = appLayout({ x: 0, y: 0, w: 1, h: 1 }, true);
  private type = new AppType();
  private steps = new Steps();
  private readouts = new Readouts();
  private size = new StageSize();
  private sp = new Float64Array(3);
  private q = new Float64Array(3);
  private chart: Box | null = null;

  layout(_f: Field, fr: Frame) {
    this.frame = freeArea(fr, 14);
    loadWorlds().then((w) => {
      this.worlds = w;
    });
    loadMaps().then((m) => {
      this.maps = m;
      if (m?.moon && m.mars)
        this.colors = [...APP_COLORS, ...m.moon.palette, ...m.mars.palette];
    });
    this.type.read(fr.section);
    this.steps.collect(fr.section);
    this.readouts.collect(fr.section);
  }

  private plan(): RelayPlan | null {
    const s = this.stop;
    return this.worlds?.relay[s.world][s.site] ?? null;
  }

  update(f: Field, fr: Frame) {
    if (this.size.changed(fr)) this.layout(f, fr);
    const p = fr.progress;
    const step = stepAt(p, STEP_AT);
    this.steps.set(step);
    this.stop = STOPS[step];
    if (!fr.reduced) this.t = (this.t + fr.dt * WARP) % 86400;
    f.classColors = this.colors;
    const b = this.frame;
    this.l = appLayout(
      { x: fr.visual.x + b.x, y: fr.visual.y + b.y, w: b.w, h: b.h },
      true,
    );
    const l = this.l;
    const vw = l.view;
    const cam = this.cam;
    cam.cx = vw.x + vw.w / 2;
    cam.cy = vw.y + vw.h / 2 + 10;
    cam.focal = vw.h * 1.15;
    const w = this.worlds;
    const plan = this.plan();
    const id = this.stop.world;
    const R = RADIUS[id];
    const W = w?.worlds[id];

    // The camera above the site, looking down at the world's center, from
    // a little toward the Sun so the site is lit when it can be.
    if (W && plan) {
      const up = mul(
        W.orient,
        [
          Math.cos(plan.lat * DEG) * Math.cos(plan.lon * DEG),
          Math.cos(plan.lat * DEG) * Math.sin(plan.lon * DEG),
          Math.sin(plan.lat * DEG),
        ],
        [0, 0, 0],
      ) as Vec3;
      const sun = unitOf(W.sun);
      const dir = unitOf([
        up[0] * 0.8 + sun[0] * 0.35,
        up[1] * 0.8 + sun[1] * 0.35,
        up[2] * 0.8 + sun[2] * 0.35,
      ]);
      const dist =
        R * Math.sqrt(1 + (cam.focal / (Math.min(vw.w, vw.h) * 0.32)) ** 2);
      const pole: Vec3 = [W.orient[2], W.orient[5], W.orient[8]];
      cam.lookAt(
        [dir[0] * dist, dir[1] * dist, dir[2] * dist],
        [0, 0, 0],
        pole,
      );
    }

    const Wd = Math.round(f.n * 0.42);
    const Cd = Math.round(f.n * 0.26);
    const Od = Math.round(f.n * 0.1);
    if (W) {
      this.world.place(
        f,
        0,
        Wd,
        cam,
        [0, 0, 0],
        {
          radius: R,
          polar: R,
          orient: W.orient,
          sun: unitOf(W.sun),
          sample: mapSampler(
            this.maps?.[id] ?? null,
            id === "moon" ? MOON_SLOT : MARS_SLOT,
            {
              k: id === "moon" ? 0.5 : 0.8,
              night: id === "moon" ? 0.1 : 0.05,
            },
          ),
        },
        vw,
        { maxSize: fr.compact ? 2.4 : 3.2 },
      );
    } else {
      for (let i = 0; i < Wd; i++) f.ga[i] = 0;
    }
    for (let i = 0; i < Wd; i++) f.ga[i] *= through(l, f.gx[i], f.gy[i]);

    // The pass chart, in dots.
    this.chart = this.chartBox();
    this.bars(f, Wd, Cd, plan);

    // Orbiters' tracks, as dotted ellipses.
    const craft = (W?.moons ?? []).filter((m) => m.kind === "spacecraft");
    const sp = this.sp;
    const q = this.q;
    for (let k = 0; k < Od; k++) {
      const i = Wd + Cd + k;
      if (i >= f.n) break;
      f.gh[i] = 0;
      f.gj[i] = 0.02;
      if (!craft.length) {
        f.ga[i] = 0;
        continue;
      }
      const m = craft[k % craft.length];
      const j = Math.floor(k / craft.length);
      const per = Math.ceil(Od / craft.length);
      // Behind the craft fades, ahead stays bright, as the app draws orbits.
      const lag = (j / per) * TAU;
      moonAt(m, this.t - (lag / TAU) * (TAU / m.n), q);
      cam.project(q[0], q[1], q[2], sp);
      const hidden = this.behind(q[0], q[1], q[2], R);
      f.gx[i] = sp[0];
      f.gy[i] = sp[1];
      f.gc[i] = 4;
      f.gz[i] = 1.1;
      f.ga[i] =
        sp[2] > 0 && !hidden && inBox(vw, sp[0], sp[1])
          ? 0.6 * (1 - j / per) ** 1.5 * through(l, sp[0], sp[1])
          : 0;
    }
    for (let i = Wd + Cd + Od; i < f.n; i++) {
      skyStar(f, i, cam, vw, 0.8);
      const dx = f.gx[i] - this.world.cx;
      const dy = f.gy[i] - this.world.cy;
      if (dx * dx + dy * dy < (this.world.r * 1.03) ** 2) f.ga[i] = 0;
      f.ga[i] *= through(l, f.gx[i], f.gy[i]);
    }

    if (plan) {
      this.readouts.write("site", plan.short);
      const light = plan.lightS;
      this.readouts.write(
        "light",
        light < 60
          ? `${light.toFixed(2)} s`
          : `${Math.floor(light / 60)} min ${Math.round(light % 60)} s`,
      );
      const passes = plan.rows
        .slice(2)
        .reduce((s, r) => s + r.passes.length, 0);
      this.readouts.write("passes", String(passes));
    }
  }

  private behind(x: number, y: number, z: number, R: number) {
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
    return px * px + py * py + pz * pz < R * R;
  }

  /** Where the 24-hour chart sits in the panel. */
  private chartBox(): Box | null {
    const p = this.l.panel;
    if (!p) return null;
    const top = p.y + 292;
    const h = p.y + p.h - 46 - top;
    if (h < 60) return null;
    return { x: p.x + 96, y: top, w: p.w - 112, h };
  }

  /** Each row's passes as bars of dots: daylight, the Earth direct, then each orbiter. */
  private bars(f: Field, start: number, count: number, plan: RelayPlan | null) {
    const box = this.chart;
    const rows = plan?.rows ?? [];
    let used = 0;
    if (box && rows.length) {
      const rowH = box.h / rows.length;
      // Total length of every pass, so the dots spread evenly over them.
      let total = 0;
      for (const r of rows)
        for (const [a, e] of r.passes)
          total += Math.max(0.12, Math.min(24, e) - Math.max(0, a));
      const per = (count * 0.92) / Math.max(1e-6, total);
      const cursor = this.t / 3600;
      rows.forEach((r, ri) => {
        const y = box.y + (ri + 0.5) * rowH;
        const daylight = ri === 0;
        const direct = ri === 1;
        for (const [a0, e0] of r.passes) {
          const a = Math.max(0, a0);
          const e = Math.min(24, Math.max(e0, a + 0.12));
          const n = Math.max(2, Math.round((e - a) * per));
          for (let k = 0; k < n && used < count; k++) {
            const i = start + used++;
            const u =
              (k % Math.ceil(n / 2)) / Math.max(1, Math.ceil(n / 2) - 1);
            const lane = k < Math.ceil(n / 2) ? -1 : 1;
            const hours = a + u * (e - a);
            f.gx[i] = box.x + (hours / 24) * box.w;
            f.gy[i] = y + lane * (daylight ? 0.8 : 1.6);
            f.gz[i] = 1.5;
            f.gj[i] = 0;
            f.gh[i] = 0;
            // Daylight and the relays in the app's gold, the Earth's own link in ink.
            f.gc[i] = direct ? 4 : 3;
            // Passes still ahead of the cursor are bright, past ones dim.
            const ahead = hours >= cursor - 0.02;
            f.ga[i] = (ahead ? 0.95 : 0.35) * (daylight ? 0.6 : 1);
          }
        }
      });
    }
    for (let k = used; k < count; k++) {
      const i = start + k;
      if (i >= f.n) break;
      f.ga[i] = 0;
      if (box) {
        f.gx[i] = box.x;
        f.gy[i] = box.y + box.h;
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    const l = this.l;
    const type = this.type;
    const plan = this.plan();
    const id = this.stop.world;
    const W = this.worlds?.worlds[id];
    const cam = this.cam;
    ctx.save();
    ctx.beginPath();
    ctx.rect(l.view.x, l.view.y, l.view.w, l.view.h);
    ctx.clip();
    if (plan && W) {
      // The site, marked as the app marks it.
      const R = RADIUS[id];
      const site = mul(
        W.orient,
        [
          Math.cos(plan.lat * DEG) * Math.cos(plan.lon * DEG) * R,
          Math.cos(plan.lat * DEG) * Math.sin(plan.lon * DEG) * R,
          Math.sin(plan.lat * DEG) * R,
        ],
        [0, 0, 0],
      );
      cam.project(site[0], site[1], site[2], this.sp);
      const sx = this.sp[0];
      const sy = this.sp[1];
      ctx.strokeStyle = ink(0.95);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(sx, sy, 6, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = ink(1);
      ctx.beginPath();
      ctx.arc(sx, sy, 1.8, 0, TAU);
      ctx.fill();
      type.text(ctx, plan.name.toUpperCase(), sx + 12, sy - 9, {
        size: 8,
        spacing: 0.16,
        alpha: 0.95,
      });
      // The orbiters, as bright dots with their names.
      const q = this.q;
      for (const m of W.moons) {
        moonAt(m, this.t, q);
        cam.project(q[0], q[1], q[2], this.sp);
        if (
          this.sp[2] <= 0 ||
          this.behind(q[0], q[1], q[2], R) ||
          !inBox(l.view, this.sp[0], this.sp[1])
        )
          continue;
        const moon = m.kind === "moon";
        ctx.fillStyle = rgbaOf(moon ? [220, 214, 204] : CRAFT, 1);
        ctx.beginPath();
        ctx.arc(this.sp[0], this.sp[1], moon ? 3 : 2.4, 0, TAU);
        ctx.fill();
        type.text(ctx, m.name.toUpperCase(), this.sp[0] + 7, this.sp[1] - 7, {
          size: 7,
          spacing: 0.16,
          alpha: 0.85,
        });
      }
    }
    ctx.restore();

    if (l.panel) this.panel(ctx, plan);
    const moon = id === "moon";
    const craft = W?.moons.filter((m) => m.kind === "spacecraft").length ?? 0;
    const naturals = W?.moons.filter((m) => m.kind === "moon").length ?? 0;
    const legend: LegendRow[] = [
      { name: "Spacecraft", count: craft, color: CRAFT },
    ];
    if (naturals)
      legend.push({ name: "Moons", count: naturals, color: [220, 214, 204] });
    legend.push({ name: "Orbits", color: [240, 240, 250] });
    drawChrome(ctx, type, l, {
      mode: "Link to Earth",
      modes: MODES,
      t: this.t,
      warp: "10M",
      world: moon ? "MOON" : "MARS",
      subtitle: moon
        ? "5 spacecraft in orbit"
        : `${craft} spacecraft and ${naturals} moons in orbit`,
      legend,
      flyTo: { here: id, km: flyFrom(this.worlds, id) },
    });
    if (l.panel) drawPanelBack(ctx, l.panel);
    drawWindow(ctx, l);
  }

  /** The Link to Earth card: site, one-way light time, Earth now, next pass, local time, the day. */
  private panel(ctx: CanvasRenderingContext2D, plan: RelayPlan | null) {
    const b = this.l.panel as Box;
    const type = this.type;
    const x = b.x + 16;
    const right = b.x + b.w - 16;
    let y = drawPanel(
      ctx,
      type,
      b,
      "LINK TO EARTH",
      "When a site can talk to Earth, directly or through a relay.",
    );
    if (!plan) return;
    const sites = this.worlds?.relay[this.stop.world] ?? [];
    type.text(ctx, "SITE", x, y + 6, { size: 6.5, spacing: 0.16, alpha: 0.46 });
    y += 22;
    const sw = (b.w - 32) / sites.length;
    sites.forEach((s, k) => {
      const on = k === this.stop.site;
      type.text(ctx, s.short.toUpperCase(), x + k * sw + sw / 2, y, {
        size: 7,
        spacing: 0.14,
        align: "center",
        alpha: on ? 1 : 0.46,
      });
      ctx.fillStyle = ink(on ? 1 : 0.12);
      ctx.fillRect(x + k * sw + 4, y + 9, sw - 8, on ? 1.5 : 1);
    });
    y += 26;
    const lat = `${Math.abs(plan.lat).toFixed(2)}°${plan.lat >= 0 ? "N" : "S"}`;
    const lon = `${Math.abs(plan.lon).toFixed(2)}°${plan.lon >= 0 ? "E" : "W"}`;
    type.text(ctx, `${plan.name} · ${plan.what}`, x, y, {
      size: 7.5,
      weight: 400,
      alpha: 0.5,
    });
    type.text(ctx, `${lat} ${lon}`, x, y + 12, {
      size: 7.5,
      weight: 400,
      alpha: 0.5,
    });
    y += 42;
    const light = plan.lightS;
    const big =
      light < 60
        ? light.toFixed(2)
        : `${Math.floor(light / 60)}:${String(Math.round(light % 60)).padStart(2, "0")}`;
    const bw = type.text(ctx, big, x, y, { size: 34, weight: 400 });
    type.text(ctx, light < 60 ? "s" : "min", x + bw + 5, y + 8, {
      size: 11,
      weight: 400,
      alpha: 0.8,
    });
    y += 26;
    type.text(ctx, "for a signal to cross from Earth, one way", x, y, {
      size: 8.5,
      weight: 400,
      alpha: 0.7,
    });
    y += 24;
    ctx.fillStyle = ink(0.1);
    ctx.fillRect(x, y - 10, b.w - 32, 1);
    const hours = this.t / 3600;
    const earth = plan.rows[1];
    const up = earth?.passes.some(([a, e]) => hours >= a && hours <= e);
    const next = plan.rows
      .slice(2)
      .flatMap((r) => r.passes.map(([a]) => a))
      .filter((a) => a > hours)
      .sort((a, c) => a - c)[0];
    const local =
      (plan.localH +
        hours * (this.stop.world === "moon" ? 24 / 708.7 : 24 / 24.66)) %
      24;
    const cols: [string, string, string][] = [
      ["EARTH", up ? "Above" : "Below", ""],
      [
        "NEXT PASS",
        next === undefined
          ? "–"
          : `${Math.max(1, Math.round((next - hours) * 60))}`,
        next === undefined ? "" : "MIN",
      ],
      [
        "LOCAL TIME",
        `${String(Math.floor(local)).padStart(2, "0")}:${String(Math.floor((local % 1) * 60)).padStart(2, "0")}`,
        "",
      ],
    ];
    const cw = (b.w - 32) / 3;
    cols.forEach(([k, v, u], c) => {
      type.text(ctx, k, x + c * cw, y + 4, {
        size: 6.5,
        spacing: 0.14,
        alpha: 0.46,
      });
      const vw = type.text(ctx, v, x + c * cw, y + 22, {
        size: 15,
        weight: 400,
      });
      if (u)
        type.text(ctx, u, x + c * cw + vw + 3, y + 25, {
          size: 6,
          spacing: 0.1,
          alpha: 0.46,
        });
    });
    const box = this.chart;
    if (!box) return;
    type.text(ctx, "NEXT 24 HOURS", x, box.y - 18, {
      size: 6.5,
      spacing: 0.16,
      alpha: 0.46,
    });
    type.text(ctx, "passes above 10°", right, box.y - 18, {
      size: 7.5,
      weight: 400,
      align: "right",
      alpha: 0.46,
    });
    const rowH = box.h / plan.rows.length;
    plan.rows.forEach((r, ri) => {
      const ry = box.y + (ri + 0.5) * rowH;
      ctx.fillStyle = ink(0.05);
      ctx.fillRect(box.x, ry - 3, box.w, 6);
      type.text(ctx, r.name, x, ry, { size: 7.5, weight: 400, alpha: 0.72 });
    });
    // The cursor: now, sweeping the day.
    const cx = box.x + (hours / 24) * box.w;
    ctx.fillStyle = ink(0.85);
    ctx.fillRect(cx, box.y - 4, 1, box.h + 8);
    ["NOW", "+6 H", "+12 H", "+18 H", "+24 H"].forEach((s, k) => {
      type.text(ctx, s, box.x + (k / 4) * box.w, box.y + box.h + 12, {
        size: 6,
        spacing: 0.12,
        align: k === 0 ? "left" : k === 4 ? "right" : "center",
        alpha: 0.4,
      });
    });
  }
}
