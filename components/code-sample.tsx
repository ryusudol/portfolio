import type { ReactNode } from "react";

const t = {
  c: (s: string) => <span className="tok-comment">{s}</span>,
  k: (s: string) => <span className="tok-key">{s}</span>,
  s: (s: string) => <span className="tok-string">{s}</span>,
  f: (s: string) => <span className="tok-fn">{s}</span>,
};

/** The wiring of the card beside it, kept short enough to fit its column. */
const lines: ReactNode[] = [
  t.c("// the card on the right is live"),
  <>
    {t.k("const")} [order, setOrder] = {t.f("useState")}(certs);
  </>,
  "",
  <>
    {"<"}
    {t.f("Handle")} aria-pressed={"{"}lifted{"}"}
  </>,
  <>
    {"  "}onKeyDown={"{"}
    {t.f("liftMoveDrop")}
    {"}"}
  </>,
  <>
    {"  "}onPointerMove={"{"}
    {t.f("reorder")}
    {"}"} /{">"}
  </>,
  "",
  <>
    {"<"}
    {t.f("Live")} {"/>"} {t.c("// announces each move")}
  </>,
];

export function CodeSample() {
  return (
    <pre className="code" data-dots-group="draft">
      <code>
        {lines.map((line, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static listing
          <span key={i} className="code__line">
            <span className="code__no" aria-hidden>
              {String(i + 1).padStart(2, "0")}
            </span>
            {line === "" ? (
              " "
            ) : (
              <span className="code__text" data-dots="bar">
                {line}
              </span>
            )}
            {"\n"}
          </span>
        ))}
      </code>
    </pre>
  );
}
