import type { Metadata } from "next";

import {
  CaseStudyHighlights,
  CaseStudyMore,
  CaseStudyResults,
} from "@/components/case-study";
import { ChapterNav } from "@/components/chapter-nav";
import { DotStage } from "@/components/dot-stage";
import { UnlearningChapter } from "@/components/featured-chapters";
import { SiteHeader } from "@/components/site-header";
import { unlearningComparator } from "@/lib/case-studies";
import { profile, projectChapters } from "@/lib/content";

export const metadata: Metadata = {
  title: `${unlearningComparator.title} — ${profile.name}`,
  description: unlearningComparator.summary,
  openGraph: {
    title: `${unlearningComparator.title} — ${profile.name}`,
    description: unlearningComparator.summary,
  },
};

export default function UnlearningCaseStudy() {
  return (
    <>
      <SiteHeader />
      <ChapterNav chapters={projectChapters} />
      <DotStage />

      <main id="chapters">
        <CaseStudyResults study={unlearningComparator} />
        <UnlearningChapter index={1} id="walkthrough" topic="Walkthrough" />
        <CaseStudyHighlights study={unlearningComparator} index={2} />
        <CaseStudyMore study={unlearningComparator} index={3} />
      </main>
    </>
  );
}
