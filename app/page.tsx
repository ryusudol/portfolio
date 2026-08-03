import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  Briefcase,
  Code,
  GraduationCap,
  Star,
} from "reicon-react";

import { GitHubIcon } from "@/components/brand-icons";
import { CopyEmailButton } from "@/components/copy-email-button";
import { ProfileMenu } from "@/components/profile-menu";
import { ProjectArtwork } from "@/components/project-artwork";
import { SocialLinks } from "@/components/social-links";
import { TechnologyIcon } from "@/components/technology-icon";
import { getGithubContributions } from "@/lib/github-contributions";
import { contact, experiences, projects, technologies } from "@/lib/portfolio";

const education = [
  {
    school: "Rice University",
    location: "Houston, TX",
    degree: "Master of Computer Science",
    period: "Aug. 2025 — Dec. 2026",
    note: "GPA 3.91 / 4.00",
  },
  {
    school: "Sungkyunkwan University",
    location: "Suwon, South Korea",
    degree: "B.S. in Computer Science and Engineering",
    period: "Mar. 2018 — Aug. 2024",
    note: "Senior-year GPA 4.40 / 4.50",
  },
] as const;

const waveMask = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='22' height='8' viewBox='0 0 22 8'%3E%3Cpath d='M0 4 Q5.5 0 11 4 T22 4' fill='none' stroke='currentColor' stroke-width='1' stroke-linecap='round'/%3E%3C/svg%3E") repeat-x center / 1.375rem 0.5rem`;

function Separator() {
  return (
    <hr
      data-testid="wave-separator"
      className="m-0 h-2 w-full border-0 bg-border-strong"
      style={{ mask: waveMask, WebkitMask: waveMask }}
    />
  );
}

export default async function HomePage() {
  const githubContributions = await getGithubContributions("ryusudol");

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
        data-testid="site-shell"
        className="mx-auto flex w-[min(40rem,calc(100vw-2.5rem))] max-[420px]:w-[min(calc(100%-2rem),40rem)] flex-col gap-20 max-sm:gap-[4.25rem] pt-44 max-sm:pt-[8.75rem] animate-content-enter motion-reduce:animate-none"
      >
        <section
          id="home"
          className="flex scroll-mt-36 flex-col gap-[2.8rem] max-sm:gap-[2.25rem]"
        >
          <h1 className="mt-4 mb-0 font-display text-[clamp(2rem,5vw,2.45rem)] font-[520] italic leading-none tracking-[-0.035em]">
            Suhyeon Yu
          </h1>

          <div
            data-testid="hero-copy"
            className="grid gap-4 text-base leading-[1.68] text-pretty text-muted max-[420px]:text-[0.94rem] [&_p]:m-0 [&_strong]:font-[570] [&_strong]:text-foreground"
          >
            <p>
              👋 Hey! I&apos;m a{" "}
              <strong>frontend-focused software engineer</strong> crafting web
              experiences for both <strong>humans and agents</strong>.
            </p>
            <p>
              I&apos;m currently at <strong>ABC Fitness</strong> and pursuing my
              Master of Computer Science at <strong>Rice University</strong>.
            </p>
            <p>
              I&apos;ve built production web applications used by{" "}
              <strong>5,000+ people</strong>, tuned interactive visualizations
              to <strong>p95 ≤ 11 ms</strong>, and shipped open-source machine
              learning tooling.
            </p>
          </div>

          <div className="flex items-center gap-[0.55rem] max-[420px]:flex-col max-[420px]:items-start">
            <CopyEmailButton email={contact.email} />
            <SocialLinks contributions={githubContributions} />
          </div>
        </section>

        <Separator />

        <section
          id="experience"
          className="flex scroll-mt-36 flex-col gap-[2.8rem] max-sm:gap-[2.25rem]"
        >
          <div className="flex items-center gap-[0.65rem] [&>svg]:size-[1.15rem] [&>svg]:text-muted">
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
                    <p className="mb-[0.3rem] text-[0.78rem] text-muted">
                      {experience.period}
                    </p>
                    <h3 className="m-0 max-[420px]:max-w-64 text-base font-medium leading-[1.45] [&_span]:text-muted [&_strong]:font-[610]">
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
                        : "bg-white p-[0.3rem]"
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
                          : "size-full object-contain"
                      }
                    />
                  </span>
                </div>
                {experience.summary ? (
                  <p className="mt-[0.1rem] mb-0 text-[0.93rem] leading-[1.6] text-foreground">
                    {experience.summary}
                  </p>
                ) : null}
                <ul className="m-0 grid list-[circle] gap-[0.38rem] pl-4 text-[0.9rem] leading-[1.62] text-pretty text-muted">
                  {experience.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
                {experience.confidential ? (
                  <p className="m-0 w-fit border-l-2 border-border-strong pl-3 text-[0.78rem] italic text-subtle">
                    Portfolio visuals are reconstructed; proprietary product
                    details remain private.
                  </p>
                ) : null}
                <ul
                  data-testid="tag-list"
                  className="m-0 flex list-none flex-wrap gap-[0.4rem] p-0 [&_li]:inline-flex [&_li]:items-center [&_li]:gap-[0.34rem] [&_li]:rounded-[0.55rem] [&_li]:border [&_li]:border-border [&_li]:bg-[color-mix(in_srgb,var(--color-surface)_72%,transparent)] [&_li]:px-2 [&_li]:py-[0.27rem] [&_li]:text-[0.7rem] [&_li]:text-muted"
                  aria-label={`${experience.company} technologies`}
                >
                  {experience.technologies.map((technology) => (
                    <li key={technology}>
                      <TechnologyIcon
                        name={technology}
                        className="size-[0.9rem] shrink-0"
                      />
                      <span>{technology}</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </section>

        <Separator />

        <section
          id="work"
          className="flex scroll-mt-36 flex-col gap-[2.8rem] max-sm:gap-[2.25rem]"
        >
          <div className="flex items-center gap-[0.65rem] [&>svg]:size-[1.15rem] [&>svg]:text-muted">
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
                className="group flex min-w-0 flex-col overflow-hidden rounded-portfolio border border-border bg-surface-alt transition-[transform,border-color,box-shadow,opacity,filter] duration-[180ms] ease-in-out hover:-translate-y-[3px] hover:border-border-strong hover:shadow-[0_18px_40px_rgb(62_54_47/9%)] dark:hover:shadow-[0_20px_45px_rgb(0_0_0/22%)] motion-reduce:transition-none [@media(hover:hover)]:group-has-[:hover]/projects:not-hover:opacity-[0.34] [@media(hover:hover)]:group-has-[:hover]/projects:not-hover:saturate-[0.2] [@media(hover:hover)]:group-has-[:hover]/projects:not-hover:grayscale-[0.9]"
                aria-label={`View ${project.title} project`}
              >
                <ProjectArtwork project={project} />
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="m-0 text-base font-[610]">{project.title}</h3>
                  <p className="mt-[0.55rem] mb-4 text-[0.82rem] leading-[1.6] text-pretty text-muted">
                    {project.description}
                  </p>
                  <ul
                    className="mt-auto flex list-none flex-wrap gap-[0.4rem] p-0 [&_li]:inline-flex [&_li]:items-center [&_li]:gap-[0.34rem] [&_li]:rounded-[0.55rem] [&_li]:border [&_li]:border-border [&_li]:bg-[color-mix(in_srgb,var(--color-surface)_72%,transparent)] [&_li]:px-2 [&_li]:py-[0.27rem] [&_li]:text-[0.7rem] [&_li]:text-muted"
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
                </div>
              </Link>
            ))}
            <a
              className="flex min-h-64 max-sm:min-h-44 flex-col items-center justify-center gap-[0.8rem] overflow-hidden rounded-portfolio border border-border bg-surface-alt p-8 text-center text-muted transition-[transform,background-color,color,opacity,filter] duration-[160ms] ease-in-out hover:-translate-y-[3px] hover:bg-surface-hover hover:text-foreground motion-reduce:transition-none [@media(hover:hover)]:group-has-[:hover]/projects:not-hover:opacity-[0.34] [@media(hover:hover)]:group-has-[:hover]/projects:not-hover:saturate-[0.2] [@media(hover:hover)]:group-has-[:hover]/projects:not-hover:grayscale-[0.9]"
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

        <Separator />

        <section
          id="credentials"
          className="flex scroll-mt-36 flex-col gap-[2.8rem] max-sm:gap-[2.25rem]"
        >
          <div className="flex items-center gap-[0.65rem] [&>svg]:size-[1.15rem] [&>svg]:text-muted">
            <GraduationCap aria-hidden="true" />
            <h2 className="m-0 text-base font-[570] tracking-[-0.01em]">
              Education & Recognition
            </h2>
          </div>
          <div className="grid grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] gap-12 max-sm:grid-cols-1 max-sm:gap-10">
            <div>
              <p className="mb-[1.1rem] text-[0.7rem] font-[580] tracking-[0.12em] text-muted uppercase">
                Education
              </p>
              <div className="grid gap-[1.8rem] [&_article]:grid [&_article]:gap-[0.35rem] [&_article>p]:m-0 [&_article>p]:text-[0.78rem] [&_article>p]:leading-[1.45] [&_article>p]:text-muted">
                {education.map((item) => (
                  <article key={item.school}>
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="m-0 text-[0.9rem] font-[610]">
                        {item.school}
                      </h3>
                      <span className="text-right text-[0.67rem] text-subtle">
                        {item.location}
                      </span>
                    </div>
                    <p>{item.degree}</p>
                    <div className="flex flex-wrap justify-between gap-x-4 gap-y-[0.4rem] text-[0.68rem] text-subtle">
                      <span>{item.period}</span>
                      <span>{item.note}</span>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div className="grid gap-[2.4rem]">
              <div>
                <p className="mb-[1.1rem] text-[0.7rem] font-[580] tracking-[0.12em] text-muted uppercase">
                  Publication
                </p>
                <a
                  className="relative -m-[0.7rem] grid gap-[0.35rem] rounded-[0.8rem] p-[0.7rem] pr-8 transition-colors duration-[140ms] ease-in-out hover:bg-surface-alt motion-reduce:transition-none [&>strong]:text-[0.88rem] [&>strong]:font-[610] [&>span]:text-[0.75rem] [&>span]:leading-normal [&>span]:text-muted [&>svg]:absolute [&>svg]:top-[0.85rem] [&>svg]:right-[0.7rem] [&>svg]:size-[0.9rem] [&>svg]:text-muted"
                  href="https://ieeexplore.ieee.org/document/11364307"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <strong>Unlearning Comparator</strong>
                  <span>
                    IEEE Transactions on Visualization and Computer Graphics,
                    2026
                  </span>
                  <ArrowUpRight aria-hidden="true" />
                </a>
              </div>
              <div>
                <p className="mb-[1.1rem] text-[0.7rem] font-[580] tracking-[0.12em] text-muted uppercase">
                  Recognition
                </p>
                <ul className="m-0 grid list-none gap-4 p-0 [&_li]:grid [&_li]:gap-[0.22rem] [&_li>span]:text-[0.74rem] [&_li>span]:text-muted [&_strong]:text-[0.84rem] [&_strong]:font-[590]">
                  <li>
                    <strong>Dean&apos;s List & Merit Scholarship</strong>
                    <span>Top 3% in CSE at SKKU</span>
                  </li>
                  <li>
                    <strong>Gold Prize</strong>
                    <span>SKKU Hackathon, 2023</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <Separator />

        <section
          id="stack"
          className="flex scroll-mt-36 flex-col gap-[2.8rem] max-sm:gap-[2.25rem]"
        >
          <div className="flex items-center gap-[0.65rem] [&>svg]:size-[1.15rem] [&>svg]:text-muted">
            <Code aria-hidden="true" />
            <h2 className="m-0 text-base font-[570] tracking-[-0.01em]">
              Tech Stack
            </h2>
          </div>
          <ul
            data-testid="technology-grid"
            className="group/tech m-0 grid list-none grid-cols-6 gap-0 p-0 max-sm:grid-cols-3"
          >
            {technologies.map((technology) => (
              <li
                key={technology.name}
                className="flex aspect-square min-w-0 flex-col items-center justify-center gap-[0.65rem] rounded-portfolio text-center text-[0.68rem] text-muted transition-[background-color,color,opacity,filter] duration-[160ms] ease-in-out hover:text-foreground motion-reduce:transition-none [@media(hover:hover)]:group-has-[:hover]/tech:not-hover:opacity-[0.52] [@media(hover:hover)]:group-has-[:hover]/tech:not-hover:saturate-[0.45] hover:[&_[data-testid=technology-icon]]:scale-[1.08] hover:[&_[data-testid=technology-icon]]:-rotate-2 hover:[&_[data-testid=technology-icon]]:drop-shadow-[0_10px_16px_rgb(62_54_47/16%)] [@media(hover:hover)]:group-has-[:hover]/tech:not-hover:[&_[data-testid=technology-icon]]:scale-[0.94] [@media(hover:hover)]:group-has-[:hover]/tech:not-hover:[&_[data-testid=technology-icon]]:grayscale-[0.55]"
              >
                <TechnologyIcon
                  name={technology.name}
                  className="size-10 drop-shadow-[0_7px_12px_rgb(62_54_47/10%)] transition-[transform,filter] duration-[180ms] ease-in-out motion-reduce:transition-none"
                />
                <span>{technology.name}</span>
              </li>
            ))}
          </ul>
        </section>

        <Separator />
      </main>

      <footer className="mx-auto flex w-[min(40rem,calc(100vw-2.5rem))] max-[420px]:w-[min(calc(100%-2rem),40rem)] items-center justify-between gap-4 px-0 pt-20 pb-9 text-[0.72rem] text-muted max-sm:flex-col max-sm:items-start [&_a]:inline-flex [&_a]:items-center [&_a]:gap-[0.4rem] [&_a]:underline [&_a]:decoration-border-strong [&_a]:underline-offset-[0.23rem] [&_a]:transition-colors [&_a]:duration-[140ms] [&_a]:ease-in-out [&_a]:hover:text-foreground [&_a]:motion-reduce:transition-none [&_p]:m-0 [&_p]:text-right [&_p]:max-sm:text-left [&_svg]:size-4">
        <a href={contact.source} target="_blank" rel="noopener noreferrer">
          <GitHubIcon aria-hidden="true" />
          View the source code
        </a>
        <p>© {new Date().getFullYear()} Suhyeon Yu. All rights reserved.</p>
      </footer>
    </>
  );
}
