export type RGB = readonly [number, number, number];

export type Rect = { x: number; y: number; w: number; h: number };

export type Palette = {
  dot: RGB;
  accent: RGB;
  hot: RGB;
  fg: RGB;
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
   * Categorical colour: a scene sets `gc` (1-based index into `classColors`,
   * 0 = none; reset every frame). `c` is the class being shown and `cw` its
   * strength, so colours fade out, and cross-fade when a particle changes class.
   */
  gc: Uint8Array;
  tc: Uint8Array;
  c: Uint8Array;
  cw: Float32Array;
  classColors: RGB[];
  k: Float32Array;
  release: Float32Array;
};

export type Pointer = {
  x: number;
  y: number;
  active: boolean;
  lastMove: number;
};

export type Frame = {
  time: number;
  dt: number;
  vw: number;
  vh: number;
  progress: number;
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
  /** Runs when another scene takes over. */
  leave?(frame: Frame): void;
}
