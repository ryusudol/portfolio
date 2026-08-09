import Link from "next/link";
import { Monitor } from "reicon-react";

import { UICraftPreview } from "@/components/playground/ui-craft-preview";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { uiCraftCategory } from "@/lib/playground/ui";

export function PlaygroundSection() {
  return (
    <section
      id="playground"
      data-testid="playground-section"
      className="flex scroll-mt-36 flex-col gap-[2.8rem] max-sm:gap-9"
    >
      <div className="flex items-center gap-[0.65rem] [&>svg]:size-[1.15rem] [&>svg]:text-muted-foreground">
        <Monitor aria-hidden="true" />
        <h2 className="m-0 text-base font-[570] tracking-[-0.01em]">
          Playground
        </h2>
      </div>
      <Link
        href={uiCraftCategory.href}
        className="group block min-w-0 transition-[filter,transform] duration-panel ease-in-out active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100"
        aria-label={`Explore ${uiCraftCategory.title}`}
      >
        <Card className="h-full gap-0 overflow-hidden rounded-portfolio border border-border/80 bg-[#F4F6F8] py-0 ring-0 dark:bg-surface">
          <UICraftPreview variant="category" />
          <CardContent className="relative z-1 flex flex-1 flex-col border-0 bg-transparent px-5 pt-7 pb-5">
            <CardTitle className="mt-2 mb-0 text-base font-[610]">
              {uiCraftCategory.title}
            </CardTitle>
            <CardDescription className="mt-[0.55rem] mb-4 text-[0.82rem] leading-[1.6] text-pretty text-muted-foreground">
              {uiCraftCategory.description}
            </CardDescription>
          </CardContent>
        </Card>
      </Link>
    </section>
  );
}
