"use client";

import { type RefObject, useEffect, useLayoutEffect, useState } from "react";

export type ScrollStageProgress = {
  /** Clamped 0–1 progress through the scroll stage. Always 1 when reduced motion is preferred. */
  progress: number;
  reducedMotion: boolean;
};

/**
 * Tracks how far the user has scrolled through a tall stage element.
 * Progress is 0 when the stage top meets the viewport top, and 1 when
 * the stage bottom meets the viewport bottom (fully scrubbed).
 */
export function useScrollStageProgress(
  stageRef: RefObject<HTMLElement | null>,
): ScrollStageProgress {
  const [progress, setProgress] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Apply reduced-motion before paint so copy isn't briefly invisible.
  useLayoutEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");

    const applyReducedMotion = (matches: boolean) => {
      setReducedMotion(matches);
      if (matches) setProgress(1);
    };

    applyReducedMotion(media.matches);

    const onMediaChange = (event: MediaQueryListEvent) => {
      applyReducedMotion(event.matches);
    };

    media.addEventListener("change", onMediaChange);
    return () => media.removeEventListener("change", onMediaChange);
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      setProgress(1);
      return;
    }

    let frame = 0;

    const measure = () => {
      const stage = stageRef.current;
      if (!stage) return;

      const rect = stage.getBoundingClientRect();
      const travel = rect.height - window.innerHeight;

      if (travel <= 0) {
        setProgress(1);
        return;
      }

      const next = Math.min(1, Math.max(0, -rect.top / travel));
      setProgress(next);
    };

    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [stageRef, reducedMotion]);

  return { progress, reducedMotion };
}

/** Smoothstep curve for less mechanical scroll scrubbing. */
export function smoothstep(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}
