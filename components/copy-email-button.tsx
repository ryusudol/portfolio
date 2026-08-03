"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

export function CopyEmailButton({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<number | undefined>(undefined);

  useEffect(
    () => () => {
      window.clearTimeout(timeoutRef.current);
    },
    [],
  );

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => setCopied(false), 3000);
    } catch {
      window.location.href = `mailto:${email}`;
    }
  }

  return (
    <Button
      type="button"
      variant="default"
      className="group h-[2.55rem] min-h-[2.55rem] rounded-[0.9rem] border-0 bg-foreground px-4 text-[0.88rem] font-[540] text-background transition-[transform,opacity] duration-instant ease-in-out hover:bg-foreground hover:opacity-90 active:scale-[0.97] focus-visible:border-transparent focus-visible:ring-0 motion-reduce:animate-none motion-reduce:transition-none"
      data-copied={copied}
      aria-label={copied ? "Email copied" : "Copy email"}
      onClick={copyEmail}
    >
      <span className="grid" aria-hidden="true">
        <span className="col-start-1 row-start-1 transition-[transform,opacity,filter] duration-morph group-data-[copied=true]:-translate-y-[0.3rem] group-data-[copied=true]:opacity-0 group-data-[copied=true]:blur-sm">
          Copy my email
        </span>
        <span className="col-start-1 row-start-1 translate-y-[0.3rem] opacity-0 blur-sm transition-[transform,opacity,filter] duration-morph group-data-[copied=true]:translate-y-0 group-data-[copied=true]:opacity-100 group-data-[copied=true]:blur-none">
          Email copied!
        </span>
      </span>
      <span className="sr-only" aria-live="polite">
        {copied ? "Email copied!" : ""}
      </span>
    </Button>
  );
}
