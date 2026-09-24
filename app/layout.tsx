import "./globals.css";

import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Newsreader } from "next/font/google";

import { ThemeGuard } from "@/components/theme-guard";
import { profile } from "@/lib/content";
import { themeInitScript } from "@/lib/theme-script";

const serif = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  variable: "--font-serif",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const title = `${profile.name} — ${profile.role}`;
const description =
  "Software engineer and Rice MCS student building software that makes complex systems easy to see and use — React rewrites, RxJS data flows, D3 visual analytics, and fast Python tooling.";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  title,
  description,
  authors: [{ name: profile.name, url: profile.github }],
  creator: profile.name,
  keywords: [
    profile.name,
    "software engineer",
    "React",
    "Next.js",
    "TypeScript",
    "RxJS",
    "D3",
    "data visualization",
  ],
  openGraph: {
    type: "website",
    title,
    description,
    siteName: profile.name,
  },
  twitter: { card: "summary_large_image", title, description },
};

export const viewport: Viewport = {
  colorScheme: "dark light",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#131312" },
    { media: "(prefers-color-scheme: light)", color: "#ede8df" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${serif.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: static, first-party theme bootstrap
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
      </head>
      <body>
        <ThemeGuard />
        {children}
      </body>
    </html>
  );
}
