import { DomShapes, dust } from "../shapes";
import type { Field, Frame, Scene } from "../types";

type Options = {
  /** Share of all particles that trace the section's `data-dots` shapes. */
  share: number;
  alpha?: number;
  /**
   * Reveal `data-stage` groups one after another as the section scrolls, so
   * the drawing assembles piece by piece.
   */
  stages?: number;
};

/** Traces whatever the section's markup tags with `data-dots`. */
export class ShapesScene implements Scene {
  private shapes = new DomShapes();
  private built = -1;

  constructor(private options: Options) {}

  layout(f: Field, fr: Frame) {
    this.shapes
      .collect(fr.section)
      .allocate(0, Math.round(f.n * this.options.share));
    this.built = -1;
  }

  private reveal(fr: Frame) {
    const stages = this.options.stages;
    if (!stages) return;
    const built = fr.reduced
      ? stages - 1
      : Math.min(stages - 1, Math.floor(fr.progress / 0.09));
    if (built === this.built) return;
    this.built = built;
    this.shapes.stage = built;
    for (const el of fr.section.querySelectorAll<HTMLElement>("[data-stage]")) {
      el.classList.toggle("is-built", Number(el.dataset.stage) <= built);
    }
  }

  update(f: Field, fr: Frame) {
    this.reveal(fr);
    this.shapes.refresh();
    const alpha = this.options.alpha ?? 0.9;
    for (let i = 0; i < f.n; i++) {
      if (!this.shapes.place(f, i, alpha)) dust(f, i, fr, 0.15);
    }
  }
}
