import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function DemoCanvas({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex h-full min-h-0 w-full flex-1 items-center justify-center bg-[#F4F6F8] p-6 sm:p-8 lg:p-10 dark:bg-surface-alt",
        className,
      )}
    >
      {children}
    </div>
  );
}
