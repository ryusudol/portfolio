import type { Metadata } from "next";
import { AsyncControls } from "@/components/async-controls";
import { CaseStudyMore, CaseStudyResults } from "@/components/case-study";
import { Chapter } from "@/components/chapter";
import { ChapterNav } from "@/components/chapter-nav";
import { CodeSample } from "@/components/code-sample";
import { DotStage } from "@/components/dot-stage";
import { MiniApp } from "@/components/mini-app";
import { SiteHeader } from "@/components/site-header";
import { abcFitness } from "@/lib/case-studies";
import { abcChapters, profile } from "@/lib/content";

const description =
  "How I rewrote the ABC Trainerize profile page from jQuery to React as a Software Engineering Intern at ABC Fitness — RxJS data flows, a redesigned layout, and an AI-assisted, flag-gated rollout.";

export const metadata: Metadata = {
  title: `ABC Fitness — ${profile.name}`,
  description,
  openGraph: { title: `ABC Fitness — ${profile.name}`, description },
};

export default function AbcFitnessCaseStudy() {
  return (
    <>
      <SiteHeader />
      <ChapterNav chapters={abcChapters} />
      <DotStage />

      <main id="chapters">
        <CaseStudyResults study={abcFitness} />

        <Chapter
          id="async"
          scene="async"
          topic="Async"
          source="RxJS"
          title={["Fire every request,", "keep only the latest."]}
          body={
            <>
              Profile data comes from several endpoints at once. I coordinated
              those requests with RxJS so stale responses are suppressed and
              edits never overlap with in-flight photo or video uploads.
            </>
          }
          stat={{
            value: "97%",
            caption: "branch coverage of profile business logic · Jest",
          }}
          tag={<span className="stat__tag">Role-based access tested</span>}
        >
          <AsyncControls />
        </Chapter>

        <Chapter
          id="interface"
          scene="interface"
          topic="Interface"
          source="React"
          title={["Rebuilt in React,", "redesigned beyond scope."]}
          body={
            <>
              Part of a company-wide move off jQuery. Beyond the migration, I
              reworked the page’s hierarchy — a streamlined header, grouped
              content cards, modal editing — and, with a UX designer and a QA
              analyst, added drag-and-drop certification reordering.
            </>
          }
          chips={["Grouped cards", "Modal editing", "Drag-and-drop"]}
          tag={<span className="hint">[ the card is live — try it ]</span>}
          visualClassName="chapter__visual--split"
          visual={
            <>
              <CodeSample />
              <div className="mini-slot" data-dots-group="live">
                <MiniApp />
              </div>
            </>
          }
        />

        <Chapter
          id="orchestration"
          scene="orchestration"
          topic="Orchestration"
          source="AI-assisted delivery"
          title={["Split in parallel,", "ship as one."]}
          body={
            <>
              I built profile sections with multiple AI agents working in
              parallel Git worktrees, then landed the rewrite as independently
              reviewable stacked PRs behind a LaunchDarkly flag.
            </>
          }
          chips={["Git worktrees", "Figma MCP", "Stacked PRs", "LaunchDarkly"]}
          tag={<span className="hint">[ scroll to merge ]</span>}
        />

        <CaseStudyMore study={abcFitness} />
      </main>
    </>
  );
}
