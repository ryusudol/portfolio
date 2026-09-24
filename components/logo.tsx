"use client";

import { useEffect, useRef } from "react";

type Mote = { r: number; a: number; size: number; bright: number };

const DISK = 260;
const HALO = 60;
const TILT = 0.34;
const CORE = 0.2;

function spawn(outer = true): Mote {
  return {
    // Denser toward the core, like a real accretion disk.
    r: outer
      ? 0.7 + Math.random() * 0.3
      : CORE * 1.25 + (1 - CORE * 1.25) * Math.random() ** 1.6,
    a: Math.random() * Math.PI * 2,
    size: 0.6 + Math.random() * 0.7,
    bright: 0.55 + Math.random() * 0.45,
  };
}

function readColor(name: string, fallback: string) {
  return (
    getComputedStyle(document.documentElement).getPropertyValue(name).trim() ||
    fallback
  );
}

/**
 * The mark: a particle black hole. An accretion disk of dots orbits a dark
 * core (inner orbits faster, slowly spiralling in), with a lensed halo and a
 * vermilion photon ring. The disk behind the core is hidden by it.
 */
export function Logo({ size = 52 }: { size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);

    const disk = Array.from({ length: DISK }, () => spawn(false));
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
    const c = size / 2;
    const R = size * 0.47;
    const tiltAngle = -0.32;
    const cosT = Math.cos(tiltAngle);
    const sinT = Math.sin(tiltAngle);
    const project = (r: number, a: number) => {
      const x = Math.cos(a) * r * R;
      const y = Math.sin(a) * r * R * TILT;
      return [c + x * cosT - y * sinT, c + x * sinT + y * cosT] as const;
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
      ctx.clearRect(0, 0, size, size);

      for (const m of disk) {
        m.a += dt * speed * 1.1 * (0.35 / m.r) ** 1.5;
        m.r -= dt * speed * 0.035 * (0.5 / m.r);
        if (m.r < CORE * 1.15) Object.assign(m, spawn());
      }

      const drawDisk = (front: boolean) => {
        for (const m of disk) {
          if (Math.sin(m.a) >= 0 !== front) continue;
          const [x, y] = project(m.r, m.a);
          const inner = 1 - (m.r - CORE) / (1 - CORE);
          ctx.fillStyle = inner > 0.62 ? colors.accent : colors.dot;
          const overCore = Math.hypot(x - c, y - c) < size * CORE * 0.7;
          const depth = front ? (overCore ? 0.45 : 1) : 0.55;
          ctx.globalAlpha = m.bright * depth * Math.min(1, m.r * 1.8);
          dot(x, y, m.size);
        }
      };

      drawDisk(false);

      // Lensed halo: the far side of the disk, bent up and over the core.
      ctx.fillStyle = colors.dot;
      for (const h of halo) {
        h.a += dt * speed * 0.9;
        const x = c + Math.cos(h.a) * size * 0.19;
        const y = c + Math.sin(h.a) * size * 0.19;
        ctx.globalAlpha = 0.3 + 0.55 * Math.max(0, -Math.sin(h.a));
        dot(x, y, h.size);
      }

      // Event horizon + photon ring.
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(c, c, size * CORE * 0.7, 0, Math.PI * 2);
      ctx.fillStyle = colors.bg;
      ctx.fill();
      ctx.lineWidth = 0.7;
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = colors.accent;
      ctx.stroke();

      drawDisk(true);
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
      style={{ width: size, height: size }}
      aria-hidden="true"
      tabIndex={-1}
    />
  );
}
