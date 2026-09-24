import Link from "next/link";
import { ArrowRight } from "reicon-react";

import { Chapter } from "@/components/chapter";
import { ChapterNav } from "@/components/chapter-nav";
import { ContactForm } from "@/components/contact-form";
import { DotStage } from "@/components/dot-stage";
import { CkaChapter, UnlearningChapter } from "@/components/featured-chapters";
import { ProfileSketch } from "@/components/profile-sketch";
import { SiteHeader } from "@/components/site-header";
import {
  alsoBuilt,
  education,
  experience,
  homeChapters,
  profile,
  publication,
  stack,
} from "@/lib/content";

export default function Home() {
  return (
    <>
      <a className="skip-link" href="#contact">
        Skip to contact
      </a>
      <SiteHeader />
      <ChapterNav chapters={homeChapters} />
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
          </div>
        </section>

        <Chapter
          index={1}
          id="experience"
          scene="profile"
          topic="Experience"
          source="ABC Fitness"
          title={["One profile page,", "rebuilt end to end."]}
          body={
            <>
              As a Software Engineering Intern at ABC Fitness, I rewrote the ABC
              Trainerize profile page from jQuery to React — RxJS data flows,
              tested permissions, a redesigned layout, and a flag-gated rollout.
            </>
          }
          stat={{
            value: "400K+",
            caption: "fitness professionals on Trainerize",
          }}
          tag={
            <Link className="pill" href="/experience/abc-fitness">
              Read the case study
              <ArrowRight size={12} aria-hidden />
            </Link>
          }
          visual={<ProfileSketch />}
        />

        <UnlearningChapter
          index={2}
          id="unlearning-comparator"
          linkToCaseStudy
        />
        <CkaChapter index={3} id="pytorch-cka" linkToCaseStudy />

        <section
          id="contact"
          className="contact"
          data-scene="contact"
          aria-labelledby="contact-title"
        >
          <div className="contact__stage">
            <p className="kicker kicker--center">
              <span className="kicker__rule" aria-hidden />
              04 — Contact
            </p>
            <h2 id="contact-title" className="contact__title">
              Have something in mind?
            </h2>
            <p className="contact__lede">
              Send a note — it lands straight in my inbox.
            </p>
            <ContactForm />
            <p className="contact__hint">
              <kbd>Enter</kbd> to send · <kbd>Shift + Enter</kbd> for a new line
            </p>
          </div>

          <footer className="colophon">
            <div className="colophon__grid">
              <div>
                <h3>Experience</h3>
                {experience.map((item) => (
                  <p key={item.org}>
                    <Link href={item.href}>
                      <strong>{item.org}</strong>
                    </Link>{" "}
                    — {item.title}
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
            </p>
          </footer>
        </section>
      </main>
    </>
  );
}
