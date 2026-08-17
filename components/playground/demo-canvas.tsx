"use client";

import type { ReactNode } from "react";

import { useDemoPreview } from "@/components/playground/demo-preview";
import { cn } from "@/lib/utils";

export function DemoCanvas({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const preview = useDemoPreview();

  return (
    <div
      data-demo-canvas
      className={cn(
        "flex items-center justify-center",
        preview
          ? "h-auto w-auto min-h-0 flex-none bg-transparent p-0 [&>*]:overflow-hidden [&>*]:rounded-[0.9rem] [&>*]:shadow-[0_18px_42px_rgb(35_30_26/18%)] dark:[&>*]:shadow-[0_18px_42px_rgb(255_255_255/16%),0_4px_14px_rgb(255_255_255/8%)]"
          : "h-full min-h-0 w-full flex-1 bg-linear-to-br from-[#F9FAFB] to-[#D2D6DB] p-6 sm:p-8 lg:p-10 dark:from-[#1A1C1F] dark:to-[#2F343A]",
        !preview && className,
      )}
    >
      {children}
    </div>
  );
}
