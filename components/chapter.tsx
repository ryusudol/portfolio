import type { CSSProperties, ReactNode } from "react";

import { CountUp } from "./count-up";

type ChapterProps = {
  id: string;
  scene: string;
  topic: string;
  source: string;
  title: [string, string];
  body: ReactNode;
  children?: ReactNode;
  chips?: ReactNode[];
  /** Technologies used, listed under the body. */
  tools?: string[];
  stat?: { value: string; caption: string };
  tag?: ReactNode;
  /**
   * Captions the scene highlights one at a time as the chapter scrolls, so
   * the copy narrates whichever phase the particles are in.
   */
  steps?: ReactNode[];
  /** Scroll length in viewport heights; longer stories get more room. */
  length?: number;
  visual?: ReactNode;
  visualClassName?: string;
};

/**
 * A pinned chapter: copy on the left, a canvas-driven stage on the right.
 * The section is taller than the viewport; its scroll progress drives the scene.
 */
export function Chapter({
  id,
  scene,
  topic,
  source,
  title,
  body,
  children,
  chips,
  tools,
  stat,
  tag,
  steps,
  length,
  visual,
  visualClassName,
}: ChapterProps) {
  return (
    <section
      id={id}
      className="chapter"
      data-scene={scene}
      aria-labelledby={`${id}-title`}
      style={length ? ({ "--len": length } as CSSProperties) : undefined}
    >
      <div className="chapter__sticky">
        <div className="chapter__copy">
          <p className="kicker">
            <span>
              {topic}
              <span className="kicker__source"> · {source}</span>
            </span>
          </p>
          <h2 id={`${id}-title`} className="chapter__title">
            {title[0]}
            <br />
            {title[1]}
          </h2>
          <p className="chapter__body">{body}</p>
          {steps && (
            <ol className="steps">
              {steps.map((step, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: static list
                <li key={i} data-step={i}>
                  {step}
                </li>
              ))}
            </ol>
          )}
          {tools && (
            <ul className="tools" aria-label="Built with">
              {tools.map((tool) => (
                <li key={tool}>{tool}</li>
              ))}
            </ul>
          )}
          {chips && (
            <ul className="tools chapter__chips">
              {chips.map((chip, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: static list
                <li key={i}>{chip}</li>
              ))}
            </ul>
          )}
          {children}
          {(stat || tag) && (
            <div className="stat">
              {stat && <p className="stat__caption">[ {stat.caption} ]</p>}
              <div className="stat__row">
                {stat && <CountUp value={stat.value} />}
                {tag}
              </div>
            </div>
          )}
        </div>
        <div className={`chapter__visual ${visualClassName ?? ""}`} data-visual>
          {visual}
        </div>
      </div>
    </section>
  );
}
