import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SkipToContent() {
  return (
    <a
      className={cn(
        buttonVariants({ variant: "outline" }),
        "fixed top-3 left-3 z-[100] h-auto -translate-y-[180%] rounded-xl border-border-strong bg-surface px-4 py-[0.7rem] text-[0.85rem] shadow-portfolio transition-transform duration-motion ease-in-out hover:bg-surface focus:translate-y-0 focus-visible:ring-0 motion-reduce:transition-none",
      )}
      href="#content"
    >
      Skip to content
    </a>
  );
}
