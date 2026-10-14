import type { ReactNode } from "react";

/** Syntax colors for the short listings the story chapters pin to a stage. */
export const tok = {
  c: (s: string) => <span className="tok-comment">{s}</span>,
  k: (s: string) => <span className="tok-key">{s}</span>,
  s: (s: string) => <span className="tok-string">{s}</span>,
  f: (s: string) => <span className="tok-fn">{s}</span>,
};

/** Pads code of `length` characters out to the listing's comment column. */
export const pad = (length: number, column = 40) =>
  " ".repeat(Math.max(2, column - length));

/**
 * A short listing pinned to the top of a chapter's stage, captioned with whose
 * code it is so the particles below read as that code's work.
 */
export function Snippet({
  label,
  ours = false,
  lines,
}: {
  label: string;
  ours?: boolean;
  lines: ReactNode[];
}) {
  return (
    <figure className="snippet" data-reserve="top">
      <figcaption
        className={`snippet__tag${ours ? " snippet__tag--ours" : ""}`}
      >
        {label}
      </figcaption>
      <pre>
        <code>
          {lines.map((line, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static listing
            <span key={i} className="snippet__line">
              {line}
              {"\n"}
            </span>
          ))}
        </code>
      </pre>
    </figure>
  );
}

export function Readout({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="readout readout--story" data-reserve="bottom">
      {items.map(([term, value]) => (
        <div key={term}>
          <dt>{term}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Counter({ name, initial }: { name: string; initial: string }) {
  return <span data-counter={name}>{initial}</span>;
}

export function Change({ from, to }: { from: string; to: string }) {
  return (
    <>
      <span className="readout__from">{from}</span>
      <span className="readout__arrow" aria-hidden>
        {" → "}
      </span>
      <span className="sr-only"> to </span>
      {to}
    </>
  );
}

export function A({ href, children }: { href: string; children: string }) {
  return (
    <a className="inline-link" href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  );
}
