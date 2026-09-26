import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "reicon-react";

import { BarrierIcon } from "@/components/barrier-icon";
import { DotStage } from "@/components/dot-stage";
import { SiteHeader } from "@/components/site-header";
import { playground, profile } from "@/lib/content";

const description =
  "Side interests outside my main work — systems programming, robotics, AI tooling, full-stack, and infrastructure.";

export const metadata: Metadata = {
  title: `Playground — ${profile.name}`,
  description,
  openGraph: { title: `Playground — ${profile.name}`, description },
};

export default function Playground() {
  return (
    <>
      <SiteHeader />
      <DotStage />

      <main id="chapters">
        <section
          id="playground"
          className="results results--curtain"
          data-scene="curtain"
          aria-labelledby="playground-title"
        >
          <div className="results__inner">
            <Link className="back-link" href="/">
              <ArrowLeft size={16} strokeWidth={1} aria-hidden />
              Back
            </Link>
            <p className="kicker">Beyond the day job</p>
            <h1 id="playground-title" className="results__title">
              Playground
            </h1>
            <p className="results__summary">
              Things I’m curious about outside my main work.
            </p>
            <div className="construction">
              <BarrierIcon size={72} />
              <div>
                <p className="construction__title">Under construction</p>
                <p className="construction__note">
                  Experiments land here as I build them.
                </p>
              </div>
            </div>
            <div className="curtain" data-dots-curtain>
              <ul className="highlights__grid playground__grid">
                {playground.map((item) => (
                  <li
                    key={item.title}
                    className="highlight"
                    data-dots="outline"
                    data-dots-spread="1"
                    data-dots-weight="0.8"
                  >
                    <span className="highlight__index">{item.tools}</span>
                    <h2>{item.title}</h2>
                    <p>{item.body}</p>
                  </li>
                ))}
              </ul>
              <p className="curtain__hint" aria-hidden="true">
                [ scroll to pull back the curtain ]
              </p>
            </div>
            <div className="results__links playground__back">
              <Link className="action" href="/">
                Back to selected work
                <ArrowRight size={12} aria-hidden />
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
