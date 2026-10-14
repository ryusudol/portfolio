import type { Metadata } from "next";
import { Barlow } from "next/font/google";

import {
  CaseStudyHighlights,
  CaseStudyMore,
  CaseStudyResults,
} from "@/components/case-study";
import { ChapterNav } from "@/components/chapter-nav";
import { DotStage } from "@/components/dot-stage";
import {
  BoundChapter,
  CatalogChapter,
  ConjunctionsChapter,
  CoverageChapter,
  EarthChapter,
  FlightChapter,
  FollowChapter,
  GiantsChapter,
  HeliosphereChapter,
  PipelineChapter,
  PrecisionChapter,
  RelayChapter,
  RoutingChapter,
  SieveChapter,
  ValidationChapter,
} from "@/components/orbit-story";
import { SiteHeader } from "@/components/site-header";
import { orbitExplorer } from "@/lib/case-studies";
import { orbitChapters, profile } from "@/lib/content";

/** Orbit Explorer's own typeface, for the app as the story draws it. */
const barlow = Barlow({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-app",
  display: "swap",
});

const description =
  "How I built Orbit Explorer, a digital twin of Earth orbit in the browser that flies out to every planet and the Oort cloud. An SGP4 engine in Rust, checked to 0.1 mm against the published reference, propagates all 32,583 tracked objects through shared-memory workers, routes London to New York over Starlink’s laser mesh in about 21 ms, screens the catalog for close approaches 423× faster than checking every pair, and places every known moon of the giant planets on JPL’s trajectories.";

export const metadata: Metadata = {
  title: `${orbitExplorer.title} — ${profile.name}`,
  description,
  openGraph: {
    title: `${orbitExplorer.title} — ${profile.name}`,
    description,
  },
};

export default function OrbitCaseStudy() {
  return (
    <>
      <SiteHeader />
      <ChapterNav chapters={orbitChapters} />
      <DotStage />

      <main id="chapters" className={barlow.variable}>
        <CaseStudyResults study={orbitExplorer} scene="orbit-results" />
        <EarthChapter />
        <FollowChapter />
        <RoutingChapter />
        <ConjunctionsChapter />
        <CoverageChapter />
        <CatalogChapter />
        <FlightChapter />
        <RelayChapter />
        <GiantsChapter />
        <HeliosphereChapter />
        <ValidationChapter />
        <PipelineChapter />
        <PrecisionChapter />
        <SieveChapter />
        <BoundChapter />
        <CaseStudyHighlights
          study={orbitExplorer}
          id="lessons"
          kicker="What I learned"
          title="Lessons I’ll keep."
        />
        <CaseStudyMore study={orbitExplorer} />
      </main>
    </>
  );
}
