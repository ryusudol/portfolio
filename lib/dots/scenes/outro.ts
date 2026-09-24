import { dust } from "../shapes";
import type { Field, Frame, Scene } from "../types";

/** A resting state: every particle settles back into drifting grain. */
export class OutroScene implements Scene {
  layout() {}

  update(f: Field, fr: Frame) {
    for (let i = 0; i < f.n; i++) dust(f, i, fr, 0.22);
  }
}
