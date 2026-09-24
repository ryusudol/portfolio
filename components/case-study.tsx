import Link from "next/link";
import { ArrowRight } from "reicon-react";

import { type CaseStudy, caseStudies } from "@/lib/case-studies";
import { pad, profile } from "@/lib/content";

import { CountUp } from "./count-up";
import { ExternalLink } from "./external-link";

/** Opening section of a case study: who, what, and what came of it. */
export function CaseStudyResults({ study }: { study: CaseStudy }) {
  return (
    <section
      id="results"
      className="results"
      data-scene="results"
      aria-labelledby="results-title"
    >
      <div className="results__inner">
        <p className="kicker">
          <span>
            {study.kind}
            <span className="kicker__source"> · {study.when}</span>
          </span>
        </p>
        <h1 id="results-title" className="results__title">
          {study.title}
        </h1>
        <p className="results__role">{study.role}</p>
        <p className="results__summary">{study.summary}</p>
        <ul className="chips results__stack">
          {study.stack.map((tool) => (
            <li key={tool} className="chip">
              {tool}
            </li>
          ))}
        </ul>
        {study.links.length > 0 && (
          <div className="results__links">
            {study.links.map((link) => (
              <ExternalLink key={link.href} href={link.href}>
                {link.label}
              </ExternalLink>
            ))}
          </div>
        )}

        <h2 className="results__heading">Results</h2>
        <ul className="results__grid">
          {study.results.map((result) => (
            <li
              key={result.label}
              className="result"
              data-dots="outline"
              data-dots-spread="1.1"
            >
              <CountUp value={result.value} className="result__value" />
              <span className="result__label">{result.label}</span>
              <p className="result__note">{result.note}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** Numbered cards for the work behind the results. */
export function CaseStudyHighlights({ study }: { study: CaseStudy }) {
  return (
    <section
      id="highlights"
      className="highlights"
      data-scene="results"
      aria-labelledby="highlights-title"
    >
      <div className="results__inner">
        <p className="kicker">What I built</p>
        <h2 id="highlights-title" className="chapter__title">
          The work behind the numbers.
        </h2>
        <ol className="highlights__grid">
          {study.highlights.map((item, i) => (
            <li
              key={item.title}
              className="highlight"
              data-dots="outline"
              data-dots-spread="1"
              data-dots-weight="0.8"
            >
              <span className="highlight__index">{pad(i + 1)}</span>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/** Closing section: the other case studies and a way to get in touch. */
export function CaseStudyMore({ study }: { study: CaseStudy }) {
  const others = caseStudies.filter((s) => s.slug !== study.slug);
  return (
    <section
      id="more"
      className="outro"
      data-scene="outro"
      aria-labelledby="more-title"
    >
      <div className="outro__stage">
        <p className="kicker kicker--center">More</p>
        <h2 id="more-title" className="contact__title">
          Keep exploring.
        </h2>
        <div className="outro__links">
          {others.map((other) => (
            <Link key={other.slug} className="pill" href={other.href}>
              {other.title}
              <ArrowRight size={12} aria-hidden />
            </Link>
          ))}
          <Link className="pill" href="/#contact">
            Get in touch
            <ArrowRight size={12} aria-hidden />
          </Link>
        </div>
      </div>
      <footer className="colophon colophon--slim">
        <p className="colophon__base">
          <span>© 2026 {profile.name}</span>
        </p>
      </footer>
    </section>
  );
}
