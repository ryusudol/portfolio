"use client";

import { useEffect } from "react";

import { preferredTheme } from "@/lib/theme";

/**
 * React can re-create the <html> element (e.g. StrictMode's dev remount),
 * which drops the theme the inline script set before paint. Re-assert it.
 */
export function ThemeGuard() {
  useEffect(() => {
    const theme = preferredTheme();
    if (document.documentElement.dataset.theme !== theme) {
      document.documentElement.dataset.theme = theme;
    }
  }, []);
  return null;
}
