import type { Metadata } from "next";
import { AsyncControls } from "@/components/async-controls";
import { BeforeAfter } from "@/components/before-after";
import { CaseStudyMore, CaseStudyResults } from "@/components/case-study";
import { CertEditor } from "@/components/cert-editor";
import { Chapter } from "@/components/chapter";
import { ChapterNav } from "@/components/chapter-nav";
import { CodeSample } from "@/components/code-sample";
import { DotStage } from "@/components/dot-stage";
import { SiteHeader } from "@/components/site-header";
import { UnderConstruction } from "@/components/under-construction";
import { abcFitness } from "@/lib/case-studies";
import { abcChapters, profile } from "@/lib/content";
import after from "./profile-after.webp";
import before from "./profile-before.webp";

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
        <CaseStudyResults
          study={abcFitness}
          notice={
            <UnderConstruction note="This case study is being rewritten." />
          }
        />

        <section
          id="redesign"
          className="compare"
          data-scene="results"
          aria-labelledby="redesign-title"
        >
          <div className="results__inner">
            <p className="kicker">
              <span>
                Redesign
                <span className="kicker__source"> · Before and after</span>
              </span>
            </p>
            <h2 id="redesign-title" className="chapter__title">
              One long form,
              <br />
              regrouped into cards.
            </h2>
            <p className="chapter__body compare__body">
              The jQuery page stacked every field in a single column under an
              empty cover photo, with the score and view counts squeezed into a
              top bar. The React page leads with who the trainer is, then groups
              the rest into cards that each edit in a modal.
            </p>
            <BeforeAfter
              shots={[
                {
                  label: "Before",
                  stack: "jQuery",
                  image: before,
                  alt: "The old profile page. A thin bar with the public link, score and views sits above a large empty cover photo, then contact fields, a grid of certifications, an intro video prompt, services and an empty photo feed run down one long column.",
                  notes: [
                    "An empty cover photo tops the page",
                    "Every field in one long column",
                    "Score and views squeezed into a top bar",
                  ],
                },
                {
                  label: "After",
                  stack: "React",
                  image: after,
                  alt: "The new profile page. A header with photo, name, bio and public link, then cards for contact details, certifications, profile score and views, the intro video, services as chips, and a photo carousel.",
                  notes: [
                    "Photo, name, bio and public link up front",
                    "Fields grouped into cards that edit in modals",
                    "Score and weekly views get their own card",
                  ],
                },
              ]}
            />
            <p className="compare__credit">
              Screenshots from a test account, with its contact details and
              photo replaced.
            </p>
          </div>
        </section>

        <Chapter
          id="async"
          scene="async"
          topic="Async"
          source="RxJS"
          title={["Fire every request,", "keep only the latest."]}
          body={
            <>
              Profile data comes from several endpoints at once. On the shipped
              page, the profile, its view counts, and six photos all leave
              within 2 ms of each other. I coordinated them with RxJS so stale
              responses are dropped and edits never overlap with in-flight photo
              or video uploads.
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
              reworked the page’s hierarchy into a streamlined header and seven
              grouped cards with modal editing. With a UX designer and a QA
              analyst, I added certification reordering that works by drag or by
              keyboard. The card here works the same way.
            </>
          }
          chips={["Seven cards", "Modal editing", "Keyboard reorder"]}
          tag={
            <span className="hint">
              [ drag a row, or Tab to it and press Space ]
            </span>
          }
          visualClassName="chapter__visual--split"
          visual={
            <>
              <CodeSample />
              <div className="mini-slot" data-dots-group="live">
                <CertEditor />
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
