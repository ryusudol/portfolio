import { gauss, smoothstep } from "../math";
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
  GROUP_SIZE,
  ink,
  rgbaOf,
  stars,
  sunDirection,
  through,
} from "../orbit-app";
import {
  ALTITUDE,
  type Catalog,
  catalogueDots,
  DEBRIS,
  type Earth,
  gmst,
  loadCatalog,
  loadEarth,
  OMEGA_EARTH,
  orbitPosition,
  project,
  RE,
  SNAPSHOT,
  STARLINK,
  type View,
  view,
} from "../orbit-data";
import { freeArea, StageSize, Steps, stepAt } from "../story";
import type { Field, Frame, Scene } from "../types";

const STEP_AT = [0, 0.16, 0.32, 0.5, 0.66, 0.82] as const;
const WARP = 600;
const DEG = Math.PI / 180;
/** The map's axes: mean altitude on a log scale split at 2,000 km, and inclination. */
const LO = Math.log10(150);
const MID = Math.log10(2000);
const HI = Math.log10(50_000);
const SPLIT = 0.66;
const MAX_INCL = 150;
const TICKS: [number, string][] = [
  [200, "200"],
  [300, "300"],
  [500, "500"],
  [700, "700"],
  [1000, "1,000"],
  [1500, "1,500"],
  [2000, "2,000"],
  [5000, "5,000"],
  [10_000, "10,000"],
  [20_000, "20,000"],
  [35_786, "35,786"],
];
const NARROW_SKIP = new Set([300, 700, 1500, 5000, 20_000]);
/** The band where debris dominates (km). */
const BAND = [700, 1000] as const;
const SHELLS = [43, 53.1, 70, 97.3];
const BREAKUPS = [
  { name: "FENGYUN-1C", alt: 824, incl: 98.8, step: 3 },
  { name: "COSMOS 2251", alt: 726, incl: 74, step: 4 },
  { name: "IRIDIUM 33", alt: 780, incl: 86.4, step: 4 },
];
const HIGH = [
  { name: "GPS · GALILEO · BEIDOU", alt: 21_000, incl: 55 },
  { name: "GEOSTATIONARY", alt: 35_786, incl: 0 },
];
/** Histogram rows in the app's order: Starlink, other satellites, debris. */
const ROWS = [0, 2, 1];
const ROW_NAMES = ["Starlink", "Debris & rocket bodies", "Other satellites"];
const HIST_DOTS = 900;

/**
 * The app's Catalogue mode, then past it. The sample orbits the dot-matrix
 * Earth while the Catalogue card counts the groups and draws its mean-altitude
 * histograms, one row per group on its own scale, in dots. Then the same
 * objects leave their orbits for a map of mean altitude against inclination
 * that fills the window: Starlink's shells, old breakups, and the high orbits.
 */
export class CatalogueScene implements Scene {
  private cat: Catalog | null = null;
  private earth: Earth | null = null;
  private globe = new DotGlobe();
  private globeN = 0;
  private dots = 0;
  private t = 0;
  private theta0 = 0;
  private frame: Box = { x: 0, y: 0, w: 1, h: 1 };
  private l: AppLayout = appLayout({ x: 0, y: 0, w: 1, h: 1 }, true);
  private map: AppLayout = appLayout({ x: 0, y: 0, w: 1, h: 1 }, false);
  private v: View = view(0, 0, 1, 0, 0);
  private box: Box = { x: 0, y: 0, w: 1, h: 1 };
  private hist: {
    x: number;
    y: number;
    w: number;
    rowH: number;
    gap: number;
  } | null = null;
  private step = 0;
  private unfold = 0;
  private type = new AppType();
  private steps = new Steps();
  private size = new StageSize();
  private pt = new Float64Array(3);
  private sp = new Float64Array(3);
  private sun = new Float64Array(3);

  layout(f: Field, fr: Frame) {
    this.frame = freeArea(fr, 14);
    this.globeN = Math.round(f.n * 0.3);
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
    this.type.read(fr.section);
    this.steps.collect(fr.section);
  }

  private x(alt: number) {
    const l = Math.log10(Math.max(150, alt));
    const u =
      l <= MID
        ? (SPLIT * (l - LO)) / (MID - LO)
        : SPLIT + ((1 - SPLIT) * (l - MID)) / (HI - MID);
    return this.box.x + Math.min(1, u) * this.box.w;
  }

  private y(incl: number) {
    return this.box.y + this.box.h * (1 - incl / MAX_INCL);
  }

  update(f: Field, fr: Frame) {
    if (this.size.changed(fr)) this.layout(f, fr);
    const p = fr.progress;
    const step = stepAt(p, STEP_AT);
    this.step = step;
    this.steps.set(step);
    // Time runs while the objects orbit, and holds once they leave for the map.
    if (!fr.reduced && step === 0) this.t += fr.dt * WARP;
    f.classColors = APP_COLORS;
    const b = this.frame;
    const screen = {
      x: fr.visual.x + b.x,
      y: fr.visual.y + b.y,
      w: b.w,
      h: b.h,
    };
    this.l = appLayout(screen, true);
    this.map = appLayout(screen, false);
    this.unfold = smoothstep(STEP_AT[1] - 0.03, STEP_AT[1] + 0.03, p);
    const l = step === 0 ? this.l : this.map;
    const vw = this.l.view;
    const r = Math.min(vw.w, vw.h) * (this.l.wide ? 0.3 : 0.28);
    this.v = view(
      vw.x + vw.w / 2,
      vw.y + vw.h / 2 + 6,
      r / RE,
      -Math.PI / 2 + 70 * DEG,
      26 * DEG,
    );
    const mv = this.map.view;
    const left = this.map.wide ? 64 : 40;
    this.box = {
      x: mv.x + left,
      y: mv.y + 34,
      w: mv.w - left - 24,
      h: mv.h - 34 - (this.map.wide ? 44 : 34),
    };
    const p0 = this.l.panel;
    this.hist = p0
      ? { x: p0.x + 40, y: p0.y + 250, w: p0.w - 56, rowH: 34, gap: 26 }
      : null;

    const cat = this.cat;
    const dots = cat ? this.dots : 0;
    const v = this.v;
    const theta = this.theta0 + OMEGA_EARTH * this.t;
    const ct = Math.cos(theta);
    const st = Math.sin(theta);
    sunDirection((cat?.jd ?? 2461323.39) + this.t / 86400, theta, this.sun);
    const pt = this.pt;
    const sp = this.sp;
    const R2 = r * r;

    for (let i = 0; i < f.n; i++) {
      if (cat && i < dots) {
        const g = cat.group[i];
        f.gc[i] = GROUP_CLASS[g];
        f.gh[i] = 0;
        f.gj[i] = 0.05;
        if (step === 0) {
          orbitPosition(cat, i, this.t, pt);
          project(
            v,
            pt[0] * ct + pt[1] * st,
            -pt[0] * st + pt[1] * ct,
            pt[2],
            sp,
          );
          const dx = sp[0] - v.cx;
          const dy = sp[1] - v.cy;
          const behind = sp[2] < 0 && dx * dx + dy * dy < R2;
          f.gx[i] = sp[0];
          f.gy[i] = sp[1];
          f.ga[i] = behind
            ? 0
            : (0.55 + f.r3[i] * 0.4) * through(l, sp[0], sp[1]);
          f.gz[i] = GROUP_SIZE[g] * 1.15;
          continue;
        }
        const alt = cat.alt[i];
        const incl = cat.incl[i] / DEG;
        // A shell holds hundreds of dots at one spot, so every dot gets the same
        // small spread (about a degree) and a dense shell reads as a dense blob.
        f.gx[i] = this.x(alt) + gauss(f.r1[i], f.r2[i]) * 1.8;
        f.gy[i] = this.y(incl) + gauss(f.r2[i], f.r0[i]) * 1.8;
        f.gz[i] = fr.compact ? 1.1 : 1.35;
        let a = 0.6 + f.r3[i] * 0.35;
        let lit = true;
        if (step === 2) lit = g === STARLINK;
        if (step === 3) lit = g === DEBRIS;
        if (step === 4) {
          const inBand = alt >= BAND[0] && alt <= BAND[1];
          lit = inBand && g === DEBRIS;
          if (!lit) a *= inBand ? 0.7 : 0.16;
        } else if (step === 5) {
          lit = alt > 2000;
        }
        if (step >= 2 && step !== 4 && !lit) a *= 0.16;
        if (step === 1 || lit) f.gc[i] = GROUP_CLASS[g];
        else f.gc[i] = APP.Ink;
        f.ga[i] = Math.min(1, a);
        continue;
      }
      if (cat && i < dots + this.globe.n) continue;
      const h = i - dots - this.globe.n;
      if (cat && h >= 0 && h < HIST_DOTS) {
        this.histogram(f, i, h, step === 0);
        continue;
      }
      stars(
        f,
        i,
        l,
        step === 0 ? { cx: v.cx, cy: v.cy, r } : null,
        step === 0 ? 0.8 : 0.35,
      );
    }
    if (cat) {
      this.globe.place(f, dots, v, this.sun, fr, 1 - this.unfold);
      for (let k = 0; k < this.globe.n; k++) {
        const i = dots + k;
        if (i < f.n) f.ga[i] *= through(this.l, f.gx[i], f.gy[i]);
      }
    }
  }

  /** The Catalogue card's histograms: one column of dots per bin, per row. */
  private histogram(f: Field, i: number, h: number, shown: boolean) {
    const hb = this.hist;
    f.gj[i] = 0;
    f.gh[i] = 0;
    f.gz[i] = 1.5;
    if (!hb || !shown) {
      f.ga[i] = 0;
      return;
    }
    // Share dots across rows by how much each row draws, then across its bins.
    const bins = ALTITUDE.counts[0].length;
    const perRow = Math.floor(HIST_DOTS / 3);
    const row = Math.min(2, Math.floor(h / perRow));
    const g = ROWS[row];
    const counts = ALTITUDE.counts[g];
    const peak = Math.max(...counts);
    const height = counts.map((c) => (c ? Math.max(0.08, c / peak) : 0));
    const total = height.reduce((s, x) => s + x, 0);
    let u = ((h - row * perRow + 0.5) / perRow) * total;
    let bin = 0;
    while (bin < bins - 1 && u > height[bin]) u -= height[bin++];
    const x = hb.x + ((bin + 0.5) / bins) * hb.w;
    const base = hb.y + row * (hb.rowH + hb.gap) + hb.rowH;
    f.gx[i] = x + (f.r0[i] - 0.5) * Math.max(1, hb.w / bins - 2);
    f.gy[i] = base - u * hb.rowH;
    f.gc[i] = GROUP_CLASS[g];
    f.ga[i] = height[bin] > 0 ? 0.95 : 0;
  }

  draw(ctx: CanvasRenderingContext2D, fr: Frame) {
    const type = this.type;
    const step = this.step;
    const v = this.v;
    if (step === 0) {
      const l = this.l;
      if (l.panel) this.panel(ctx);
      drawChrome(ctx, type, l, {
        mode: "Catalogue",
        t: this.t,
        warp: "10M",
        legend: undefined,
      });
      if (l.panel) drawPanelBack(ctx, l.panel);
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
      drawWindow(ctx, l);
      return;
    }
    const l = this.map;
    this.axes(ctx, fr);
    drawChrome(ctx, type, l, {
      mode: "Catalogue",
      t: this.t,
      warp: "10M",
      legend: false,
    });
    drawWindow(ctx, l);
  }

  private axes(ctx: CanvasRenderingContext2D, fr: Frame) {
    const type = this.type;
    const b = this.box;
    const step = this.step;
    const y1 = b.y + b.h;
    const narrow = fr.compact || b.w < 520;
    ctx.lineWidth = 1;
    for (const [alt, text] of TICKS) {
      if (narrow && NARROW_SKIP.has(alt)) continue;
      const x = this.x(alt);
      ctx.fillStyle = ink(alt === 2000 ? 0.28 : 0.07);
      ctx.fillRect(x, b.y, 1, b.h);
      type.text(ctx, text, x, y1 + 12, {
        size: 7.5,
        weight: 400,
        align: "center",
        alpha: 0.6,
      });
    }
    for (let incl = 0; incl <= MAX_INCL; incl += 30) {
      const y = this.y(incl);
      ctx.fillStyle = ink(incl === 0 ? 0.28 : 0.07);
      ctx.fillRect(b.x, y, b.w, 1);
      type.text(ctx, `${incl}°`, b.x - 8, y, {
        size: 7.5,
        weight: 400,
        align: "right",
        alpha: 0.6,
      });
    }
    const xs = this.x(2000);
    type.text(ctx, "MEAN ALTITUDE, KM · LOG", b.x + (xs - b.x) / 2, y1 + 28, {
      size: 7.5,
      spacing: 0.14,
      align: "center",
      alpha: 0.46,
    });
    type.text(
      ctx,
      "COMPRESSED ABOVE 2,000",
      xs + (b.x + b.w - xs) / 2,
      y1 + 28,
      {
        size: 7.5,
        spacing: 0.14,
        align: "center",
        alpha: 0.3,
      },
    );
    type.text(ctx, "INCLINATION", b.x, b.y - 16, {
      size: 7.5,
      spacing: 0.14,
      alpha: 0.46,
    });

    const tag = (
      text: string,
      x: number,
      y: number,
      align: CanvasTextAlign = "left",
    ) => type.text(ctx, text, x, y, { size: 8.5, spacing: 0.14, align });
    if (step === 2) {
      for (const incl of SHELLS)
        tag(`${Math.round(incl)}°`, this.x(330) - 10, this.y(incl), "right");
    }
    if (step === 4) {
      const xa = this.x(BAND[0]);
      const xb = this.x(BAND[1]);
      ctx.fillStyle = ink(0.05);
      ctx.fillRect(xa, b.y, xb - xa, b.h);
      type.text(ctx, "700–1,000 KM · 85% DEBRIS", (xa + xb) / 2, b.y + 10, {
        size: 7.5,
        spacing: 0.14,
        align: "center",
        alpha: 0.85,
      });
    }
    if (step === 3 || step === 4) {
      for (const p of BREAKUPS) {
        if (p.step !== step && !(step === 4 && p.step === 3)) continue;
        const x = this.x(p.alt);
        const y = this.y(p.incl);
        const end = this.x(BAND[1] * 1.25);
        ctx.fillStyle = ink(0.5);
        ctx.fillRect(x + 6, y, end - x - 6, 1);
        tag(p.name, end + 5, y);
      }
    }
    if (step === 5) {
      for (const p of HIGH) {
        tag(
          p.name,
          this.x(p.alt),
          this.y(p.incl) - (p.incl === 0 ? 18 : 16),
          p.incl === 0 ? "right" : "center",
        );
      }
    }
  }

  /** The Catalogue card, as the app's. */
  private panel(ctx: CanvasRenderingContext2D) {
    const b = this.l.panel as Box;
    const hb = this.hist;
    const type = this.type;
    const x = b.x + 16;
    const right = b.x + b.w - 16;
    let y = drawPanel(
      ctx,
      type,
      b,
      "CATALOGUE",
      "What is up there, and at which altitude.",
    );
    y += 18;
    type.text(ctx, SNAPSHOT.objects.toLocaleString("en-US"), x, y, {
      size: 36,
      weight: 400,
    });
    y += 28;
    type.text(ctx, "objects, every one propagated live", x, y, {
      size: 9,
      weight: 400,
      alpha: 0.7,
    });
    y += 18;
    const groups: [string, number, number][] = [
      ["Starlink", SNAPSHOT.starlink, 0],
      ["Other satellites", SNAPSHOT.other, 2],
      ["Debris & rocket bodies", SNAPSHOT.debris, 1],
    ];
    let bx = x;
    for (const [, n, g] of groups) {
      const w = ((b.w - 32) * n) / SNAPSHOT.objects;
      ctx.fillStyle = rgbaOf(APP_COLORS[GROUP_CLASS[g] - 1], 1);
      ctx.fillRect(bx, y, w - 2, 3);
      bx += w;
    }
    y += 22;
    for (const [name, n, g] of groups) {
      ctx.strokeStyle = rgbaOf(APP_COLORS[GROUP_CLASS[g] - 1], 1);
      ctx.beginPath();
      ctx.arc(x + 4, y, 3.2, 0, Math.PI * 2);
      ctx.stroke();
      type.text(ctx, name, x + 14, y, { size: 9.5, weight: 400 });
      type.text(ctx, n.toLocaleString("en-US"), right - 34, y, {
        size: 9.5,
        weight: 400,
        align: "right",
      });
      type.text(ctx, `${Math.round((100 * n) / SNAPSHOT.objects)}%`, right, y, {
        size: 9,
        weight: 400,
        align: "right",
        alpha: 0.46,
      });
      ctx.fillStyle = ink(0.1);
      ctx.fillRect(x, y + 11, b.w - 32, 1);
      y += 22;
    }
    if (!hb || hb.y + 3 * hb.rowH + 2 * hb.gap + 20 > b.y + b.h) return;
    type.text(ctx, "MEAN ALTITUDE", x, hb.y - 26, {
      size: 7,
      spacing: 0.14,
      alpha: 0.46,
    });
    type.text(ctx, "log scale · own count scale per row", right, hb.y - 26, {
      size: 7.5,
      weight: 400,
      align: "right",
      alpha: 0.46,
    });
    ROWS.forEach((g, row) => {
      const top = hb.y + row * (hb.rowH + hb.gap);
      const peak = Math.max(...ALTITUDE.counts[g]);
      type.text(
        ctx,
        `${ROW_NAMES[g]} · peak ${peak.toLocaleString("en-US")}`,
        hb.x,
        top - 6,
        {
          size: 8,
          weight: 400,
          alpha: 0.7,
        },
      );
      type.text(ctx, peak.toLocaleString("en-US"), hb.x - 6, top + 2, {
        size: 7,
        weight: 400,
        align: "right",
        alpha: 0.46,
      });
      ctx.fillStyle = ink(0.18);
      ctx.fillRect(hb.x, top + hb.rowH, hb.w, 1);
    });
    const last = hb.y + 2 * (hb.rowH + hb.gap) + hb.rowH;
    const lx = (alt: number) =>
      hb.x +
      ((Math.log10(alt) - Math.log10(ALTITUDE.lo)) /
        (Math.log10(ALTITUDE.hi) - Math.log10(ALTITUDE.lo))) *
        hb.w;
    for (const [alt, text] of [
      [200, "200"],
      [500, "500"],
      [1000, "1k"],
      [2000, "2k"],
      [5000, "5k"],
      [10_000, "10k"],
      [20_000, "20k"],
      [36_000, "36k"],
    ] as const) {
      type.text(ctx, text, lx(alt), last + 12, {
        size: 7,
        weight: 400,
        align: "center",
        alpha: 0.46,
      });
    }
    ctx.fillStyle = ink(0.1);
    ctx.fillRect(lx(35_786), hb.y, 1, last - hb.y);
    type.text(ctx, "GEO", lx(35_786) - 4, last - 6, {
      size: 7,
      align: "right",
      alpha: 0.46,
    });
  }
}
