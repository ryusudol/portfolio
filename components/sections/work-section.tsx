import Link from "next/link";
import { Star } from "reicon-react";

import { GitHubIcon } from "@/components/brand-icons";
import { ProjectArtwork } from "@/components/project-artwork";
import { TechnologyBadge } from "@/components/technology-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { contact, projects } from "@/lib/portfolio";

export function WorkSection() {
  return (
    <section
      id="work"
      className="flex scroll-mt-36 flex-col gap-[2.8rem] max-sm:gap-[2.25rem]"
    >
      <div className="flex items-center gap-[0.65rem] [&>svg]:size-[1.15rem] [&>svg]:text-muted-foreground">
        <Star aria-hidden="true" />
        <h2 className="m-0 text-base font-[570] tracking-[-0.01em]">
          Selected Work
        </h2>
      </div>
      <div className="group/projects grid grid-cols-2 gap-4 max-sm:grid-cols-1">
        {projects.map((project) => (
          <Link
            key={project.id}
            href={`/work/${project.slug}`}
            data-testid="project-card"
            className="group block min-w-0 transition-[transform,border-color,box-shadow,opacity,filter] duration-motion ease-in-out hover:-translate-y-[3px] motion-reduce:transition-none [@media(hover:hover)]:group-has-[:hover]/projects:not-hover:opacity-[0.34] [@media(hover:hover)]:group-has-[:hover]/projects:not-hover:saturate-[0.2] [@media(hover:hover)]:group-has-[:hover]/projects:not-hover:grayscale-[0.9]"
            aria-label={`View ${project.title} project`}
          >
            <Card className="h-full gap-0 overflow-hidden rounded-portfolio border border-border bg-surface py-0 ring-0 transition-[border-color,box-shadow] duration-motion group-hover:border-border-strong group-hover:shadow-[0_18px_40px_rgb(62_54_47/9%)] dark:group-hover:shadow-[0_20px_45px_rgb(0_0_0/22%)]">
              <ProjectArtwork project={project} />
              <CardContent className="flex flex-1 flex-col border-0 p-5">
                <CardTitle className="m-0 text-base font-[610]">
                  {project.title}
                </CardTitle>
                <CardDescription className="mt-[0.55rem] mb-4 text-[0.82rem] leading-[1.6] text-pretty text-muted-foreground">
                  {project.description}
                </CardDescription>
                <ul
                  className="mt-auto flex list-none flex-wrap gap-[0.4rem] p-0"
                  aria-label={`${project.title} technologies`}
                >
                  {project.technologies.map((technology) => (
                    <li key={technology}>
                      <TechnologyBadge name={technology} />
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </Link>
        ))}
        <a
          className="flex min-h-64 max-sm:min-h-44 flex-col items-center justify-center gap-[0.8rem] overflow-hidden rounded-portfolio border border-border bg-surface p-8 text-center text-muted-foreground transition-[transform,background-color,color,opacity,filter] duration-motion ease-in-out hover:-translate-y-[3px] hover:bg-surface-hover hover:text-foreground motion-reduce:transition-none [@media(hover:hover)]:group-has-[:hover]/projects:not-hover:opacity-[0.34] [@media(hover:hover)]:group-has-[:hover]/projects:not-hover:saturate-[0.2] [@media(hover:hover)]:group-has-[:hover]/projects:not-hover:grayscale-[0.9]"
          href={contact.github}
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="max-w-48 text-[0.8rem] leading-normal">
            See the source code of more experiments and open-source work on
          </span>
          <strong className="inline-flex items-center gap-[0.35rem] text-[0.92rem] font-[580] underline decoration-border-strong underline-offset-[0.28rem] [&>svg]:size-[1.1rem]">
            <GitHubIcon aria-hidden="true" /> GitHub
          </strong>
        </a>
      </div>
    </section>
  );
}
