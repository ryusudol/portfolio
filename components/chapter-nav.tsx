"use client";

import { useSyncExternalStore } from "react";

import { chapters, pad } from "@/lib/content";
import { dots } from "@/lib/dots/runtime";

export function ChapterNav() {
  const { active } = useSyncExternalStore(
    dots.subscribe,
    dots.getSnapshot,
    dots.getServerSnapshot,
  );

  return (
    <nav className="chapter-nav" aria-label="Chapters">
      <ol>
        {chapters.map((chapter, i) => (
          <li key={chapter.id}>
            <a
              href={`#${chapter.id}`}
              aria-current={active === i ? "step" : undefined}
              aria-label={`${pad(i)} ${chapter.label}`}
            >
              <span className="chapter-nav__label">{chapter.label}</span>
              <span className="chapter-nav__index">{pad(i)}</span>
              <span className="chapter-nav__tick" />
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
