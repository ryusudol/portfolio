"use client";

import type { CSSProperties } from "react";

import { getUICraftDemo } from "@/components/playground/ui-craft";
import { cn } from "@/lib/utils";

/**
 * Stage chrome for a UI Craft demo (border, radius, scroll-driven size).
 * Background lives on each demo via {@link DemoCanvas} (or a custom full-bleed root).
 */
export function DemoPanel({
  slug,
  className,
  style,
}: {
  slug: string;
  className?: string;
  style?: CSSProperties;
}) {
  const Demo = getUICraftDemo(slug);

  if (!Demo) return null;

  return (
    <div
      data-testid="ui-craft-demo"
      data-slug={slug}
      className={cn(
        "flex h-full w-full min-h-0 flex-col overflow-hidden border border-border",
        className,
      )}
      style={style}
    >
      <Demo />
    </div>
  );
}
