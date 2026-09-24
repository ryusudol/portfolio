import { profile } from "@/lib/content";

import { ThemeToggle } from "./theme-toggle";

export function SiteHeader() {
  return (
    <header className="site-header">
      <a className="brand" href="#intro">
        <span className="brand__name">{profile.name}</span>
        <span className="brand__role">{profile.role}</span>
      </a>
      <div className="site-header__actions">
        <a className="pill pill--quiet hide-compact" href="#contact">
          Say hello
        </a>
        <ThemeToggle />
      </div>
    </header>
  );
}
