import Link from "next/link";

import { DemoPanel } from "@/components/playground/demo-panel";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { getUICraftEntryHref, uiCraftEntries } from "@/lib/playground/ui";
import { cn } from "@/lib/utils";

/** Public UI Craft index: live demo tiles linking to each component page. */
export function UICraftWorkspace() {
  return (
    <ul
      data-testid="ui-craft-workspace"
      aria-label="Components"
      className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3"
    >
      {uiCraftEntries.map((entry) => (
        <li key={entry.slug} className="min-w-0">
          <Link
            href={getUICraftEntryHref(entry.slug)}
            className={cn(
              "group block min-w-0 rounded-portfolio",
              "transition-transform duration-panel ease-in-out",
              "active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            )}
            aria-label={`View ${entry.title}`}
          >
            <Card
              data-testid="ui-craft-card"
              data-slug={entry.slug}
              className="h-full gap-0 overflow-hidden rounded-portfolio bg-[#FBFCFD] py-0 ring-0 dark:bg-[color-mix(in_srgb,white_5%,var(--background))]"
            >
              <div
                aria-hidden="true"
                inert
                className="pointer-events-none flex flex-1 items-center justify-center overflow-visible px-5 py-8 max-sm:px-3"
              >
                <div className="origin-center transition-transform duration-panel ease-in-out group-hover:scale-[1.04] motion-reduce:transition-none max-sm:scale-[0.9] max-sm:group-hover:scale-[0.94]">
                  <DemoPanel slug={entry.slug} preview />
                </div>
              </div>
              <CardContent className="relative z-1 mt-auto grid gap-1 border-0 bg-transparent px-5 pt-7 pb-5">
                <CardTitle className="m-0 text-base font-[610]">
                  {entry.title}
                </CardTitle>
                <CardDescription className="text-[0.82rem] leading-[1.55] text-pretty text-muted-foreground">
                  {entry.description}
                </CardDescription>
              </CardContent>
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  );
}
