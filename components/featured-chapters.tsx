import Link from "next/link";
import { ArrowRight } from "reicon-react";

import { pytorchCka, unlearningComparator } from "@/lib/case-studies";
import { links } from "@/lib/content";

import { Chapter } from "./chapter";
import { ExternalLink } from "./external-link";

type Props = {
  index: number;
  id: string;
  /** Home shows a link to the full case study; the case study itself doesn't. */
  linkToCaseStudy?: boolean;
  topic?: string;
};

function CaseStudyLink({ href }: { href: string }) {
  return (
    <Link className="pill" href={href}>
      Case study
      <ArrowRight size={12} aria-hidden />
    </Link>
  );
}

export function UnlearningChapter({
  index,
  id,
  linkToCaseStudy,
  topic = "Featured project",
}: Props) {
  return (
    <Chapter
      index={index}
      id={id}
      scene="visualization"
      topic={topic}
      source="Unlearning Comparator"
      title={["Two thousand points,", "one class forgotten."]}
      body={
        <>
          A visual analytics system for comparing how machine-unlearning methods
          change a model’s accuracy, efficiency, and privacy — published in IEEE
          TVCG. I built the frontend end to end with React, D3, and Zustand.
        </>
      }
      chips={["UMAP · 2,000 pts", "DOM ops per hover −99%"]}
      stat={{ value: "100+", caption: "GitHub stars" }}
      tag={
        linkToCaseStudy ? (
          <>
            <CaseStudyLink href={unlearningComparator.href} />
            <ExternalLink href={links.unlearningDemo}>Demo</ExternalLink>
          </>
        ) : (
          <span className="hint">[ scroll to unlearn the “cat” class ]</span>
        )
      }
      visual={
        <p className="singularity" aria-live="off">
          <span className="singularity__value" data-counter="forget">
            200
          </span>
          <span className="singularity__caption">forget-class points</span>
        </p>
      }
    />
  );
}

export function CkaChapter({
  index,
  id,
  linkToCaseStudy,
  topic = "Featured project",
}: Props) {
  return (
    <Chapter
      index={index}
      id={id}
      scene="performance"
      topic={topic}
      source="PyTorch-CKA"
      title={["Cubic,", "made quadratic."]}
      body={
        <>
          An open-source library for comparing representations across CNN and
          LLM layers. Frobenius inner products replaced full matrix products,
          taking HSIC from O(B³) to O(B²) per layer pair.
        </>
      }
      chips={["~400 PyPI downloads / mo", "CI · Python 3.10–3.14"]}
      stat={{
        value: "5.7×",
        caption: "faster than an existing library on H100",
      }}
      tag={
        linkToCaseStudy ? (
          <>
            <CaseStudyLink href={pytorchCka.href} />
            <ExternalLink href={links.ckaPypi}>PyPI</ExternalLink>
          </>
        ) : (
          <span className="hint">[ scroll to collapse the cube ]</span>
        )
      }
      visual={
        <dl className="readout">
          <div>
            <dt>complexity</dt>
            <dd data-counter="order">O(B³)</dd>
          </div>
          <div>
            <dt>speed-up</dt>
            <dd data-counter="speed">1.0×</dd>
          </div>
          <div>
            <dt>retained GPU memory</dt>
            <dd data-counter="memory">100.0%</dd>
          </div>
        </dl>
      }
    />
  );
}
