"use client";

import { Moon, Sun } from "reicon-react";

import { toggleTheme, useTheme } from "@/lib/theme";

export function ThemeToggle() {
  const theme = useTheme();
  const next = theme === "ink" ? "Paper" : "Ink";
  return (
    <button
      type="button"
      className="pill pill--quiet"
      aria-label={`Switch to ${next.toLowerCase()} theme`}
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
      <span>{next}</span>
    </button>
  );
}
