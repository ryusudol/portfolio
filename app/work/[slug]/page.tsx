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
      <a className="skip-link" href="#content">
        Skip to content
      </a>
      <div className="top-blur" aria-hidden="true" />
      <ProfileMenu />

      <main id="content" className="project-detail-shell">
        <Link className="project-back-link" href="/#work">
          <ArrowLeft aria-hidden="true" />
          Back to selected work
        </Link>

        <header className="project-detail-header">
          <p>{project.context}</p>
          <h1>{project.title}</h1>
          <span>{project.description}</span>
          <ul
            className="project-technologies"
            aria-label={`${project.title} technologies`}
          >
            {project.technologies.map((technology) => (
              <li key={technology}>
                <TechnologyIcon name={technology} />
                <span>{technology}</span>
              </li>
            ))}
          </ul>
        </header>

        <div className="project-detail-artwork">
          <ProjectArtwork project={project} />
        </div>

        <div className="project-detail-content">
          <section>
            <p className="project-detail-label">Overview</p>
            <h2>Making a complex system easier to understand.</h2>
            <p>{project.overview}</p>
          </section>

          <section>
            <p className="project-detail-label">Contribution</p>
            <h2>What I worked on</h2>
            <ul className="project-highlight-list">
              {project.highlights.map((highlight) => (
                <li key={highlight}>{highlight}</li>
              ))}
            </ul>
          </section>

          <aside className="project-result" aria-label="Project result">
            <strong>{project.metric}</strong>
            <span>{project.metricLabel}</span>
          </aside>

          {project.confidentialityNote ? (
            <aside className="project-confidentiality">
              <strong>Confidentiality note</strong>
              <p>{project.confidentialityNote}</p>
            </aside>
          ) : null}

          {project.links.length > 0 ? (
            <nav
              className="project-detail-links"
              aria-label={`${project.title} external links`}
            >
              {project.links.map((link) => (
                <a
                  key={link.href}
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

        <Link className="project-next-link" href="/#work">
          Explore the other selected projects
          <ArrowUpRight aria-hidden="true" />
        </Link>
      </main>
    </>
  );
}
