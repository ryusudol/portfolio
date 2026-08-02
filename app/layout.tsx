import "@fontsource-variable/cormorant-garamond";
import "./globals.css";

import { GeistSans } from "geist/font/sans";
import type { Metadata, Viewport } from "next";

import { ThemeProvider } from "@/components/theme-provider";

const description =
  "Suhyeon Yu is a frontend-focused software engineer crafting web experiences for both humans and agents.";

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
      document.documentElement.dataset.resolvedTheme = "light";
    }
  })();
`;

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  title: "Suhyeon Yu — Software Engineer",
  description,
  authors: [{ name: "Suhyeon Yu" }],
  creator: "Suhyeon Yu",
  category: "technology",
  keywords: [
    "Suhyeon Yu",
    "software engineer",
    "frontend engineer",
    "AI interfaces",
    "Next.js",
    "React",
    "PyTorch",
    "data visualization",
  ],
  openGraph: {
    type: "website",
    title: "Suhyeon Yu — Software Engineer",
    description,
    siteName: "Suhyeon Yu",
  },
  twitter: {
    card: "summary_large_image",
    title: "Suhyeon Yu — Software Engineer",
    description,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f9fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#181715" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={GeistSans.variable}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <head>
        <script>{themeInitScript}</script>
        <link
          rel="preload"
          href="/images/portrait/suhyeon-mountain-profile.png"
          as="image"
          type="image/png"
        />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
