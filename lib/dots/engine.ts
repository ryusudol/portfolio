import { clamp, mix, parseColor, rgba, TAU } from "./math";
import { dots } from "./runtime";
import type { Field, Frame, Palette, Pointer, Rect, RGB, Scene } from "./types";

const TINT_LEVELS = 6;
const ALPHA_LEVELS = 8;
const BUCKETS = TINT_LEVELS * ALPHA_LEVELS;
const CLASS_LEVELS = 4;
const MAX_CLASSES = 10;
const ALL_BUCKETS = BUCKETS + MAX_CLASSES * CLASS_LEVELS * ALPHA_LEVELS;
const SKIP = 0xffff;
const COMPACT_BREAKPOINT = 900;

type Chapter = {
  el: HTMLElement;
  scene: Scene;
  visual: HTMLElement | null;
  progress: number;
  cssP: string;
  cssVis: string;
};

type Pulse = { x: number; y: number; t0: number; power: number };

function createField(n: number, vw: number, vh: number): Field {
  const f32 = () => new Float32Array(n);
  const field: Field = {
    n,
    x: f32(),
    y: f32(),
    vx: f32(),
    vy: f32(),
    gx: f32(),
    gy: f32(),
    ga: f32(),
    gh: f32(),
    tx: f32(),
    ty: f32(),
    ta: f32(),
    th: f32(),
    a: f32(),
    h: f32(),
    r0: f32(),
    r1: f32(),
    r2: f32(),
    r3: f32(),
    size: f32(),
    k: f32(),
    release: f32(),
    gz: f32(),
    gj: f32().fill(1),
    sz: f32(),
    sj: f32().fill(1),
    gc: new Uint8Array(n),
    tc: new Uint8Array(n),
    c: new Uint8Array(n),
    cw: f32(),
    classColors: [],
  };
  for (let i = 0; i < n; i++) {
    field.r0[i] = Math.random();
    field.r1[i] = Math.random();
    field.r2[i] = Math.random();
    field.r3[i] = Math.random();
    field.x[i] = field.tx[i] = field.gx[i] = Math.random() * vw;
    field.y[i] = field.ty[i] = field.gy[i] = Math.random() * vh;
    const s = Math.random();
    field.size[i] = 0.7 + s * s * 1.1;
    field.k[i] = 0.65 + Math.random() * 0.7;
  }
  return field;
}

function particleBudget(vw: number, vh: number) {
  const area = vw * vh;
  return Math.round(clamp(area / 125, 5000, 11000));
}

/**
 * One canvas, one set of particles. Each chapter of the page owns a Scene that
 * tells every particle where to be; scrolling between chapters hands the same
 * dots from one formation to the next.
 */
export class DotEngine {
  private ctx: CanvasRenderingContext2D;
  private field: Field;
  private chapters: Chapter[] = [];
  private active = -1;
  private raf = 0;
  private last = 0;
  private time = 0;
  private dpr = 1;
  private vw = 0;
  private vh = 0;
  private visual: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private pointer: Pointer = { x: -9999, y: -9999, active: false, lastMove: 0 };
  private pulses: Pulse[] = [];
  private palette: Palette;
  private reduced = false;
  private needsLayout = true;
  private order: Int32Array;
  private bucketStart = new Int32Array(ALL_BUCKETS + 1);
  private bucketFill = new Int32Array(ALL_BUCKETS);
  private bucketOf: Uint16Array;
  private disposers: (() => void)[] = [];

  constructor(
    private canvas: HTMLCanvasElement,
    root: HTMLElement,
    scenes: Record<string, () => Scene>,
  ) {
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) throw new Error("Canvas 2D is unavailable");
    this.ctx = ctx;
    this.measure();
    this.field = createField(
      particleBudget(this.vw, this.vh),
      this.vw,
      this.vh,
    );
    this.order = new Int32Array(this.field.n);
    this.bucketOf = new Uint16Array(this.field.n);
    this.palette = this.readPalette();

    for (const el of root.querySelectorAll<HTMLElement>("[data-scene]")) {
      const make = scenes[el.dataset.scene ?? ""];
      if (!make) continue;
      this.chapters.push({
        el,
        scene: make(),
        visual: el.querySelector<HTMLElement>("[data-visual]"),
        progress: 0,
        cssP: "",
        cssVis: "",
      });
    }

    this.listen();
    dots.engine = this;
    // Dots now draw the outlines and covers that CSS drew until this point.
    document.documentElement.classList.add("dots-ready");
    dots.set({ particles: this.field.n });
  }

  start() {
    const loop = (now: number) => {
      this.raf = requestAnimationFrame(loop);
      this.tick(now);
    };
    this.raf = requestAnimationFrame(loop);
    document.fonts?.ready.then(() => this.relayout());
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    for (const dispose of this.disposers) dispose();
    if (dots.engine === this) dots.engine = null;
  }

  relayout() {
    this.needsLayout = true;
  }

  burst(x: number, y: number, power = 1) {
    if (this.reduced) power *= 0.35;
    this.pulses.push({ x, y, t0: this.time, power });
    if (this.pulses.length > 6) this.pulses.shift();
    const f = this.field;
    const radius = 240 * Math.sqrt(power);
    for (let i = 0; i < f.n; i++) {
      const dx = f.x[i] - x;
      const dy = f.y[i] - y;
      const d = Math.hypot(dx, dy);
      if (d > radius || d < 0.01) continue;
      const falloff = (1 - d / radius) ** 1.5;
      const kick = falloff * 26 * power * (0.6 + f.r2[i] * 0.8);
      f.vx[i] += (dx / d) * kick;
      f.vy[i] += (dy / d) * kick;
    }
  }

  private listen() {
    const on = <K extends keyof WindowEventMap>(
      type: K,
      handler: (e: WindowEventMap[K]) => void,
      options?: AddEventListenerOptions,
    ) => {
      window.addEventListener(type, handler, options);
      this.disposers.push(() => window.removeEventListener(type, handler));
    };

    on("resize", () => {
      const { vw, vh } = this;
      this.measure();
      // Mobile toolbars nudge the height while scrolling; only re-plan real resizes.
      if (this.vw !== vw || Math.abs(this.vh - vh) > 140) this.relayout();
    });
    on(
      "pointermove",
      (e) => {
        this.pointer.x = e.clientX;
        this.pointer.y = e.clientY;
        this.pointer.active = true;
        this.pointer.lastMove = this.time;
      },
      { passive: true },
    );
    on("pointerdown", (e) => {
      const target = e.target as Element | null;
      if (target?.closest("a, button, input, textarea, label, select")) return;
      this.burst(e.clientX, e.clientY, e.pointerType === "touch" ? 0.8 : 1);
    });
    on("pointerup", (e) => {
      if (e.pointerType !== "mouse") this.pointer.active = false;
    });
    const leave = () => {
      this.pointer.active = false;
    };
    document.documentElement.addEventListener("pointerleave", leave);
    this.disposers.push(() =>
      document.documentElement.removeEventListener("pointerleave", leave),
    );

    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    this.reduced = motion.matches;
    const onMotion = () => {
      this.reduced = motion.matches;
    };
    motion.addEventListener("change", onMotion);
    this.disposers.push(() => motion.removeEventListener("change", onMotion));

    const observer = new MutationObserver(() => {
      this.palette = this.readPalette();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    this.disposers.push(() => observer.disconnect());
  }

  private measure() {
    this.vw = window.innerWidth;
    this.vh = window.innerHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(this.vw * this.dpr);
    this.canvas.height = Math.round(this.vh * this.dpr);
  }

  private readPalette(): Palette {
    const cs = getComputedStyle(document.documentElement);
    const read = (name: string, fallback: readonly [number, number, number]) =>
      parseColor(cs.getPropertyValue(name), fallback);
    return {
      dot: read("--dot", [236, 232, 225]),
      accent: read("--accent", [226, 88, 58]),
      hot: read("--hot", [255, 72, 30]),
      fg: read("--fg", [236, 232, 225]),
      muted: read("--muted", [140, 136, 130]),
      mono: cs.getPropertyValue("--font-mono").trim() || "monospace",
      ink: document.documentElement.dataset.theme !== "paper",
    };
  }

  /** Reads every chapter's scroll position; returns the one under the fold line. */
  private readScroll() {
    const vh = this.vh;
    const line = vh * 0.5;
    let next = this.active < 0 ? 0 : this.active;
    for (let i = 0; i < this.chapters.length; i++) {
      const c = this.chapters[i];
      const r = c.el.getBoundingClientRect();
      const travel = Math.max(1, r.height - vh);
      c.progress = clamp(-r.top / travel);
      const vis = clamp(
        Math.min((vh - r.top) / (vh * 0.55), r.bottom / (vh * 0.55)),
      );
      const cssP = c.progress.toFixed(3);
      const cssVis = vis.toFixed(3);
      if (cssP !== c.cssP) {
        c.cssP = cssP;
        c.el.style.setProperty("--p", cssP);
      }
      if (cssVis !== c.cssVis) {
        c.cssVis = cssVis;
        c.el.style.setProperty("--vis", cssVis);
      }
      if (r.top <= line && r.bottom > line) next = i;
    }
    return next;
  }

  private frame(dt: number): Frame | null {
    const chapter = this.chapters[this.active];
    if (!chapter) return null;
    const vr = (chapter.visual ?? chapter.el).getBoundingClientRect();
    this.visual.x = vr.left;
    this.visual.y = vr.top;
    this.visual.w = vr.width;
    this.visual.h = vr.height;
    return {
      time: this.time,
      dt,
      vw: this.vw,
      vh: this.vh,
      progress: chapter.progress,
      visual: this.visual,
      section: chapter.el,
      pointer: this.pointer,
      compact: this.vw < COMPACT_BREAKPOINT,
      reduced: this.reduced,
      temperature: dots.getSnapshot().temperature,
    };
  }

  private tick(now: number) {
    const t = now / 1000;
    const dt = this.last ? Math.min(t - this.last, 1 / 20) : 1 / 60;
    this.last = t;
    this.time += dt;

    const next = this.readScroll();
    if (next !== this.active) {
      const prev = this.chapters[this.active];
      this.active = next;
      const fr = this.frame(dt);
      if (prev && fr) prev.scene.leave?.(fr);
      this.needsLayout = true;
      const f = this.field;
      const spread = this.reduced ? 0 : 0.6;
      for (let i = 0; i < f.n; i++) f.release[i] = this.time + f.r3[i] * spread;
      dots.set({ active: next });
    }

    const fr = this.frame(dt);
    if (!fr) return;
    const scene = this.chapters[this.active].scene;
    if (this.needsLayout) {
      this.needsLayout = false;
      scene.layout(this.field, fr);
    }
    this.field.gz.fill(0);
    this.field.gj.fill(1);
    this.field.gc.fill(0);
    scene.update(this.field, fr);
    this.commit();
    this.step(fr);
    this.render(fr, scene);
  }

  /** Copies goals into targets for particles whose stagger delay has passed. */
  private commit() {
    const f = this.field;
    for (let i = 0; i < f.n; i++) {
      if (f.release[i] > this.time) continue;
      f.tx[i] = f.gx[i];
      f.ty[i] = f.gy[i];
      f.ta[i] = f.ga[i];
      f.th[i] = f.gh[i];
      f.sz[i] = f.gz[i];
      f.sj[i] = f.gj[i];
      f.tc[i] = f.gc[i];
    }
  }

  private step(fr: Frame) {
    const f = this.field;
    const scale = fr.dt * 60;
    const damp = 0.84 ** scale;
    const ease = 1 - 0.86 ** scale;
    const T = fr.temperature;
    const reduced = this.reduced;
    const jitter = reduced ? 0 : 0.35 + T * T * 7;
    const time = this.time;
    const stiffness = reduced ? 0.12 : 0.045;

    const p = this.pointer;
    const pr = fr.compact ? 70 : 105;
    const pr2 = pr * pr;
    const pointerOn = p.active && !reduced;

    this.pulses = this.pulses.filter((pulse) => time - pulse.t0 < 1.4);
    const pulses = this.pulses;

    for (let i = 0; i < f.n; i++) {
      const r0 = f.r0[i];
      const r1 = f.r1[i];
      let tx = f.tx[i];
      let ty = f.ty[i];
      if (jitter > 0) {
        const j = jitter * f.sj[i];
        tx += Math.sin(time * (0.6 + r0 * 1.4) + r1 * TAU) * j;
        ty += Math.cos(time * (0.5 + f.r2[i] * 1.2) + f.r3[i] * TAU) * j;
      }
      const x = f.x[i];
      const y = f.y[i];
      const k = stiffness * f.k[i];
      let ax = (tx - x) * k;
      let ay = (ty - y) * k;

      if (pointerOn) {
        const dx = x - p.x;
        const dy = y - p.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < pr2 && d2 > 0.01) {
          const d = Math.sqrt(d2);
          const fall = 1 - d / pr;
          const force = fall * fall * 4.6;
          ax += (dx / d) * force;
          ay += (dy / d) * force;
        }
      }

      for (let j = 0; j < pulses.length; j++) {
        const pulse = pulses[j];
        const age = time - pulse.t0;
        const radius = age * 820;
        const dx = x - pulse.x;
        const dy = y - pulse.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        const band = Math.abs(d - radius);
        if (band < 46) {
          const push = (1 - band / 46) * (1 - age / 1.4) * 2.2 * pulse.power;
          ax += (dx / d) * push;
          ay += (dy / d) * push;
        }
      }

      if (T > 0.55 && !reduced) {
        const kick = (T - 0.55) * 0.9;
        ax += (Math.random() - 0.5) * kick;
        ay += (Math.random() - 0.5) * kick;
      }

      const vx = f.vx[i] * damp + ax * scale;
      const vy = f.vy[i] * damp + ay * scale;
      f.vx[i] = vx;
      f.vy[i] = vy;
      f.x[i] = x + vx * scale;
      f.y[i] = y + vy * scale;
      f.a[i] += (f.ta[i] - f.a[i]) * ease;
      f.h[i] += (f.th[i] - f.h[i]) * ease;
      // Changing class fades the old colour out before the new one fades in.
      const tc = f.tc[i];
      if (tc > 0 && (f.c[i] === 0 || f.cw[i] < 0.2)) f.c[i] = tc;
      f.cw[i] += ((tc > 0 && tc === f.c[i] ? 1 : 0) - f.cw[i]) * ease;
    }
  }

  private render(fr: Frame, scene: Scene) {
    const ctx = this.ctx;
    const f = this.field;
    const dpr = this.dpr;
    const palette = this.palette;
    const T = fr.temperature;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Counting sort particles into colour/alpha buckets so each bucket is one fill.
    const counts = this.bucketFill;
    counts.fill(0);
    const heat = T * T * 1.1;
    for (let i = 0; i < f.n; i++) {
      const a = f.a[i];
      if (
        a < 0.025 ||
        f.x[i] < -4 ||
        f.y[i] < -4 ||
        f.x[i] > fr.vw + 4 ||
        f.y[i] > fr.vh + 4
      ) {
        this.bucketOf[i] = SKIP;
        continue;
      }
      const al = Math.min(ALPHA_LEVELS - 1, Math.floor(a * ALPHA_LEVELS));
      const cl = Math.round(f.cw[i] * (CLASS_LEVELS - 1));
      let b: number;
      if (cl > 0 && f.c[i] > 0 && f.c[i] <= f.classColors.length) {
        b = BUCKETS + ((f.c[i] - 1) * CLASS_LEVELS + cl) * ALPHA_LEVELS + al;
      } else {
        const tint = Math.min(1, f.h[i] + heat * f.r0[i]);
        const tl = Math.round(tint * (TINT_LEVELS - 1));
        b = tl * ALPHA_LEVELS + al;
      }
      this.bucketOf[i] = b;
      counts[b]++;
    }
    const start = this.bucketStart;
    start[0] = 0;
    for (let b = 0; b < ALL_BUCKETS; b++) start[b + 1] = start[b] + counts[b];
    counts.fill(0);
    for (let i = 0; i < f.n; i++) {
      const b = this.bucketOf[i];
      if (b === SKIP) continue;
      this.order[start[b] + counts[b]++] = i;
    }

    const hotShift = T * T * 0.45;
    for (let b = 0; b < ALL_BUCKETS; b++) {
      const from = start[b];
      const to = start[b + 1];
      if (from === to) continue;
      const al = b % ALPHA_LEVELS;
      let color: RGB;
      if (b >= BUCKETS) {
        const slot = Math.floor((b - BUCKETS) / ALPHA_LEVELS);
        const cls = f.classColors[Math.floor(slot / CLASS_LEVELS)];
        color = mix(
          palette.dot,
          cls,
          (slot % CLASS_LEVELS) / (CLASS_LEVELS - 1),
        );
      } else {
        const tl = Math.floor(b / ALPHA_LEVELS);
        color = mix(palette.dot, palette.accent, tl / (TINT_LEVELS - 1));
        if (hotShift > 0.01)
          color = mix(color, palette.hot, hotShift * (tl / (TINT_LEVELS - 1)));
      }
      ctx.fillStyle = rgba(color, (al + 0.6) / ALPHA_LEVELS);
      ctx.beginPath();
      for (let o = from; o < to; o++) {
        const i = this.order[o];
        const s = f.sz[i] || f.size[i];
        ctx.rect(f.x[i] - s / 2, f.y[i] - s / 2, s, s);
      }
      ctx.fill();
    }

    // Shockwave rings.
    for (const pulse of this.pulses) {
      const age = this.time - pulse.t0;
      const life = 1 - age / 1.4;
      if (life <= 0) continue;
      ctx.beginPath();
      ctx.arc(pulse.x, pulse.y, age * 820, 0, TAU);
      ctx.strokeStyle = rgba(palette.accent, 0.28 * life * life);
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    scene.draw?.(ctx, fr, palette);
  }
}
