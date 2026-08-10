"use client";

import { useRef, useState } from "react";

import { DemoPanel } from "@/components/playground/demo-panel";
import { getUICraftEntry, uiCraftEntries } from "@/lib/playground/ui";
import {
  smoothstep,
  useScrollStageProgress,
} from "@/lib/use-scroll-stage-progress";
import { cn } from "@/lib/utils";

/** Shared settled width for the demo stage and explanation (`max-w-2xl`). */
const CONTENT_MAX_WIDTH_REM = 42;

/** Hero / settled stage min-heights — kept as paired (vh, rem) caps. */
const HERO_MIN_HEIGHT_VH = 70;
const HERO_MIN_HEIGHT_REM = 40;
const SETTLED_MIN_HEIGHT_VH = 36;
const SETTLED_MIN_HEIGHT_REM = 22;

function lerp(from: number, to: number, t: number) {
  return from + (to - from) * t;
}

export function UICraftWorkspace() {
  const [selectedSlug, setSelectedSlug] = useState(
    uiCraftEntries[0]?.slug ?? "",
  );

  const stageRef = useRef<HTMLElement>(null);
  const { progress, reducedMotion } = useScrollStageProgress(stageRef);
  const entry = getUICraftEntry(selectedSlug);

  if (!entry) return null;

  const eased = smoothstep(progress);
  const copyOpacity = reducedMotion ? 1 : eased;
  const copyTranslate = reducedMotion ? 0 : lerp(1.25, 0, eased);

  // Hero: 100% shell width → settled: same as explanation (42rem / max-w-2xl)
  const demoMaxWidth = reducedMotion
    ? `${CONTENT_MAX_WIDTH_REM}rem`
    : `calc(${(1 - eased) * 100}% + ${eased * CONTENT_MAX_WIDTH_REM}rem)`;

  // Hero min-height → compact settled stage (same progress curve as width)
  const demoMinHeight = reducedMotion
    ? `min(${SETTLED_MIN_HEIGHT_VH}vh, ${SETTLED_MIN_HEIGHT_REM}rem)`
    : `min(${lerp(HERO_MIN_HEIGHT_VH, SETTLED_MIN_HEIGHT_VH, eased)}vh, ${lerp(HERO_MIN_HEIGHT_REM, SETTLED_MIN_HEIGHT_REM, eased)}rem)`;

  return (
    <div data-testid="ui-craft-workspace" className="grid gap-6">
      <section
        ref={stageRef}
        className={cn(
          "relative",
          reducedMotion ? "h-auto" : "h-[170vh] max-sm:h-[145vh]",
        )}
      >
        <div
          className={cn(
            "flex w-full flex-col items-center gap-8",
            reducedMotion
              ? "relative"
              : "sticky top-36 max-sm:top-28 min-h-[calc(100svh-10rem)] max-sm:min-h-[calc(100svh-8rem)] justify-start pt-1 pb-10",
          )}
        >
          <div className="flex w-full flex-col items-center gap-4">
            <p className="m-0 w-full text-[0.7rem] font-[590] tracking-[0.12em] text-muted-foreground uppercase">
              Components
            </p>
            <nav
              data-testid="ui-craft-nav"
              aria-label="Components"
              className="flex w-full flex-wrap items-center gap-x-5 gap-y-1"
            >
              {uiCraftEntries.map((item) => {
                const isSelected = item.slug === selectedSlug;

                return (
                  <button
                    key={item.slug}
                    type="button"
                    aria-current={isSelected ? "page" : undefined}
                    className={cn(
                      "border-b py-1 text-[0.86rem] transition-colors duration-instant ease-in-out motion-reduce:transition-none",
                      isSelected
                        ? "border-foreground font-[560] text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground",
                    )}
                    onClick={() => setSelectedSlug(item.slug)}
                  >
                    {item.title}
                  </button>
                );
              })}
            </nav>
          </div>

          <div
            aria-live="polite"
            className="flex w-full flex-col items-center gap-8"
          >
            <div
              className="mx-auto w-full will-change-[max-width] motion-reduce:will-change-auto"
              style={{ maxWidth: demoMaxWidth }}
            >
              <DemoPanel
                slug={entry.slug}
                style={{ minHeight: demoMinHeight }}
              />
            </div>

            <div
              className="grid w-full max-w-2xl gap-6"
              style={{
                opacity: copyOpacity,
                transform: `translateY(${copyTranslate}rem)`,
              }}
            >
              <header className="grid gap-3">
                <h2 className="m-0 text-[1.35rem] font-[610] tracking-[-0.02em]">
                  {entry.title}
                </h2>
                <p className="m-0 text-[0.94rem] leading-[1.68] text-pretty text-muted-foreground">
                  {entry.description}
                </p>
              </header>

              <section className="grid gap-[0.8rem]">
                <p className="m-0 text-[0.7rem] font-[590] tracking-[0.12em] text-muted-foreground uppercase">
                  Rationale
                </p>
                <p
                  data-testid="ui-craft-brief-rationale"
                  className="m-0 text-[0.94rem] leading-[1.72] text-pretty text-muted-foreground"
                >
                  {entry.briefRationale}
                </p>
              </section>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
