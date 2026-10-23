"use client";

import Image, { type StaticImageData } from "next/image";
import { useId, useState } from "react";
import { ChevronDown } from "reicon-react";

type Shot = {
  label: string;
  stack: string;
  image: StaticImageData;
  alt: string;
  notes: string[];
};

/**
 * Two screenshots of the same page side by side, cropped to their first
 * screen until the reader asks for the whole of both, so they stay aligned.
 */
export function BeforeAfter({ shots }: { shots: [Shot, Shot] }) {
  const [open, setOpen] = useState(false);
  const grid = useId();

  return (
    <>
      <div id={grid} className="compare__grid" data-open={open || undefined}>
        {shots.map((shot) => (
          <figure key={shot.label} className="compare__shot">
            <div
              className="compare__frame"
              data-dots="outline"
              data-dots-spread="1"
              data-dots-weight="0.8"
            >
              <Image
                src={shot.image}
                alt={shot.alt}
                sizes="(max-width: 899px) 92vw, 540px"
                placeholder="blur"
              />
            </div>
            <figcaption>
              <p className="compare__label">
                {shot.label}
                <span className="kicker__source"> · {shot.stack}</span>
              </p>
              <ul className="compare__notes">
                {shot.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </figcaption>
          </figure>
        ))}
      </div>
      <button
        type="button"
        className="action compare__toggle"
        aria-expanded={open}
        aria-controls={grid}
        onClick={(e) => {
          const button = e.currentTarget;
          setOpen(!open);
          // Collapsing from deep in the full pages would strand the reader
          // far below the section, so bring the button back into view.
          if (open) {
            requestAnimationFrame(() =>
              button.scrollIntoView({ block: "nearest" }),
            );
          }
        }}
      >
        {open ? "Show the first screen" : "Show both full pages"}
        <ChevronDown size={12} aria-hidden />
      </button>
    </>
  );
}
