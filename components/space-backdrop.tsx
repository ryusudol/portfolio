"use client";

import { useEffect, useRef } from "react";

/** Seconds between meteors: rare enough that each one is a small surprise. */
const METEOR_MIN = 16;
const METEOR_MAX = 42;

/** Widths `scripts/sky/milkyway.py` renders each frame at. */
const WIDE = [1920, 2880, 3840, 5120, 7680];
const TALL = [810, 1080, 1620, 2160];

const candidates = (name: string, widths: number[]) =>
  widths.map((w) => `/sky/${name}-${w}.avif ${w}w`).join(", ");

/**
 * The far sky behind every page: the Milky Way toward the galactic center,
 * rendered from NASA's Deep Star Maps (`scripts/sky/milkyway.py`), with a
 * meteor crossing now and then. It lives in the root layout, so the same sky
 * stays put while pages change in front of it.
 *
 * The frame covers the viewport, so what the browser needs is the larger of
 * the viewport's width and its height times the frame's aspect; `sizes` says
 * so, and a screen is sent no more pixels than it can show. Portrait screens
 * get a frame composed upright instead of the middle slice of the wide one.
 */
export function SpaceBackdrop() {
  const imageRef = useRef<HTMLImageElement>(null);
  const meteorRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    // Still on its way: hold it clear and let it fade in when it lands. An
    // image that was already there (cached, or no script) just shows.
    const image = imageRef.current;
    const show = () => {
      delete image?.dataset.loading;
    };
    if (image && !image.complete) {
      image.dataset.loading = "";
      image.addEventListener("load", show);
      image.addEventListener("error", show);
    }

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
      window.clearTimeout(timer);
      image?.removeEventListener("load", show);
      image?.removeEventListener("error", show);
    };
  }, []);

  return (
    <div className="sky" aria-hidden="true">
      <picture>
        <source
          media="(orientation: portrait)"
          type="image/avif"
          srcSet={candidates("milkyway-tall", TALL)}
          sizes="max(100vw, 56.25vh)"
        />
        <source
          type="image/avif"
          srcSet={candidates("milkyway", WIDE)}
          sizes="max(100vw, 177.78vh)"
        />
        {/* A plain img: the frames are already rendered at every size, and
            the image optimizer would re-encode an 8K source on demand. */}
        <img
          ref={imageRef}
          className="sky__image"
          src="/sky/milkyway-1920.avif"
          alt=""
          decoding="async"
        />
      </picture>
      <span ref={meteorRef} className="sky__meteor" />
    </div>
  );
}
