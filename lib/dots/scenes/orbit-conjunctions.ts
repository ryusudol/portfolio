import { smoothstep, TAU } from "../math";
import {
  APP,
  APP_COLORS,
  type AppLayout,
  AppType,
  appLayout,
  type Box,
  DotGlobe,
  drawAtmosphere,
  drawChrome,
  drawPanel,
  drawPanelBack,
  drawWindow,
  GROUP_CLASS,
  ink,
  rgbaOf,
  stars,
  sunDirection,
  through,
} from "../orbit-app";
import {
  DEBRIS,
  type Earth,
  type Encounters,
  gmst,
  loadEarth,
  loadEncounters,
  project,
  RE,
  STARLINK,
  unit,
  type View,
  viewFacing,
} from "../orbit-data";
import { elementsFromState, ellipsePoint } from "../orbit-worlds";
import { freeArea, StageSize, Steps, stepAt } from "../story";
import type { Field, Frame, RGB, Scene } from "../types";

const STEP_AT = [0, 0.22, 0.42, 0.62, 0.8] as const;
const MAX_SPEED = 16;
const FAST = 10;
/** The snapshot, for the Sun and the Earth's turn. */
const JD = 2461323.3930127779;
/** The screened hour, replayed in this many seconds. */
const REPLAY = 9;
/** The app's severity colors for miss distance: under 1 km, 1–2 km, 2–5 km. */
const SEVERITY: RGB[] = [
  [255, 90, 90],
  [255, 154, 82],
  [242, 201, 76],
];
/** The five closest, from the engine's screen of the hour after the snapshot. */
const CLOSEST = [
  ["STARLINK-2063", "FLOCK 4G 24", 43, 281, 14.5],
  ["LAPAN A3", "STARLINK-35883", 181, 1823, 14.7],
  ["OBJECT C", "STARLINK-5686", 302, 1373, 11.9],
  ["SAUDISAT 1B", "SPEAR-1A", 318, 1672, 14.9],
  ["LEMUR 2 GREENBERG", "STARLINK-36855", 320, 2208, 14.2],
] as const;
const FACE: [number, number] = [28, -20];
/**
 * The closest pair the engine finds, at the snapshot (TEME, km and km/s,
 * from its export), and where and when they meet: 42.8 m apart at 14.45
 * km/s, 280.69 s after the snapshot, over the South Pacific.
 */
const PAIR = [
  {
    name: "STARLINK-2063",
    state: [-4614.171, 1526.6223, -4833.0735, -4.74498, -5.220114, 2.884005],
    color: APP.Starlink,
  },
  {
    name: "FLOCK 4G 24",
    state: [-6579.7261, -312.5658, -1887.209, 2.025801, 1.118254, -7.268331],
    color: APP.Other,
  },
] as const;
const TCA = 280.69;
const MEET: [number, number] = [-33.866, -161.279];
const MU = 398600.8;
/** Watch it happen: from 90 s before closest approach, at ten times real time. */
const LEAD = 90;
const WATCH_RATE = 10;

type Spot = { x: number; y: number };

/**
 * The app's Conjunctions mode, then what its numbers say. All 2,981
 * encounters under 5 km that the engine finds in the hour after the
 * snapshot, first as markers where each happens, colored by miss distance
 * the way the app colors them, appearing as the hour replays. Then the same
 * dots leave the globe and swarm by closing speed, colored by who meets whom.
 */
export class ConjunctionsScene implements Scene {
  private ev: Encounters | null = null;
  private earth: Earth | null = null;
  private globe = new DotGlobe();
  private globeN = 0;
  private where = new Float32Array(0);
  private bySpeed: Spot[] = [];
  private closest = 0;
  private bins = [0, 0, 0];
  private dot = 3;
  private frame: Box = { x: 0, y: 0, w: 1, h: 1 };
  private l: AppLayout = appLayout({ x: 0, y: 0, w: 1, h: 1 }, true);
  private v: View = viewFacing(0, 0, 1, ...FACE);
  private swarmBox: Box = { x: 0, y: 0, w: 1, h: 1 };
  private clock = 0;
  private step = 0;
  private type = new AppType();
  private steps = new Steps();
  private size = new StageSize();
  private sp = new Float64Array(3);
  private sun = new Float64Array(3);
  private orbits = PAIR.map((o) => elementsFromState(o.state, MU));
  /** Seconds after the snapshot while watching it happen. */
  private tw = TCA - LEAD;

  /** One of the pair, Earth-fixed, `t` seconds after the snapshot. */
  private pairAt(k: number, t: number, out: Float64Array) {
    const o = this.orbits[k];
    ellipsePoint(o.el, o.el[5] + o.n * t, out, 0, true);
    const th = gmst(JD) + 7.292115146706979e-5 * t;
    const x = out[0] * Math.cos(th) + out[1] * Math.sin(th);
    const y = -out[0] * Math.sin(th) + out[1] * Math.cos(th);
    out[0] = x;
    out[1] = y;
    return out;
  }

  layout(f: Field, fr: Frame) {
    this.frame = freeArea(fr, 14);
    this.globeN = Math.round(f.n * (fr.compact ? 0.3 : 0.38));
    this.globe.build(this.globeN, this.earth);
    loadEarth().then((earth) => {
      if (!earth || this.earth) return;
      this.earth = earth;
      this.globe.build(this.globeN, earth);
    });
    loadEncounters().then((ev) => {
      if (!ev || this.ev) return;
      this.ev = ev;
      this.prepare();
    });
    if (this.ev) this.prepare();
    this.type.read(fr.section);
    this.steps.collect(fr.section);
  }

  /** Earth-fixed positions of every encounter, and its bin and rank. */
  private prepare() {
    const ev = this.ev as Encounters;
    this.where = new Float32Array(3 * ev.n);
    const u = new Float64Array(3);
    this.bins = [0, 0, 0];
    let best = 0;
    for (let k = 0; k < ev.n; k++) {
      unit(ev.lat[k], ev.lon[k], u);
      const r = RE + ev.alt[k];
      this.where[3 * k] = u[0] * r;
      this.where[3 * k + 1] = u[1] * r;
      this.where[3 * k + 2] = u[2] * r;
      this.bins[ev.miss[k] < 1 ? 0 : ev.miss[k] < 2 ? 1 : 2]++;
      if (ev.miss[k] < ev.miss[best]) best = k;
    }
    this.closest = best;
    this.bySpeed = [];
  }

  /** The swarm by closing speed, laid out once the window's size is known. */
  private swarm(box: Box) {
    const ev = this.ev as Encounters;
    const same =
      this.bySpeed.length &&
      Math.abs(box.w - this.swarmBox.w) < 1 &&
      Math.abs(box.h - this.swarmBox.h) < 1;
    if (same) return;
    this.swarmBox = box;
    let s = 3.2;
    const place = (spacing: number) => {
      const cols = Math.floor(box.w / spacing);
      const fill = new Int32Array(cols + 1);
      const out: Spot[] = new Array(ev.n);
      let tallest = 0;
      for (let k = 0; k < ev.n; k++) {
        const c = Math.min(cols, Math.floor((ev.speed[k] / MAX_SPEED) * cols));
        const j = fill[c]++;
        const level = Math.ceil(j / 2);
        tallest = Math.max(tallest, level);
        out[k] = {
          x: (c + 0.5) * spacing,
          y: (j % 2 ? -1 : 1) * level * spacing,
        };
      }
      return { out, tallest };
    };
    let sw = place(s);
    if (sw.tallest * s * 2 > box.h * 0.86) {
      // A column's height grows with the square of the spacing.
      s = Math.max(1.8, s * Math.sqrt((box.h * 0.86) / (sw.tallest * s * 2)));
      sw = place(s);
    }
    this.bySpeed = sw.out;
    this.dot = s;
  }

  update(f: Field, fr: Frame) {
    if (this.size.changed(fr)) this.layout(f, fr);
    const p = fr.progress;
    const step = stepAt(p, STEP_AT);
    this.step = step;
    this.steps.set(step);
    this.clock += fr.dt;
    f.classColors = APP_COLORS;
    const b = this.frame;
    this.l = appLayout(
      { x: fr.visual.x + b.x, y: fr.visual.y + b.y, w: b.w, h: b.h },
      true,
    );
    const l = this.l;
    const vw = l.view;
    const r = l.wide
      ? Math.min(vw.w * 0.4, vw.h * 0.46)
      : Math.min(vw.w, vw.h) * 0.4;
    // The camera drifts east, so markers on both sides of the Atlantic show.
    const lon = FACE[1] + (fr.reduced ? 0 : this.clock * 4);
    const watch = step === 4;
    // Watch it happen: the clock runs from 90 s before closest approach, looping.
    this.tw = fr.reduced
      ? TCA
      : TCA - LEAD + ((this.clock * WATCH_RATE) % (LEAD + 30));
    this.v = watch
      ? viewFacing(
          vw.x + vw.w / 2,
          vw.y + vw.h / 2,
          (r * 1.15) / RE,
          MEET[0] + 12,
          MEET[1],
        )
      : viewFacing(vw.x + vw.w / 2, vw.y + vw.h / 2, r / RE, FACE[0], lon);
    const v = this.v;
    const ev = this.ev;
    const swarm = step >= 1 && !watch;
    const off = watch
      ? 1 - smoothstep(STEP_AT[4], STEP_AT[4] + 0.04, p)
      : smoothstep(STEP_AT[1] - 0.03, STEP_AT[1] + 0.03, p);
    const box = {
      x: vw.x + 24,
      y: vw.y + 70,
      w: vw.w - 48,
      h: vw.h - 110,
    };
    if (ev) this.swarm(box);
    // The hour replays: markers appear at their time of closest approach.
    const shownUntil = fr.reduced
      ? 3600
      : ((this.clock % (REPLAY + 2)) / REPLAY) * 3600;
    const st = watch ? this.tw : 0;
    sunDirection(
      JD + st / 86400,
      gmst(JD) + 7.292115146706979e-5 * st,
      this.sun,
    );
    const sp = this.sp;
    const R2 = r * r;
    const n = ev ? ev.n : 0;

    for (let i = 0; i < f.n; i++) {
      if (ev && i < n) {
        const g = ev.pair[i];
        f.gj[i] = 0.05;
        f.gh[i] = 0;
        if (!swarm) {
          project(
            v,
            this.where[3 * i],
            this.where[3 * i + 1],
            this.where[3 * i + 2],
            sp,
          );
          const dx = sp[0] - v.cx;
          const dy = sp[1] - v.cy;
          const behind = sp[2] < 0 && dx * dx + dy * dy < R2;
          const due = watch || ev.tca[i] <= shownUntil;
          const bin = ev.miss[i] < 1 ? 0 : ev.miss[i] < 2 ? 1 : 2;
          f.gx[i] = sp[0];
          f.gy[i] = sp[1];
          f.gz[i] = bin === 0 ? 3.2 : bin === 1 ? 2.4 : 1.6;
          // The app's severity: red under 1 km, orange to 2 km, yellow to 5 km.
          f.gc[i] = bin === 0 ? APP.Debris : bin === 1 ? APP.Lights : APP.Other;
          f.ga[i] =
            behind || !due
              ? 0
              : (bin === 2 ? 0.75 : 1) *
                (watch && i !== this.closest ? 0.3 : 1) *
                through(l, sp[0], sp[1]);
          continue;
        }
        const q = this.bySpeed[i];
        f.gx[i] = box.x + q.x;
        f.gy[i] = box.y + box.h / 2 + q.y;
        f.gz[i] = this.dot * 0.75;
        f.gc[i] =
          step >= 2
            ? step === 2 && g !== STARLINK
              ? APP.Ink
              : GROUP_CLASS[g]
            : APP.Ink;
        let a = 0.75 + f.r3[i] * 0.25;
        if (step === 1) a *= ev.speed[i] > FAST ? 1 : 0.4;
        if (step === 2 && g !== STARLINK) a *= 0.35;
        if (step === 3 && g !== DEBRIS) a *= 0.4;
        f.ga[i] = a;
        continue;
      }
      if (ev && i < n + this.globe.n) continue;
      stars(f, i, l, swarm ? null : { cx: v.cx, cy: v.cy, r }, 0.8);
    }
    if (ev) {
      // The globe fades out as the dots leave it for the swarm.
      this.globe.place(f, n, v, this.sun, fr, 1 - off);
      for (let k = 0; k < this.globe.n; k++) {
        const i = n + k;
        if (i < f.n) f.ga[i] *= through(l, f.gx[i], f.gy[i]);
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    const l = this.l;
    const ev = this.ev;
    const v = this.v;
    const type = this.type;
    const step = this.step;
    const box = this.swarmBox;
    if (ev && step >= 1 && step < 4) {
      const y1 = box.y + box.h + 6;
      ctx.fillStyle = ink(0.28);
      ctx.fillRect(box.x, y1, box.w, 1);
      for (let s = 0; s <= MAX_SPEED; s += 4) {
        type.text(ctx, `${s} KM/S`, box.x + (s / MAX_SPEED) * box.w, y1 + 13, {
          size: 7.5,
          spacing: 0.12,
          align: s === 0 ? "left" : s === MAX_SPEED ? "right" : "center",
          alpha: 0.6,
        });
      }
      type.text(ctx, "CLOSING SPEED", box.x, box.y - 18, {
        size: 8,
        spacing: 0.14,
        alpha: 0.6,
      });
      if (step === 1) {
        const x = box.x + (FAST / MAX_SPEED) * box.w;
        ctx.fillStyle = ink(0.5);
        for (let y = box.y; y < y1; y += 5) ctx.fillRect(x, y, 1, 2);
        type.text(ctx, "68% FASTER THAN 10 KM/S", x + 8, box.y + 4, {
          size: 8,
          spacing: 0.14,
        });
      }
      if (step >= 2) {
        const rows: [string, number][] =
          step === 2
            ? [["Starlink with Starlink, 55%", STARLINK]]
            : [
                ["Starlink with Starlink, 55%", STARLINK],
                ["Debris or a rocket body, 30%", DEBRIS],
                ["Other pairs, 15%", 2],
              ];
        rows.forEach(([text, g], k) => {
          const y = box.y + 4 + k * 16;
          ctx.fillStyle = rgbaOf(APP_COLORS[GROUP_CLASS[g] - 1], 1);
          ctx.beginPath();
          ctx.arc(box.x + box.w - 170, y, 3, 0, TAU);
          ctx.fill();
          type.text(ctx, text, box.x + box.w - 160, y, {
            size: 9,
            weight: 400,
          });
        });
      }
    }
    if (step === 4) this.watch(ctx);
    if (l.panel) this.panel(ctx);
    drawChrome(ctx, type, l, {
      mode: "Conjunctions",
      legend: step === 0 ? undefined : false,
      t:
        step === 0
          ? ((this.clock % (REPLAY + 2)) / REPLAY) * 3600
          : step === 4
            ? this.tw
            : 0,
      warp: step === 4 ? "10×" : "1H",
      markers: CLOSEST.map((c) => c[3]),
    });
    if (l.panel) drawPanelBack(ctx, l.panel);
    if (step === 0 || step === 4) {
      const s = this.sun;
      const x1 = s[0] * v.cosYaw - s[1] * v.sinYaw;
      const y1 = s[0] * v.sinYaw + s[1] * v.cosYaw;
      drawAtmosphere(
        ctx,
        v.cx,
        v.cy,
        RE * v.scale,
        x1,
        -(y1 * v.sinPitch + s[2] * v.cosPitch),
      );
    }
    drawWindow(ctx, l);
  }

  /**
   * Watch it happen: both objects' orbits, faint behind and bright ahead,
   * the two closing on the point where they pass 43 m apart.
   */
  private watch(ctx: CanvasRenderingContext2D) {
    const l = this.l;
    const v = this.v;
    const R = RE * v.scale;
    const q = new Float64Array(3);
    const sp = this.sp;
    ctx.save();
    ctx.beginPath();
    ctx.rect(l.view.x, l.view.y, l.view.w, l.view.h);
    ctx.clip();
    const front = () => {
      const dx = sp[0] - v.cx;
      const dy = sp[1] - v.cy;
      return sp[2] >= 0 || dx * dx + dy * dy > R * R;
    };
    PAIR.forEach((o, k) => {
      const period = (2 * Math.PI) / this.orbits[k].n;
      const color = APP_COLORS[o.color - 1];
      ctx.lineWidth = 1.3;
      let prev: [number, number] | null = null;
      for (let j = -90; j <= 90; j++) {
        const u = j / 90;
        this.pairAt(
          k,
          this.tw + Math.sign(u) * Math.abs(u) ** 2 * period * 0.5,
          q,
        );
        project(v, q[0], q[1], q[2], sp);
        if (!front()) {
          prev = null;
          continue;
        }
        if (prev) {
          ctx.strokeStyle = rgbaOf(color, u > 0 ? 0.9 * (1 - u * 0.7) : 0.25);
          ctx.beginPath();
          ctx.moveTo(prev[0], prev[1]);
          ctx.lineTo(sp[0], sp[1]);
          ctx.stroke();
        }
        prev = [sp[0], sp[1]];
      }
      this.pairAt(k, this.tw, q);
      project(v, q[0], q[1], q[2], sp);
      if (front()) {
        ctx.fillStyle = rgbaOf(color, 1);
        ctx.beginPath();
        ctx.arc(sp[0], sp[1], 3.4, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = ink(0.9);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(sp[0], sp[1], 7, 0, TAU);
        ctx.stroke();
        this.type.text(
          ctx,
          o.name,
          sp[0] + (k ? -12 : 12),
          sp[1] + (k ? 12 : -12),
          {
            size: 8,
            spacing: 0.14,
            align: k ? "right" : "left",
          },
        );
      }
    });
    // Where they meet, and the countdown to it.
    const u = unit(MEET[0], MEET[1], q);
    const r = RE + 481.9;
    project(v, u[0] * r, u[1] * r, u[2] * r, sp);
    const left = TCA - this.tw;
    ctx.strokeStyle = rgbaOf(SEVERITY[0], 0.9);
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.arc(sp[0], sp[1], 12, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    this.type.text(
      ctx,
      left > 0
        ? `CLOSEST IN ${Math.ceil(left)} S · 43 M · 14.5 KM/S`
        : "43 M APART · 14.5 KM/S",
      sp[0] + 18,
      sp[1] + 22,
      { size: 8, spacing: 0.14, color: SEVERITY[0] },
    );
    ctx.restore();
  }

  /** The Conjunctions card, as the app's: look-ahead, threshold, counts, closest first. */
  private panel(ctx: CanvasRenderingContext2D) {
    const b = this.l.panel as Box;
    const type = this.type;
    const x = b.x + 16;
    const right = b.x + b.w - 16;
    let y = drawPanel(
      ctx,
      type,
      b,
      "CONJUNCTIONS",
      "Close approaches between every tracked object, screened ahead.",
    );
    y += 6;
    const group = (
      title: string,
      opts: string[],
      on: number,
      x0: number,
      w: number,
    ) => {
      type.text(ctx, title, x0, y, { size: 7, spacing: 0.14, alpha: 0.46 });
      const cw = w / opts.length;
      opts.forEach((o, k) => {
        const cx = x0 + cw * k + cw / 2;
        type.text(ctx, o, cx, y + 22, {
          size: 8,
          spacing: 0.12,
          align: "center",
          alpha: k === on ? 1 : 0.46,
        });
        ctx.fillStyle = ink(k === on ? 1 : 0.1);
        ctx.fillRect(x0 + cw * k + 2, y + 32, cw - 4, 1);
      });
    };
    const half = (b.w - 40) / 2;
    group("LOOK AHEAD", ["1 H", "6 H", "24 H"], 0, x, half);
    group("MISS DISTANCE", ["1 KM", "2 KM", "5 KM"], 2, x + half + 8, half);
    y += 66;
    const total = this.ev ? this.ev.n : 0;
    type.text(ctx, total.toLocaleString("en-US"), x, y, {
      size: 38,
      weight: 400,
    });
    y += 30;
    type.text(ctx, "encounters under 5 km in the next 1 h", x, y, {
      size: 9,
      weight: 400,
      alpha: 0.7,
    });
    y += 30;
    const labels = ["< 1 km", "1–2 km", "2–5 km"];
    let bx = x;
    this.bins.forEach((n, k) => {
      ctx.fillStyle = rgbaOf(SEVERITY[k], 1);
      ctx.beginPath();
      ctx.arc(bx + 3, y, 2.6, 0, TAU);
      ctx.fill();
      const w = type.text(ctx, n.toLocaleString("en-US"), bx + 11, y, {
        size: 9.5,
      });
      const w2 = type.text(ctx, labels[k], bx + 15 + w, y, {
        size: 8.5,
        weight: 400,
        alpha: 0.46,
      });
      bx += 25 + w + w2;
    });
    y += 22;
    ctx.fillStyle = ink(0.1);
    ctx.fillRect(x, y, b.w - 32, 1);
    y += 22;
    type.text(ctx, "CLOSEST FIRST", x, y, {
      size: 7,
      spacing: 0.14,
      alpha: 0.46,
    });
    type.text(ctx, `5 of ${total.toLocaleString("en-US")}`, right, y, {
      size: 8,
      weight: 400,
      align: "right",
      alpha: 0.46,
    });
    y += 14;
    let first = true;
    for (const [a, c, m, tca, speed] of CLOSEST) {
      if (y + 44 > b.y + b.h - (this.step === 4 ? 46 : 0)) break;
      if (first && this.step === 4) {
        ctx.fillStyle = ink(0.07);
        ctx.fillRect(x - 6, y + 1, b.w - 20, 44);
        ctx.strokeStyle = ink(0.4);
        ctx.strokeRect(x - 5.5, y + 1.5, b.w - 21, 43);
      }
      first = false;
      ctx.fillStyle = ink(0.1);
      ctx.fillRect(x, y, b.w - 32, 1);
      y += 18;
      ctx.fillStyle = rgbaOf(SEVERITY[0], 1);
      ctx.beginPath();
      ctx.arc(x + 3, y + 1, 2.4, 0, TAU);
      ctx.fill();
      type.text(ctx, a, x + 12, y, { size: 9.5, weight: 400 });
      type.text(ctx, `${m} m`, right, y, {
        size: 10.5,
        weight: 400,
        align: "right",
      });
      y += 15;
      type.text(ctx, c, x + 12, y, { size: 9, weight: 400, alpha: 0.46 });
      type.text(
        ctx,
        `+${Math.round(tca / 60)} min · ${speed} km/s`,
        right,
        y + 1,
        {
          size: 8,
          weight: 400,
          align: "right",
          alpha: 0.46,
        },
      );
      y += 13;
    }
    if (this.step === 4) {
      // The selected encounter's action, as the app's card offers it.
      const by = b.y + b.h - 40;
      ctx.fillStyle = ink(0.95);
      ctx.fillRect(x, by, b.w - 32, 24);
      type.text(ctx, "WATCH IT HAPPEN", b.x + b.w / 2, by + 12, {
        size: 8,
        spacing: 0.16,
        align: "center",
        color: [6, 8, 12],
      });
    }
  }
}
