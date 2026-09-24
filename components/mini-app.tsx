"use client";

import { type CSSProperties, useSyncExternalStore } from "react";
import { Sparkle } from "reicon-react";

import { dots } from "@/lib/dots/runtime";
import { setTheme, useTheme } from "@/lib/theme";

/**
 * A real, keyboard-accessible control panel. The visible chrome is traced by
 * particles (`data-dots`), while native inputs underneath do the work.
 */
export function MiniApp() {
  const theme = useTheme();
  const { temperature } = useSyncExternalStore(
    dots.subscribe,
    dots.getSnapshot,
    dots.getServerSnapshot,
  );

  return (
    <div
      className="mini"
      data-dots="outline"
      data-dots-spread="1.6"
      data-dots-weight="1.1"
    >
      <div className="mini__bar">
        <span className="mini__led" aria-hidden />
        <span>profile.app</span>
        <span className="mini__live">live</span>
      </div>
      <div className="mini__rule" data-dots="rule" data-dots-spread="0.8" />

      <label className="mini__row">
        <span>Ink mode</span>
        <span className="switch">
          <input
            type="checkbox"
            role="switch"
            aria-checked={theme === "ink"}
            checked={theme === "ink"}
            onChange={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              setTheme(e.currentTarget.checked ? "ink" : "paper", {
                x: r.left + r.width / 2,
                y: r.top + r.height / 2,
              });
            }}
          />
          <span
            className="switch__track"
            data-dots="outline"
            data-dots-spread="1"
            aria-hidden
          />
          <span
            className="switch__knob"
            data-dots="disc"
            data-dots-weight="3"
            aria-hidden
          />
        </span>
      </label>

      <label
        className="mini__row"
        style={{ "--v": temperature } as CSSProperties}
      >
        <span>
          Temperature <b className="mini__value">{temperature.toFixed(2)}</b>
        </span>
        <span className="slider">
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={temperature}
            onChange={(e) => dots.setTemperature(Number(e.currentTarget.value))}
          />
          <span
            className="slider__track"
            data-dots="rule"
            data-dots-spread="0.7"
            aria-hidden
          />
          <span
            className="slider__fill"
            data-dots="rule"
            data-dots-tint="1"
            data-dots-weight="1.6"
            data-dots-spread="0.9"
            aria-hidden
          />
          <span
            className="slider__thumb"
            data-dots="disc"
            data-dots-tint="1"
            data-dots-weight="3"
            aria-hidden
          />
        </span>
      </label>

      <button
        type="button"
        className="mini__button"
        data-dots="outline"
        data-dots-spread="1.2"
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          dots.burst(r.left + r.width / 2, r.top + r.height / 2, 1.4);
        }}
      >
        <Sparkle size={14} aria-hidden />
        Scatter
      </button>
    </div>
  );
}
