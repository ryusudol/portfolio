import { ArrowDown, ArrowUpRight } from "reicon-react";

import { AsyncControls } from "@/components/async-controls";
import { Chapter } from "@/components/chapter";
import { ChapterNav } from "@/components/chapter-nav";
import { CodeSample } from "@/components/code-sample";
import { ContactPrompt } from "@/components/contact-prompt";
import { DotStage } from "@/components/dot-stage";
import { MiniApp } from "@/components/mini-app";
import { SiteHeader } from "@/components/site-header";
import {
  alsoBuilt,
  education,
  experience,
  links,
  profile,
  publication,
  stack,
} from "@/lib/content";

function External({ href, children }: { href: string; children: string }) {
  return (
    <a className="pill" href={href} target="_blank" rel="noreferrer">
      {children}
      <ArrowUpRight size={12} aria-hidden />
    </a>
  );
}

export default function Home() {
  return (
    <>
      <a className="skip-link" href="#contact">
        Skip to contact
      </a>
      <SiteHeader />
      <ChapterNav />
      <DotStage />

      <main id="chapters">
        <section
          id="intro"
          className="hero"
          data-scene="hero"
          aria-label="Introduction"
        >
          <div className="hero__sticky">
            <p className="kicker kicker--center">
              {profile.role} · Rice MCS ’26
            </p>
            <h1 className="hero__name" data-dots-text>
              {profile.name}
            </h1>
            <p className="hero__tagline">{profile.tagline}</p>
            <p className="hero__hint">
              <span>scroll</span>
              <ArrowDown size={12} aria-hidden />
              <span className="hide-compact">· click anywhere</span>
            </p>
          </div>
        </section>

        <Chapter
          index={1}
          id="async"
          scene="async"
          topic="Async"
          source="ABC Fitness"
          title={["Fire every request,", "keep only the latest."]}
          body={
            <>
              At ABC Fitness I coordinated multi-endpoint profile requests with
              RxJS — stale responses suppressed, overlapping uploads and edits
              prevented.
            </>
          }
          stat={{
            value: "97%",
            caption: "branch coverage of profile logic · Jest",
          }}
          tag={<span className="pill pill--static">Jun – Aug 2026</span>}
        >
          <AsyncControls />
        </Chapter>

        <Chapter
          index={2}
          id="interface"
          scene="interface"
          topic="Interface"
          source="ABC Trainerize"
          title={["Rebuilt in React,", "redesigned beyond scope."]}
          body={
            <>
              I rewrote the Trainerize profile page from jQuery to React for a
              platform serving 400,000+ fitness professionals — then reworked
              its hierarchy with a streamlined header, grouped cards, and modal
              editing.
            </>
          }
          stat={{
            value: "1.6M+",
            caption: "clients reached through Trainerize",
          }}
          tag={<span className="hint">[ the card is live — try it ]</span>}
          visualClassName="chapter__visual--split"
          visual={
            <>
              <CodeSample />
              <div className="mini-slot" data-dots-group="live">
                <MiniApp />
              </div>
            </>
          }
        />

        <Chapter
          index={3}
          id="visualization"
          scene="visualization"
          topic="Visualization"
          source="Unlearning Comparator"
          title={["Two thousand points,", "one class forgotten."]}
          body={
            <>
              A visual analytics system for comparing how machine-unlearning
              methods change a model’s accuracy, efficiency, and privacy —
              published in IEEE TVCG. I built the frontend end to end with
              React, D3, and Zustand.
            </>
          }
          chips={["UMAP · 2,000 pts", "DOM ops per hover −99%"]}
          stat={{ value: "100+", caption: "GitHub stars" }}
          tag={
            <>
              <External href={links.unlearningDemo}>Demo</External>
              <External href={links.unlearningPaper}>Paper</External>
            </>
          }
          visual={
            <p className="singularity" aria-live="off">
              <span className="singularity__value" data-counter="forget">
                200
              </span>
              <span className="singularity__caption">forget-class points</span>
            </p>
          }
        />

        <Chapter
          index={4}
          id="orchestration"
          scene="orchestration"
          topic="Orchestration"
          source="AI-assisted delivery"
          title={["Split in parallel,", "ship as one."]}
          body={
            <>
              I built profile sections with multiple AI agents working in
              parallel Git worktrees, then landed the rewrite as independently
              reviewable stacked PRs behind a LaunchDarkly flag.
            </>
          }
          chips={["Git worktrees", "Figma MCP", "Stacked PRs", "LaunchDarkly"]}
          tag={<span className="hint">[ scroll to merge ]</span>}
        />

        <Chapter
          index={5}
          id="performance"
          scene="performance"
          topic="Performance"
          source="PyTorch-CKA"
          title={["Cubic,", "made quadratic."]}
          body={
            <>
              An open-source library for comparing representations across CNN
              and LLM layers. Frobenius inner products replaced full matrix
              products, taking HSIC from O(B³) to O(B²) per layer pair.
            </>
          }
          chips={["~400 PyPI downloads / mo", "CI · Python 3.10–3.14"]}
          stat={{
            value: "5.7×",
            caption: "faster than an existing library on H100",
          }}
          tag={
            <>
              <External href={links.ckaPypi}>PyPI</External>
              <External href={links.ckaCode}>Code</External>
            </>
          }
          visual={
            <dl className="readout">
              <div>
                <dt>complexity</dt>
                <dd data-counter="order">O(B³)</dd>
              </div>
              <div>
                <dt>speed-up</dt>
                <dd data-counter="speed">1.0×</dd>
              </div>
              <div>
                <dt>retained GPU memory</dt>
                <dd data-counter="memory">100.0%</dd>
              </div>
            </dl>
          }
        />

        <section
          id="contact"
          className="contact"
          data-scene="contact"
          aria-labelledby="contact-title"
        >
          <div className="contact__stage">
            <p className="kicker kicker--center">
              <span className="kicker__rule" aria-hidden />
              06 — Your turn
            </p>
            <h2 id="contact-title" className="contact__title">
              Let’s give your idea a shape.
            </h2>
            <ContactPrompt />
            <p className="contact__hint">
              <kbd>Enter ↵</kbd> opens your mail app ·{" "}
              <a href={`mailto:${profile.email}`}>{profile.email}</a>
            </p>
          </div>

          <footer className="colophon">
            <div className="colophon__grid">
              <div>
                <h3>Experience</h3>
                {experience.map((item) => (
                  <p key={item.org}>
                    <strong>{item.org}</strong> — {item.title}
                    <span>
                      {item.place} · {item.period}
                    </span>
                  </p>
                ))}
              </div>
              <div>
                <h3>Education</h3>
                {education.map((item) => (
                  <p key={item.org}>
                    <strong>{item.org}</strong> — {item.title}
                    <span>
                      {item.place} · {item.period}
                    </span>
                  </p>
                ))}
              </div>
              <div>
                <h3>Publication</h3>
                <p>
                  <a href={publication.href} target="_blank" rel="noreferrer">
                    {publication.title}
                  </a>
                  <span>
                    {publication.authors} · {publication.venue}
                  </span>
                </p>
                <h3>Also built</h3>
                {alsoBuilt.map((item) => (
                  <p key={item.title}>
                    <strong>{item.title}</strong>
                    <span>{item.note}</span>
                  </p>
                ))}
              </div>
              <div>
                <h3>Elsewhere</h3>
                <ul className="colophon__links">
                  <li>
                    <a href={`mailto:${profile.email}`}>Email</a>
                  </li>
                  <li>
                    <a href={profile.github} target="_blank" rel="noreferrer">
                      GitHub
                    </a>
                  </li>
                  <li>
                    <a href={profile.linkedin} target="_blank" rel="noreferrer">
                      LinkedIn
                    </a>
                  </li>
                </ul>
                <h3>Tools</h3>
                <p className="colophon__stack">{stack.join(" · ")}</p>
              </div>
            </div>
            <p className="colophon__base">
              <span>© 2026 {profile.name}</span>
              <span>Drawn in dots with Next.js &amp; Canvas</span>
            </p>
          </footer>
        </section>
      </main>
    </>
  );
}
