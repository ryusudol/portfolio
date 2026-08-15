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
        "flex h-full min-h-0 w-full flex-1 items-center justify-center bg-linear-to-br from-[#F9FAFB] to-[#D2D6DB] p-6 sm:p-8 lg:p-10 dark:from-[#1A1C1F] dark:to-[#2F343A]",
        className,
      )}
    >
      {children}
    </div>
  );
}
