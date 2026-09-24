"use client";

import { useEffect, useRef } from "react";

type Mote = {
  r: number;
  a: number;
  size: number;
  bright: number;
  age: number;
  /** Offset above or below the disk plane, so the disk has some depth. */
  lift: number;
};

const MOTES = 340;
const HALO = 60;
const TILT = 0.24;
const OUTER_TILT = 0.46;
const CORE = 0.2;
const WIDTH = 1.5;

/** `core` is the event horizon's radius as a fraction of the disk's. */
function spawn(core: number, anywhere = false): Mote {
  return {
    r: anywhere
      ? core * 1.2 + (1 - core * 1.2) * Math.random()
      : 0.6 + Math.random() * 0.4,
    a: Math.random() * Math.PI * 2,
    size: 0.6 + Math.random() * 0.7,
    bright: 0.55 + Math.random() * 0.45,
    age: anywhere ? 1 : 0,
    lift: (Math.random() + Math.random() - 1) * 1.4,
  };
}

function readColor(name: string, fallback: string) {
  return (
    getComputedStyle(document.documentElement).getPropertyValue(name).trim() ||
    fallback
  );
}

/**
 * The mark: a particle black hole. Dots drift in on a wide, tilted disk, then
 * speed up, flatten further, and warm to vermilion as they spiral into a
 * dark core ringed by a lensed halo. The core hides whatever passes behind it.
 */
export function Logo({ size = 60 }: { size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    // The disk is wider than it is tall, so the canvas is too.
    const width = Math.round(size * WIDTH);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(size * dpr);
    const cx = width / 2;
    const cy = size / 2;
    const R = width * 0.48;
    const horizon = size * CORE * 0.7;
    const core = (size * CORE * 0.5) / R;

    const motes = Array.from({ length: MOTES }, () => spawn(core, true));
    const halo = Array.from({ length: HALO }, (_, k) => ({
      a: (k / HALO) * Math.PI * 2,
      size: 0.5 + Math.random() * 0.5,
    }));
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const brand = canvas.closest("a");
    let boost = 1;
    let target = 1;
    const onEnter = () => {
      target = 3.2;
    };
    const onLeave = () => {
      target = 1;
    };
    brand?.addEventListener("pointerenter", onEnter);
    brand?.addEventListener("pointerleave", onLeave);

    let colors = { dot: "#ece8e1", accent: "#e2583a", bg: "#131312" };
    const readColors = () => {
      colors = {
        dot: readColor("--dot", colors.dot),
        accent: readColor("--accent", colors.accent),
        bg: readColor("--bg", colors.bg),
      };
    };
    readColors();
    const tiltAngle = -0.32;
    const cosT = Math.cos(tiltAngle);
    const sinT = Math.sin(tiltAngle);
    // A flat disk that flattens further as dots fall in.
    const flatten = (r: number) => {
      const t = Math.min(1, Math.max(0, (r - core) / (1 - core)));
      return TILT + (OUTER_TILT - TILT) * t;
    };
    const project = (r: number, a: number, lift: number) => {
      const x = Math.cos(a) * r * R;
      const y = (Math.sin(a) * flatten(r) + lift * 0.16 * r) * r * R;
      return [cx + x * cosT - y * sinT, cy + x * sinT + y * cosT] as const;
    };

    const dot = (x: number, y: number, s: number) => {
      ctx.fillRect(x - s / 2, y - s / 2, s, s);
    };

    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const still = reduced.matches;
      boost += (target - boost) * 0.08;
      const speed = still ? 0 : boost;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, size);

      for (const m of motes) {
        m.age += dt * speed;
        m.a += dt * speed * (0.35 + 0.9 / (m.r + 0.08));
        // Slow at the rim, fast near the core, so the disk stays wide.
        m.r -= dt * speed * (0.02 + 0.03 / (m.r + 0.05) ** 2);
        if (m.r < core * 1.1) Object.assign(m, spawn(core));
      }

      // Soft glow behind the event horizon.
      const glow = ctx.createRadialGradient(
        cx,
        cy,
        size * CORE * 0.6,
        cx,
        cy,
        size * 0.34,
      );
      glow.addColorStop(0, colors.accent);
      glow.addColorStop(1, "transparent");
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, size);

      const drawMotes = (front: boolean) => {
        for (const m of motes) {
          if (Math.sin(m.a) >= 0 !== front) continue;
          const [x, y] = project(m.r, m.a, m.lift);
          const inner = 1 - (m.r - core) / (1 - core);
          ctx.fillStyle = inner > 0.55 ? colors.accent : colors.dot;
          const overCore = Math.hypot(x - cx, y - cy) < horizon;
          const depth = front ? (overCore ? 0.45 : 1) : 0.55;
          const fadeIn = Math.min(1, m.age * 1.5);
          ctx.globalAlpha = m.bright * depth * fadeIn * (0.5 + inner * 0.5);
          dot(x, y, m.size);
        }
      };

      drawMotes(false);

      // Lensed halo: the far side of the disk, bent up and over the core.
      ctx.fillStyle = colors.dot;
      for (const h of halo) {
        h.a += dt * speed * 0.9;
        const x = cx + Math.cos(h.a) * size * 0.19;
        const y = cy + Math.sin(h.a) * size * 0.19;
        ctx.globalAlpha = 0.3 + 0.55 * Math.max(0, -Math.sin(h.a));
        dot(x, y, h.size);
      }

      // Event horizon + photon ring.
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, horizon, 0, Math.PI * 2);
      ctx.fillStyle = colors.bg;
      ctx.fill();
      ctx.lineWidth = 0.7;
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = colors.accent;
      ctx.stroke();

      drawMotes(true);
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
      style={{ width: Math.round(size * WIDTH), height: size }}
      aria-hidden="true"
      tabIndex={-1}
    />
  );
}
