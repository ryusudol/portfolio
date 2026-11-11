import { gauss, smoothstep, TAU } from "../math";
import { dust } from "../shapes";
import type { Field, Frame, Scene } from "../types";

/** How flat the disk lies, and how far it leans, as in the site's mark. */
const TILT = 0.34;
const LEAN = -0.2;
/** How tightly the two arms wind (radians per e-fold of radius). */
const WIND = 2.3;
/** Seconds a dot takes to drift from the rim to the inner edge. */
const FALL = 80;

/**
 * A resting state that echoes the mark in the header: the grain gathers into
 * a wide, tilted disk turning slowly under the closing words. Dots ride two
 * spiral arms inward, warming to the accent as they near the dark center,
 * then fade out and rejoin at the rim. Where the disk passes behind the words
 * it dims, so the links stay easy to read.
 */
export class OutroScene implements Scene {
  private eye = { x: 0, y: 0 };
  private inner = 200;
  private outer = 600;
  private diskN = 0;
  private title: HTMLElement | null = null;
  private links: HTMLElement | null = null;
  private words = { left: 0, right: 0, top: 0, bottom: 0 };

  layout(f: Field, fr: Frame) {
    this.title = fr.section.querySelector<HTMLElement>("h2");
    this.links = fr.section.querySelector<HTMLElement>(".outro__links");
    this.inner = Math.min(110, Math.max(50, fr.vw * 0.065));
    this.outer = Math.max(this.inner * 5, fr.vw * (fr.compact ? 1 : 0.58));
    this.diskN = Math.round(f.n * 0.82);
  }

  update(f: Field, fr: Frame) {
    const top = this.title?.getBoundingClientRect();
    const low = (this.links ?? this.title)?.getBoundingClientRect();
    if (top && low) {
      // The eye of the disk sits in the open space under the links.
      this.eye.x = fr.vw / 2;
      this.eye.y = low.bottom + Math.min(190, Math.max(96, fr.vh * 0.19));
      this.words = {
        left: Math.min(top.left, low.left) - 28,
        right: Math.max(top.right, low.right) + 28,
        top: top.top - 34,
        bottom: low.bottom + 22,
      };
    }
    const words = this.words;
    const cx = this.eye.x;
    const cy = this.eye.y;
    const inner = this.inner;
    const outer = this.outer;
    const t = fr.reduced ? 0 : fr.time;
    const cosL = Math.cos(LEAN);
    const sinL = Math.sin(LEAN);
    const turn = t * 0.04;

    for (let i = 0; i < f.n; i++) {
      if (i >= this.diskN) {
        dust(f, i, fr, 0.2);
        continue;
      }
      // u runs 0 at the rim to 1 at the inner edge, and wraps.
      const u = (f.r0[i] + t / FALL) % 1;
      const radius = inner + (outer - inner) * (1 - u) ** 1.5;
      // Most dots keep to one of two arms; the rest fill the disk between.
      const loose = f.r3[i] > 0.72;
      const arm = i % 2 === 0 ? 0 : Math.PI;
      const scatter = loose
        ? f.r1[i] * TAU
        : arm + gauss(f.r1[i], f.r2[i]) * (0.3 + 0.25 * (1 - u));
      const angle = scatter - WIND * Math.log(radius / inner) + turn;
      const lift = (f.r2[i] - 0.5) * radius * 0.07;
      const px = Math.cos(angle) * radius;
      const py = Math.sin(angle) * radius * TILT + lift;
      const x = cx + px * cosL - py * sinL;
      const y = cy + px * sinL + py * cosL;
      f.gx[i] = x;
      f.gy[i] = y;
      const behind =
        x > words.left && x < words.right && y > words.top && y < words.bottom;

      const fade = smoothstep(0, 0.07, u) * (1 - smoothstep(0.9, 1, u));
      const warm = smoothstep(0.55, 0.98, u);
      // The far side of the disk sits a little dimmer than the near side.
      const depth = 0.78 + 0.22 * Math.sin(angle);
      f.ga[i] =
        fade *
        depth *
        (loose ? 0.22 + 0.2 * warm : 0.4 + 0.45 * warm) *
        (0.6 + 0.4 * f.r3[i]) *
        (behind ? 0.3 : 1);
      f.gh[i] = warm * (loose ? 0.5 : 0.85);
      f.gz[i] = 0.8 + f.r2[i] * 0.7 + warm * 0.5;
      f.gj[i] = 0.5;
    }
  }
}
