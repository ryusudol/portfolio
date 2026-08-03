"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "reicon-react";

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
    <button
      type="button"
      className="group flex h-[2.55rem] min-h-[2.55rem] items-center justify-center gap-2 rounded-[0.9rem] border-0 bg-foreground px-4 text-[0.88rem] font-[540] text-background transition-[transform,opacity] duration-[140ms] ease-in-out hover:opacity-90 active:scale-[0.97] motion-reduce:animate-none motion-reduce:transition-none [&_svg]:size-4"
      data-copied={copied}
      aria-label={copied ? "Email copied" : "Copy email"}
      onClick={copyEmail}
    >
      <span className="grid" aria-hidden="true">
        <span className="col-start-1 row-start-1 transition-[transform,opacity,filter] duration-500 group-data-[copied=true]:-translate-y-[0.3rem] group-data-[copied=true]:opacity-0 group-data-[copied=true]:blur-sm">
          Copy my email
        </span>
        <span className="col-start-1 row-start-1 translate-y-[0.3rem] opacity-0 blur-sm transition-[transform,opacity,filter] duration-500 group-data-[copied=true]:translate-y-0 group-data-[copied=true]:opacity-100 group-data-[copied=true]:blur-none">
          Email copied!
        </span>
      </span>
      <span className="relative size-4 shrink-0" aria-hidden="true">
        <Copy
          className="absolute inset-0 transition-[transform,opacity,filter] duration-[520ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] group-data-[copied=true]:translate-x-[0.28rem] group-data-[copied=true]:-translate-y-[0.28rem] group-data-[copied=true]:rotate-[14deg] group-data-[copied=true]:scale-[0.62] group-data-[copied=true]:opacity-0 group-data-[copied=true]:blur-sm motion-reduce:transition-none"
          data-testid="copy-icon-default"
        />
        <span className="absolute top-1/2 left-1/2 h-px w-[0.72rem] -translate-x-1/2 -translate-y-1/2 rotate-[-45deg] scale-x-0 rounded-full bg-current opacity-0 group-data-[copied=true]:animate-icon-connect motion-reduce:animate-none" />
        <Check
          className="absolute inset-0 translate-x-[-0.28rem] translate-y-[0.28rem] -rotate-[18deg] scale-[0.62] opacity-0 blur-sm transition-[transform,opacity,filter] duration-[520ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] group-data-[copied=true]:translate-x-0 group-data-[copied=true]:translate-y-0 group-data-[copied=true]:rotate-0 group-data-[copied=true]:scale-100 group-data-[copied=true]:opacity-100 group-data-[copied=true]:blur-none motion-reduce:transition-none"
          data-testid="copy-icon-success"
        />
      </span>
      <span className="sr-only" aria-live="polite">
        {copied ? "Email copied!" : ""}
      </span>
    </button>
  );
}
