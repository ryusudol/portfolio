import { DomShapes, dust } from "../shapes";
import type { Field, Frame, Scene } from "../types";

/**
 * Code first, then screen: particles rough out the code lines, then migrate to
 * trace a live mini app whose controls really drive the page.
 */
export class InterfaceScene implements Scene {
  private draft = new DomShapes();
  private live = new DomShapes();
  private phase = "";

  layout(f: Field, fr: Frame) {
    const root = fr.section;
    this.draft
      .collect(root, '[data-dots-group="draft"] [data-dots]')
      .allocate(0, Math.round(f.n * 0.45));
    this.live
      .collect(root, '[data-dots-group="live"] [data-dots]')
      .allocate(0, Math.round(f.n * 0.6));
  }

  update(f: Field, fr: Frame) {
    const hasDraft = this.draft.owner.some((o) => o >= 0);
    const phase = hasDraft && fr.progress < 0.28 ? "draft" : "live";
    if (phase !== this.phase) {
      this.phase = phase;
      fr.section.dataset.phase = phase;
    }
    const group = phase === "draft" ? this.draft : this.live;
    const alpha = phase === "draft" ? 0.6 : 0.9;
    group.refresh();
    for (let i = 0; i < f.n; i++) {
      if (!group.place(f, i, alpha)) dust(f, i, fr, 0.14);
    }
  }
}
