"use client";

import { useState } from "react";
import { ChevronDown } from "reicon-react";

import { cn } from "@/lib/utils";

const items = [
  {
    id: "item-1",
    title: "What is UI Craft?",
    body: "A space to document component decisions with live demos and rationale.",
  },
  {
    id: "item-2",
    title: "How does this demo work?",
    body: "This is a placeholder accordion shell. The full implementation will replace it.",
  },
  {
    id: "item-3",
    title: "What comes next?",
    body: "Real GreatFrontEnd components with props tables and code snippets.",
  },
] as const;

export function Accordion() {
  const [openId, setOpenId] = useState<string | null>("item-1");

  return (
    <div className="grid gap-2">
      {items.map((item) => {
        const isOpen = openId === item.id;

        return (
          <div
            key={item.id}
            className="overflow-hidden rounded-[0.8rem] border border-border bg-[#F4F6F8] dark:bg-surface-alt"
          >
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-[0.86rem] font-[560] transition-colors duration-instant ease-in-out hover:bg-surface-hover motion-reduce:transition-none"
              aria-expanded={isOpen}
              aria-controls={`accordion-${item.id}-panel`}
              id={`accordion-${item.id}-trigger`}
              onClick={() => setOpenId(isOpen ? null : item.id)}
            >
              {item.title}
              <ChevronDown
                aria-hidden="true"
                className={cn(
                  "size-4 shrink-0 text-muted-foreground transition-transform duration-panel ease-in-out motion-reduce:transition-none",
                  isOpen && "rotate-180",
                )}
              />
            </button>
            <section
              id={`accordion-${item.id}-panel`}
              aria-labelledby={`accordion-${item.id}-trigger`}
              className={cn(
                "grid transition-[grid-template-rows] duration-panel ease-in-out motion-reduce:transition-none",
                isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
              )}
            >
              <div className="min-h-0 overflow-hidden">
                <p className="m-0 border-t border-border px-4 py-3 text-[0.82rem] leading-[1.6] text-muted-foreground">
                  {item.body}
                </p>
              </div>
            </section>
          </div>
        );
      })}
    </div>
  );
}
