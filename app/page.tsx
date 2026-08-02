"use client";

import Image from "next/image";
import { type KeyboardEvent, useState } from "react";
import { ArrowUpRight, Envelope, FileText } from "reicon-react";

import { BackToTop } from "@/components/back-to-top";
import { GitHubIcon, LinkedInIcon } from "@/components/brand-icons";
import { ContactComposer } from "@/components/contact-composer";
import { ProjectChapter } from "@/components/project-chapter";
import { ThemeToggle } from "@/components/theme-toggle";
import { VisualStage } from "@/components/visual-stage";
import { projects } from "@/lib/projects";

type PanelId = "overview" | "projects" | "archive" | "contact";

const resumeHref = "/documents/Suhyeon-Yu-Resume.pdf";
const portraitSrc = "/images/portrait/suhyeon-mountain-dithered.jpg";

const education = [
  {
    school: "Rice University",
    degree: "Master of Computer Science",
    period: "Aug 2025 — Dec 2026",
    note: "GPA 3.91 / 4.00",
  },
  {
    school: "Sungkyunkwan University",
    degree: "B.S. in Computer Science & Engineering",
    period: "Mar 2018 — Aug 2024",
    note: "GPA 4.40 / 4.50",
  },
] as const;

const skills = [
  {
    label: "Frontend",
    value: "TypeScript, React, Next.js, Tailwind CSS, D3.js",
  },
  {
    label: "ML & data",
    value: "Python, PyTorch, NumPy, Pandas, scikit-learn",
  },
  {
    label: "Systems",
    value: "Docker, AWS, GitHub Actions, Linux, PostgreSQL",
  },
] as const;

const panels = [
  { id: "overview", label: "Overview" },
  { id: "projects", label: "Projects" },
  { id: "archive", label: "Archive" },
  { id: "contact", label: "Contact" },
] as const satisfies readonly { id: PanelId; label: string }[];

const archiveLinks = [
  {
    index: "A01",
    label: "Unlearning Comparator",
    detail: "Peer-reviewed paper · IEEE TVCG",
    href: "https://ieeexplore.ieee.org/document/11364307",
  },
  {
    index: "A02",
    label: "PyTorch-CKA",
    detail: "Open-source representation analysis toolkit",
    href: "https://github.com/ryusudol/Centered-Kernel-Alignment",
  },
] as const;

function panelTabId(panel: PanelId) {
  return `portfolio-tab-${panel}`;
}

function panelContentId(panel: PanelId) {
  return `portfolio-panel-${panel}`;
}

type PortfolioSectionProps = {
  id: string;
  labelledBy?: string;
};

function ProjectsSection({ id, labelledBy }: PortfolioSectionProps) {
  return (
    <>
      <VisualStage projectsPanelId={id} />
      <section
        id={id}
        className="work-section portfolio-tab-panel"
        role={labelledBy ? "tabpanel" : undefined}
        aria-labelledby={labelledBy}
      >
        <div className="page-grid portfolio-section-header">
          <div className="section-heading portfolio-section-heading">
            <span className="section-index">01</span>
            <p className="eyebrow">Selected Projects</p>
          </div>
          <h2 className="sr-only">Selected Projects</h2>
        </div>
        <div className="project-list">
          {projects.map((project) => (
            <ProjectChapter key={project.id} project={project} />
          ))}
        </div>
      </section>
    </>
  );
}

function BackgroundSection({ id }: PortfolioSectionProps) {
  return (
    <section id={id} className="overview-section">
      <div className="page-grid">
        <div className="section-heading">
          <span className="section-index">02</span>
          <p className="eyebrow">Background</p>
        </div>
        <h2 className="sr-only">Overview and background</h2>

        <div className="overview-layout">
          <div className="overview-portrait portrait-dither">
            <Image
              src={portraitSrc}
              alt="Suhyeon standing on a mountain at sunset"
              fill
              priority
              sizes="(max-width: 767px) 92vw, (max-width: 1199px) 44vw, 34vw"
              className="object-cover"
            />
          </div>

          <div className="record-grid background-record-grid">
            <section aria-labelledby={`${id}-education-title`}>
              <p className="record-label" id={`${id}-education-title`}>
                Education
              </p>
              <div className="record-list education-list">
                {education.map((item) => (
                  <article key={item.school}>
                    <div>
                      <h3>{item.school}</h3>
                      <p>{item.degree}</p>
                    </div>
                    <time>{item.period}</time>
                    <p>{item.note}</p>
                  </article>
                ))}
              </div>
            </section>

            <section aria-labelledby={`${id}-skills-title`}>
              <p className="record-label" id={`${id}-skills-title`}>
                Selected skills
              </p>
              <dl className="skills-list">
                {skills.map((skill) => (
                  <div key={skill.label}>
                    <dt>{skill.label}</dt>
                    <dd>{skill.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          </div>
        </div>
      </div>
    </section>
  );
}

function ArchiveSection({ id, labelledBy }: PortfolioSectionProps) {
  return (
    <section
      id={id}
      className="archive-section portfolio-tab-panel"
      role={labelledBy ? "tabpanel" : undefined}
      aria-labelledby={labelledBy}
    >
      <div className="page-grid">
        <div className="section-heading">
          <span className="section-index">03</span>
          <p className="eyebrow">Archive</p>
        </div>
        <h2>Technical writing and open work.</h2>
        <div className="archive-list">
          {archiveLinks.map((item) => (
            <a
              key={item.index}
              href={item.href}
              target="_blank"
              rel="noreferrer"
            >
              <span>{item.index}</span>
              <strong>{item.label}</strong>
              <small>{item.detail}</small>
              <ArrowUpRight aria-hidden="true" />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function ContactSection({ id, labelledBy }: PortfolioSectionProps) {
  return (
    <section
      id={id}
      className="contact-footer portfolio-tab-panel"
      role={labelledBy ? "tabpanel" : undefined}
      aria-labelledby={labelledBy}
    >
      <div className="page-grid">
        <div className="section-heading">
          <span className="section-index">04</span>
          <p className="eyebrow">Contact</p>
        </div>
        <h2>Have an interesting problem?</h2>
        <p className="contact-helper">
          You can send a message to my email here.
        </p>
        <ContactComposer />

        <nav className="social-links" aria-label="Contact links">
          <a
            className="focus-ring"
            href="mailto:suhyeon.yu.2789@gmail.com"
            aria-label="Email Suhyeon"
            title="Email"
          >
            <Envelope aria-hidden="true" />
          </a>
          <a
            className="focus-ring"
            href="https://www.linkedin.com/in/suhyeon-yu"
            target="_blank"
            rel="noreferrer"
            aria-label="Suhyeon on LinkedIn"
            title="LinkedIn"
          >
            <LinkedInIcon aria-hidden="true" />
          </a>
          <a
            className="focus-ring"
            href="https://github.com/ryusudol"
            target="_blank"
            rel="noreferrer"
            aria-label="Suhyeon on GitHub"
            title="GitHub"
          >
            <GitHubIcon aria-hidden="true" />
          </a>
          <a
            className="focus-ring"
            href={resumeHref}
            target="_blank"
            rel="noreferrer"
            aria-label="Suhyeon's résumé"
            title="Résumé"
          >
            <FileText aria-hidden="true" />
          </a>
        </nav>

        <div className="footer-meta">
          <span>Suhyeon Yu</span>
          <span>© {new Date().getFullYear()}</span>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const [activePanel, setActivePanel] = useState<PanelId>("overview");

  function handleTabKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) {
    let nextIndex: number | null = null;

    if (event.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % panels.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + panels.length) % panels.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = panels.length - 1;
    }

    if (nextIndex === null) {
      return;
    }

    event.preventDefault();
    const nextPanel = panels[nextIndex];
    setActivePanel(nextPanel.id);
    document.getElementById(panelTabId(nextPanel.id))?.focus();
  }

  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <BackToTop />
      <div className="theme-dock">
        <ThemeToggle />
      </div>

      <main id="main-content" tabIndex={-1}>
        <section
          id="top"
          className="hero-section tabbed-portfolio"
          aria-labelledby="hero-title"
        >
          <div className="hero-copy">
            <div className="hero-copy-inner">
              <h1 id="hero-title">Suhyeon Yu</h1>
              <p className="hero-introduction">
                Frontend-focused software engineer who crafts web experiences
                for both humans and agents.
              </p>
              <div
                className="hero-navigation"
                role="tablist"
                aria-label="Portfolio views"
              >
                {panels.map((panel, index) => (
                  <button
                    key={panel.id}
                    id={panelTabId(panel.id)}
                    type="button"
                    role="tab"
                    aria-selected={activePanel === panel.id}
                    aria-controls={panelContentId(panel.id)}
                    tabIndex={activePanel === panel.id ? 0 : -1}
                    onClick={() => setActivePanel(panel.id)}
                    onKeyDown={(event) => handleTabKeyDown(event, index)}
                  >
                    {panel.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {activePanel === "overview" ? (
          <div
            id={panelContentId("overview")}
            className="portfolio-overview portfolio-tab-panel"
            role="tabpanel"
            aria-labelledby={panelTabId("overview")}
          >
            <ProjectsSection id="overview-selected-projects" />
            <BackgroundSection id="overview-background" />
            <ArchiveSection id="overview-archive" />
            <ContactSection id="overview-contact" />
          </div>
        ) : null}

        {activePanel === "projects" ? (
          <ProjectsSection
            id={panelContentId("projects")}
            labelledBy={panelTabId("projects")}
          />
        ) : null}

        {activePanel === "archive" ? (
          <ArchiveSection
            id={panelContentId("archive")}
            labelledBy={panelTabId("archive")}
          />
        ) : null}

        {activePanel === "contact" ? (
          <ContactSection
            id={panelContentId("contact")}
            labelledBy={panelTabId("contact")}
          />
        ) : null}
      </main>
    </>
  );
}
