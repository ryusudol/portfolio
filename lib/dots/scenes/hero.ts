import { smoothstep } from "../math";
import { dust, sampleText, type TextSample } from "../shapes";
import type { Field, Frame, Scene } from "../types";

/** The name, drawn in dust. Scrolling away loosens it back into grain. */
export class HeroScene implements Scene {
  private el: HTMLElement | null = null;
  private sample: TextSample | null = null;
  private textN = 0;

  layout(f: Field, fr: Frame) {
    this.el = fr.section.querySelector<HTMLElement>("[data-dots-text]");
    if (!this.el) return;
    this.sample = sampleText(this.el);
    this.textN = Math.round(f.n * 0.84);
    document.documentElement.classList.add("dots-ready");
  }

  update(f: Field, fr: Frame) {
    const el = this.el;
    const sample = this.sample;
    if (!el || !sample || sample.count === 0) {
      for (let i = 0; i < f.n; i++) dust(f, i, fr);
      return;
    }
    const r = el.getBoundingClientRect();
    const scatter = smoothstep(0.2, 1, fr.progress);
    const textN = this.textN;
    const { pts, count } = sample;
    for (let i = 0; i < f.n; i++) {
      if (i >= textN) {
        dust(f, i, fr, 0.2);
        continue;
      }
      const j = Math.min(
        count - 1,
        Math.floor(((i + f.r0[i]) / textN) * count),
      );
      let x = r.left + pts[j * 2] + f.r1[i] - 0.5;
      let y = r.top + pts[j * 2 + 1] + f.r2[i] - 0.5;
      if (scatter > 0) {
        x += (f.r0[i] - 0.5) * scatter * fr.vw * 0.9;
        y += (f.r2[i] - 0.5) * scatter * fr.vh * 0.7 - scatter * 60;
      }
      f.gx[i] = x;
      f.gy[i] = y;
      f.ga[i] = (0.5 + f.r3[i] * 0.5) * (1 - scatter * 0.7);
      f.gh[i] = f.r3[i] > 0.992 ? 1 : 0;
    }
  }
}
