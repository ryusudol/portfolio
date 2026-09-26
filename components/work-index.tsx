import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "reicon-react";

import type { CaseStudy } from "@/lib/case-studies";

type ExternalWork = {
  title: string;
  href: string;
  note: string;
};

type Group = {
  /** Omit to list the cards without a label; their titles become h2s. */
  heading?: string;
  studies?: CaseStudy[];
  external?: ExternalWork[];
};

type Props = {
  id: string;
  kicker?: string;
  title: string;
  summary?: string;
  groups: Group[];
};

type TitleTag = "h2" | "h3";

const cardDots = {
  "data-dots": "outline",
  "data-dots-spread": "1",
  "data-dots-weight": "0.8",
} as const;

/** A case study as a card; the whole card links to it. */
function StudyCard({ study, Title }: { study: CaseStudy; Title: TitleTag }) {
  return (
    <li className="highlight work-card" {...cardDots}>
      {study.kind === "Experience" && (
        <span className="work-card__meta">{study.when}</span>
      )}
      <Title>
        <Link className="work-card__link" href={study.href}>
          {study.title}
        </Link>
      </Title>
      <p className="work-card__role">{study.role}</p>
      <p>{study.blurb ?? study.summary}</p>
      <ul className="tools" aria-label="Built with">
        {study.stack.map((tool) => (
          <li key={tool}>{tool}</li>
        ))}
      </ul>
    </li>
  );
}

function ExternalCard({
  work,
  Title,
}: {
  work: ExternalWork;
  Title: TitleTag;
}) {
  return (
    <li className="highlight work-card" {...cardDots}>
      <Title>
        <a
          className="work-card__link"
          href={work.href}
          target="_blank"
          rel="noreferrer"
        >
          {work.title}
          <ArrowUpRight size={14} strokeWidth={1.5} aria-hidden />
        </a>
      </Title>
      <p>{work.note}</p>
    </li>
  );
}

/** Listing page for work, grouped by kind: /work. */
export function WorkIndex({ id, kicker, title, summary, groups }: Props) {
  return (
    <section
      id={id}
      className="results results--index"
      data-scene="results"
      aria-labelledby={`${id}-title`}
    >
      <div className="results__inner">
        <Link className="back-link" href="/">
          <ArrowLeft size={16} strokeWidth={1} aria-hidden />
          Back
        </Link>
        {kicker && <p className="kicker">{kicker}</p>}
        <h1 id={`${id}-title`} className="results__title">
          {title}
        </h1>
        {summary && <p className="results__summary">{summary}</p>}

        {groups.map((group, i) => {
          const Title = group.heading ? "h3" : "h2";
          return (
            <div key={group.heading ?? i}>
              {group.heading && (
                <h2 className="results__heading">{group.heading}</h2>
              )}
              <ul className="highlights__grid work-index__grid">
                {group.studies?.map((study) => (
                  <StudyCard key={study.slug} study={study} Title={Title} />
                ))}
                {group.external?.map((work) => (
                  <ExternalCard key={work.href} work={work} Title={Title} />
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
