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
      className="copy-email-button"
      data-copied={copied}
      aria-label={copied ? "Email copied" : "Copy email"}
      onClick={copyEmail}
    >
      <span className="copy-label-stack" aria-hidden="true">
        <span className="copy-label copy-label--default">Copy my email</span>
        <span className="copy-label copy-label--success">Email copied!</span>
      </span>
      <span className="copy-icon-stage" aria-hidden="true">
        <Copy className="copy-icon copy-icon--default" />
        <span className="copy-icon-connector" />
        <Check className="copy-icon copy-icon--success" />
      </span>
      <span className="sr-only" aria-live="polite">
        {copied ? "Email copied!" : ""}
      </span>
    </button>
  );
}
