import type { Metadata } from "next";

import {
  CaseStudyHighlights,
  CaseStudyMore,
  CaseStudyResults,
} from "@/components/case-study";
import { ChapterNav } from "@/components/chapter-nav";
import { DotStage } from "@/components/dot-stage";
import {
  AttackChapter,
  EmbeddingChapter,
  LayersChapter,
  MatrixChapter,
  MotivationChapter,
  ProblemChapter,
  RedrawChapter,
  RenderingChapter,
  StateChapter,
  WorkflowChapter,
} from "@/components/muc-story";
import { SiteHeader } from "@/components/site-header";
import { unlearningComparator } from "@/lib/case-studies";
import { mucChapters, profile } from "@/lib/content";

const description =
  "How I built the frontend of Machine Unlearning Comparator, a visual analytics system published in IEEE TVCG. It compares machine unlearning methods two models at a time, through embeddings, prediction matrices, layer similarity, and simulated attacks that expose what summary metrics hide, and it taught me when to trade React Context for Zustand and why SVG was worth keeping over canvas.";

export const metadata: Metadata = {
  title: `${unlearningComparator.title} — ${profile.name}`,
  description,
  openGraph: {
    title: `${unlearningComparator.title} — ${profile.name}`,
    description,
  },
};

export default function UnlearningCaseStudy() {
  return (
    <>
      <SiteHeader />
      <ChapterNav chapters={mucChapters} />
      <DotStage />

      <main id="chapters">
        <CaseStudyResults study={unlearningComparator} scene="muc-results" />
        <MotivationChapter />
        <ProblemChapter />
        <WorkflowChapter />
        <EmbeddingChapter />
        <MatrixChapter />
        <LayersChapter />
        <AttackChapter />
        <StateChapter />
        <RenderingChapter />
        <RedrawChapter />
        <CaseStudyHighlights
          study={unlearningComparator}
          id="lessons"
          kicker="What I learned"
          title="Lessons I still use."
        />
        <CaseStudyMore study={unlearningComparator} />
      </main>
    </>
  );
}
