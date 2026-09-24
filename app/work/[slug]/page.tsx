import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "reicon-react";

import { ProfileMenu } from "@/components/profile-menu";
import { ProjectArtwork } from "@/components/project-artwork";
import { SkipToContent } from "@/components/skip-to-content";
import { TechnologyBadge } from "@/components/technology-badge";
import { buttonVariants } from "@/components/ui/button";
import {
  CaseStudyBullets,
  CaseStudyParagraphs,
  CaseStudyPoints,
  CaseStudySection,
  ProjectLinks,
} from "@/components/work-case-study";
import { getProject, projects } from "@/lib/portfolio";
import { cn } from "@/lib/utils";

type ProjectPageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return projects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({
  params,
}: ProjectPageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = getProject(slug);

  if (!project) return {};

  return {
    title: `${project.title} — Suhyeon Yu`,
    description: project.description,
  };
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { slug } = await params;
  const project = getProject(slug);

  if (!project) notFound();

  const { walkthrough } = project;
  const snapshot = [
    { label: "Role", value: project.role },
    { label: "Time frame", value: project.period },
    project.team ? { label: "Team", value: project.team } : null,
  ].filter((item) => item !== null);

  return (
    <>
      <SkipToContent />
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-40 h-[8.5rem] max-sm:h-28 backdrop-blur-[1px] [background:linear-gradient(to_bottom,var(--color-background)_0%,color-mix(in_srgb,var(--color-background)_88%,transparent)_44%,transparent_100%)] [mask-image:linear-gradient(to_bottom,#000_0_72%,transparent_100%)]"
        aria-hidden="true"
      />
      <ProfileMenu />

      <main
        id="content"
        className="mx-auto flex w-[min(40rem,calc(100vw-2.5rem))] max-[420px]:w-[min(calc(100%-2rem),40rem)] flex-col gap-14 max-sm:gap-11 pt-44 max-sm:pt-[8.75rem] pb-20 animate-content-enter motion-reduce:animate-none"
      >
        <Link
          className={cn(
            buttonVariants({ variant: "link" }),
            "h-auto w-fit items-center gap-[0.45rem] p-0 text-[0.8rem] text-muted-foreground no-underline transition-colors duration-instant ease-in-out hover:text-foreground hover:no-underline motion-reduce:transition-none [&>svg]:size-4",
          )}
          href="/#work"
        >
          <ArrowLeft aria-hidden="true" />
          Back to selected work
        </Link>

        <header className="grid gap-5">
          <p className="m-0 text-[0.7rem] font-[590] tracking-[0.12em] text-muted-foreground uppercase">
            {project.context}
          </p>
          <h1 className="m-0 font-display text-[clamp(2.5rem,9vw,4.25rem)] font-[520] italic leading-[0.95] tracking-[-0.045em]">
            {project.title}
          </h1>
          <span className="max-w-[35rem] text-base leading-[1.68] text-pretty text-muted-foreground">
            {project.description}
          </span>
          <dl className="m-0 flex flex-wrap gap-x-8 gap-y-3">
            {snapshot.map((item) => (
              <div
                key={item.label}
                className="grid min-w-[7.5rem] gap-[0.28rem]"
              >
                <dt className="text-[0.68rem] font-[590] tracking-[0.1em] text-muted-foreground uppercase">
                  {item.label}
                </dt>
                <dd className="m-0 text-[0.84rem] leading-[1.45] text-pretty">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
          <ul
            className="flex list-none flex-wrap gap-[0.4rem] p-0"
            aria-label={`${project.title} technologies`}
          >
            {project.technologies.map((technology) => (
              <li key={technology}>
                <TechnologyBadge name={technology} />
              </li>
            ))}
          </ul>
          <ProjectLinks title={project.title} links={project.links} />
        </header>

        <div className="w-full">
          <ProjectArtwork project={project} variant="detail" />
        </div>

        <div className="grid gap-14">
          <CaseStudySection
            eyebrow="Why this project"
            title={walkthrough.why.title}
          >
            {walkthrough.why.paragraphs ? (
              <CaseStudyParagraphs paragraphs={walkthrough.why.paragraphs} />
            ) : null}
          </CaseStudySection>

          <CaseStudySection
            eyebrow="Goals & constraints"
            title={walkthrough.goals.title}
          >
            {walkthrough.goals.bullets ? (
              <CaseStudyBullets items={walkthrough.goals.bullets} />
            ) : null}
          </CaseStudySection>

          <CaseStudySection
            eyebrow="Approach"
            title={walkthrough.approach.title}
          >
            {walkthrough.approach.paragraphs ? (
              <CaseStudyParagraphs
                paragraphs={walkthrough.approach.paragraphs}
              />
            ) : null}
            <CaseStudyPoints items={walkthrough.approach.decisions} />
          </CaseStudySection>

          <CaseStudySection
            eyebrow="Implementation"
            title={walkthrough.highlights.title}
          >
            <CaseStudyPoints items={walkthrough.highlights.items} />
          </CaseStudySection>

          <CaseStudySection eyebrow="Outcome" title={walkthrough.outcome.title}>
            {walkthrough.outcome.paragraphs ? (
              <CaseStudyParagraphs
                paragraphs={walkthrough.outcome.paragraphs}
              />
            ) : null}
            <aside
              className="flex items-baseline justify-between gap-4 border-y border-border py-6"
              aria-label="Project result"
            >
              <strong className="font-display text-[2.2rem] font-semibold italic">
                {project.metric}
              </strong>
              <span className="text-right text-[0.78rem] text-muted-foreground">
                {project.metricLabel}
              </span>
            </aside>
          </CaseStudySection>

          {walkthrough.reflection ? (
            <CaseStudySection
              eyebrow="Reflection"
              title={walkthrough.reflection.title}
            >
              {walkthrough.reflection.paragraphs ? (
                <CaseStudyParagraphs
                  paragraphs={walkthrough.reflection.paragraphs}
                />
              ) : null}
            </CaseStudySection>
          ) : null}

          {project.confidentialityNote ? (
            <aside className="border-l-2 border-border-strong pl-4">
              <strong className="text-[0.8rem] font-[610]">
                Confidentiality note
              </strong>
              <p className="mt-[0.35rem] mb-0 text-[0.82rem] leading-[1.6] text-muted-foreground">
                {project.confidentialityNote}
              </p>
            </aside>
          ) : null}
        </div>

        <Link
          className={cn(
            buttonVariants({ variant: "link" }),
            "mt-4 h-auto w-fit items-center gap-[0.45rem] p-0 text-[0.86rem] text-muted-foreground underline decoration-border-strong underline-offset-[0.25rem] transition-colors duration-instant ease-in-out hover:text-foreground motion-reduce:transition-none [&>svg]:size-4",
          )}
          href="/#work"
        >
          Explore the other selected projects
          <ArrowUpRight aria-hidden="true" />
        </Link>
      </main>
    </>
  );
}
