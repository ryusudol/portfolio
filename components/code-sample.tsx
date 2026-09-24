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
    {t.k("const")} dots = {t.f("useDots")}();
  </>,
  "",
  <>
    {"<"}
    {t.f("Switch")} checked={"{"}ink{"}"}
  </>,
  <>
    {"  "}onChange={"{"}
    {t.f("setInk")}
    {"}"} /{">"}
  </>,
  "",
  <>
    {"<"}
    {t.f("Slider")} value={"{"}temperature{"}"}
  </>,
  <>
    {"  "}onChange={"{"}dots.{t.f("setTemperature")}
    {"}"} /{">"}
  </>,
  "",
  <>
    {"<"}
    {t.f("Button")} onClick={"{"}() {t.k("=>")} dots.{t.f("burst")}(){"}"}
    {">"}
  </>,
  <>
    {"  "}
    {t.s("Scatter")}
  </>,
  <>
    {"</"}
    {t.f("Button")}
    {">"}
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
