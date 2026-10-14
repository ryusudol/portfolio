import Link from "next/link";
import { ArrowRight } from "reicon-react";

import {
  orbitExplorer,
  pytorchCka,
  unlearningComparator,
} from "@/lib/case-studies";
import { links } from "@/lib/content";

import { Chapter } from "./chapter";
import { ExternalLink } from "./external-link";

type Props = {
  id: string;
  /** Home shows a link to the full case study; the case study itself doesn't. */
  linkToCaseStudy?: boolean;
  topic?: string;
};

function DetailsLink({ href, name }: { href: string; name: string }) {
  return (
    <Link className="action" href={href} aria-label={`${name} details`}>
      Details
      <ArrowRight size={12} aria-hidden />
    </Link>
  );
}

export function OrbitChapter({ id, topic = "Featured project" }: Props) {
  return (
    <Chapter
      id={id}
      scene="orbit"
      topic={topic}
      source="Orbit Explorer"
      title={["Every satellite in orbit,", "live in the browser."]}
      body={
        <>
          Built a digital twin of Earth orbit that propagates all 32,583 tracked
          objects live on an SGP4 engine I wrote in Rust and WebAssembly, routes
          packets across Starlink’s laser mesh, screens the catalog for close
          approaches, and flies out to every planet’s moons.
        </>
      }
      tools={[
        "Rust",
        "WebAssembly",
        "TypeScript",
        "React",
        "Three.js",
        "WebGPU",
      ]}
      tag={
        <>
          <DetailsLink href={orbitExplorer.href} name={orbitExplorer.title} />
          <ExternalLink href={links.orbitDemo}>Demo</ExternalLink>
        </>
      }
      visual={
        <dl className="readout">
          <div>
            <dt>tracked objects</dt>
            <dd>32,583</dd>
          </div>
          <div>
            <dt>camera from the Earth</dt>
            <dd data-counter="distance">–</dd>
          </div>
        </dl>
      }
    />
  );
}

export function UnlearningChapter({
  id,
  linkToCaseStudy,
  topic = "Featured project",
}: Props) {
  return (
    <Chapter
      id={id}
      scene="visualization"
      topic={topic}
      source="Machine Unlearning Comparator"
      title={["A visualization dashboard", "for machine unlearning."]}
      body={
        <>
          Built an interactive visualization dashboard for evaluating machine
          unlearning methods on accuracy, efficiency, and privacy — published in
          IEEE TVCG.
        </>
      }
      tools={["React", "TypeScript", "D3", "Zustand"]}
      tag={
        linkToCaseStudy ? (
          <>
            <DetailsLink
              href={unlearningComparator.href}
              name={unlearningComparator.title}
            />
            <ExternalLink href={links.unlearningDemo}>Demo</ExternalLink>
          </>
        ) : (
          <span className="hint">[ scroll to unlearn the “cat” class ]</span>
        )
      }
      visual={
        <p className="sr-only" aria-live="off">
          Accuracy on the forgotten “cat” class:{" "}
          <span data-counter="forget">100%</span>
        </p>
      }
    />
  );
}

export function CkaChapter({
  id,
  linkToCaseStudy,
  topic = "Featured project",
}: Props) {
  return (
    <Chapter
      id={id}
      scene={linkToCaseStudy ? "similarity" : "performance"}
      topic={topic}
      source="PyTorch-CKA"
      title={
        linkToCaseStudy
          ? ["How similarly ML models", "see the same things."]
          : ["Cubic,", "made quadratic."]
      }
      body={
        <>
          Developed an open-source Python library that compares internal
          representations across CNN and LLM layers with Centered Kernel
          Alignment (CKA) — 6.8× faster than torch_cka, the most widely used
          one.
        </>
      }
      tools={["Python", "PyTorch"]}
      tag={
        linkToCaseStudy ? (
          <>
            <DetailsLink href={pytorchCka.href} name={pytorchCka.title} />
            <ExternalLink href={links.ckaPypi}>PyPI</ExternalLink>
          </>
        ) : (
          <span className="hint">[ scroll to collapse the cube ]</span>
        )
      }
      visual={
        linkToCaseStudy ? (
          <dl className="readout readout--below">
            <div>
              <dt>layer pairs compared</dt>
              <dd data-counter="pairs">0 / 324</dd>
            </div>
          </dl>
        ) : (
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
        )
      }
    />
  );
}
