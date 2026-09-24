import type { Metadata } from "next";

import {
  CaseStudyHighlights,
  CaseStudyMore,
  CaseStudyResults,
} from "@/components/case-study";
import { ChapterNav } from "@/components/chapter-nav";
import { DotStage } from "@/components/dot-stage";
import { CkaChapter } from "@/components/featured-chapters";
import { SiteHeader } from "@/components/site-header";
import { pytorchCka } from "@/lib/case-studies";
import { profile, projectChapters } from "@/lib/content";

export const metadata: Metadata = {
  title: `${pytorchCka.title} — ${profile.name}`,
  description: pytorchCka.summary,
  openGraph: {
    title: `${pytorchCka.title} — ${profile.name}`,
    description: pytorchCka.summary,
  },
};

export default function CkaCaseStudy() {
  return (
    <>
      <SiteHeader />
      <ChapterNav chapters={projectChapters} />
      <DotStage />

      <main id="chapters">
        <CaseStudyResults study={pytorchCka} />
        <CkaChapter index={1} id="walkthrough" topic="Walkthrough" />
        <CaseStudyHighlights study={pytorchCka} index={2} />
        <CaseStudyMore study={pytorchCka} index={3} />
      </main>
    </>
  );
}
