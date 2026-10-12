import type { Metadata } from "next";

import { DotStage } from "@/components/dot-stage";
import { SiteHeader } from "@/components/site-header";
import { WorkIndex } from "@/components/work-index";
import { experienceStudies, projectStudies } from "@/lib/case-studies";
import { alsoBuilt, profile } from "@/lib/content";

const description =
  "Where I’ve worked and what I’ve built — from rebuilding the ABC Trainerize profile page in React to a digital twin of Earth orbit, visual analytics for machine unlearning, and a fast CKA library for PyTorch.";

export const metadata: Metadata = {
  title: `Work — ${profile.name}`,
  description,
  openGraph: { title: `Work — ${profile.name}`, description },
};

export default function Work() {
  return (
    <>
      <SiteHeader />
      <DotStage />

      <main id="chapters">
        <WorkIndex
          id="work"
          title="Work"
          summary="Where I’ve worked and what I’ve built."
          groups={[
            { heading: "Experience", studies: experienceStudies },
            {
              heading: "Projects",
              studies: projectStudies,
              external: alsoBuilt,
            },
          ]}
        />
      </main>
    </>
  );
}
