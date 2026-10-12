import { clamp, rgba, smoothstep } from "../math";
import {
  APP_COLORS,
  DotGlobe,
  drawAtmosphere,
  GROUP_CLASS,
  GROUP_SIZE,
  sunDirection,
} from "../orbit-app";
import {
  type Catalog,
  type Earth,
  gmst,
  loadCatalog,
  loadEarth,
  OMEGA_EARTH,
  orbitPosition,
  project,
  RE,
  SIEVE,
  VALLADO_LOG,
  type View,
  view,
} from "../orbit-data";
import { dust } from "../shapes";
import { label, resetText } from "../story";
import type { Field, Frame, Palette, Scene } from "../types";

type Kind = "catalogue" | "vallado" | "sieve" | "latency";

type Chart = {
  el: HTMLElement;
  kind: Kind;
  rect: DOMRect | null;
  start: number;
  count: number;
};

const WARP = 600;
/** London to New York, one way: laser over the 53° shell, and ideal fibre. */
const LASER_MS = 21;
const FIBRE_MS = 27.3;
/** Seconds of animation per millisecond of light travel. */
const PACE = 0.11;
const RACE = FIBRE_MS * PACE + 1.6;
const V_LO = -3.2;
const V_HI = -0.6;
const WORST = Math.max(...VALLADO_LOG);

const COUNT: Record<Kind, (n: number) => number> = {
  catalogue: (n) => Math.round(n * 0.17),
  vallado: () => VALLADO_LOG.length,
  sieve: () => 360,
  latency: () => 420,
};

/**
 * The four results, each with a particle chart of its own evidence: the
 * sampled catalogue orbiting a small Earth, the 666 reference states on a
 * log axis of error, the sieve's scaling against all pairs, and a packet
 * racing London to New York by laser while another goes by fibre.
 */
export class OrbitResultsScene implements Scene {
  private charts: Chart[] = [];
  private cat: Catalog | null = null;
  private earth: Earth | null = null;
  /** A small Explore view: the dot-matrix Earth under the catalogue's halo. */
  private globe = new DotGlobe();
  private sun = new Float64Array(3);
  private clock = 0;
  private t = 0;
  private ink = true;
  private vallado: { x: number; y: number }[] = [];
  private tallest = 1;
  private pos = new Float64Array(3);
  private sp = new Float64Array(3);

  layout(f: Field, fr: Frame) {
    let start = 0;
    this.charts = Array.from(
      fr.section.querySelectorAll<HTMLElement>("[data-chart]"),
    ).map((el) => {
      const kind = el.dataset.chart as Kind;
      const count = COUNT[kind]?.(f.n) ?? 0;
      const chart = { el, kind, rect: null, start, count };
      start += count;
      return chart;
    });
    this.clock = 0;
    loadCatalog().then((cat) => {
      this.cat = cat;
    });
    const tile = this.charts.find((c) => c.kind === "catalogue");
    const globeN = tile ? Math.round(tile.count * 0.42) : 0;
    this.globe.build(globeN, this.earth);
    loadEarth().then((earth) => {
      if (!earth || this.earth) return;
      this.earth = earth;
      this.globe.build(globeN, earth);
    });
    // The Vallado histogram, in fractions of its chart: bins two dots wide.
    const bins = 46;
    const fill = new Int32Array(bins + 1);
    this.vallado = VALLADO_LOG.map((v) => {
      const b = Math.max(
        0,
        Math.min(bins, Math.floor(((v / 1000 - V_LO) / (V_HI - V_LO)) * bins)),
      );
      const j = fill[b]++;
      return { x: (b + 0.25 + (j % 2) * 0.5) / bins, y: Math.floor(j / 2) };
    });
    this.tallest = Math.max(...this.vallado.map((p) => p.y)) + 1;
  }

  update(f: Field, fr: Frame) {
    this.clock = fr.reduced ? 10 : this.clock + fr.dt;
    if (!fr.reduced) this.t += fr.dt * WARP;
    const t = smoothstep(0.4, 2.2, this.clock);
    const boost = this.ink ? 1 : 1.3;
    for (const c of this.charts) c.rect = c.el.getBoundingClientRect();
    // The app's colours, for the catalogue tile; the other charts don't use classes.
    f.classColors = APP_COLORS;
    const theta = gmst(this.cat?.jd ?? 2461323.39) + OMEGA_EARTH * this.t;
    sunDirection(
      (this.cat?.jd ?? 2461323.39) + this.t / 86400,
      theta,
      this.sun,
    );

    let chart = 0;
    for (let i = 0; i < f.n; i++) {
      while (
        chart < this.charts.length &&
        i >= this.charts[chart].start + this.charts[chart].count
      )
        chart++;
      const c = this.charts[chart];
      if (!c || !c.rect || c.rect.width < 1 || i < c.start) {
        dust(f, i, fr, 0.12);
        continue;
      }
      const k = i - c.start;
      f.gh[i] = 0;
      f.gj[i] = 0.25;
      f.gz[i] = this.ink ? 0 : f.size[i] * 1.3;
      switch (c.kind) {
        case "catalogue":
          this.catalogue(f, i, k, c.rect, t);
          break;
        case "vallado":
          this.histogram(f, i, k, c.rect, t);
          break;
        case "sieve":
          this.sieve(f, i, k, c, t);
          break;
        case "latency":
          this.latency(f, i, k, c, fr);
          break;
      }
      if (c.kind !== "catalogue") f.ga[i] = Math.min(1, f.ga[i] * boost);
    }
    const tile = this.charts.find((c) => c.kind === "catalogue");
    if (tile?.rect && tile.rect.width > 1 && this.cat) {
      const start = tile.start + tile.count - this.globe.n;
      this.globe.place(f, start, this.orbitView(tile.rect), this.sun, fr, t);
    }
  }

  /** The app's opening view, scaled into the tile: Earth-fixed, over the Atlantic. */
  private orbitView(r: DOMRect): View {
    const R = r.height * 0.34;
    return view(
      r.left + r.width * 0.42,
      r.top + r.height * 0.52,
      R / RE,
      -Math.PI / 2 + 0.7,
      0.5,
    );
  }

  /** Objects in the app's colours, Earth-fixed; the last share of the tile's dots is the globe. */
  private catalogue(f: Field, i: number, k: number, r: DOMRect, t: number) {
    const cat = this.cat;
    const tile = this.charts.find((c) => c.kind === "catalogue") as Chart;
    if (!cat || k >= tile.count - this.globe.n || k >= cat.n) {
      if (!cat) f.ga[i] = 0;
      return;
    }
    const v = this.orbitView(r);
    orbitPosition(cat, k, this.t, this.pos);
    const theta = gmst(cat.jd) + OMEGA_EARTH * this.t;
    const ct = Math.cos(theta);
    const st = Math.sin(theta);
    const x = this.pos[0] * ct + this.pos[1] * st;
    const y = -this.pos[0] * st + this.pos[1] * ct;
    project(v, x, y, this.pos[2], this.sp);
    const R = RE * v.scale;
    const dx = this.sp[0] - v.cx;
    const dy = this.sp[1] - v.cy;
    const hidden =
      (this.sp[2] < 0 && dx * dx + dy * dy < R * R) ||
      this.sp[1] < r.top - 4 ||
      this.sp[1] > r.bottom + 4 ||
      this.sp[0] < r.left ||
      this.sp[0] > r.right;
    const g = cat.group[k];
    f.gx[i] = this.sp[0];
    f.gy[i] = this.sp[1];
    f.gc[i] = GROUP_CLASS[g];
    f.gz[i] = GROUP_SIZE[g];
    f.ga[i] = hidden ? 0 : (0.55 + f.r3[i] * 0.4) * t;
    f.gj[i] = 0.05;
  }

  private histogram(f: Field, i: number, k: number, r: DOMRect, t: number) {
    const p = this.vallado[k];
    const s = Math.min(2.6, (r.height - 20) / this.tallest);
    f.gx[i] = r.left + p.x * r.width * 0.92;
    f.gy[i] = r.top + r.height - 14 - (p.y + 0.5) * s * t;
    f.ga[i] = t > 0.02 ? 0.62 + f.r3[i] * 0.3 : 0;
    f.gh[i] = VALLADO_LOG[k] === WORST ? 1 : 0;
  }

  /** Log-log plot geometry for the sieve's scaling chart. */
  private plot(r: DOMRect) {
    const x0 = r.left + 4;
    const w = r.width * 0.56;
    const y0 = r.top + 6;
    const h = r.height - 22;
    const x = (n: number) => x0 + ((Math.log10(n) - 4) / 1) * w;
    const y = (ms: number) => y0 + h * (1 - (Math.log10(ms) - 0) / 4);
    return { x, y, x0, w, y0, h };
  }

  /** Dots along both measured series; the all-pairs line climbs, the grid's barely rises. */
  private sieve(f: Field, i: number, k: number, c: Chart, t: number) {
    const r = c.rect as DOMRect;
    const p = this.plot(r);
    const brute = k < c.count / 2;
    const pts = SIEVE.scaling.map((s) => [s.n, brute ? s.bruteMs : s.gridMs]);
    const u = ((k % (c.count / 2)) + f.r0[i]) / (c.count / 2);
    const seg = Math.min(pts.length - 2, Math.floor(u * (pts.length - 1)));
    const w = u * (pts.length - 1) - seg;
    const [na, ma] = pts[seg];
    const [nb, mb] = pts[seg + 1];
    const ln = Math.log10(na) + (Math.log10(nb) - Math.log10(na)) * w;
    const lm = Math.log10(ma) + (Math.log10(mb) - Math.log10(ma)) * w;
    const drawn = u <= t;
    f.gx[i] = p.x(10 ** ln) + (f.r1[i] - 0.5) * 1.5;
    f.gy[i] = p.y(10 ** lm) + (f.r2[i] - 0.5) * 1.5;
    f.ga[i] = drawn ? 0.7 + f.r3[i] * 0.25 : 0;
    f.gh[i] = brute ? 0 : 1;
  }

  /** Earth's surface between the cities, the shell above it, both paths. */
  private route(r: DOMRect) {
    const x0 = r.left + 6;
    const x1 = r.left + r.width * 0.6;
    const ground = r.top + r.height - 22;
    const sky = r.top + r.height * 0.32;
    const bulge = r.height * 0.14;
    const arc = (u: number) => ground - Math.sin(u * Math.PI) * bulge;
    return { x0, x1, ground, sky, bulge, arc };
  }

  /** Where the laser packet is at fraction u of its 21 ms trip. */
  private laserAt(r: DOMRect, u: number) {
    const g = this.route(r);
    const climb = 0.12;
    const x = g.x0 + (g.x1 - g.x0) * u;
    if (u < climb) {
      const a = u / climb;
      return {
        x: g.x0 + (g.x1 - g.x0) * climb * a,
        y: g.arc(0) + (g.sky - g.arc(0)) * a,
      };
    }
    if (u > 1 - climb) {
      const a = (1 - u) / climb;
      return { x, y: g.arc(1) + (g.sky - g.arc(1)) * a };
    }
    // Hops along the shell, a little stepped like the +Grid's staircase.
    const hop = Math.sin((u - climb) * Math.PI * 14) * 2;
    return { x, y: g.sky - Math.sin(u * Math.PI) * g.bulge + hop };
  }

  private latency(f: Field, i: number, k: number, c: Chart, fr: Frame) {
    const r = c.rect as DOMRect;
    const g = this.route(r);
    const time = fr.reduced ? RACE : this.clock % (RACE + 1.2);
    const ms = Math.max(0, time - 0.4) / PACE;
    const third = Math.floor(c.count / 3);
    if (k < third) {
      // The ground, and with it the fibre's path.
      const u = (k + f.r0[i]) / third;
      f.gx[i] = g.x0 + (g.x1 - g.x0) * u;
      f.gy[i] = g.arc(u) + (f.r1[i] - 0.5) * 1.5;
      f.ga[i] = 0.4 + f.r3[i] * 0.2;
      return;
    }
    if (k < 2 * third) {
      const u = (k - third + f.r0[i]) / third;
      const p = this.laserAt(r, u);
      f.gx[i] = p.x;
      f.gy[i] = p.y;
      f.ga[i] = 0.22 + f.r3[i] * 0.15;
      return;
    }
    // Packets: half ride the laser, half the fibre.
    const laser = k < 2.5 * third;
    const u = clamp(ms / (laser ? LASER_MS : FIBRE_MS));
    const jitter = (f.r1[i] - 0.5) * 6;
    const trail = f.r2[i] * 0.05;
    const v = clamp(u - trail);
    const p = laser
      ? this.laserAt(r, v)
      : { x: g.x0 + (g.x1 - g.x0) * v, y: g.arc(v) };
    f.gx[i] = p.x + jitter * 0.4;
    f.gy[i] = p.y + jitter * 0.3;
    f.ga[i] = ms > 0 ? 0.9 - trail * 8 : 0;
    f.gh[i] = laser ? 1 : 0;
  }

  draw(ctx: CanvasRenderingContext2D, fr: Frame, palette: Palette) {
    this.ink = palette.ink;
    const size = 9.5;
    const t = smoothstep(0.4, 2.2, this.clock);
    for (const c of this.charts) {
      const r = c.rect;
      if (!r || r.width < 1) continue;
      if (c.kind === "catalogue") {
        const v = this.orbitView(r);
        const sn = this.sun;
        const x1 = sn[0] * v.cosYaw - sn[1] * v.sinYaw;
        const y1 = sn[0] * v.sinYaw + sn[1] * v.cosYaw;
        ctx.save();
        ctx.beginPath();
        ctx.rect(r.left - 2, r.top - 8, r.width + 4, r.height + 16);
        ctx.clip();
        drawAtmosphere(
          ctx,
          v.cx,
          v.cy,
          RE * v.scale,
          x1,
          -(y1 * v.sinPitch + sn[2] * v.cosPitch),
          t,
        );
        ctx.globalCompositeOperation = "destination-over";
        ctx.fillStyle = `rgba(2,3,6,${t.toFixed(3)})`;
        ctx.fillRect(r.left - 2, r.top - 8, r.width + 4, r.height + 16);
        ctx.restore();
      } else if (c.kind === "vallado") {
        const x = r.left + ((-2 - V_LO) / (V_HI - V_LO)) * r.width * 0.92;
        ctx.strokeStyle = rgba(palette.fg, 0.35 * t);
        ctx.setLineDash([2, 3]);
        ctx.beginPath();
        ctx.moveTo(x, r.top + 4);
        ctx.lineTo(x, r.bottom - 12);
        ctx.stroke();
        ctx.setLineDash([]);
        label(ctx, palette, "0.01 mm", x, r.bottom - 2, {
          size,
          align: "center",
          alpha: 0.75 * t,
        });
        label(
          ctx,
          palette,
          "0.001",
          r.left + ((-3 - V_LO) / (V_HI - V_LO)) * r.width * 0.92,
          r.bottom - 2,
          {
            size,
            align: "center",
            alpha: 0.6 * t,
          },
        );
        label(
          ctx,
          palette,
          "0.1",
          r.left + ((-1 - V_LO) / (V_HI - V_LO)) * r.width * 0.92,
          r.bottom - 2,
          {
            size,
            align: "center",
            alpha: 0.6 * t,
          },
        );
      } else if (c.kind === "sieve") {
        const p = this.plot(r);
        const last = SIEVE.scaling[SIEVE.scaling.length - 1];
        label(ctx, palette, "all pairs", p.x(last.n) + 8, p.y(last.bruteMs), {
          size,
          alpha: t,
        });
        label(ctx, palette, "spatial grid", p.x(last.n) + 8, p.y(last.gridMs), {
          size,
          color: palette.accent,
          alpha: t,
        });
        label(ctx, palette, "10k", p.x(10_000), r.bottom - 2, {
          size,
          alpha: 0.6 * t,
        });
        label(ctx, palette, "100k objects", p.x(100_000), r.bottom - 2, {
          size,
          align: "right",
          alpha: 0.6 * t,
        });
      } else {
        const g = this.route(r);
        const time = fr.reduced ? RACE : this.clock % (RACE + 1.2);
        const ms = Math.max(0, time - 0.4) / PACE;
        label(ctx, palette, "London", g.x0, r.bottom - 8, { size, alpha: 0.7 });
        label(ctx, palette, "New York", g.x1, r.bottom - 8, {
          size,
          align: "right",
          alpha: 0.7,
        });
        const end = g.x1 + 10;
        label(ctx, palette, `laser  ${LASER_MS} ms`, end, g.sky, {
          size,
          color: palette.accent,
          alpha: ms >= LASER_MS ? 1 : 0.25,
        });
        label(ctx, palette, `fibre  ${FIBRE_MS} ms`, end, g.arc(1), {
          size,
          color: palette.fg,
          alpha: ms >= FIBRE_MS ? 0.9 : 0.25,
        });
      }
    }
    resetText(ctx);
  }
}
