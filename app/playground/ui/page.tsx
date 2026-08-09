import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "reicon-react";

import { UICraftWorkspace } from "@/components/playground/ui-craft-workspace";
import { buttonVariants } from "@/components/ui/button";
import { uiCraftCategory } from "@/lib/playground/ui";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "UI Craft — Suhyeon Yu",
  description: uiCraftCategory.description,
};

export default function UICraftPage() {
  return (
    <>
      <Link
        className={cn(
          buttonVariants({ variant: "link" }),
          "h-auto w-fit items-center gap-[0.45rem] p-0 text-[0.8rem] text-muted-foreground no-underline transition-colors duration-instant ease-in-out hover:text-foreground hover:no-underline motion-reduce:transition-none [&>svg]:size-4",
        )}
        href="/#playground"
      >
        <ArrowLeft aria-hidden="true" />
        Back to playground
      </Link>

      <header className="grid gap-4">
        <p className="m-0 text-[0.7rem] font-[590] tracking-[0.12em] text-muted-foreground uppercase">
          Playground
        </p>
        <h1 className="m-0 font-display text-[clamp(2.5rem,9vw,4.25rem)] font-[520] italic leading-[0.95] tracking-[-0.045em]">
          {uiCraftCategory.title}
        </h1>
        <p className="m-0 max-w-140 text-base leading-[1.68] text-pretty text-muted-foreground">
          {uiCraftCategory.description}
        </p>
      </header>

      <UICraftWorkspace />
    </>
  );
}
