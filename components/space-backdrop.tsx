"use client";

import { useEffect, useRef } from "react";

import { parseColor } from "@/lib/dots/math";
import { paintSky } from "@/lib/sky";

/** Seconds between meteors: rare enough that each one is a small surprise. */
const METEOR_MIN = 16;
const METEOR_MAX = 42;

/**
 * The far sky behind every page: a nebula and fixed stars painted once to a
 * canvas (`lib/sky.ts`), with a meteor crossing now and then. It lives in the
 * root layout, so the same sky stays put while pages change in front of it.
 */
export function SpaceBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const meteorRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const root = document.documentElement;
    let width = 0;
    let height = 0;
    let ink = true;

    const paint = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const dark = root.dataset.theme !== "paper";
      // Mobile toolbars nudge the height while scrolling; the canvas is
      // stretched by CSS in between, so only repaint real resizes.
      if (w === width && Math.abs(h - height) < 140 && dark === ink) return;
      width = w;
      height = h;
      ink = dark;
      const ground = parseColor(
        getComputedStyle(root).getPropertyValue("--bg"),
        dark ? [5, 7, 13] : [233, 236, 242],
      );
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      paintSky(canvas, w, h, dpr, dark, ground);
    };
    paint();

    let pending = 0;
    const onResize = () => {
      window.clearTimeout(pending);
      pending = window.setTimeout(paint, 120);
    };
    window.addEventListener("resize", onResize);
    const themeWatch = new MutationObserver(paint);
    themeWatch.observe(root, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    const meteor = meteorRef.current;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let timer = 0;
    const schedule = () => {
      const wait = METEOR_MIN + Math.random() * (METEOR_MAX - METEOR_MIN);
      timer = window.setTimeout(launch, wait * 1000);
    };
    const launch = () => {
      schedule();
      if (!meteor || reduced.matches || document.hidden) return;
      const rightward = Math.random() < 0.5;
      const angle = 16 + Math.random() * 26;
      meteor.style.setProperty(
        "--x",
        `${(8 + Math.random() * 84).toFixed(1)}%`,
      );
      meteor.style.setProperty(
        "--y",
        `${(4 + Math.random() * 48).toFixed(1)}%`,
      );
      meteor.style.setProperty(
        "--angle",
        `${(rightward ? angle : 180 - angle).toFixed(1)}deg`,
      );
      meteor.style.setProperty(
        "--reach",
        `${Math.round(260 + Math.random() * 300)}px`,
      );
      // Restart the animation: drop the flag, flush styles, set it again.
      delete meteor.dataset.go;
      void meteor.offsetWidth;
      meteor.dataset.go = "";
    };
    schedule();

    return () => {
      window.clearTimeout(pending);
      window.clearTimeout(timer);
      window.removeEventListener("resize", onResize);
      themeWatch.disconnect();
    };
  }, []);

  return (
    <div className="sky" aria-hidden="true">
      <canvas ref={canvasRef} className="sky__stars" tabIndex={-1} />
      <span ref={meteorRef} className="sky__meteor" />
    </div>
  );
}
