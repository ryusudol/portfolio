"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "reicon-react";

const src = "/music/Humanity's-Last-Machine.mp3";

/** A fixed play/pause for the site's theme; it lives in the root layout so it
    keeps playing across page navigations. Never autoplays. */
export function SiteAudio() {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const el = audio.current;
    if (!el) return;
    const sync = () => setPlaying(!el.paused);
    el.addEventListener("play", sync);
    el.addEventListener("pause", sync);
    return () => {
      el.removeEventListener("play", sync);
      el.removeEventListener("pause", sync);
    };
  }, []);

  const toggle = () => {
    const el = audio.current;
    if (!el) return;
    if (el.paused) el.play().catch(() => setPlaying(false));
    else el.pause();
  };

  const Icon = playing ? Pause : Play;
  return (
    <div className="site-audio">
      <button
        type="button"
        className="site-audio__button"
        aria-pressed={playing}
        aria-label={playing ? "Pause site music" : "Play site music"}
        onClick={toggle}
      >
        <span className="site-audio__icon">
          <Icon size={10} weight="Filled" aria-hidden />
        </span>
        <span className="site-audio__label">Site audio</span>
        <span className="site-audio__bars" aria-hidden>
          <span />
          <span />
          <span />
        </span>
      </button>
      {/* biome-ignore lint/a11y/useMediaCaption: instrumental background music */}
      <audio ref={audio} src={src} preload="none" loop />
    </div>
  );
}
