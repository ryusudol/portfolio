"use client";

import { useEffect, useRef } from "react";

/** The header lays the mark out at this height; a larger mark overhangs it. */
const SLOT = 60;
const WIDTH = 1.2;

/* Lengths are in units of the mark's height. */
const PLANET = 0.26;
const GRAINS = 1150;
/** Tries per grain when spacing them out; more is more even and slower. */
const TRIES = 5;
/** Radians per second the planet turns. */
const SPIN = 0.22;

const ORBIT = 0.455;
/** Seconds for the star to go round once. */
const YEAR = 10;
/** The orbit is seen from above by this much, then the figure rolls. */
const TILT = 0.68;
const ROLL = -0.32;
const STAR = 0.036;

/** Dust the star sheds: how many motes, and how far round they trail. */
const DUST = 90;
const WAKE = 1.9;

/** Light the night side still shows, so the planet never vanishes. */
const NIGHT = 0.15;

function grains() {
  // A small fixed generator, so the planet looks the same on every load.
  let seed = 11;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  // Each grain is the best of a few random tries: the one farthest from
  // every grain already placed. That spaces them evenly with no pattern.
  const at = new Float32Array(GRAINS * 3);
  const weight = new Float32Array(GRAINS);
  for (let k = 0; k < GRAINS; k++) {
    let closest = 2;
    for (let t = 0; t < TRIES; t++) {
      const y = rand() * 2 - 1;
      const ring = Math.sqrt(1 - y * y);
      const a = rand() * Math.PI * 2;
      const x = Math.cos(a) * ring;
      const z = Math.sin(a) * ring;
      // The largest dot product is the nearest neighbour.
      let near = -1;
      for (let n = 0; n < k; n++) {
        const d = x * at[n * 3] + y * at[n * 3 + 1] + z * at[n * 3 + 2];
        if (d > near) near = d;
      }
      if (near < closest) {
        closest = near;
        at[k * 3] = x;
        at[k * 3 + 1] = y;
        at[k * 3 + 2] = z;
      }
    }
    weight[k] = 0.6 + rand() * 0.4;
  }
  const dust = Array.from({ length: DUST }, () => {
    const behind = rand() ** 1.5;
    return {
      behind,
      out: (rand() - 0.5) * (0.02 + 0.1 * behind),
      up: (rand() - 0.5) * (0.02 + 0.08 * behind),
      weight: 0.5 + rand() * 0.5,
      beat: rand() * Math.PI * 2,
    };
  });
  return { at, weight, dust };
}

function readColor(name: string, fallback: string) {
  return (
    getComputedStyle(document.documentElement).getPropertyValue(name).trim() ||
    fallback
  );
}

/**
 * The mark: a planet of fine grain, seen by the light of one small star. The
 * star orbits it, so the lit side follows the star round: full when the star
 * is in front, a thin crescent along the limb when it swings behind. Nothing
 * outlines the planet; it is only the grain the light reaches.
 */
export function Logo({ size = 72 }: { size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const width = Math.round(size * WIDTH);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(size * dpr);
    const cx = width / 2;
    const cy = size / 2;
    const radius = size * PLANET;

    const { at, weight, dust } = grains();
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const brand = canvas.closest("a");
    let boost = 1;
    let target = 1;
    const onEnter = () => {
      target = 3.4;
    };
    const onLeave = () => {
      target = 1;
    };
    brand?.addEventListener("pointerenter", onEnter);
    brand?.addEventListener("pointerleave", onLeave);

    let colors = { dot: "#dfe7ff", accent: "#ffb054" };
    // Light bleeds on the dark sky; on paper the same halo would read as a smudge.
    let bloom = 1;
    const readColors = () => {
      bloom = document.documentElement.dataset.theme === "paper" ? 0.45 : 1;
      colors = {
        dot: readColor("--dot", colors.dot),
        accent: readColor("--accent", colors.accent),
      };
    };
    readColors();

    const cosT = Math.cos(TILT);
    const sinT = Math.sin(TILT);
    const cosR = Math.cos(ROLL);
    const sinR = Math.sin(ROLL);
    /** A point on the star's orbit plane, turned to face the viewer. */
    const orbit = (angle: number, out: number, up: number) => {
      const x = Math.cos(angle) * (ORBIT + out);
      const z = Math.sin(angle) * (ORBIT + out);
      const y = up * cosT - z * sinT;
      return [x * cosR - y * sinR, x * sinR + y * cosR, up * sinT + z * cosT];
    };
    // The planet's axis leans the same way the orbit does.
    const lean = TILT * 0.6;
    const cosA = Math.cos(lean);
    const sinA = Math.sin(lean);

    // A grain no finer than one device pixel, or it smears to nothing.
    const fine = Math.max(1 / dpr, size * 0.011);
    /** Years flown, starting with the star behind the planet: a sunrise. */
    let year = 0.72;
    let turn = 0;
    let age = 0;

    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const still = reduced.matches;
      boost += (target - boost) * 0.08;
      if (still) {
        year = 0.36;
        age = 10;
      } else {
        age += dt;
        year += (dt * boost) / YEAR;
        turn += dt * SPIN * (0.6 + 0.4 * boost);
      }
      const angle = year * Math.PI * 2;
      const [sx, sy, sz] = orbit(angle, 0, 0);
      const far = Math.hypot(sx, sy, sz);
      const lx = sx / far;
      const ly = sy / far;
      const lz = sz / far;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, size);

      /** The star and its wake, on the far or the near side of the planet. */
      const drawStar = (front: boolean) => {
        ctx.fillStyle = colors.accent;
        for (const mote of dust) {
          const [x, y, z] = orbit(
            angle - 0.1 - mote.behind * WAKE,
            mote.out,
            mote.up,
          );
          if (z >= 0 !== front) continue;
          // The planet hides whatever passes behind it.
          if (!front && Math.hypot(x, y) < PLANET) continue;
          const s = fine * (1.5 - 0.7 * mote.behind);
          const flicker = 0.75 + 0.25 * Math.sin(age * 2.4 + mote.beat);
          ctx.globalAlpha = mote.weight * flicker * (1 - mote.behind) ** 1.4;
          ctx.fillRect(cx + x * size - s / 2, cy - y * size - s / 2, s, s);
        }
        if (sz >= 0 !== front) return;
        const px = cx + sx * size;
        const py = cy - sy * size;
        // Behind the planet the star sets and rises on the limb.
        const hidden = !front && Math.hypot(sx, sy) < PLANET;
        if (hidden) return;
        const near = 1 + (sz / ORBIT) * 0.16;
        const reach = size * 0.17 * near;
        const halo = ctx.createRadialGradient(px, py, 0, px, py, reach);
        halo.addColorStop(0, colors.accent);
        halo.addColorStop(1, "transparent");
        ctx.globalAlpha = 0.6 * bloom;
        ctx.fillStyle = halo;
        ctx.fillRect(px - reach, py - reach, reach * 2, reach * 2);
        ctx.globalAlpha = 1;
        ctx.fillStyle = colors.accent;
        ctx.beginPath();
        ctx.arc(px, py, size * STAR * near, 0, Math.PI * 2);
        ctx.fill();
      };

      drawStar(false);

      // The planet: every grain on the near side, as bright as its light.
      const cosS = Math.cos(turn);
      const sinS = Math.sin(turn);
      const wake = Math.min(1, age / 0.9);
      ctx.fillStyle = colors.dot;
      for (let k = 0; k < GRAINS; k++) {
        const gx = at[k * 3];
        const gy = at[k * 3 + 1];
        const gz = at[k * 3 + 2];
        // Spin about the axis, then lean the axis toward the viewer.
        const x = gx * cosS + gz * sinS;
        const z0 = gz * cosS - gx * sinS;
        const y = gy * cosA - z0 * sinA;
        const z = gy * sinA + z0 * cosA;
        if (z < 0) continue;
        // A soft terminator: light wraps a little past the edge of day.
        const facing = (x * lx + y * ly + z * lz + 0.22) / 1.22;
        const lit = facing > 0 ? facing ** 0.8 : 0;
        const s = fine * (0.8 + 0.5 * lit);
        ctx.globalAlpha = wake * weight[k] * (NIGHT + (1 - NIGHT) * lit);
        ctx.fillRect(cx + x * radius - s / 2, cy - y * radius - s / 2, s, s);
      }

      drawStar(true);
      ctx.globalAlpha = 1;

      if (!still) raf = requestAnimationFrame(frame);
    };
    const themeWatch = new MutationObserver(() => {
      readColors();
      if (reduced.matches) requestAnimationFrame(frame);
    });
    themeWatch.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    raf = requestAnimationFrame(frame);
    const onMotion = () => {
      cancelAnimationFrame(raf);
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    reduced.addEventListener("change", onMotion);

    return () => {
      cancelAnimationFrame(raf);
      themeWatch.disconnect();
      reduced.removeEventListener("change", onMotion);
      brand?.removeEventListener("pointerenter", onEnter);
      brand?.removeEventListener("pointerleave", onLeave);
    };
  }, [size]);

  return (
    <canvas
      ref={ref}
      className="logo"
      style={{
        width: Math.round(size * WIDTH),
        height: size,
        marginBlock: Math.min(0, (SLOT - size) / 2),
      }}
      aria-hidden="true"
      tabIndex={-1}
    />
  );
}
