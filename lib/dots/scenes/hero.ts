import { smoothstep } from "../math";
import { dust, sampleText, type TextSample } from "../shapes";
import type { Field, Frame, Scene } from "../types";

type Portrait = { aspect: number; count: number; pts: Float32Array };

const portraits = new Map<string, Promise<Portrait | null>>();

/**
 * Loads stippled portrait dots written by `scripts/portrait.py`:
 * uint16 [version, aspect * 10000, n, (x, y) * n], normalised to 0..65535.
 */
function loadPortrait(url: string) {
  let pending = portraits.get(url);
  if (!pending) {
    pending = fetch(url)
      .then((res) => (res.ok ? res.arrayBuffer() : null))
      .then((buffer) => {
        if (!buffer) return null;
        const raw = new Uint16Array(buffer);
        const count = raw[2];
        const pts = new Float32Array(count * 2);
        for (let k = 0; k < count * 2; k++) pts[k] = raw[3 + k] / 65535;
        return { aspect: raw[1] / 10000, count, pts };
      })
      .catch(() => null);
    portraits.set(url, pending);
  }
  return pending;
}

/**
 * The name — and, when the markup asks for one, a stippled portrait — drawn
 * in dust. Scrolling away loosens both back into grain.
 */
export class HeroScene implements Scene {
  private textEl: HTMLElement | null = null;
  private faceEl: HTMLElement | null = null;
  private sample: TextSample | null = null;
  private portrait: Portrait | null = null;
  private textN = 0;
  private faceN = 0;

  layout(f: Field, fr: Frame) {
    this.textEl = fr.section.querySelector<HTMLElement>("[data-dots-text]");
    this.faceEl = fr.section.querySelector<HTMLElement>("[data-dots-portrait]");
    if (this.textEl) this.sample = sampleText(this.textEl);
    const url = this.faceEl?.dataset.dotsPortrait;
    if (url && !this.portrait) {
      loadPortrait(url).then((portrait) => {
        this.portrait = portrait;
        this.split(f);
      });
    }
    this.split(f);
    document.documentElement.classList.add("dots-ready");
  }

  /** Share particles between the portrait and the name. */
  private split(f: Field) {
    const face = this.portrait && this.faceEl ? 0.62 : 0;
    this.faceN = Math.round(f.n * face);
    this.textN = Math.round(f.n * (face ? 0.26 : 0.84));
  }

  update(f: Field, fr: Frame) {
    const scatter = smoothstep(0.2, 1, fr.progress);
    const fade = 1 - scatter * 0.7;
    const textN = this.textN;
    const faceN = this.faceN;
    const sample = this.sample;
    const text = this.textEl?.getBoundingClientRect();
    const portrait = this.portrait;
    const faceRect = this.faceEl?.getBoundingClientRect();

    // Fit the portrait inside its box, preserving aspect ratio.
    let fx = 0;
    let fy = 0;
    let fw = 0;
    let fh = 0;
    if (portrait && faceRect) {
      fw = Math.min(faceRect.width, faceRect.height * portrait.aspect);
      fh = fw / portrait.aspect;
      fx = faceRect.left + (faceRect.width - fw) / 2;
      fy = faceRect.top + (faceRect.height - fh) / 2;
    }

    for (let i = 0; i < f.n; i++) {
      let x: number;
      let y: number;
      if (i < textN && sample && text && sample.count > 0) {
        const j = Math.min(
          sample.count - 1,
          Math.floor(((i + f.r0[i]) / textN) * sample.count),
        );
        x = text.left + sample.pts[j * 2] + f.r1[i] - 0.5;
        y = text.top + sample.pts[j * 2 + 1] + f.r2[i] - 0.5;
        f.ga[i] = (0.5 + f.r3[i] * 0.5) * fade;
      } else if (i >= textN && i < textN + faceN && portrait) {
        const k = i - textN;
        const j = Math.min(
          portrait.count - 1,
          Math.floor(((k + f.r0[i]) / faceN) * portrait.count),
        );
        x = fx + portrait.pts[j * 2] * fw;
        y = fy + portrait.pts[j * 2 + 1] * fh;
        // Stippling relies on even dots: fixed size, steady brightness, and
        // almost no drift (until the section scrolls away).
        f.ga[i] = (0.82 + f.r3[i] * 0.18) * fade;
        f.gz[i] = fr.compact ? 1.15 : 1.3;
        f.gj[i] = 0.15 + scatter;
      } else {
        dust(f, i, fr, 0.2);
        continue;
      }
      if (scatter > 0) {
        x += (f.r0[i] - 0.5) * scatter * fr.vw * 0.9;
        y += (f.r2[i] - 0.5) * scatter * fr.vh * 0.7 - scatter * 60;
      }
      f.gx[i] = x;
      f.gy[i] = y;
      f.gh[i] = f.r3[i] > 0.992 ? 1 : 0;
    }
  }
}
