import { clamp, easeInOut, smoothstep } from "../math";
import { dots } from "../runtime";
import { DomShapes, dust } from "../shapes";
import type { Field, Frame, Scene } from "../types";

/** A paper plane seen from above, nose to the right, in units of its length. */
const PLANE: [number, number, number, number][] = [
  [0.5, 0, -0.5, -0.36],
  [-0.5, -0.36, -0.26, 0],
  [-0.26, 0, -0.5, 0.36],
  [-0.5, 0.36, 0.5, 0],
  // The center fold.
  [0.5, 0, -0.26, 0],
];
const LENGTHS = PLANE.map(([ax, ay, bx, by]) => Math.hypot(bx - ax, by - ay));
const TOTAL = LENGTHS.reduce((a, b) => a + b, 0);

/** Seconds: fold into a plane, fly off, stay away, then the outline returns. */
const FOLD = 0.55;
const FLY = 1.5;
const AWAY = 0.5;
/** Seconds the light takes to run once round the letter while it's in focus. */
const LAP = 3.2;

/**
 * The contact form's letter, outlined in dots. While the form has focus a
 * light runs round the outline: it is listening. When a message is delivered,
 * the dots that drew the letter fold into a paper plane, bank up and away
 * off the screen with a few of them strung out behind as a trail, and then
 * come back to outline a fresh sheet.
 */
export class ContactScene implements Scene {
  private shapes = new DomShapes();
  private form: HTMLElement | null = null;
  private shapeN = 0;
  private seen = dots.sent;
  private launched = -100;
  private focus = 0;

  layout(f: Field, fr: Frame) {
    this.form = fr.section.querySelector<HTMLElement>("form");
    this.shapeN = Math.round(f.n * 0.5);
    this.shapes.collect(fr.section).allocate(0, this.shapeN);
  }

  /** A point on the plane's outline at u ∈ [0, 1), in plane units. */
  private plane(u: number, out: [number, number]) {
    let d = u * TOTAL;
    for (let k = 0; k < PLANE.length; k++) {
      if (d <= LENGTHS[k] || k === PLANE.length - 1) {
        const [ax, ay, bx, by] = PLANE[k];
        const t = clamp(d / LENGTHS[k]);
        out[0] = ax + (bx - ax) * t;
        out[1] = ay + (by - ay) * t;
        return out;
      }
      d -= LENGTHS[k];
    }
    return out;
  }

  update(f: Field, fr: Frame) {
    if (dots.sent !== this.seen) {
      this.seen = dots.sent;
      if (!fr.reduced) this.launched = fr.time;
    }
    this.shapes.refresh();
    const since = fr.time - this.launched;
    const flying = since < FOLD + FLY + AWAY;

    const focused = this.form?.matches(":focus-within") ? 1 : 0;
    this.focus += (focused - this.focus) * 0.1;
    const bead = fr.reduced ? -1 : (fr.time / LAP) % 1;

    // The plane: where it is, which way it points, and how big it is.
    const rect = this.form?.getBoundingClientRect();
    const size = (rect?.width ?? 300) * 0.34;
    const startX = rect ? rect.left + rect.width / 2 : fr.vw / 2;
    const startY = rect ? rect.top + rect.height / 2 : fr.vh / 2;
    const pt: [number, number] = [0, 0];
    const pose = (t: number, out: [number, number, number]) => {
      // t is seconds since launch, which a trailing dot sees a little late.
      const go = clamp((t - FOLD) / FLY);
      const far = go * go * (3 - 2 * go) * go;
      const heading = -0.5 - 0.5 * go;
      out[0] = startX + far * fr.vw * 0.75;
      out[1] = startY - far * fr.vh * 0.95 - Math.sin(go * Math.PI) * 26;
      out[2] = heading;
      return out;
    };
    const at: [number, number, number] = [0, 0, 0];
    const fold = easeInOut(clamp(since / FOLD));

    for (let i = 0; i < f.n; i++) {
      if (!this.shapes.place(f, i, 0.9)) {
        dust(f, i, fr, 0.15);
        continue;
      }
      if (this.focus > 0.02 && bead >= 0) {
        // The listening light, a short bright run on each shape.
        let d = Math.abs(f.r0[i] - bead);
        if (d > 0.5) d = 1 - d;
        const lit = (1 - smoothstep(0, 0.07, d)) * this.focus * 0.7;
        if (lit > f.fx[i]) f.fx[i] = lit;
      }
      if (!flying) continue;

      // One dot in five is strung out behind the plane as its trail.
      const trail = f.r3[i] < 0.2 ? 0.05 + f.r1[i] * 0.42 : 0;
      pose(since - trail, at);
      this.plane(f.r0[i], pt);
      let px = pt[0];
      let py = pt[1];
      if (trail > 0) {
        // Part of the plane while it folds; it falls behind once under way.
        const loose = smoothstep(FOLD, FOLD + 0.3, since);
        px += (-0.3 - f.r2[i] * 0.2 - px) * loose;
        py += ((f.r1[i] - 0.5) * 0.12 - py) * loose;
      }
      const cos = Math.cos(at[2]);
      const sin = Math.sin(at[2]);
      const x = at[0] + (px * cos - py * sin) * size;
      const y = at[1] + (px * sin + py * cos) * size;
      // Fold from the letter's outline into the plane, then go with it.
      f.gx[i] += (x - f.gx[i]) * fold;
      f.gy[i] += (y - f.gy[i]) * fold;
      f.ga[i] = trail > 0 ? 0.95 - trail * 1.4 * fold : 0.95;
      f.gh[i] = fold * (trail > 0 ? 1 : 0.6);
      f.gj[i] = 0.2;
    }
  }
}
