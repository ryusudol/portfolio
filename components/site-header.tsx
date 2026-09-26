"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { profile } from "@/lib/content";

import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";

const nav = [
  { href: "/work", label: "Work", className: "action action--nav" },
  {
    href: "/playground",
    label: "Playground",
    className: "action action--nav hide-compact",
  },
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header className="site-header">
      <Link className="brand" href="/" aria-label={`${profile.name} — home`}>
        <Logo />
      </Link>
      <div className="site-header__actions">
        {nav.map((item) => (
          <Link
            key={item.href}
            className={item.className}
            href={item.href}
            aria-current={pathname === item.href ? "page" : undefined}
          >
            {item.label}
          </Link>
        ))}
        <ThemeToggle />
      </div>
    </header>
  );
}
