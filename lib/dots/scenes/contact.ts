import { DomShapes, dust } from "../shapes";
import type { Field, Frame, Scene } from "../types";

/** The closing prompt: dots trace a real input you can write into. */
export class ContactScene implements Scene {
  private shapes = new DomShapes();

  layout(f: Field, fr: Frame) {
    this.shapes.collect(fr.section).allocate(0, Math.round(f.n * 0.5));
  }

  update(f: Field, fr: Frame) {
    this.shapes.refresh();
    for (let i = 0; i < f.n; i++) {
      if (!this.shapes.place(f, i, 0.9)) dust(f, i, fr, 0.16);
    }
  }
}
