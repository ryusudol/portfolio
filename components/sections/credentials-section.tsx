import { ArrowUpRight, GraduationCap } from "reicon-react";

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

export function CredentialsSection() {
  return (
    <section
      id="credentials"
      className="flex scroll-mt-36 flex-col gap-[2.8rem] max-sm:gap-[2.25rem]"
    >
      <div className="flex items-center gap-[0.65rem] [&>svg]:size-[1.15rem] [&>svg]:text-muted-foreground">
        <GraduationCap aria-hidden="true" />
        <h2 className="m-0 text-base font-[570] tracking-[-0.01em]">
          Education & Recognition
        </h2>
      </div>
      <div className="grid grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] gap-12 max-sm:grid-cols-1 max-sm:gap-10">
        <div>
          <p className="mb-[1.1rem] text-[0.7rem] font-[580] tracking-[0.12em] text-muted-foreground uppercase">
            Education
          </p>
          <div className="grid gap-[1.8rem] [&_article]:grid [&_article]:gap-[0.35rem] [&_article>p]:m-0 [&_article>p]:text-[0.78rem] [&_article>p]:leading-[1.45] [&_article>p]:text-muted-foreground">
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
            <p className="mb-[1.1rem] text-[0.7rem] font-[580] tracking-[0.12em] text-muted-foreground uppercase">
              Publication
            </p>
            <a
              className="relative -m-[0.7rem] grid gap-[0.35rem] rounded-[0.8rem] p-[0.7rem] pr-8 transition-colors duration-instant ease-in-out hover:bg-surface-alt motion-reduce:transition-none [&>strong]:text-[0.88rem] [&>strong]:font-[610] [&>span]:text-[0.75rem] [&>span]:leading-normal [&>span]:text-muted-foreground [&>svg]:absolute [&>svg]:top-[0.85rem] [&>svg]:right-[0.7rem] [&>svg]:size-[0.9rem] [&>svg]:text-muted-foreground"
              href="https://ieeexplore.ieee.org/document/11364307"
              target="_blank"
              rel="noopener noreferrer"
            >
              <strong>Machine Unlearning Comparator</strong>
              <span>
                IEEE Transactions on Visualization and Computer Graphics, 2026
              </span>
              <ArrowUpRight aria-hidden="true" />
            </a>
          </div>
          <div>
            <p className="mb-[1.1rem] text-[0.7rem] font-[580] tracking-[0.12em] text-muted-foreground uppercase">
              Recognition
            </p>
            <ul className="m-0 grid list-none gap-4 p-0 [&_li]:grid [&_li]:gap-[0.22rem] [&_li>span]:text-[0.74rem] [&_li>span]:text-muted-foreground [&_strong]:text-[0.84rem] [&_strong]:font-[590]">
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
  );
}
