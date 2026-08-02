import "@fontsource-variable/cormorant-garamond";
import "./globals.css";

import { GeistSans } from "geist/font/sans";
import type { Metadata, Viewport } from "next";

import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";

const themeInitScript = `
  (() => {
    try {
      const saved = localStorage.getItem("suhyeon-theme");
      const theme = saved === "light" || saved === "dark" || saved === "system"
        ? saved
        : "system";
      const resolved = theme === "system"
        ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
        : theme;
      const root = document.documentElement;
      root.classList.toggle("dark", resolved === "dark");
      root.dataset.theme = theme;
      root.dataset.resolvedTheme = resolved;
      root.style.colorScheme = resolved;
    } catch {
      document.documentElement.dataset.theme = "system";
    }
  })();
`;

export const metadata: Metadata = {
  title: {
    default: "Suhyeon Yu — Frontend-Focused Software Engineer",
    template: "%s — Suhyeon Yu",
  },
  description:
    "Frontend-focused software engineer who crafts web experiences for both humans and agents.",
  authors: [{ name: "Suhyeon Yu" }],
  creator: "Suhyeon Yu",
  category: "technology",
  keywords: [
    "Suhyeon Yu",
    "software engineer",
    "frontend engineer",
    "Next.js",
    "machine learning visualization",
    "PyTorch",
    "D3.js",
  ],
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f2eb" },
    { media: "(prefers-color-scheme: dark)", color: "#0f0f0f" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={GeistSans.variable} suppressHydrationWarning>
      <head>
        <script>{themeInitScript}</script>
        <link
          rel="preload"
          href="/images/portrait/suhyeon-mountain-dithered.jpg"
          as="image"
          type="image/jpeg"
        />
      </head>
      <body>
        <ThemeProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
