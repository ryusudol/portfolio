export type RGB = readonly [number, number, number];

export type Rect = { x: number; y: number; w: number; h: number };

export type Palette = {
  dot: RGB;
  accent: RGB;
  hot: RGB;
  fg: RGB;
  /** The page background, for cards drawn over the dots. */
  bg: RGB;
  muted: RGB;
  /** Resolved monospace font-family for canvas labels. */
  mono: string;
  ink: boolean;
};

/**
 * Structure-of-arrays particle buffers. Scenes write *goals* (g*); the engine
 * commits goals to targets (t*) once a particle's stagger delay has elapsed,
 * then springs positions toward targets and eases alpha/tint.
 */
export type Field = {
  n: number;
  x: Float32Array;
  y: Float32Array;
  vx: Float32Array;
  vy: Float32Array;
  gx: Float32Array;
  gy: Float32Array;
  ga: Float32Array;
  gh: Float32Array;
  tx: Float32Array;
  ty: Float32Array;
  ta: Float32Array;
  th: Float32Array;
  a: Float32Array;
  h: Float32Array;
  /** Stable per-particle random seeds in [0, 1). */
  r0: Float32Array;
  r1: Float32Array;
  r2: Float32Array;
  r3: Float32Array;
  size: Float32Array;
  /**
   * Per-frame overrides a scene may set (reset every frame): a fixed dot
   * size (0 = the particle's own) and a drift multiplier (1 = normal). Used
   * where exact placement matters, like a stippled portrait.
   */
  gz: Float32Array;
  gj: Float32Array;
  sz: Float32Array;
  sj: Float32Array;
  /**
   * Categorical color: a scene sets `gc` (1-based index into `classColors`,
   * 0 = none; reset every frame). `c` is the class being shown and `cw` its
   * strength, so colors fade out, and cross-fade when a particle changes class.
   */
  gc: Uint8Array;
  tc: Uint8Array;
  c: Uint8Array;
  cw: Float32Array;
  classColors: RGB[];
  k: Float32Array;
  release: Float32Array;
  /**
   * Excitement, 0..1: a short glint the engine sets when a particle lands
   * after a long flight or a shockwave passes, then lets decay. Drawn as a
   * brighter, slightly larger dot.
   */
  fx: Float32Array;
  /** Set while a particle is far from its target, so its landing can glint. */
  far: Uint8Array;
  /**
   * Set by `dust` each frame (reset every frame): this particle is spare
   * grain, not part of the scene's figure.
   */
  loose: Uint8Array;
};

/**
 * How a chapter's figure arrives when the page scrolls to it. Each is a way
 * of building the figure where it stands: the old one fades out in place and
 * no dot crosses the screen, except in `flock`.
 *
 * - `flock`: the whole swarm wheels round the stage and lands. The one loud
 *   entrance, kept for the hero.
 * - `wipe`: laid down by a front moving at `angle` (degrees; 0 is left to
 *   right, 90 top to bottom, -90 bottom to top), the way a plotter draws.
 * - `bloom`: opens outward from a point (`at`, in fractions of the stage,
 *   default its center).
 * - `rain`: drops into place from above, column after column.
 * - `focus`: resolves from a soft blur around each dot's place.
 * - `draw`: traced along each outline in order, like a pen.
 * - `cut`: dissolves in where it stands.
 */
export type Entrance =
  | { kind: "flock" }
  | { kind: "wipe"; angle: number }
  | { kind: "bloom"; at?: readonly [number, number] }
  | { kind: "rain" }
  | { kind: "focus" }
  | { kind: "draw" }
  | { kind: "cut" };

export type Pointer = {
  x: number;
  y: number;
  active: boolean;
  lastMove: number;
  /** Smoothed velocity, in pixels per 60 Hz frame. */
  vx: number;
  vy: number;
};

export type Frame = {
  time: number;
  dt: number;
  vw: number;
  vh: number;
  progress: number;
  /** The page's scroll offset, for anything that should drift past as it moves. */
  scroll: number;
  visual: Rect;
  section: HTMLElement;
  pointer: Pointer;
  compact: boolean;
  reduced: boolean;
  temperature: number;
};

export interface Scene {
  /** Runs when the scene becomes active and whenever the viewport changes. */
  layout(field: Field, frame: Frame): void;
  /** Runs every frame while active; writes goals for every particle. */
  update(field: Field, frame: Frame): void;
  /** Optional overlay (glows, labels) drawn on top of the particles. */
  draw?(ctx: CanvasRenderingContext2D, frame: Frame, palette: Palette): void;
  /**
   * Whether the pointer pushes particles aside this frame (default true).
   * Scenes return false over a chart the visitor is reading by hovering.
   */
  repels?(frame: Frame): boolean;
  /** Runs when another scene takes over. */
  leave?(frame: Frame): void;
}
