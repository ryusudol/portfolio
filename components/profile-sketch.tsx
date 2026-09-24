"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";

/** Profile-view histogram from the real page, normalised to the tallest day. */
const VIEWS = [
  0, 0, 0, 0, 0.45, 0.45, 0, 0.15, 1, 0.68, 0, 0.15, 0, 0.3, 0, 0, 0, 0, 0,
  0.15, 0, 0.45, 0.3, 0, 0.3, 0,
];

const CERTS = [
  { title: 0.72, issuer: 0.54 },
  { title: 0.6, issuer: 0.78 },
  { title: 0.84, issuer: 0.66 },
];

const bar = (width: string): CSSProperties =>
  ({ "--w": width }) as CSSProperties;

/**
 * Certifications keep reordering themselves — a nod to the drag-and-drop
 * reordering that lets trainers lead with their strongest credentials.
 */
function Certifications() {
  // Each tick lifts the bottom row to the top: slot = (id + tick) mod n.
  const [tick, setTick] = useState(0);
  const n = CERTS.length;
  const moving = tick > 0 ? (n - (tick % n)) % n : -1;

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 2800);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="sk-certs">
      {CERTS.map((cert, id) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed list; order animates via --slot
          key={id}
          className={`sk-cert${moving === id ? " is-moving" : ""}`}
          style={{ "--slot": (id + tick) % n } as CSSProperties}
          data-dots="outline"
          data-dots-tint={moving === id ? 1 : 0}
          data-dots-weight="0.8"
          data-dots-spread="0.7"
        >
          <span
            className="sk-cert__icon"
            data-dots="outline"
            data-dots-weight="0.8"
          />
          <span className="sk-cert__text">
            <span
              className="sk-bar"
              style={bar(`${cert.title * 100}%`)}
              data-dots="bar"
            />
            <span
              className="sk-bar sk-bar--faint"
              style={bar(`${cert.issuer * 100}%`)}
              data-dots="bar"
              data-dots-weight="0.6"
            />
          </span>
        </div>
      ))}
    </div>
  );
}

const THUMBS = 3;

/**
 * Photo feed: a large featured picture with a vertical list of thumbnails.
 * The selection cycles so the featured picture keeps changing.
 */
function PhotoFeed() {
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(
      () => setSelected((s) => (s + 1) % THUMBS),
      2400,
    );
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="sk-card sk-photos" data-stage="5" data-dots="outline">
      <div className="sk-card__top">
        <span className="sk-h">Photo feed</span>
        <span
          className="sk-btn sk-btn--sm"
          data-dots="outline"
          data-dots-weight="0.7"
        >
          + Add a photo
        </span>
      </div>
      <div className="sk-photos__body">
        <div
          className="sk-photo sk-photo--hero"
          style={{ "--sel": selected } as CSSProperties}
          data-dots="outline"
          data-dots-weight="0.9"
        >
          <span
            className="sk-sun"
            data-dots="disc"
            data-dots-tint="1"
            data-dots-weight="5"
          />
          <span className="sk-ridge" data-dots="rule" data-dots-spread="0.9" />
        </div>
        <div className="sk-photo-list">
          {Array.from({ length: THUMBS }, (_, k) => (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed thumbnail slots
              key={k}
              className={`sk-photo sk-photo--thumb${selected === k ? " is-selected" : ""}`}
              data-dots="outline"
              data-dots-tint={selected === k ? 1 : 0}
              data-dots-weight="0.7"
              data-dots-spread="0.7"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * The rebuilt ABC Trainerize profile, redrawn as a dot wireframe. Personal
 * details are abstracted into bars; `data-stage` sets the build order.
 */
export function ProfileSketch() {
  const slotRef = useRef<HTMLDivElement>(null);
  const sketchRef = useRef<HTMLDivElement>(null);

  // Scale the whole wireframe down when its slot is shorter than the drawing.
  useEffect(() => {
    const slot = slotRef.current;
    const sketch = sketchRef.current;
    if (!slot || !sketch) return;
    const fit = () => {
      const scale = Math.min(1, slot.clientHeight / sketch.offsetHeight);
      sketch.style.setProperty("--fit", scale.toFixed(3));
    };
    const observer = new ResizeObserver(fit);
    observer.observe(slot);
    observer.observe(sketch);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={slotRef} className="sketch-slot">
      <p className="sr-only">
        Wireframe of the rebuilt ABC Trainerize profile page: header, contact
        details, certifications, profile score and views, an intro video, and a
        photo feed.
      </p>
      <div ref={sketchRef} className="sketch" aria-hidden="true">
        <div className="sk-head" data-stage="0">
          <span className="sk-avatar" data-dots="disc" data-dots-weight="0.7" />
          <div className="sk-id">
            <div className="sk-line">
              <span className="sk-name">Trainerize ABC</span>
              <span
                className="sk-pill"
                data-dots="outline"
                data-dots-tint="1"
                data-dots-weight="1.6"
                data-dots-spread="0.7"
              >
                Live
              </span>
            </div>
            <span className="sk-bar" style={bar("82%")} data-dots="bar" />
            <span
              className="sk-bar sk-bar--faint"
              style={bar("60%")}
              data-dots="bar"
            />
          </div>
          <span className="sk-btn" data-dots="outline" data-dots-spread="0.8">
            Edit profile
          </span>
        </div>

        <div className="sk-grid">
          <div className="sk-card" data-stage="1" data-dots="outline">
            <div className="sk-card__top">
              <span className="sk-h">Contact &amp; details</span>
              <span
                className="sk-btn sk-btn--sm"
                data-dots="outline"
                data-dots-weight="0.6"
              >
                Edit
              </span>
            </div>
            {[0.7, 0.5, 0.3, 0.62].map((w) => (
              <div key={w} className="sk-field">
                <span
                  className="sk-bar sk-bar--label"
                  data-dots="bar"
                  data-dots-weight="0.5"
                />
                <span
                  className="sk-bar"
                  style={bar(`${w * 100}%`)}
                  data-dots="bar"
                />
                <span
                  className="sk-rule"
                  data-dots="rule"
                  data-dots-weight="0.35"
                />
              </div>
            ))}
          </div>

          <div className="sk-card" data-stage="2" data-dots="outline">
            <div className="sk-card__top">
              <span className="sk-h">Certifications · 9</span>
              <span
                className="sk-btn sk-btn--sm"
                data-dots="outline"
                data-dots-weight="0.6"
              >
                Edit
              </span>
            </div>
            <Certifications />
          </div>
        </div>

        <div className="sk-card sk-metrics" data-stage="3" data-dots="outline">
          <div className="sk-score">
            <span className="sk-h sk-h--caps">Profile score</span>
            <div className="sk-score__row">
              <span className="sk-donut">
                <span
                  className="sk-donut__ring"
                  data-dots="ring"
                  data-dots-weight="0.5"
                  data-dots-spread="0.5"
                />
                <span
                  className="sk-donut__ring"
                  data-dots="ring"
                  data-dots-arc="0.83"
                  data-dots-tint="1"
                  data-dots-weight="2"
                  data-dots-spread="1.3"
                />
              </span>
              <span className="sk-score__num">
                25<small>/30</small>
              </span>
            </div>
          </div>
          <div className="sk-views">
            <span className="sk-h sk-h--caps">Profile views</span>
            <span className="sk-views__num">28</span>
            <div className="sk-chart">
              {VIEWS.map((h, day) => (
                <span
                  // biome-ignore lint/suspicious/noArrayIndexKey: one column per day
                  key={day}
                  className="sk-col"
                  style={{ "--h": h } as CSSProperties}
                  data-dots={h > 0 ? "fill" : "rule"}
                  data-dots-tint={h > 0 ? 1 : 0}
                  data-dots-weight={h > 0 ? 6 : 0.4}
                  data-dots-spread="0.4"
                />
              ))}
            </div>
          </div>
        </div>

        <div className="sk-card sk-video" data-stage="4" data-dots="outline">
          <div className="sk-screen" data-dots="outline" data-dots-weight="0.8">
            <span
              className="sk-play"
              data-dots="ring"
              data-dots-tint="1"
              data-dots-weight="1.4"
            />
          </div>
          <div className="sk-video__text">
            <span className="sk-h">Why train with me</span>
            <span className="sk-bar" style={bar("92%")} data-dots="bar" />
            <span
              className="sk-bar sk-bar--faint"
              style={bar("70%")}
              data-dots="bar"
            />
            <div className="sk-actions">
              <span
                className="sk-btn"
                data-dots="outline"
                data-dots-spread="0.8"
              >
                Upload
              </span>
              <span
                className="sk-btn sk-btn--accent"
                data-dots="outline"
                data-dots-tint="1"
                data-dots-spread="0.8"
              >
                Delete
              </span>
            </div>
          </div>
        </div>

        <PhotoFeed />
      </div>
    </div>
  );
}
