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
            <div className="hero__copy">
              <p className="kicker hero__kicker">
                {profile.role} · Rice MCS ’26
              </p>
              <h1 className="hero__name" data-dots-text>
                {profile.name}
              </h1>
              <div className="hero__focus">
                <p className="hero__focus-label">Focused on</p>
                <ul>
                  {profile.focus.map((area) => (
                    <li key={area}>{area}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div
              className="hero__portrait"
              role="img"
              aria-label={`Portrait of ${profile.name}, drawn in dots`}
              data-dots-portrait="/portrait/dots.bin"
            />
          </div>
        </section>

        <Chapter
          id="experience"
          scene="profile"
          topic="Experience"
          source="ABC Fitness"
          title={["A jQuery profile page,", "rewritten in React."]}
          body={
            <>
              Software Engineering Intern at ABC Fitness. Rebuilt the ABC
              Trainerize profile page from scratch for a platform serving 1.6M+
              clients and 400,000+ fitness professionals — carrying over its
              business logic with care and covering it with unit tests so it
              could roll out safely.
            </>
          }
          tools={["React", "TypeScript", "RxJS", "Redux", "Jest"]}
          tag={
            <Link
              className="pill"
              href="/experience/abc-fitness"
              aria-label="ABC Fitness details"
            >
              Details
              <ArrowRight size={12} aria-hidden />
            </Link>
          }
          visual={<ProfileSketch />}
        />

        <UnlearningChapter id="unlearning-comparator" linkToCaseStudy />
        <CkaChapter id="pytorch-cka" linkToCaseStudy />

        <section
          id="contact"
          className="contact"
          data-scene="contact"
          aria-labelledby="contact-title"
        >
          <div className="contact__stage">
            <p className="kicker kicker--center">Contact</p>
            <h2 id="contact-title" className="contact__title">
              Let’s work together.
            </h2>
            <p className="contact__lede">
              Hiring, collaborating, or just curious? Send a note — it lands
              straight in my inbox.
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
                    <a href={item.href} target="_blank" rel="noreferrer">
                      <strong>{item.title}</strong>
                    </a>
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
