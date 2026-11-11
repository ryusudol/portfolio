import { clamp, mix, parseColor, rgba, TAU } from "./math";
import { dots } from "./runtime";
import { dust } from "./shapes";
import type {
  Entrance,
  Field,
  Frame,
  Palette,
  Pointer,
  Rect,
  RGB,
  Scene,
} from "./types";

const TINT_LEVELS = 6;
const ALPHA_LEVELS = 12;
const BUCKETS = TINT_LEVELS * ALPHA_LEVELS;
const CLASS_LEVELS = 4;
const MAX_CLASSES = 16;
const ALL_BUCKETS = BUCKETS + MAX_CLASSES * CLASS_LEVELS * ALPHA_LEVELS;
const SKIP = 0xffff;
const COMPACT_BREAKPOINT = 900;

/** CSS pixels per pixel of the low-resolution bloom layer. */
const BLOOM_SCALE = 6;
/** Speed (px per 60 Hz frame) above which a dot draws its motion as a streak. */
const STREAK_FROM = 2.6;
/** Frames of travel a streak covers, and its longest length in pixels. */
const SHUTTER = 0.45;
const STREAK_MAX = 15;

/** A dot this close to its new place just moves there; no need to restage it. */
const NEAR = 64;
/** Seconds the old figure gets to fade before the new one starts to build. */
const EXIT = 0.14;
/** Seconds each entrance takes to cover its figure, first dot to last. */
const SPAN: Record<Entrance["kind"], number> = {
  flock: 0.4,
  wipe: 0.46,
  bloom: 0.3,
  rain: 0.5,
  focus: 0.22,
  draw: 0.62,
  cut: 0.26,
};
const FLOCK: Entrance = { kind: "flock" };
const CUT: Entrance = { kind: "cut" };

/** How a dot waits to be restaged: not at all, as part of the figure, or as grain. */
const DIRECT = 0;
const FIGURE = 1;
const GRAIN = 2;

type Chapter = {
  el: HTMLElement;
  scene: Scene;
  entrance: Entrance;
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
    fx: f32(),
    far: new Uint8Array(n),
    loose: new Uint8Array(n),
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
 *
 * The engine owns how the dots feel. Each chapter's figure makes its own
 * entrance (see `Entrance`): the old figure fades where it stands and the new
 * one is built in place, in the order it is read. Only the hero's dots flock
 * across the stage. A fast dot draws its speed as a streak and glints once as
 * it lands. Accent-tinted dots bleed a soft bloom, so whatever a scene marks
 * as "now" is also the brightest thing on screen. The pointer drags a wake
 * through them.
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
  private scroll = 0;
  private scrollDown = true;
  /** When the dots last flocked from one chapter to the next. */
  private flockAt = -100;
  /** Ticks until the current scene's figure is staged (0 = nothing pending). */
  private staging = 0;
  /** The entrance being played, and whether it follows another chapter. */
  private entrance: Entrance = CUT;
  private sweep = false;
  /** How each dot is waiting to make its entrance (DIRECT, FIGURE or GRAIN). */
  private staged: Uint8Array;
  private visual: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private pointer: Pointer = {
    x: -9999,
    y: -9999,
    active: false,
    lastMove: 0,
    vx: 0,
    vy: 0,
  };
  private pointerLast = { x: -9999, y: -9999 };
  private pulses: Pulse[] = [];
  private palette: Palette;
  private reduced = false;
  private needsLayout = true;
  private order: Int32Array;
  private bucketStart = new Int32Array(ALL_BUCKETS + 1);
  private bucketFill = new Int32Array(ALL_BUCKETS);
  private bucketOf: Uint16Array;
  /** Which dots draw a streak this frame, and how many per bucket. */
  private streaked: Uint8Array;
  /** How much of its brightness each dot keeps while in flight (1 = settled). */
  private lit: Float32Array;
  private bucketStreaks = new Int32Array(ALL_BUCKETS);
  private bloom: HTMLCanvasElement;
  private bloomWide: HTMLCanvasElement;
  private disposers: (() => void)[] = [];

  constructor(
    private canvas: HTMLCanvasElement,
    root: HTMLElement,
    scenes: Record<string, () => Scene>,
    entrances: Record<string, Entrance> = {},
  ) {
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) throw new Error("Canvas 2D is unavailable");
    this.ctx = ctx;
    this.bloom = document.createElement("canvas");
    this.bloomWide = document.createElement("canvas");
    this.measure();
    this.field = createField(
      particleBudget(this.vw, this.vh),
      this.vw,
      this.vh,
    );
    this.order = new Int32Array(this.field.n);
    this.bucketOf = new Uint16Array(this.field.n);
    this.streaked = new Uint8Array(this.field.n);
    this.lit = new Float32Array(this.field.n).fill(1);
    this.staged = new Uint8Array(this.field.n);
    this.palette = this.readPalette();
    this.scroll = window.scrollY;

    for (const el of root.querySelectorAll<HTMLElement>("[data-scene]")) {
      const make = scenes[el.dataset.scene ?? ""];
      if (!make) continue;
      this.chapters.push({
        el,
        scene: make(),
        entrance: entrances[el.dataset.scene ?? ""] ?? CUT,
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
    // A newer engine may already own the page; leave its state alone.
    if (dots.engine !== this) return;
    dots.engine = null;
    dots.reset();
    document.documentElement.classList.remove("dots-ready");
  }

  relayout() {
    this.needsLayout = true;
  }

  /** Plays the current chapter's entrance again, for a figure that just loaded. */
  restage() {
    if (this.active < 0 || this.staging > 0) return;
    const mine = this.chapters[this.active].entrance;
    // The hero's flock is for arriving, not for a portrait that loads late.
    if (mine.kind === "flock") return;
    // Still flocking in from the hero: let the figure join the flock.
    this.entrance = this.time - this.flockAt < 1.6 ? FLOCK : mine;
    this.sweep = true;
    this.staging = 1;
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
    this.bloom.width = Math.ceil(this.vw / BLOOM_SCALE) + 2;
    this.bloom.height = Math.ceil(this.vh / BLOOM_SCALE) + 2;
    this.bloomWide.width = Math.ceil(this.bloom.width / 2);
    this.bloomWide.height = Math.ceil(this.bloom.height / 2);
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
      bg: read("--bg", [19, 19, 18]),
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
      scroll: this.scroll,
      visual: this.visual,
      section: chapter.el,
      pointer: this.pointer,
      compact: this.vw < COMPACT_BREAKPOINT,
      reduced: this.reduced,
      temperature: dots.getSnapshot().temperature,
    };
  }

  /** Smooths the pointer's velocity, which the wake it drags is built from. */
  private trackPointer(scale: number) {
    const p = this.pointer;
    const last = this.pointerLast;
    const fresh = p.active && last.x > -9000;
    const vx = fresh ? clamp((p.x - last.x) / scale, -26, 26) : 0;
    const vy = fresh ? clamp((p.y - last.y) / scale, -26, 26) : 0;
    const ease = 1 - 0.7 ** scale;
    p.vx += (vx - p.vx) * ease;
    p.vy += (vy - p.vy) * ease;
    last.x = p.active ? p.x : -9999;
    last.y = p.active ? p.y : -9999;
  }

  private tick(now: number) {
    const t = now / 1000;
    const dt = this.last ? Math.min(t - this.last, 1 / 20) : 1 / 60;
    this.last = t;
    this.time += dt;

    const scroll = window.scrollY;
    if (scroll !== this.scroll) this.scrollDown = scroll > this.scroll;
    this.scroll = scroll;
    this.trackPointer(dt * 60);

    const next = this.readScroll();
    if (next !== this.active) {
      const prev = this.chapters[this.active];
      this.active = next;
      const fr = this.frame(dt);
      if (prev && fr) prev.scene.leave?.(fr);
      if (!prev && fr) this.settle(fr);
      this.needsLayout = true;
      // Leaving the hero flocks too, so its dust wheels into what follows.
      const mine = this.chapters[next].entrance;
      const flock = mine.kind === "flock" || prev?.entrance.kind === "flock";
      this.entrance = flock ? FLOCK : mine;
      this.sweep = Boolean(prev);
      // Staged a tick late: a scene that reads cached data in `layout` only
      // has it once this tick's promises have run. Until then nothing moves.
      this.staging = 2;
      this.field.release.fill(Number.POSITIVE_INFINITY);
      this.staged.fill(DIRECT);
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
    this.field.loose.fill(0);
    scene.update(this.field, fr);
    if (this.staging > 0 && --this.staging === 0) this.handOff(fr);
    this.commit(fr);
    this.step(fr, scene.repels?.(fr) ?? true);
    this.render(fr, scene);
  }

  /**
   * The page opens on still grain: every dot starts where it would rest as
   * dust, so the first thing that moves is the first scene drawing itself.
   */
  private settle(fr: Frame) {
    const f = this.field;
    for (let i = 0; i < f.n; i++) {
      dust(f, i, fr, 0);
      f.x[i] = f.tx[i] = f.gx[i];
      f.y[i] = f.ty[i] = f.gy[i];
    }
  }

  /**
   * Decides when, and from where, each dot takes up the scene's goal. A dot
   * already near its new place simply goes. Every other dot fades out where
   * it is, then reappears to make the chapter's entrance, timed by where it
   * falls in the figure, so the figure is built in the order it is read.
   */
  private handOff(fr: Frame) {
    const f = this.field;
    const now = this.time;
    const staged = this.staged;
    staged.fill(DIRECT);
    if (this.reduced) {
      f.release.fill(now);
      return;
    }
    const entrance = this.entrance;
    if (entrance.kind === "flock") {
      // Dots let go in a wave from the edge the page is scrolling toward.
      this.flockAt = now;
      const vh = Math.max(1, this.vh);
      for (let i = 0; i < f.n; i++) {
        let delay = f.r3[i] * 0.6;
        if (this.sweep) {
          const u = clamp(f.y[i] / vh);
          delay = (this.scrollDown ? 1 - u : u) * SPAN.flock + f.r3[i] * 0.24;
        }
        f.release[i] = now + delay;
      }
      return;
    }

    const key = this.orderOf(entrance, fr);
    let lo = Number.POSITIVE_INFINITY;
    let hi = Number.NEGATIVE_INFINITY;
    for (let i = 0; i < f.n; i++) {
      const dx = f.gx[i] - f.x[i];
      const dy = f.gy[i] - f.y[i];
      const hidden = f.ga[i] < 0.03 && f.a[i] < 0.03;
      if (hidden || dx * dx + dy * dy < NEAR * NEAR) continue;
      if (f.loose[i] === 1 || f.ga[i] < 0.03) {
        staged[i] = GRAIN;
        continue;
      }
      staged[i] = FIGURE;
      const k = key(i);
      if (k < lo) lo = k;
      if (k > hi) hi = k;
    }
    const range = hi > lo ? hi - lo : 1;
    const span = SPAN[entrance.kind];
    for (let i = 0; i < f.n; i++) {
      const mode = staged[i];
      if (mode === DIRECT) {
        f.release[i] = now + f.r3[i] * 0.12;
      } else if (mode === GRAIN) {
        f.release[i] = now + EXIT + f.r3[i] * span;
      } else {
        const order = (key(i) - lo) / range;
        f.release[i] = now + EXIT + order * span + f.r3[i] * 0.07;
      }
    }
  }

  /** Where a dot falls in the order an entrance builds its figure (any scale). */
  private orderOf(entrance: Entrance, fr: Frame): (i: number) => number {
    const f = this.field;
    switch (entrance.kind) {
      case "wipe": {
        const a = (entrance.angle * Math.PI) / 180;
        const cos = Math.cos(a);
        const sin = Math.sin(a);
        return (i) => f.gx[i] * cos + f.gy[i] * sin;
      }
      case "bloom": {
        const [ox, oy] = this.originOf(entrance, fr);
        return (i) => Math.hypot(f.gx[i] - ox, f.gy[i] - oy);
      }
      case "rain":
        // Column by column, each a little ragged, lower dots landing first.
        return (i) => f.gx[i] - f.gy[i] * 0.12;
      case "draw":
        return (i) => f.r0[i];
      default:
        return (i) => f.r1[i];
    }
  }

  private originOf(entrance: Entrance, fr: Frame): [number, number] {
    const at = entrance.kind === "bloom" ? entrance.at : undefined;
    return [
      fr.visual.x + fr.visual.w * (at?.[0] ?? 0.5),
      fr.visual.y + fr.visual.h * (at?.[1] ?? 0.5),
    ];
  }

  /** Puts a dot where its entrance starts, unseen, just before it is released. */
  private enter(i: number, fr: Frame) {
    const f = this.field;
    const entrance = this.entrance;
    const gx = f.gx[i];
    const gy = f.gy[i];
    let x = gx;
    let y = gy;
    const vx = 0;
    let vy = 0;
    if (this.staged[i] === FIGURE) {
      switch (entrance.kind) {
        case "wipe": {
          // Slides in the last few pixels along the wipe.
          const a = (entrance.angle * Math.PI) / 180;
          const slide = 12 + f.r2[i] * 20;
          x -= Math.cos(a) * slide;
          y -= Math.sin(a) * slide;
          break;
        }
        case "bloom": {
          const [ox, oy] = this.originOf(entrance, fr);
          x = ox + (gx - ox) * 0.3;
          y = oy + (gy - oy) * 0.3;
          break;
        }
        case "rain":
          y -= 56 + f.r2[i] * 80;
          vy = 5;
          break;
        case "focus": {
          const r = 22 + f.r2[i] * 46;
          x += Math.cos(f.r1[i] * TAU) * r;
          y += Math.sin(f.r1[i] * TAU) * r;
          break;
        }
        default:
          break;
      }
    }
    f.x[i] = x;
    f.y[i] = y;
    f.vx[i] = vx;
    f.vy[i] = vy;
    f.a[i] = 0;
    f.h[i] = f.gh[i];
    f.c[i] = 0;
    f.cw[i] = 0;
    f.far[i] = 0;
    this.lit[i] = 1;
  }

  /**
   * Copies goals into targets for dots whose turn has come. A dot still
   * waiting to make its entrance holds its place and fades.
   */
  private commit(fr: Frame) {
    const f = this.field;
    const staged = this.staged;
    for (let i = 0; i < f.n; i++) {
      if (f.release[i] > this.time) {
        if (staged[i] !== DIRECT) f.ta[i] = 0;
        continue;
      }
      if (staged[i] !== DIRECT) {
        this.enter(i, fr);
        staged[i] = DIRECT;
      }
      f.tx[i] = f.gx[i];
      f.ty[i] = f.gy[i];
      f.ta[i] = f.ga[i];
      f.th[i] = f.gh[i];
      f.sz[i] = f.gz[i];
      f.sj[i] = f.gj[i];
      f.tc[i] = f.gc[i];
    }
  }

  private step(fr: Frame, repel: boolean) {
    const f = this.field;
    const scale = fr.dt * 60;
    const damp = 0.84 ** scale;
    const ease = 1 - 0.86 ** scale;
    const cool = 0.935 ** scale;
    const T = fr.temperature;
    const reduced = this.reduced;
    const jitter = reduced ? 0 : 0.35 + T * T * 7;
    const time = this.time;
    const stiffness = reduced ? 0.12 : 0.045;

    const p = this.pointer;
    const pr = fr.compact ? 70 : 105;
    const pr2 = pr * pr;
    const pointerOn = p.active && !reduced && repel;
    const pvx = p.vx;
    const pvy = p.vy;

    this.pulses = this.pulses.filter((pulse) => time - pulse.t0 < 1.4);
    const pulses = this.pulses;

    // The current a dot in flight rides: three slow waves, turning over time.
    const ft1 = time * 0.23;
    const ft2 = time * 0.19;
    const ft3 = time * 0.13;
    // The eye of the vortex dots wheel round in flight, turning with the scroll.
    const eyeX = fr.visual.x + fr.visual.w / 2;
    const eyeY = clamp(fr.visual.y + fr.visual.h / 2, 0, fr.vh);
    const spin = this.scrollDown ? 1 : -1;
    const sinceFlock = time - this.flockAt;
    const handoff =
      sinceFlock > 1.6
        ? 0
        : sinceFlock < 0.8
          ? 1
          : 1 - (sinceFlock - 0.8) / 0.8;

    for (let i = 0; i < f.n; i++) {
      const r0 = f.r0[i];
      const r1 = f.r1[i];
      let tx = f.tx[i];
      let ty = f.ty[i];
      const x = f.x[i];
      const y = f.y[i];
      const gapX = tx - x;
      const gapY = ty - y;
      const gap2 = gapX * gapX + gapY * gapY;
      if (jitter > 0) {
        const j = jitter * f.sj[i];
        tx += Math.sin(time * (0.6 + r0 * 1.4) + r1 * TAU) * j;
        ty += Math.cos(time * (0.5 + f.r2[i] * 1.2) + f.r3[i] * TAU) * j;
      }
      const k = stiffness * f.k[i];
      let ax = (tx - x) * k;
      let ay = (ty - y) * k;

      if (gap2 > 400 && !reduced) {
        const gap = Math.sqrt(gap2);
        if (handoff > 0) {
          // The hero's flock: instead of flying straight, each dot is carried
          // round the stage by a slow vortex and nudged by the current. Both
          // pushes scale with the distance left, so paths wheel wide early
          // and land true, and the whole swarm turns together. Everywhere
          // else dots go straight, so the eye can track where each ends up.
          const w = gap > 150 ? 1 : (gap - 20) / 130;
          const angle =
            (Math.sin(x * 0.0041 + ft1) +
              Math.sin(y * 0.0053 - ft2) +
              Math.sin((x - y) * 0.0029 + ft3 + r0 * 0.7)) *
            1.9;
          const push = k * gap * w * w * handoff;
          const ox = x - eyeX;
          const oy = y - eyeY;
          const or = Math.sqrt(ox * ox + oy * oy) + 40;
          const wheel = (push * 0.46 * spin) / or;
          ax += Math.cos(angle) * push * 0.2 - oy * wheel;
          ay += Math.sin(angle) * push * 0.2 + ox * wheel;
        }
        if (gap > 110) f.far[i] = 1;
        // A dot in flight is a ghost of itself; it brightens as it nears
        // home. Fainter still while the swarm flocks.
        const ghost = 0.4 + 0.32 * handoff;
        this.lit[i] =
          gap > 280 ? 1 - ghost : 1 - ghost * ((gap - 20) / 260) ** 0.7;
      } else {
        this.lit[i] = 1;
      }
      if (f.far[i] === 1 && gap2 < 64) {
        f.far[i] = 0;
        if (f.ta[i] > 0.12) f.fx[i] = Math.max(f.fx[i], 0.5 + f.r2[i] * 0.3);
      }

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
          // A moving pointer drags the dots it passes and curls them round
          // behind it, like a hand through water.
          const side = pvx * dy - pvy * dx > 0 ? 1 : -1;
          const swirl = fall * fall * 0.11 * side;
          ax += pvx * fall * 0.2 - pvy * swirl;
          ay += pvy * fall * 0.2 + pvx * swirl;
          // And it carries a little light: what it touches brightens.
          const glow = fall * 0.32;
          if (glow > f.fx[i]) f.fx[i] = glow;
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
          const edge = (1 - band / 46) * (1 - age / 1.4);
          const push = edge * 2.2 * pulse.power;
          ax += (dx / d) * push;
          ay += (dy / d) * push;
          // The wave lights what it crosses.
          const lit = edge * 0.9;
          if (lit > f.fx[i]) f.fx[i] = lit;
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
      f.fx[i] *= cool;
      // Changing class fades the old color out before the new one fades in.
      const tc = f.tc[i];
      if (tc > 0 && (f.c[i] === 0 || f.cw[i] < 0.2)) f.c[i] = tc;
      f.cw[i] += ((tc > 0 && tc === f.c[i] ? 1 : 0) - f.cw[i]) * ease;
    }
  }

  private bucketColor(b: number, hotShift: number): RGB {
    const f = this.field;
    const palette = this.palette;
    if (b >= BUCKETS) {
      const slot = Math.floor((b - BUCKETS) / ALPHA_LEVELS);
      const cls = f.classColors[Math.floor(slot / CLASS_LEVELS)];
      return mix(palette.dot, cls, (slot % CLASS_LEVELS) / (CLASS_LEVELS - 1));
    }
    const tl = Math.floor(b / ALPHA_LEVELS);
    const color = mix(palette.dot, palette.accent, tl / (TINT_LEVELS - 1));
    if (hotShift > 0.01)
      return mix(color, palette.hot, hotShift * (tl / (TINT_LEVELS - 1)));
    return color;
  }

  /**
   * Accent-tinted dots, drawn small and blurred back up underneath the sharp
   * ones: a soft light around whatever a scene has marked as current. Only
   * the part of the screen that holds lit dots is touched.
   */
  private drawBloom(hotShift: number) {
    const f = this.field;
    const start = this.bucketStart;
    const tight = this.bloom;
    const g = tight.getContext("2d");
    if (!g) return;
    const s = 1 / BLOOM_SCALE;
    let lit = false;
    let x0 = 1e9;
    let y0 = 1e9;
    let x1 = -1e9;
    let y1 = -1e9;
    for (let tl = 2; tl < TINT_LEVELS; tl++) {
      const weight = (tl - 1) / (TINT_LEVELS - 2);
      for (let al = 2; al < ALPHA_LEVELS; al++) {
        const b = tl * ALPHA_LEVELS + al;
        const from = start[b];
        const to = start[b + 1];
        if (from === to) continue;
        if (!lit) {
          lit = true;
          g.clearRect(0, 0, tight.width, tight.height);
        }
        // Faint per dot, so a lone tinted dot barely registers and it takes
        // a dense stroke or fill to build up to a glow.
        g.fillStyle = rgba(
          this.bucketColor(b, hotShift),
          Math.min(1, ((al + 0.6) / ALPHA_LEVELS) * weight * 0.36),
        );
        g.beginPath();
        for (let o = from; o < to; o++) {
          const i = this.order[o];
          const x = f.x[i] * s;
          const y = f.y[i] * s;
          const size = 1.05 + f.fx[i] * 0.5;
          g.rect(x - size / 2, y - size / 2, size, size);
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
        g.fill();
      }
    }
    if (!lit) return;

    // The lit region in bloom pixels, padded for the blur and kept even so
    // the half-size copy lines up.
    const left = Math.max(0, (Math.floor(x0) - 4) & ~1);
    const top = Math.max(0, (Math.floor(y0) - 4) & ~1);
    const right = Math.min(tight.width, (Math.ceil(x1) + 5) & ~1);
    const bottom = Math.min(tight.height, (Math.ceil(y1) + 5) & ~1);
    const w = right - left;
    const h = bottom - top;
    if (w < 2 || h < 2) return;

    // Squaring the coverage finishes the job: sparse specks fall away while
    // anything dense stays near full strength.
    const square = (
      c: CanvasRenderingContext2D,
      canvas: HTMLCanvasElement,
      x: number,
      y: number,
      cw: number,
      ch: number,
    ) => {
      c.globalCompositeOperation = "destination-in";
      c.drawImage(canvas, x, y, cw, ch, x, y, cw, ch);
      c.globalCompositeOperation = "source-over";
    };
    const wide = this.bloomWide;
    const gw = wide.getContext("2d");
    const ctx = this.ctx;
    const strength = this.palette.ink ? 1 : 0.66;
    const S = BLOOM_SCALE;
    ctx.save();
    // Plain bilinear smoothing on purpose: "high" quality costs tens of
    // milliseconds a frame for a blit this size when the canvas isn't on the
    // GPU, and two stacked octaves already hide the difference.
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "low";
    if (gw) {
      const hx = left / 2;
      const hy = top / 2;
      const hw = w / 2;
      const hh = h / 2;
      gw.clearRect(hx, hy, hw, hh);
      gw.imageSmoothingEnabled = true;
      gw.drawImage(tight, left, top, w, h, hx, hy, hw, hh);
      square(gw, wide, hx, hy, hw, hh);
      ctx.globalAlpha = strength;
      ctx.drawImage(wide, hx, hy, hw, hh, left * S, top * S, w * S, h * S);
    }
    square(g, tight, left, top, w, h);
    ctx.globalAlpha = 0.8 * strength;
    ctx.drawImage(tight, left, top, w, h, left * S, top * S, w * S, h * S);
    ctx.restore();
  }

  private render(fr: Frame, scene: Scene) {
    const ctx = this.ctx;
    const f = this.field;
    const dpr = this.dpr;
    const palette = this.palette;
    const T = fr.temperature;
    const time = this.time;
    const moving = !this.reduced;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Counting sort particles into color/alpha buckets so each bucket is one fill.
    const counts = this.bucketFill;
    const streaks = this.bucketStreaks;
    counts.fill(0);
    streaks.fill(0);
    const heat = T * T * 1.1;
    const streakFrom2 = STREAK_FROM * STREAK_FROM;
    for (let i = 0; i < f.n; i++) {
      let a = f.a[i];
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
      // Each dot breathes on its own slow clock, and brightens while excited.
      if (moving)
        a *=
          1 +
          0.13 *
            f.sj[i] *
            Math.sin(time * (0.7 + f.r1[i] * 1.7) + f.r0[i] * TAU);
      a *= (1 + f.fx[i] * 0.9) * this.lit[i];
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
      const fast =
        moving && f.vx[i] * f.vx[i] + f.vy[i] * f.vy[i] > streakFrom2 ? 1 : 0;
      this.streaked[i] = fast;
      streaks[b] += fast;
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
    this.drawBloom(hotShift);

    ctx.lineCap = "butt";
    for (let b = 0; b < ALL_BUCKETS; b++) {
      const from = start[b];
      const to = start[b + 1];
      if (from === to) continue;
      const al = b % ALPHA_LEVELS;
      const color = this.bucketColor(b, hotShift);
      const alpha = (al + 0.6) / ALPHA_LEVELS;

      if (streaks[b] > 0) {
        // Motion blur: the path each fast dot covered while the shutter was
        // open, fainter the longer it is.
        ctx.strokeStyle = rgba(color, alpha * 0.27);
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let o = from; o < to; o++) {
          const i = this.order[o];
          if (this.streaked[i] === 0) continue;
          const vx = f.vx[i];
          const vy = f.vy[i];
          const speed = Math.sqrt(vx * vx + vy * vy);
          const len = Math.min(STREAK_MAX, (speed - STREAK_FROM) * SHUTTER);
          const u = len / speed;
          ctx.moveTo(f.x[i], f.y[i]);
          ctx.lineTo(f.x[i] - vx * u, f.y[i] - vy * u);
        }
        ctx.stroke();
      }

      ctx.fillStyle = rgba(color, alpha);
      ctx.beginPath();
      for (let o = from; o < to; o++) {
        const i = this.order[o];
        const s = (f.sz[i] || f.size[i]) * (1 + f.fx[i] * 0.55);
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
