import "./globals.css";

import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Jost } from "next/font/google";

import { BackToTop } from "@/components/back-to-top";
import { SiteAudio } from "@/components/site-audio";
import { SocialLinks } from "@/components/social-links";
import { SpaceBackdrop } from "@/components/space-backdrop";
import { ThemeGuard } from "@/components/theme-guard";
import { profile } from "@/lib/content";
import { themeInitScript } from "@/lib/theme-script";

/** A geometric sans in the Futura line, the face on the Apollo 11 plaque. */
const sans = Jost({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const title = `${profile.name} — ${profile.role}`;
const description =
  "Software engineer and Rice MCS student working across frontend engineering, data visualization, and machine learning.";

export const metadata: Metadata = {
  // Unset, Next falls back to the deployment's own URL (localhost in dev).
  metadataBase: process.env.NEXT_PUBLIC_SITE_URL
    ? new URL(process.env.NEXT_PUBLIC_SITE_URL)
    : undefined,
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
    { media: "(prefers-color-scheme: dark)", color: "#05070d" },
    { media: "(prefers-color-scheme: light)", color: "#e9ecf2" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${mono.variable}`}
      // Smooth scrolling for in-page links only; page changes jump to the top.
      data-scroll-behavior="smooth"
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
        <SpaceBackdrop />
        {children}
        <div className="site-dock">
          <BackToTop />
          <SocialLinks />
          <SiteAudio />
        </div>
      </body>
    </html>
  );
}
