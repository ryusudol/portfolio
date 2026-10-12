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
  ink,
  rgbaOf,
  stars,
  sunDirection,
  through,
} from "../orbit-app";
import {
  coverageAt,
  type Earth,
  loadEarth,
  loadShell,
  OMEGA_EARTH,
  project,
  RE,
  unit,
  type View,
  viewFacing,
} from "../orbit-data";
import {
  buildMesh,
  C_KM_S,
  createMesh,
  FIBRE_INDEX,
  greatCircleKm,
  type Mesh,
  type Route,
  route,
  type Shell,
  shellPositions,
  type Terminal,
  terminal,
} from "../orbit-mesh";
import { fmt, freeArea, Readouts, StageSize, Steps, stepAt } from "../story";
import type { Field, Frame, Scene } from "../types";

/** A minute of orbit a second, the app's 1M time warp. */
const WARP = 60;
/** The app rebuilds the mesh and the route four times a second. */
const REBUILD = 0.25;
const STEP_AT = [0, 0.18, 0.38, 0.58, 0.78] as const;
/** The Coverage chapter's steps: heatmap, extremes, peaks, equator and poles. */
const COVER_AT = [0, 0.24, 0.5, 0.75] as const;
const LONDON: [number, number] = [51.5072, -0.1276];
const NEW_YORK: [number, number] = [40.7128, -74.006];
const GREAT_CIRCLE = greatCircleKm(LONDON, NEW_YORK);
const FIBRE_MS = ((GREAT_CIRCLE * FIBRE_INDEX) / C_KM_S) * 1e3;
/** The view looks down on the North Atlantic. */
const FACE: [number, number] = [45, -40];
/** Coverage looks from lower down, so both 47° bands show. */
const COVER_FACE: [number, number] = [12, -30];
const MIN_ELEV = 25;
const DEG = Math.PI / 180;
/** The app's link and route colours. */
const LINK: [number, number, number] = [134, 182, 239];
const ROUTE: [number, number, number] = [255, 241, 214];
/** Latency samples kept for the panel's chart, one per rebuild. */
const HISTORY = 80;
const CHART_DOTS = 150;
/** The heatmap's ramp: most places see 20 to 75 satellites. */
const COVER_LO = 20;
const COVER_HI = 75;
const PROFILE_DOTS = 180;
/** The first few encounters the screen finds, for the timeline (s). */
const MARKERS = [281, 1373, 1672, 1823, 2208];

/**
 * The app's Routing mode, in dots. Starlink's 53° shell, as the engine
 * recovers it from the 9 October catalogue, flies over a dot-matrix Earth
 * lit by the real Sun. The +Grid links and the Dijkstra route are a port of
 * the engine's Rust (`lib/dots/orbit-mesh.ts`), rebuilt four times a second,
 * and the Laser Routing panel shows what the app's does, live. As
 * `coverage`, the same view is the Coverage mode: the globe coloured from the
 * engine's coverage grid, the panel's latitude profile drawn in dots.
 */
export class RoutingScene implements Scene {
  constructor(private mode: "routing" | "coverage" = "routing") {}

  private shell: Shell | null = null;
  private earth: Earth | null = null;
  private mesh: Mesh | null = null;
  private pos = new Float64Array(0);
  private screen = new Float32Array(0);
  private visible = new Uint8Array(0);
  private best: Route | null = null;
  private london: Terminal = terminal(...LONDON);
  private newYork: Terminal = terminal(...NEW_YORK);
  private history: number[] = [];
  private profile = new Float32Array(90);
  private stats = { fewest: 0, mean: 0, most: 0, peak: 0, peakLat: 0 };
  private sats = 0;
  private globe = new DotGlobe();
  private globeN = 0;
  private frame: Box = { x: 0, y: 0, w: 1, h: 1 };
  private l: AppLayout = appLayout({ x: 0, y: 0, w: 1, h: 1 }, true);
  private v: View = viewFacing(0, 0, 1, ...FACE);
  private t = 0;
  private clock = 0;
  private since = REBUILD;
  private step = 0;
  private panelIn = 0;
  private type = new AppType();
  private steps = new Steps();
  private readouts = new Readouts();
  private size = new StageSize();
  private sp = new Float64Array(3);
  private sun = new Float64Array(3);

  layout(f: Field, fr: Frame) {
    this.frame = freeArea(fr, 14);
    this.globeN = Math.round(f.n * 0.46);
    this.globe.build(this.globeN, this.earth);
    loadEarth().then((earth) => {
      if (!earth || this.earth) return;
      this.earth = earth;
      this.globe.build(this.globeN, earth);
      this.summarise(earth);
    });
    loadShell().then((shell) => {
      if (!shell || this.shell) return;
      this.shell = shell;
      this.mesh = createMesh(shell);
      this.pos = new Float64Array(3 * shell.n);
      this.screen = new Float32Array(2 * shell.n);
      this.visible = new Uint8Array(shell.n);
      this.since = REBUILD;
    });
    this.sats = this.shell ? Math.min(this.shell.n, Math.round(f.n * 0.32)) : 0;
    this.type.read(fr.section);
    this.steps.collect(fr.section);
    this.readouts.collect(fr.section);
  }

  /** The coverage panel's numbers, from the engine's grid. */
  private summarise(earth: Earth) {
    let fewest = Number.POSITIVE_INFINITY;
    let most = 0;
    let sum = 0;
    let weight = 0;
    for (let row = 0; row < 90; row++) {
      const w = Math.cos((-89 + row * 2) * DEG);
      let rowSum = 0;
      for (let col = 0; col < 180; col++) {
        const c = earth.coverage[row * 180 + col];
        fewest = Math.min(fewest, c);
        most = Math.max(most, c);
        rowSum += c;
      }
      this.profile[row] = rowSum / 180;
      sum += rowSum * w;
      weight += 180 * w;
    }
    let peak = 0;
    for (let row = 1; row < 90; row++)
      if (this.profile[row] > this.profile[peak]) peak = row;
    this.stats = {
      fewest,
      mean: sum / weight,
      most,
      peak: this.profile[peak],
      peakLat: -89 + peak * 2,
    };
  }

  update(f: Field, fr: Frame) {
    if (this.size.changed(fr)) this.layout(f, fr);
    const p = fr.progress;
    const coverage = this.mode === "coverage";
    const step = stepAt(p, coverage ? COVER_AT : STEP_AT);
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
    this.panelIn = coverage
      ? smoothstep(0, 0.05, p)
      : smoothstep(STEP_AT[3] - 0.02, STEP_AT[3] + 0.04, p);
    const r = l.wide
      ? Math.min(vw.w * 0.43, vw.h * 0.5)
      : Math.min(vw.w, vw.h) * 0.44;
    const face: [number, number] = coverage
      ? [COVER_FACE[0], COVER_FACE[1] + (fr.reduced ? 0 : p * 70)]
      : FACE;
    this.v = viewFacing(vw.x + vw.w / 2, vw.y + vw.h / 2 + 4, r / RE, ...face);
    const v = this.v;
    const shell = this.shell;
    const sp = this.sp;
    const R2 = r * r;

    if (shell && this.mesh) {
      if (!this.sats) this.sats = Math.min(shell.n, Math.round(f.n * 0.32));
      if (!fr.reduced) this.t += fr.dt * WARP;
      shellPositions(shell, this.t, this.pos);
      for (let k = 0; k < shell.n; k++) {
        project(
          v,
          this.pos[3 * k],
          this.pos[3 * k + 1],
          this.pos[3 * k + 2],
          sp,
        );
        this.screen[2 * k] = sp[0];
        this.screen[2 * k + 1] = sp[1];
        const dx = sp[0] - v.cx;
        const dy = sp[1] - v.cy;
        this.visible[k] = sp[2] < 0 && dx * dx + dy * dy < R2 ? 0 : 1;
      }
      this.since += fr.dt;
      if (this.since >= REBUILD) {
        this.since = 0;
        buildMesh(shell, this.pos, this.t, this.mesh);
        this.best = route(
          shell,
          this.pos,
          this.mesh,
          this.london,
          this.newYork,
          MIN_ELEV,
        );
        if (this.best) {
          this.history.push((this.best.km / C_KM_S) * 1e3);
          if (this.history.length > HISTORY) this.history.shift();
        }
      }
      this.readouts.write("links", fmt(this.mesh.count));
      if (coverage && this.earth) {
        this.readouts.write("fewest", String(this.stats.fewest));
        this.readouts.write("mean", this.stats.mean.toFixed(1));
        this.readouts.write("most", String(this.stats.most));
      }
      this.readouts.write(
        "latency",
        step >= 3 && this.best
          ? `${((this.best.km / C_KM_S) * 1e3).toFixed(1)} ms`
          : "–",
      );
    }
    const theta = (shell?.gmst ?? 0) + OMEGA_EARTH * this.t;
    sunDirection((shell?.jd ?? 2461323.39) + this.t / 86400, theta, this.sun);

    const sats = shell ? this.sats : 0;
    const onPath = new Set(
      step >= 3 && !coverage && this.best ? this.best.path : [],
    );
    for (let i = 0; i < f.n; i++) {
      if (shell && i < sats) {
        const k = Math.floor((i * shell.n) / sats);
        const x = this.screen[2 * k];
        const y = this.screen[2 * k + 1];
        f.gx[i] = x;
        f.gy[i] = y;
        let a = this.visible[k] ? 0.6 + f.r3[i] * 0.35 : 0;
        f.gc[i] =
          !coverage && step === 1 && shell.planeOf[k] % 2
            ? APP.Ink
            : APP.Starlink;
        if (onPath.has(k)) a = 0;
        if (coverage) a *= 0.25;
        f.ga[i] = a * through(l, x, y);
        f.gz[i] = fr.compact ? 1.3 : 1.7;
        f.gh[i] = 0;
        f.gj[i] = 0.02;
        continue;
      }
      if (shell && i < sats + this.globe.n) continue;
      const c = i - sats - this.globe.n;
      if (shell && l.panel && c >= 0 && c < CHART_DOTS + PROFILE_DOTS) {
        this.chart(f, i, c, fr);
        continue;
      }
      stars(f, i, l, { cx: v.cx, cy: v.cy, r }, 0.8);
    }
    if (shell) {
      const earth = this.earth;
      this.globe.place(f, sats, v, this.sun, fr, 1, {
        coverage:
          coverage && earth
            ? (lat, lon) =>
                Math.min(
                  1,
                  Math.max(
                    0,
                    (coverageAt(earth, lat, lon) - COVER_LO) /
                      (COVER_HI - COVER_LO),
                  ),
                ) ** 1.6
            : undefined,
      });
      for (let k = 0; k < this.globe.n; k++) {
        const i = sats + k;
        if (i < f.n) f.ga[i] *= through(l, f.gx[i], f.gy[i]);
      }
    }
  }

  /** Where the panel's chart sits, or null when the panel is too short for it. */
  private chartBox(coverage: boolean): Box | null {
    const p = this.l.panel;
    if (!p) return null;
    const top = p.y + (coverage ? 330 : 360);
    const h = p.y + p.h - 26 - top;
    if (h < 50) return null;
    return { x: p.x + 40, y: top, w: p.w - 80, h };
  }

  /** Dots for the latency-over-time line, or the coverage-by-latitude profile. */
  private chart(f: Field, i: number, c: number, fr: Frame) {
    const coverage = this.mode === "coverage";
    const box = this.chartBox(coverage);
    const shown = coverage ? c >= CHART_DOTS : c < CHART_DOTS;
    f.gz[i] = fr.compact ? 1.2 : 1.5;
    f.gj[i] = 0;
    f.gh[i] = 0;
    f.gc[i] = APP.Ink;
    if (!box || !shown || this.panelIn < 0.5) {
      f.ga[i] = 0;
      if (box) {
        f.gx[i] = box.x + ((c % CHART_DOTS) / CHART_DOTS) * box.w;
        f.gy[i] = box.y + box.h;
      }
      return;
    }
    if (!coverage) {
      const h = this.history;
      if (h.length < 2) {
        f.ga[i] = 0;
        return;
      }
      const u = (c + 0.5) / CHART_DOTS;
      const at = u * (h.length - 1);
      const k = Math.min(h.length - 2, Math.floor(at));
      const ms = h[k] + (h[k + 1] - h[k]) * (at - k);
      f.gx[i] = box.x + u * box.w;
      f.gy[i] = box.y + box.h * (1 - ms / 30);
      f.ga[i] = 0.95 * this.panelIn;
      return;
    }
    const u = (c - CHART_DOTS + 0.5) / PROFILE_DOTS;
    const at = u * 89;
    const k = Math.min(88, Math.floor(at));
    const mean =
      this.profile[k] + (this.profile[k + 1] - this.profile[k]) * (at - k);
    f.gx[i] = box.x + u * box.w;
    f.gy[i] = box.y + box.h * (1 - mean / 80);
    f.ga[i] = 0.95;
  }

  private groundOf(t: Terminal) {
    const p = project(
      this.v,
      t.pos[0],
      t.pos[1],
      t.pos[2],
      new Float64Array(3),
    );
    return { x: p[0], y: p[1] };
  }

  /** Where a terminal sees satellites above 25°: a cap on the ground. */
  private cap(
    ctx: CanvasRenderingContext2D,
    at: [number, number],
    radiusKm: number,
  ) {
    const lambda =
      Math.acos((RE * Math.cos(MIN_ELEV * DEG)) / radiusKm) - MIN_ELEV * DEG;
    const lat0 = at[0] * DEG;
    const lon0 = at[1] * DEG;
    const u = new Float64Array(3);
    ctx.beginPath();
    for (let k = 0; k <= 48; k++) {
      const az = (k / 48) * TAU;
      const lat = Math.asin(
        Math.sin(lat0) * Math.cos(lambda) +
          Math.cos(lat0) * Math.sin(lambda) * Math.cos(az),
      );
      const lon =
        lon0 +
        Math.atan2(
          Math.sin(az) * Math.sin(lambda) * Math.cos(lat0),
          Math.cos(lambda) - Math.sin(lat0) * Math.sin(lat),
        );
      unit(lat / DEG, lon / DEG, u);
      project(this.v, u[0] * RE, u[1] * RE, u[2] * RE, this.sp);
      if (k === 0) ctx.moveTo(this.sp[0], this.sp[1]);
      else ctx.lineTo(this.sp[0], this.sp[1]);
    }
    ctx.closePath();
    ctx.fillStyle = "rgba(120,170,255,0.13)";
    ctx.fill();
    ctx.strokeStyle = "rgba(150,195,255,0.55)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  /** A city's tag, as the app draws them: a black box, a dot, the name tracked out. */
  private tag(
    ctx: CanvasRenderingContext2D,
    name: string,
    x: number,
    y: number,
  ) {
    const type = this.type;
    const w =
      type.text(ctx, name, -999, -999, { size: 8.5, spacing: 0.16 }) + 26;
    const h = 18;
    const bx = x + 10;
    const by = y - h - 4;
    ctx.fillStyle = "rgba(0,0,0,0.82)";
    ctx.fillRect(bx, by, w, h);
    ctx.strokeStyle = ink(0.35);
    ctx.lineWidth = 1;
    ctx.strokeRect(bx + 0.5, by + 0.5, w - 1, h - 1);
    ctx.fillStyle = ink(1);
    ctx.beginPath();
    ctx.arc(bx + 10, by + h / 2, 2, 0, TAU);
    ctx.fill();
    type.text(ctx, name, bx + 18, by + h / 2, { size: 8.5, spacing: 0.16 });
  }

  private greatCircle(ctx: CanvasRenderingContext2D) {
    const a = unit(...LONDON, new Float64Array(3));
    const c = unit(...NEW_YORK, new Float64Array(3));
    const omega = Math.acos(a[0] * c[0] + a[1] * c[1] + a[2] * c[2]);
    ctx.strokeStyle = ink(0.75);
    ctx.setLineDash([2, 4]);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let k = 0; k <= 48; k++) {
      const t = k / 48;
      const wa = Math.sin((1 - t) * omega) / Math.sin(omega);
      const wc = Math.sin(t * omega) / Math.sin(omega);
      project(
        this.v,
        (wa * a[0] + wc * c[0]) * RE,
        (wa * a[1] + wc * c[1]) * RE,
        (wa * a[2] + wc * c[2]) * RE,
        this.sp,
      );
      if (k === 0) ctx.moveTo(this.sp[0], this.sp[1]);
      else ctx.lineTo(this.sp[0], this.sp[1]);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }

  /** The route glows warm white, the brightest thing on screen, with a packet riding it. */
  private route(
    ctx: CanvasRenderingContext2D,
    pts: { x: number; y: number }[],
  ) {
    ctx.save();
    ctx.shadowColor = rgbaOf(ROUTE, 0.9);
    ctx.shadowBlur = 12;
    ctx.strokeStyle = rgbaOf(ROUTE, 0.95);
    ctx.lineWidth = 2.4;
    ctx.lineJoin = "round";
    ctx.beginPath();
    pts.forEach((q, k) => {
      if (k) ctx.lineTo(q.x, q.y);
      else ctx.moveTo(q.x, q.y);
    });
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = rgbaOf(ROUTE, 1);
    for (const q of pts.slice(1, -1)) {
      ctx.beginPath();
      ctx.arc(q.x, q.y, 2.2, 0, TAU);
      ctx.fill();
    }
    const lens = pts
      .slice(1)
      .map((q, k) => Math.hypot(q.x - pts[k].x, q.y - pts[k].y));
    const total = lens.reduce((s, x) => s + x, 0);
    let d = ((this.clock % 1.4) / 1.4) * total;
    let k = 0;
    while (k < lens.length - 1 && d > lens[k]) d -= lens[k++];
    const u = lens[k] ? d / lens[k] : 0;
    const px = pts[k].x + (pts[k + 1].x - pts[k].x) * u;
    const py = pts[k].y + (pts[k + 1].y - pts[k].y) * u;
    const glow = ctx.createRadialGradient(px, py, 0, px, py, 12);
    glow.addColorStop(0, "rgba(255,250,235,1)");
    glow.addColorStop(1, "rgba(255,240,210,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(px, py, 12, 0, TAU);
    ctx.fill();
  }

  draw(ctx: CanvasRenderingContext2D) {
    const l = this.l;
    const shell = this.shell;
    const mesh = this.mesh;
    const v = this.v;
    const step = this.step;
    const coverage = this.mode === "coverage";

    ctx.save();
    ctx.beginPath();
    ctx.rect(
      l.frame.x,
      l.frame.y + l.header,
      l.view.w,
      l.frame.h - l.header - l.dock,
    );
    ctx.clip();
    if (shell && mesh && step >= 2 && !coverage) {
      ctx.strokeStyle = rgbaOf(LINK, step === 2 ? 0.42 : 0.26);
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      for (let e = 0; e < mesh.count; e++) {
        const a = mesh.edges[2 * e];
        const c = mesh.edges[2 * e + 1];
        if (!this.visible[a] || !this.visible[c]) continue;
        ctx.moveTo(this.screen[2 * a], this.screen[2 * a + 1]);
        ctx.lineTo(this.screen[2 * c], this.screen[2 * c + 1]);
      }
      ctx.stroke();
    }
    if (shell && step >= 3 && !coverage) {
      const london = this.groundOf(this.london);
      const newYork = this.groundOf(this.newYork);
      this.cap(ctx, LONDON, shell.radius[0]);
      this.cap(ctx, NEW_YORK, shell.radius[0]);
      if (step === 4) this.greatCircle(ctx);
      if (this.best) {
        const hops = this.best.path.map((k) => ({
          x: this.screen[2 * k],
          y: this.screen[2 * k + 1],
        }));
        this.route(ctx, [london, ...hops, newYork]);
      }
      this.tag(ctx, "LONDON", london.x, london.y);
      this.tag(ctx, "NEW YORK", newYork.x, newYork.y);
    }
    if (coverage && step >= 2)
      this.bands(ctx, step === 2 ? [47, -47] : [0, 70, -70]);
    ctx.restore();

    if (l.panel && this.panelIn > 0.01) this.drawPanel(ctx, coverage);
    drawChrome(ctx, this.type, l, {
      mode: coverage ? "Coverage" : "Routing",
      t: this.t,
      warp: "1M",
      markers: MARKERS,
    });
    if (l.panel && this.panelIn > 0.01)
      drawPanelBack(ctx, l.panel, this.panelIn);
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
  }

  private drawPanel(ctx: CanvasRenderingContext2D, coverage: boolean) {
    if (coverage) this.coveragePanel(ctx);
    else this.routingPanel(ctx);
  }

  /** Parallels on the globe, labelled with the mean count along them. */
  private bands(ctx: CanvasRenderingContext2D, lats: number[]) {
    const v = this.v;
    const u = new Float64Array(3);
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 3]);
    for (const lat of lats) {
      ctx.strokeStyle = ink(0.75);
      ctx.beginPath();
      let pen = false;
      let label: [number, number] | null = null;
      for (let k = 0; k <= 96; k++) {
        unit(lat, (k / 96) * 360 - 180, u);
        project(v, u[0] * RE, u[1] * RE, u[2] * RE, this.sp);
        if (this.sp[2] < 0) {
          pen = false;
          continue;
        }
        if (!label || this.sp[0] > label[0]) label = [this.sp[0], this.sp[1]];
        if (pen) ctx.lineTo(this.sp[0], this.sp[1]);
        else ctx.moveTo(this.sp[0], this.sp[1]);
        pen = true;
      }
      ctx.stroke();
      if (label) {
        const row = Math.min(89, Math.max(0, Math.round((lat + 89) / 2)));
        const name = `${Math.abs(lat)}°${lat > 0 ? "N" : lat < 0 ? "S" : ""} · ${Math.round(this.profile[row])} IN VIEW`;
        this.type.text(ctx, name, label[0] + 8, label[1], {
          size: 8,
          spacing: 0.14,
          alpha: 0.95,
        });
      }
    }
    ctx.setLineDash([]);
  }

  private rule(ctx: CanvasRenderingContext2D, y: number) {
    const b = this.l.panel as Box;
    ctx.fillStyle = ink(0.1 * this.panelIn);
    ctx.fillRect(b.x + 16, y, b.w - 32, 1);
  }

  private routingPanel(ctx: CanvasRenderingContext2D) {
    const b = this.l.panel as Box;
    const type = this.type;
    const a = this.panelIn;
    const x = b.x + 16;
    const right = b.x + b.w - 16;
    let y = drawPanel(
      ctx,
      type,
      b,
      "LASER ROUTING",
      "The fastest path across Starlink’s laser mesh, rebuilt 4× a second.",
      a,
    );
    this.rule(ctx, y - 6);
    y += 14;
    ctx.strokeStyle = ink(a);
    ctx.beginPath();
    ctx.arc(x + 3, y, 2.5, 0, TAU);
    ctx.stroke();
    type.text(ctx, "FROM", x + 14, y, {
      size: 7,
      spacing: 0.14,
      alpha: 0.46 * a,
    });
    type.text(ctx, "London, United Kingdom", x + 50, y, {
      size: 10.5,
      weight: 400,
      alpha: a,
    });
    y += 26;
    ctx.fillStyle = ink(a);
    ctx.beginPath();
    ctx.arc(x + 3, y, 2.5, 0, TAU);
    ctx.fill();
    type.text(ctx, "TO", x + 14, y, {
      size: 7,
      spacing: 0.14,
      alpha: 0.46 * a,
    });
    type.text(ctx, "New York, United States", x + 50, y, {
      size: 10.5,
      weight: 400,
      alpha: a,
    });
    y += 20;
    this.rule(ctx, y);
    y += 22;
    const best = this.best;
    const ms = best ? (best.km / C_KM_S) * 1e3 : 0;
    type.text(ctx, "ONE-WAY LATENCY", x, y, {
      size: 7.5,
      spacing: 0.14,
      alpha: 0.46 * a,
    });
    type.text(ctx, "London → New York", right, y, {
      size: 8,
      weight: 400,
      align: "right",
      alpha: 0.46 * a,
    });
    y += 32;
    const w = type.text(ctx, ms.toFixed(1), x, y, {
      size: 40,
      weight: 400,
      alpha: a,
    });
    type.text(ctx, "ms", x + w + 6, y + 10, {
      size: 9,
      weight: 400,
      alpha: 0.7 * a,
    });
    y += 30;
    const chip = `${(FIBRE_MS - ms).toFixed(1)} MS FASTER THAN FIBRE`;
    const cw =
      type.text(ctx, chip, -999, -999, { size: 7.5, spacing: 0.14 }) + 20;
    ctx.strokeStyle = ink(0.35 * a);
    ctx.lineWidth = 1;
    ctx.strokeRect(right - cw + 0.5, y - 9.5, cw - 1, 19);
    type.text(ctx, chip, right - cw / 2, y, {
      size: 7.5,
      spacing: 0.14,
      align: "center",
      alpha: a,
    });
    y += 28;
    const bar = (name: string, value: number, dashed: boolean) => {
      type.text(ctx, name, x, y, { size: 9.5, weight: 400, alpha: 0.7 * a });
      const bx = x + 84;
      const bw = right - 60 - bx;
      ctx.fillStyle = ink(0.1 * a);
      ctx.fillRect(bx, y - 1, bw, 2);
      ctx.fillStyle = ink(a);
      const len = (value / 30) * bw;
      if (dashed)
        for (let d = 0; d < len; d += 4) ctx.fillRect(bx + d, y - 1, 2, 2);
      else ctx.fillRect(bx, y - 1, len, 2);
      type.text(ctx, `${value.toFixed(1)} ms`, right, y, {
        size: 9.5,
        weight: 400,
        align: "right",
        alpha: a,
      });
      y += 22;
    };
    bar("Laser mesh", ms, false);
    bar("Ideal fibre", FIBRE_MS, true);
    y += 6;
    const cols: [string, string, string][] = [
      ["PATH LENGTH", best ? fmt(best.km) : "–", "KM"],
      ["GREAT CIRCLE", fmt(GREAT_CIRCLE), "KM"],
      ["HOPS", best ? String(best.path.length) : "–", ""],
    ];
    const colW = (b.w - 32) / 3;
    cols.forEach(([k, val, unitLabel], c) => {
      type.text(ctx, k, x + c * colW, y, {
        size: 7,
        spacing: 0.14,
        alpha: 0.46 * a,
      });
      const vw = type.text(ctx, val, x + c * colW, y + 20, {
        size: 16,
        weight: 400,
        alpha: a,
      });
      if (unitLabel)
        type.text(ctx, unitLabel, x + c * colW + vw + 4, y + 23, {
          size: 6.5,
          spacing: 0.1,
          alpha: 0.46 * a,
        });
    });
    const box = this.chartBox(false);
    if (!box) return;
    this.rule(ctx, box.y - 34);
    type.text(ctx, "LATENCY OVER TIME", x, box.y - 18, {
      size: 7.5,
      spacing: 0.14,
      alpha: 0.46 * a,
    });
    this.axes(ctx, box, [0, 10, 20, 30], 30, null);
    const fy = box.y + box.h * (1 - FIBRE_MS / 30);
    ctx.fillStyle = ink(0.6 * a);
    for (let d = 0; d < box.w; d += 4) ctx.fillRect(box.x + d, fy, 2, 1);
    type.text(ctx, `${FIBRE_MS.toFixed(1)} ms`, box.x + box.w + 4, fy, {
      size: 7.5,
      weight: 400,
      alpha: 0.7 * a,
    });
    if (best) {
      type.text(
        ctx,
        `${ms.toFixed(1)} ms`,
        box.x + box.w + 4,
        box.y + box.h * (1 - ms / 30),
        {
          size: 7.5,
          weight: 400,
          alpha: 0.9 * a,
        },
      );
    }
  }

  private coveragePanel(ctx: CanvasRenderingContext2D) {
    const b = this.l.panel as Box;
    const type = this.type;
    const a = this.panelIn;
    const x = b.x + 16;
    const right = b.x + b.w - 16;
    let y = drawPanel(
      ctx,
      type,
      b,
      "COVERAGE",
      "Where on Earth a Starlink satellite is in view.",
      a,
    );
    y += 20;
    type.text(ctx, "100.0", x, y + 6, { size: 38, weight: 400, alpha: a });
    y += 40;
    type.text(ctx, "% of Earth’s surface sees a Starlink", x, y, {
      size: 9,
      weight: 400,
      alpha: 0.7 * a,
    });
    type.text(ctx, "satellite above 25°", x, y + 13, {
      size: 9,
      weight: 400,
      alpha: 0.7 * a,
    });
    y += 30;
    ctx.fillStyle = ink(a);
    ctx.fillRect(x, y, b.w - 32, 1.5);
    y += 24;
    const st = this.stats;
    const cols: [string, string][] = [
      ["FEWEST", String(st.fewest)],
      ["MEAN", st.mean.toFixed(1)],
      ["MOST", String(st.most)],
    ];
    const cw = (b.w - 32) / 3;
    if (this.step === 1) {
      ctx.strokeStyle = ink(0.5 * a);
      ctx.strokeRect(x - 6.5, y - 11.5, b.w - 19, 44);
    }
    cols.forEach(([k, val], c) => {
      type.text(ctx, k, x + c * cw, y, {
        size: 7.5,
        spacing: 0.14,
        alpha: 0.46 * a,
      });
      type.text(ctx, val, x + c * cw, y + 20, {
        size: 17,
        weight: 400,
        alpha: a,
      });
    });
    y += 48;
    this.rule(ctx, y);
    y += 22;
    type.text(ctx, "Heatmap on the globe", x, y, {
      size: 9.5,
      weight: 400,
      alpha: a,
    });
    ctx.fillStyle = rgbaOf(APP_COLORS[APP.Starlink - 1], a);
    ctx.fillRect(right - 30, y - 6, 30, 12);
    ctx.fillStyle = ink(a);
    ctx.fillRect(right - 13, y - 4, 11, 8);
    y += 22;
    const g = ctx.createLinearGradient(x + 14, 0, right - 100, 0);
    g.addColorStop(0, "rgba(46,86,138,0.3)");
    g.addColorStop(1, rgbaOf(APP_COLORS[APP.Starlink - 1], a));
    ctx.fillStyle = g;
    ctx.fillRect(x + 14, y - 1, right - 100 - x - 14, 2);
    type.text(ctx, String(COVER_LO), x, y, { size: 7.5, alpha: 0.46 * a });
    type.text(ctx, `${COVER_HI}+ SATELLITES`, right, y, {
      size: 7.5,
      spacing: 0.14,
      align: "right",
      alpha: 0.46 * a,
    });
    y += 22;
    this.rule(ctx, y);
    const box = this.chartBox(true);
    if (!box) return;
    type.text(ctx, "SATELLITES IN VIEW BY LATITUDE", x, box.y - 22, {
      size: 7.5,
      spacing: 0.14,
      alpha: 0.46 * a,
    });
    this.axes(ctx, box, [0, 20, 40, 60, 80], 80, [
      "90°S",
      "45°S",
      "0°",
      "45°N",
      "90°N",
    ]);
    const px = box.x + ((st.peakLat + 89) / 178) * box.w;
    const hemi = st.peakLat < 0 ? "S" : "N";
    type.text(
      ctx,
      `${st.peak.toFixed(1)} at ${Math.abs(st.peakLat)}°${hemi}`,
      px,
      box.y + box.h * (1 - st.peak / 80) - 10,
      {
        size: 8,
        align: "center",
        alpha: 0.85 * a,
      },
    );
  }

  private axes(
    ctx: CanvasRenderingContext2D,
    box: Box,
    ticks: number[],
    max: number,
    xLabels: string[] | null,
  ) {
    const type = this.type;
    const a = this.panelIn;
    for (const t of ticks) {
      const y = box.y + box.h * (1 - t / max);
      ctx.fillStyle = ink((t === 0 ? 0.28 : 0.08) * a);
      ctx.fillRect(box.x, y, box.w, 1);
      type.text(ctx, String(t), box.x - 8, y, {
        size: 7,
        weight: 400,
        align: "right",
        alpha: 0.46 * a,
      });
    }
    xLabels?.forEach((s, k) => {
      type.text(
        ctx,
        s,
        box.x + (k / (xLabels.length - 1)) * box.w,
        box.y + box.h + 12,
        {
          size: 7,
          weight: 400,
          align: "center",
          alpha: 0.46 * a,
        },
      );
    });
  }
}
