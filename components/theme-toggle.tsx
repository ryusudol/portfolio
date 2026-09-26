"use client";

import { Moon, Sun } from "reicon-react";

import { toggleTheme, useTheme } from "@/lib/theme";

export function ThemeToggle() {
  const theme = useTheme();
  const next = theme === "ink" ? "paper" : "ink";
  return (
    <button
      type="button"
      className="action action--nav action--icon"
      aria-label={`Switch to ${next} theme`}
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        toggleTheme({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
      }}
    >
      {theme === "ink" ? (
        <Sun size={14} aria-hidden />
      ) : (
        <Moon size={14} aria-hidden />
      )}
    </button>
  );
}
