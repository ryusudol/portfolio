import { ArrowUpRight } from "reicon-react";

import { ProjectVisual } from "@/components/project-visual";
import { TechnologyBadge } from "@/components/technology-badge";
import { Button } from "@/components/ui/button";
import type { Project } from "@/lib/projects";

export function ProjectChapter({ project }: { project: Project }) {
  return (
    <article
      id={project.id}
      className="project-chapter scroll-mt-24"
      data-visual-id={project.id}
    >
      <div className="project-chapter-inner">
        <h3>{project.title}</h3>
        <p className="project-summary">{project.summary}</p>

        <ProjectVisual
          project={project}
          className="inline-visual inline-project-visual"
          eager={project.id === "trainerize-profile"}
        />

        <section
          className="project-metrics"
          aria-label={`${project.title} metrics`}
        >
          {project.metrics.map((metric) => (
            <div key={metric.label}>
              <strong>{metric.value}</strong>
              <span>{metric.label}</span>
            </div>
          ))}
        </section>

        <p className="project-narrative">{project.narrative}</p>

        <ul className="technology-list" aria-label="Technologies">
          {project.technologies.map((technology) => (
            <TechnologyBadge key={technology} technology={technology} />
          ))}
        </ul>

        <div className="project-links">
          {project.links.map((link) => (
            <Button
              key={link.label}
              asChild
              variant="outline"
              className="h-11 rounded-none border-foreground/25 bg-transparent px-4 text-[0.69rem] uppercase tracking-[0.18em] hover:border-foreground hover:bg-foreground hover:text-background"
            >
              <a href={link.href} target="_blank" rel="noreferrer">
                {link.label}
                <ArrowUpRight aria-hidden="true" />
              </a>
            </Button>
          ))}
        </div>
      </div>
    </article>
  );
}
