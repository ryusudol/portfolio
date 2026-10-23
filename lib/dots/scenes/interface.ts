import { DomShapes, dust } from "../shapes";
import type { Field, Frame, Scene } from "../types";

/** How much of the usual shimmer the live card's particles keep. */
const CALM = 0.15;

/**
 * Code first, then screen: particles rough out the code lines, then migrate to
 * trace a live mini app whose controls really drive the page. The live card
 * is for dragging, so its particles hold still and ignore the pointer.
 */
export class InterfaceScene implements Scene {
  private draft = new DomShapes();
  private live = new DomShapes();
  private phase = "";
  private slot: Element | null = null;

  layout(f: Field, fr: Frame) {
    const root = fr.section;
    this.slot = root.querySelector('[data-dots-group="live"]');
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
    const live = phase === "live";
    const group = live ? this.live : this.draft;
    const alpha = live ? 0.9 : 0.6;
    group.refresh();
    for (let i = 0; i < f.n; i++) {
      if (!group.place(f, i, alpha)) dust(f, i, fr, 0.14);
      else if (live) f.gj[i] = CALM;
    }
  }

  repels(fr: Frame) {
    if (this.phase !== "live" || !this.slot) return true;
    const r = this.slot.getBoundingClientRect();
    const { x, y } = fr.pointer;
    return x < r.left || x > r.right || y < r.top || y > r.bottom;
  }
}
