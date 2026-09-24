import { clamp, smoothstep, TAU } from "../math";
import { DomShapes, dust } from "../shapes";
import type { Field, Frame, Scene } from "../types";

const FOLDS = 7;
/** Vertical threads per panel; dots on a thread read as woven cloth. */
const THREADS = 52;
const PAD = 18;

/**
 * A stage curtain of dots over whatever the section tags `data-dots-curtain`.
 * Scrolling parts it: each half gathers toward its side in deepening folds,
 * then the gathered cloth comes apart and drifts off, uncovering the cards
 * (whose outlines the section's `data-dots` shapes trace).
 */
export class CurtainScene implements Scene {
  private shapes = new DomShapes();
  private cover: HTMLElement | null = null;
  private shapeN = 0;
  private curtainN = 0;
  private open = -1;

  layout(f: Field, fr: Frame) {
    this.cover = fr.section.querySelector<HTMLElement>("[data-dots-curtain]");
    this.shapeN = Math.round(f.n * 0.2);
    this.curtainN = Math.round(f.n * 0.72);
    this.shapes.collect(fr.section).allocate(0, this.shapeN);
    this.open = -1;
  }

  update(f: Field, fr: Frame) {
    this.shapes.refresh();
    const rect = this.cover?.getBoundingClientRect();
    // Opens over the first ~40% of a screen of scrolling, wherever the
    // section's travel ends.
    const scrolled = -fr.section.getBoundingClientRect().top;
    const open = fr.reduced ? 1 : smoothstep(0, fr.vh * 0.4, scrolled);
    const part = smoothstep(0, 0.7, open);
    const scatter = smoothstep(0.45, 1, open);
    if (Math.abs(open - this.open) > 0.001) {
      this.open = open;
      fr.section.style.setProperty("--open", open.toFixed(3));
    }

    const left = (rect?.left ?? 0) - PAD;
    const top = (rect?.top ?? 0) - PAD;
    const width = (rect?.width ?? 0) + PAD * 2;
    const height = (rect?.height ?? 0) + PAD * 2;
    const half = width / 2;
    const sway = fr.reduced ? 0 : fr.time * 0.9;

    for (let i = 0; i < f.n; i++) {
      if (i < this.shapeN) {
        if (!this.shapes.place(f, i, 0.9 * smoothstep(0.3, 0.9, open))) {
          dust(f, i, fr, 0.12);
        }
        continue;
      }
      if (!rect || i >= this.shapeN + this.curtainN) {
        dust(f, i, fr, 0.12);
        continue;
      }

      const k = i - this.shapeN;
      const rod = k % 24 === 0;
      const hem = !rod && k % 24 === 1;
      const side = f.r2[i] < 0.5 ? -1 : 1;
      // u: 0 at the seam, 1 at the panel's outer edge; v: 0 at the rod.
      const thread = Math.floor(f.r0[i] * THREADS);
      const u = (thread + 0.5 + (f.r3[i] - 0.5) * 0.25) / THREADS;
      const v = rod ? 0 : hem ? 1 : f.r1[i];
      // Gathering: the cloth bunches toward the outer edge — more at the hem,
      // like a drape swept aside — and its folds deepen as it does.
      const gather = part * (0.82 + 0.12 * v);
      const reach = half * (1 - gather);
      // Warping u bunches threads at each fold's crest (dense, lit) and
      // spreads them through the troughs (sparse, shaded).
      const fold = Math.sin(u * FOLDS * TAU);
      const depth = (0.58 + 0.3 * part) / (FOLDS * TAU);
      const across = clamp(u + fold * depth, 0, 1);
      let x = rod
        ? left + f.r0[i] * width
        : left + half + side * (half - (1 - across) * reach);
      let y = rod ? top - 6 : top + v * height;
      // A slight sway, strongest at the hem, while the curtain hangs closed.
      if (!rod) x += Math.sin(sway + v * 2.4 + u * 3) * 2.2 * v * (1 - part);

      // Light catches the crest of each fold; the troughs fall into shadow.
      const light = (0.5 - 0.5 * Math.cos(u * FOLDS * TAU)) ** 1.3;
      let alpha = rod ? 0.8 : hem ? 0.85 : 0.22 + 0.7 * light;
      if (scatter > 0) {
        const drift = scatter * (0.6 + f.r3[i]);
        x += side * drift * fr.vw * 0.35;
        y += (f.r1[i] - 0.6) * drift * fr.vh * 0.5;
        alpha *= 1 - scatter;
      }
      f.gx[i] = x;
      f.gy[i] = y;
      f.ga[i] = alpha;
      f.gh[i] = rod ? 0.6 : 0.08 * (1 - part);
      f.gz[i] = 1.7;
      f.gj[i] = 0.4 + scatter;
    }
  }
}
