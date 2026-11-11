import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "reicon-react";

import { DotStage } from "@/components/dot-stage";
import { SiteHeader } from "@/components/site-header";
import { profile } from "@/lib/content";

export const metadata: Metadata = {
  title: `Lost in space — ${profile.name}`,
};

/** Any address the site doesn't have: the grain's slow disk, and the way back. */
export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <DotStage />

      <main id="chapters">
        <section
          id="lost"
          className="outro"
          data-scene="outro"
          aria-labelledby="lost-title"
        >
          <div className="outro__stage">
            <p className="kicker kicker--center">404 · No signal</p>
            <h1 id="lost-title" className="contact__title">
              Lost in space.
            </h1>
            <p className="contact__lede outro__lede">
              Nothing is in orbit at this address.
            </p>
            <div className="outro__links">
              <Link className="action" href="/">
                Back to home
                <ArrowRight size={12} aria-hidden />
              </Link>
              <Link className="action" href="/work">
                See the work
                <ArrowRight size={12} aria-hidden />
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
