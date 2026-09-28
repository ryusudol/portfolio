"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "reicon-react";

/** A round up-arrow that floats above the dock once the page is scrolled past
    most of the first screen. Scrolling defers to the root's CSS
    scroll-behavior, so it glides normally and jumps under reduced motion. */
export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const sync = () => setVisible(window.scrollY > window.innerHeight * 0.8);
    sync();
    window.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    return () => {
      window.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, []);

  return (
    <button
      type="button"
      className="site-top"
      data-visible={visible}
      inert={!visible}
      title="Back to top"
      onClick={() => window.scrollTo({ top: 0 })}
    >
      <ArrowUp size={15} aria-hidden />
      <span className="sr-only">Back to top</span>
    </button>
  );
}
