import Link from "next/link";

import { profile } from "@/lib/content";

import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link className="brand" href="/" aria-label={`${profile.name} — home`}>
        <Logo />
      </Link>
      <div className="site-header__actions">
        <Link className="pill pill--quiet hide-compact" href="/playground">
          Playground
        </Link>
        <Link className="pill pill--quiet hide-compact" href="/#contact">
          Contact
        </Link>
        <ThemeToggle />
      </div>
    </header>
  );
}
