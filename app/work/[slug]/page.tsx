import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "reicon-react";

import { ProfileMenu } from "@/components/profile-menu";
import { ProjectArtwork } from "@/components/project-artwork";
import { TechnologyIcon } from "@/components/technology-icon";
import { getProject, projects } from "@/lib/portfolio";

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

  return (
    <>
      <a
        className="fixed top-3 left-3 z-[100] -translate-y-[180%] rounded-xl border border-border-strong bg-surface px-4 py-[0.7rem] text-[0.85rem] shadow-portfolio transition-transform duration-[160ms] ease-in-out focus:translate-y-0 motion-reduce:transition-none"
        href="#content"
      >
        Skip to content
      </a>
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
          className="inline-flex w-fit items-center gap-[0.45rem] text-[0.8rem] text-muted transition-colors duration-[140ms] ease-in-out hover:text-foreground motion-reduce:transition-none [&>svg]:size-4"
          href="/#work"
        >
          <ArrowLeft aria-hidden="true" />
          Back to selected work
        </Link>

        <header className="grid gap-4">
          <p className="m-0 text-[0.7rem] font-[590] tracking-[0.12em] text-muted uppercase">
            {project.context}
          </p>
          <h1 className="m-0 font-display text-[clamp(2.5rem,9vw,4.25rem)] font-[520] italic leading-[0.95] tracking-[-0.045em]">
            {project.title}
          </h1>
          <span className="max-w-[35rem] text-base leading-[1.68] text-pretty text-muted">
            {project.description}
          </span>
          <ul
            className="mt-2 flex list-none flex-wrap gap-[0.4rem] p-0 [&_li]:inline-flex [&_li]:items-center [&_li]:gap-[0.34rem] [&_li]:rounded-[0.55rem] [&_li]:border [&_li]:border-border [&_li]:bg-[color-mix(in_srgb,var(--color-surface)_72%,transparent)] [&_li]:px-2 [&_li]:py-[0.27rem] [&_li]:text-[0.7rem] [&_li]:text-muted"
            aria-label={`${project.title} technologies`}
          >
            {project.technologies.map((technology) => (
              <li key={technology}>
                <TechnologyIcon
                  name={technology}
                  className="size-[0.9rem] shrink-0"
                />
                <span>{technology}</span>
              </li>
            ))}
          </ul>
        </header>

        <div className="overflow-hidden rounded-[1.6rem] border border-border shadow-[0_24px_60px_rgb(62_54_47/10%)]">
          <ProjectArtwork project={project} variant="detail" />
        </div>

        <div className="grid gap-14">
          <section className="grid gap-[0.8rem]">
            <p className="m-0 text-[0.7rem] font-[590] tracking-[0.12em] text-muted uppercase">
              Overview
            </p>
            <h2 className="m-0 max-w-[30rem] text-[1.18rem] font-[610] tracking-[-0.015em]">
              Making a complex system easier to understand.
            </h2>
            <p className="m-0 text-[0.94rem] leading-[1.72] text-pretty text-muted">
              {project.overview}
            </p>
          </section>

          <section className="grid gap-[0.8rem]">
            <p className="m-0 text-[0.7rem] font-[590] tracking-[0.12em] text-muted uppercase">
              Contribution
            </p>
            <h2 className="m-0 max-w-[30rem] text-[1.18rem] font-[610] tracking-[-0.015em]">
              What I worked on
            </h2>
            <ul className="m-0 grid list-[circle] gap-[0.65rem] pl-[1.1rem] text-[0.9rem] leading-[1.65] text-muted">
              {project.highlights.map((highlight) => (
                <li key={highlight}>{highlight}</li>
              ))}
            </ul>
          </section>

          <aside
            className="flex items-baseline justify-between gap-4 border-y border-border py-6"
            aria-label="Project result"
          >
            <strong className="font-display text-[2.2rem] font-semibold italic">
              {project.metric}
            </strong>
            <span className="text-right text-[0.78rem] text-muted">
              {project.metricLabel}
            </span>
          </aside>

          {project.confidentialityNote ? (
            <aside className="border-l-2 border-border-strong pl-4">
              <strong className="text-[0.8rem] font-[610]">
                Confidentiality note
              </strong>
              <p className="mt-[0.35rem] mb-0 text-[0.82rem] leading-[1.6] text-muted">
                {project.confidentialityNote}
              </p>
            </aside>
          ) : null}

          {project.links.length > 0 ? (
            <nav
              className="flex flex-wrap gap-[0.65rem]"
              aria-label={`${project.title} external links`}
            >
              {project.links.map((link) => (
                <a
                  key={link.href}
                  className="inline-flex min-h-[2.7rem] items-center gap-[0.4rem] rounded-[0.8rem] border border-border bg-surface-alt px-[0.85rem] py-[0.65rem] text-[0.8rem] font-[560] transition-[transform,background-color] duration-[140ms] ease-in-out hover:-translate-y-0.5 hover:bg-surface-hover motion-reduce:transition-none [&>svg]:size-[0.9rem]"
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {link.label}
                  <ArrowUpRight aria-hidden="true" />
                </a>
              ))}
            </nav>
          ) : null}
        </div>

        <Link
          className="mt-4 inline-flex w-fit items-center gap-[0.45rem] text-[0.86rem] text-muted underline decoration-border-strong underline-offset-[0.25rem] transition-colors duration-[140ms] ease-in-out hover:text-foreground motion-reduce:transition-none [&>svg]:size-4"
          href="/#work"
        >
          Explore the other selected projects
          <ArrowUpRight aria-hidden="true" />
        </Link>
      </main>
    </>
  );
}
