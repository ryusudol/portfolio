"use client";

import type { CSSProperties } from "react";

import { DemoPreviewProvider } from "@/components/playground/demo-preview";
import { getUICraftDemo } from "@/components/playground/ui-craft";
import { cn } from "@/lib/utils";

/**
 * Stage chrome for a UI Craft demo (border, radius, size).
 * Background lives on {@link DemoCanvas} (override per demo via `className`).
 * Set {@link preview} on the catalog index so the canvas fill is omitted.
 */
export function DemoPanel({
  slug,
  className,
  style,
  preview = false,
}: {
  slug: string;
  className?: string;
  style?: CSSProperties;
  preview?: boolean;
}) {
  const Demo = getUICraftDemo(slug);

  if (!Demo) return null;

  const panel = (
    <div
      data-testid="ui-craft-demo"
      data-slug={slug}
      className={cn(
        "flex min-h-0 flex-col",
        preview
          ? "h-auto w-auto overflow-visible border-0 bg-transparent"
          : "h-full w-full overflow-hidden border border-border",
        className,
      )}
      style={style}
    >
      <Demo />
    </div>
  );

  if (!preview) return panel;

  return <DemoPreviewProvider>{panel}</DemoPreviewProvider>;
}
