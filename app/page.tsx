import { ChapterNav } from "@/components/chapter-nav";
import { ContactForm } from "@/components/contact-form";
import { DotStage } from "@/components/dot-stage";
import {
  CkaChapter,
  OrbitChapter,
  UnlearningChapter,
} from "@/components/featured-chapters";
import { SiteHeader } from "@/components/site-header";
import { education, homeChapters, profile, skills } from "@/lib/content";

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
              <h1 className="hero__name" data-dots-text>
                {profile.name}
              </h1>
              <p className="hero__lede">
                {profile.tagline.split(/(?<=\.) /).map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </p>
            </div>
            <div
              className="hero__portrait"
              role="img"
              aria-label={`Portrait of ${profile.name}, drawn in dots`}
              data-dots-portrait="/portrait/dots.bin"
            />
          </div>
        </section>

        <OrbitChapter id="orbit-explorer" />
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
                <h3>Education</h3>
                {education.map((item) => (
                  <p key={item.org}>
                    <strong>{item.org}</strong> — {item.title}
                    <span>
                      {item.place} · {item.period}
                    </span>
                  </p>
                ))}
                <h3>Contact</h3>
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
              </div>
              <div>
                <h3>Skills &amp; Tools</h3>
                <dl className="colophon__skills">
                  {skills.map((group) => (
                    <div key={group.label}>
                      <dt>{group.label}</dt>
                      <dd>{group.items.join(" · ")}</dd>
                    </div>
                  ))}
                </dl>
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
