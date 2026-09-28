import type { Metadata } from "next";

import {
  CaseStudyHighlights,
  CaseStudyMore,
  CaseStudyResults,
} from "@/components/case-study";
import { ChapterNav } from "@/components/chapter-nav";
import {
  BenchmarkChapter,
  GroundworkChapter,
  InsightChapter,
  MemoryChapter,
  RedesignChapter,
  WhyChapter,
} from "@/components/cka-story";
import { DotStage } from "@/components/dot-stage";
import { SiteHeader } from "@/components/site-header";
import { pytorchCka } from "@/lib/case-studies";
import { ckaChapters, profile } from "@/lib/content";

const description =
  "How I built PyTorch-CKA after the CKA library in my own research tool proved too slow, relearned the linear algebra behind it, and rewrote HSIC so every layer pair comes out of one GPU pass, 7.7× faster than torch_cka with 95.7% less retained GPU memory.";

export const metadata: Metadata = {
  title: `${pytorchCka.title} — ${profile.name}`,
  description,
  openGraph: {
    title: `${pytorchCka.title} — ${profile.name}`,
    description,
  },
};

export default function CkaCaseStudy() {
  return (
    <>
      <SiteHeader />
      <ChapterNav chapters={ckaChapters} />
      <DotStage />

      <main id="chapters">
        <CaseStudyResults study={pytorchCka} scene="cka-results" />
        <WhyChapter />
        <GroundworkChapter />
        <InsightChapter />
        <RedesignChapter />
        <MemoryChapter />
        <BenchmarkChapter />
        <CaseStudyHighlights
          study={pytorchCka}
          id="lessons"
          kicker="What I learned"
          title="Lessons I still use."
        />
        <CaseStudyMore study={pytorchCka} />
      </main>
    </>
  );
}
