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

function Separator() {
  return <hr className="wave-separator" />;
}

export default async function HomePage() {
  const githubContributions = await getGithubContributions("ryusudol");

  return (
    <>
      <a className="skip-link" href="#content">
        Skip to content
      </a>
      <div className="top-blur" aria-hidden="true" />
      <ProfileMenu />

      <main id="content" className="site-shell">
        <section id="home" className="hero-section anchor-section">
          <h1>Suhyeon Yu</h1>

          <div className="hero-copy">
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

          <div className="contact-row">
            <CopyEmailButton email={contact.email} />
            <SocialLinks contributions={githubContributions} />
          </div>
        </section>

        <Separator />

        <section id="experience" className="content-section anchor-section">
          <div className="section-title">
            <Briefcase aria-hidden="true" />
            <h2>Experience</h2>
          </div>
          <ol className="experience-list">
            {experiences.map((experience) => (
              <li key={experience.company} className="experience-item">
                <div className="experience-heading">
                  <div>
                    <p className="period">{experience.period}</p>
                    <h3>
                      {experience.role} <span>at</span>{" "}
                      <strong>{experience.company}</strong>
                    </h3>
                  </div>
                  <span
                    className="company-mark"
                    data-company={experience.logo.variant}
                    aria-hidden="true"
                  >
                    <Image
                      src={experience.logo.src}
                      alt=""
                      width={96}
                      height={48}
                      className="company-logo"
                    />
                  </span>
                </div>
                {experience.summary ? (
                  <p className="experience-summary">{experience.summary}</p>
                ) : null}
                <ul className="experience-bullets">
                  {experience.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
                {experience.confidential ? (
                  <p className="confidential-note">
                    Portfolio visuals are reconstructed; proprietary product
                    details remain private.
                  </p>
                ) : null}
                <ul
                  className="tag-list"
                  aria-label={`${experience.company} technologies`}
                >
                  {experience.technologies.map((technology) => (
                    <li key={technology}>
                      <TechnologyIcon name={technology} />
                      <span>{technology}</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </section>

        <Separator />

        <section id="work" className="content-section anchor-section">
          <div className="section-title">
            <Star aria-hidden="true" />
            <h2>Selected Work</h2>
          </div>
          <div className="project-grid">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/work/${project.slug}`}
                className="project-card"
                aria-label={`View ${project.title} project`}
              >
                <ProjectArtwork project={project} />
                <div className="project-card-copy">
                  <h3>{project.title}</h3>
                  <p>{project.description}</p>
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
                </div>
              </Link>
            ))}
            <a
              className="github-card"
              href={contact.github}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span>
                See the source code of more experiments and open-source work on
              </span>
              <strong>
                <GitHubIcon aria-hidden="true" /> GitHub
              </strong>
            </a>
          </div>
        </section>

        <Separator />

        <section id="credentials" className="content-section anchor-section">
          <div className="section-title">
            <GraduationCap aria-hidden="true" />
            <h2>Education & Recognition</h2>
          </div>
          <div className="credentials-grid">
            <div>
              <p className="credentials-label">Education</p>
              <div className="education-list">
                {education.map((item) => (
                  <article key={item.school}>
                    <div className="credential-heading">
                      <h3>{item.school}</h3>
                      <span>{item.location}</span>
                    </div>
                    <p>{item.degree}</p>
                    <div className="credential-meta">
                      <span>{item.period}</span>
                      <span>{item.note}</span>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div className="recognition-column">
              <div>
                <p className="credentials-label">Publication</p>
                <a
                  className="publication-link"
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
                <p className="credentials-label">Recognition</p>
                <ul className="recognition-list">
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

        <section id="stack" className="content-section anchor-section">
          <div className="section-title">
            <Code aria-hidden="true" />
            <h2>Tech Stack</h2>
          </div>
          <ul className="technology-grid">
            {technologies.map((technology) => (
              <li key={technology.name}>
                <TechnologyIcon
                  name={technology.name}
                  className="technology-icon"
                />
                <span>{technology.name}</span>
              </li>
            ))}
          </ul>
        </section>

        <Separator />
      </main>

      <footer className="site-footer">
        <a href={contact.source} target="_blank" rel="noopener noreferrer">
          <GitHubIcon aria-hidden="true" />
          View the source code
        </a>
        <p>© {new Date().getFullYear()} Suhyeon Yu. All rights reserved.</p>
      </footer>
    </>
  );
}
