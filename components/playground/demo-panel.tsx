"use client";

import { getUICraftDemo } from "@/components/playground/ui-craft";

export function DemoPanel({ slug }: { slug: string }) {
  const Demo = getUICraftDemo(slug);

  if (!Demo) return null;

  return (
    <div
      data-testid="ui-craft-demo"
      data-slug={slug}
      className="overflow-hidden rounded-lg"
    >
      <Demo />
    </div>
  );
}
