"use client";

import { useState } from "react";

import { DemoPanel } from "@/components/playground/demo-panel";
import { getUICraftEntry, uiCraftEntries } from "@/lib/playground/ui";
import { cn } from "@/lib/utils";

export function UICraftWorkspace() {
  const [selectedSlug, setSelectedSlug] = useState(
    uiCraftEntries[0]?.slug ?? "",
  );
  const entry = getUICraftEntry(selectedSlug);

  if (!entry) return null;

  return (
    <div
      data-testid="ui-craft-workspace"
      className="grid gap-10 lg:grid-cols-[minmax(0,12.5rem)_minmax(0,1fr)] lg:gap-14"
    >
      <div className="lg:sticky lg:top-36 lg:self-start lg:border-border lg:pr-4">
        <p className="m-0 mb-3 text-[0.7rem] font-[590] tracking-[0.12em] text-muted-foreground uppercase">
          Components
        </p>
        <nav
          data-testid="ui-craft-nav"
          aria-label="Components"
          className="flex flex-col gap-0.5"
        >
          {uiCraftEntries.map((item) => {
            const isSelected = item.slug === selectedSlug;

            return (
              <button
                key={item.slug}
                type="button"
                aria-current={isSelected ? "page" : undefined}
                className={cn(
                  "w-full py-2 text-left text-[0.86rem] transition-colors duration-instant ease-in-out motion-reduce:transition-none",
                  isSelected
                    ? "border-l-2 border-foreground pl-2.5 font-[560] text-foreground"
                    : "border-l-2 border-transparent pl-2.5 text-muted-foreground hover:bg-[color-mix(in_srgb,var(--color-foreground)_4%,transparent)] hover:text-foreground",
                )}
                onClick={() => setSelectedSlug(item.slug)}
              >
                {item.title}
              </button>
            );
          })}
        </nav>
      </div>

      <div aria-live="polite" className="grid min-w-0 gap-8">
        <header className="grid gap-3">
          <h2 className="m-0 text-[1.35rem] font-[610] tracking-[-0.02em]">
            {entry.title}
          </h2>
          <p className="m-0 max-w-140 text-[0.94rem] leading-[1.68] text-pretty text-muted-foreground">
            {entry.description}
          </p>
        </header>

        <DemoPanel slug={entry.slug} />

        <section className="grid gap-[0.8rem]">
          <p className="m-0 text-[0.7rem] font-[590] tracking-[0.12em] text-muted-foreground uppercase">
            Rationale
          </p>
          <p
            data-testid="ui-craft-brief-rationale"
            className="m-0 max-w-140 text-[0.94rem] leading-[1.72] text-pretty text-muted-foreground"
          >
            {entry.briefRationale}
          </p>
        </section>
      </div>
    </div>
  );
}
