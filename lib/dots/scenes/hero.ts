import { clamp, smoothstep, TAU } from "../math";
import { dust, sampleText, type TextSample } from "../shapes";
import type { Field, Frame, Scene } from "../types";

type Portrait = { aspect: number; count: number; pts: Float32Array };

const portraits = new Map<string, Promise<Portrait | null>>();

/**
 * Loads stippled portrait dots written by `scripts/portrait.py`:
 * uint16 [version, aspect * 10000, n, (x, y) * n], normalized to 0..65535.
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

/** Seconds the light takes to cross the hero the first time, drawing it. */
const DRAW = 2.1;
const DRAW_DELAY = 0.2;
/** After that it returns as a glint: seconds between passes, and per pass. */
const GLINT_EVERY = 9;
const GLINT_PASS = 2.8;
/** Half-width of the light, in pixels. */
const BAND = 64;
/** The wind that carries the hero off as it scrolls away: up and to the right. */
const WIND = -0.62;

/**
 * The name — and, when the markup asks for one, a stippled portrait — drawn
 * in dust by a band of light. On load the light crosses the hero once, left
 * to right, and dust falls into place behind it: the name is written, then
 * the portrait develops. Afterwards the same light comes back every few
 * seconds as a glint. Scrolling away raises a wind that peels both off, the
 * lee side first, and carries them up and out as grain; scrolling back sets
 * them down again.
 */
export class HeroScene implements Scene {
  private textEl: HTMLElement | null = null;
  private faceEl: HTMLElement | null = null;
  private sample: TextSample | null = null;
  private portrait: Portrait | null = null;
  private textN = 0;
  private faceN = 0;
  /** The scene clock when the hero first drew, or far in the past to skip the intro. */
  private born = Number.NaN;

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
  }

  /** Share particles between the portrait and the name. */
  private split(f: Field) {
    const face = this.portrait && this.faceEl ? 0.62 : 0;
    this.faceN = Math.round(f.n * face);
    this.textN = Math.round(f.n * (face ? 0.26 : 0.84));
  }

  update(f: Field, fr: Frame) {
    if (Number.isNaN(this.born)) {
      // Arriving mid-page (a back navigation, a deep link) skips the intro.
      const skip = fr.reduced || fr.progress > 0.06;
      this.born = skip ? fr.time - 1000 : fr.time;
    }
    const age = fr.time - this.born;
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

    // The span the light and the wind both work across.
    const hasText = Boolean(sample && text && sample.count > 0);
    const hasFace = Boolean(portrait && faceRect);
    const left = Math.min(
      hasText && text ? text.left : 1e9,
      hasFace ? fx : 1e9,
    );
    const right = Math.max(
      hasText && text ? text.right : -1e9,
      hasFace ? fx + fw : -1e9,
    );
    const top = Math.min(hasText && text ? text.top : 1e9, hasFace ? fy : 1e9);
    const bottom = Math.max(
      hasText && text ? text.bottom : -1e9,
      hasFace ? fy + fh : -1e9,
    );
    const wide = Math.max(1, right - left);
    const tall = Math.max(1, bottom - top);

    // Where the light is: crossing once to draw, then back now and then.
    const drawing = clamp((age - DRAW_DELAY) / DRAW);
    const drawn = left - BAND + (wide + BAND * 2) * drawing;
    let light = drawn;
    if (drawing >= 1) {
      const pass = ((age - DRAW_DELAY - DRAW) % GLINT_EVERY) / GLINT_PASS;
      light = pass < 1 ? left - BAND * 2 + (wide + BAND * 4) * pass : -1e9;
    }
    if (fr.reduced) light = -1e9;

    const wind = fr.reduced
      ? smoothstep(0.2, 1, fr.progress)
      : smoothstep(0.08, 0.96, fr.progress);

    for (let i = 0; i < f.n; i++) {
      let x: number;
      let y: number;
      let alpha: number;
      let calm = 1;
      if (i < textN && sample && text && sample.count > 0) {
        const j = Math.min(
          sample.count - 1,
          Math.floor(((i + f.r0[i]) / textN) * sample.count),
        );
        x = text.left + sample.pts[j * 2] + f.r1[i] - 0.5;
        y = text.top + sample.pts[j * 2 + 1] + f.r2[i] - 0.5;
        alpha = 0.55 + f.r3[i] * 0.45;
        // The name is set in thin capitals: small even dots that hold still,
        // or the strokes fray.
        f.gz[i] = fr.compact ? 1 : 1.1;
        calm = 0.3;
      } else if (i >= textN && i < textN + faceN && portrait) {
        const k = i - textN;
        const j = Math.min(
          portrait.count - 1,
          Math.floor(((k + f.r0[i]) / faceN) * portrait.count),
        );
        x = fx + portrait.pts[j * 2] * fw;
        y = fy + portrait.pts[j * 2 + 1] * fh;
        // Stippling relies on even dots: fixed size, steady brightness, and
        // almost no drift (until the wind takes them).
        alpha = 0.82 + f.r3[i] * 0.18;
        f.gz[i] = fr.compact ? 1.15 : 1.3;
        calm = 0.15;
      } else {
        dust(f, i, fr, 0.2);
        continue;
      }

      // Not reached by the light yet: still loose grain.
      if (x > drawn + (f.r3[i] - 0.5) * 36) {
        dust(f, i, fr, 0.2);
        continue;
      }

      const lit = Math.exp(-(((x - light) / BAND) ** 2));
      if (lit > 0.02) {
        const glint = lit * (drawing < 1 ? 0.7 : 0.42);
        if (glint > f.fx[i]) f.fx[i] = glint;
      }

      if (wind > 0) {
        // The lee side — right and top — goes first; the rest follows.
        const order =
          0.62 * (1 - (x - left) / wide) +
          0.3 * ((y - top) / tall) +
          0.08 * f.r1[i];
        const e = clamp((wind * 1.3 - order) / 0.3);
        if (e > 0) {
          const e2 = e * e;
          const far = e2 * Math.sqrt(e);
          const gust = Math.sin(y * 0.013 + f.r0[i] * 2 + wind * 3);
          const angle = WIND + gust * 0.35 + (f.r2[i] - 0.5) * 0.5;
          const reach = far * (0.25 + 0.6 * f.r3[i]) * fr.vw * 0.7;
          x +=
            Math.cos(angle) * reach + Math.sin(e * 5 + f.r0[i] * TAU) * 18 * e;
          y += Math.sin(angle) * reach - e2 * 40;
          const grain = 0.2 * (0.4 + f.r2[i] * f.r2[i] * 1.1);
          alpha += (grain - alpha) * e2;
          calm += e * 1.6;
          if (e > 0.5) f.gz[i] = 0;
        }
      }

      f.gx[i] = x;
      f.gy[i] = y;
      f.ga[i] = alpha;
      f.gj[i] = calm;
      f.gh[i] = f.r3[i] > 0.992 ? 1 : 0;
    }
  }
}
