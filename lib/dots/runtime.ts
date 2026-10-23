import type { Operator } from "@/lib/content";

export type RequestStats = {
  emitted: number;
  completed: number;
  dropped: number;
  inFlight: number;
};

export type DotsSnapshot = {
  /** Index of the chapter currently driving the particles. */
  active: number;
  operator: Operator;
  temperature: number;
  stats: RequestStats;
  particles: number;
};

type EngineCommands = {
  burst(x: number, y: number, power?: number): void;
};

const initial: DotsSnapshot = {
  active: 0,
  operator: "switchMap",
  temperature: 0.3,
  stats: { emitted: 0, completed: 0, dropped: 0, inFlight: 0 },
  particles: 0,
};

/**
 * A tiny external store shared by the canvas engine and React islands.
 * React reads it with useSyncExternalStore; the engine reads it every frame.
 */
class DotsRuntime {
  private snapshot: DotsSnapshot = initial;
  private listeners = new Set<() => void>();
  engine: EngineCommands | null = null;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = () => this.snapshot;

  getServerSnapshot = () => initial;

  set(patch: Partial<DotsSnapshot>) {
    let changed = false;
    for (const key of Object.keys(patch) as (keyof DotsSnapshot)[]) {
      if (this.snapshot[key] !== patch[key]) changed = true;
    }
    if (!changed) return;
    this.snapshot = { ...this.snapshot, ...patch };
    for (const listener of this.listeners) listener();
  }

  /** Back to the page-load state, so one page's readouts don't reach the next. */
  reset() {
    this.set(initial);
  }

  setOperator(operator: Operator) {
    this.set({ operator });
  }

  setTemperature(temperature: number) {
    this.set({ temperature });
  }

  /** Radial shockwave; defaults to the viewport center. */
  burst(x?: number, y?: number, power = 1) {
    this.engine?.burst(
      x ?? window.innerWidth / 2,
      y ?? window.innerHeight / 2,
      power,
    );
  }
}

export const dots = new DotsRuntime();
