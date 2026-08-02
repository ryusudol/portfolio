"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "reicon-react";

export function BackToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let frameRequest = 0;

    const updateVisibility = () => {
      frameRequest = 0;
      setIsVisible(window.scrollY > 80);
    };

    const scheduleUpdate = () => {
      if (!frameRequest) {
        frameRequest = window.requestAnimationFrame(updateVisibility);
      }
    };

    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    updateVisibility();

    return () => {
      window.cancelAnimationFrame(frameRequest);
      window.removeEventListener("scroll", scheduleUpdate);
    };
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <a
      href="#top"
      className="back-to-top-button focus-ring"
      data-testid="back-to-top"
    >
      <ArrowUp aria-hidden="true" className="size-4" />
      <span>Back to top</span>
    </a>
  );
}
