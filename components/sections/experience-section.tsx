import Image from "next/image";
import { Briefcase } from "reicon-react";

import { TechnologyBadge } from "@/components/technology-badge";
import { experiences } from "@/lib/portfolio";

export function ExperienceSection() {
  return (
    <section
      id="experience"
      className="flex scroll-mt-36 flex-col gap-[2.8rem] max-sm:gap-[2.25rem]"
    >
      <div className="flex items-center gap-[0.65rem] [&>svg]:size-[1.15rem] [&>svg]:text-muted-foreground">
        <Briefcase aria-hidden="true" />
        <h2 className="m-0 text-base font-[570] tracking-[-0.01em]">
          Experience
        </h2>
      </div>
      <ol className="m-0 grid list-none gap-[3.25rem] p-0">
        {experiences.map((experience) => (
          <li
            key={experience.company}
            data-testid="experience-item"
            className="flex flex-col gap-[0.8rem]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="mb-[0.3rem] text-[0.78rem] text-muted-foreground">
                  {experience.period}
                </p>
                <h3 className="m-0 max-[420px]:max-w-64 text-base font-medium leading-[1.45] [&_span]:text-muted-foreground [&_strong]:font-[610]">
                  {experience.role} <span>at</span>{" "}
                  <strong>{experience.company}</strong>
                </h3>
              </div>
              <span
                data-testid="company-mark"
                data-company={experience.logo.variant}
                className={`grid size-[2.55rem] min-w-[2.55rem] place-items-center overflow-hidden rounded-[0.8rem] border border-border shadow-[0_6px_18px_rgb(62_54_47/6%)] max-[420px]:size-[2.3rem] max-[420px]:min-w-[2.3rem] ${
                  experience.logo.variant === "abc"
                    ? "bg-black p-0"
                    : "bg-white p-0"
                }`}
                aria-hidden="true"
              >
                <Image
                  src={experience.logo.src}
                  alt=""
                  width={experience.logo.variant === "abc" ? 160 : 96}
                  height={experience.logo.variant === "abc" ? 160 : 48}
                  data-testid="company-logo"
                  className={
                    experience.logo.variant === "abc"
                      ? "size-full object-cover"
                      : "size-full scale-[1.3] object-contain"
                  }
                />
              </span>
            </div>
            {experience.summary ? (
              <p className="mt-[0.1rem] mb-0 text-[0.93rem] leading-[1.6] text-foreground">
                {experience.summary}
              </p>
            ) : null}
            <ul className="m-0 grid list-[circle] gap-[0.38rem] pl-4 text-[0.9rem] leading-[1.62] text-pretty text-muted-foreground">
              {experience.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
            {experience.confidential ? (
              <p className="m-0 w-fit border-l-2 border-border-strong pl-3 text-[0.78rem] italic text-subtle">
                Portfolio visuals are reconstructed; proprietary product details
                remain private.
              </p>
            ) : null}
            <ul
              data-testid="tag-list"
              className="m-0 flex list-none flex-wrap gap-[0.4rem] p-0"
              aria-label={`${experience.company} technologies`}
            >
              {experience.technologies.map((technology) => (
                <li key={technology}>
                  <TechnologyBadge name={technology} />
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </section>
  );
}
