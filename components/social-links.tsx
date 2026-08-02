"use client";

import Image from "next/image";
import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { FileText, ShieldCheck } from "reicon-react";

import { GitHubIcon, LinkedInIcon } from "@/components/brand-icons";
import {
  type ContributionDay,
  type Contributions,
  toWeeks,
} from "@/lib/github-contributions";
import { contact } from "@/lib/portfolio";

type SocialTarget = "github" | "linkedin";
type SlideDirection = "backward" | "forward" | "none";

const socialItems = [
  {
    id: "github" as const,
    href: contact.github,
    label: "Suhyeon Yu on GitHub",
    icon: GitHubIcon,
  },
  {
    id: "linkedin" as const,
    href: contact.linkedin,
    label: "Suhyeon Yu on LinkedIn",
    icon: LinkedInIcon,
  },
];

const socialOrder: Record<SocialTarget, number> = {
  github: 0,
  linkedin: 1,
};

type ContributionTooltip = {
  day: ContributionDay;
  left: number;
  top: number;
};

function ContributionGraph({
  contributions,
}: {
  contributions: Contributions;
}) {
  const weeks = useMemo(() => toWeeks(contributions), [contributions]);
  const graphRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const [tooltip, setTooltip] = useState<ContributionTooltip | null>(null);
  const [graphWidth, setGraphWidth] = useState(0);
  const [tooltipWidth, setTooltipWidth] = useState(0);

  const showTooltip = (
    day: ContributionDay,
    event: ReactPointerEvent<HTMLElement>,
  ) => {
    const graph = graphRef.current;
    if (!graph) return;

    const cell = event.currentTarget;
    const graphRect = graph.getBoundingClientRect();
    const cellRect = cell.getBoundingClientRect();
    const center = cellRect.left - graphRect.left + cellRect.width / 2;

    setTooltip({
      day,
      left: center,
      top: cellRect.top - graphRect.top - 5,
    });
  };

  useLayoutEffect(() => {
    if (!tooltip) return;
    setGraphWidth(graphRef.current?.clientWidth ?? 0);
    setTooltipWidth(tooltipRef.current?.clientWidth ?? 0);
  }, [tooltip]);

  const tooltipLeft = tooltip
    ? Math.min(
        Math.max(tooltip.left, tooltipWidth / 2),
        graphWidth - tooltipWidth / 2,
      )
    : 0;

  return (
    <div className="contribution-preview">
      <div
        ref={graphRef}
        className="contribution-graph"
        onPointerLeave={() => setTooltip(null)}
        role="presentation"
      >
        <div
          className="contribution-grid"
          style={{ "--contribution-weeks": weeks.length } as CSSProperties}
        >
          {weeks.flatMap((week, weekIndex) =>
            week.map((day, dayIndex) =>
              day ? (
                <i
                  key={day.date}
                  data-count={day.count}
                  data-date={day.date}
                  data-level={day.level}
                  onPointerEnter={(event) => showTooltip(day, event)}
                />
              ) : (
                <i
                  // biome-ignore lint/suspicious/noArrayIndexKey: Calendar placeholders are fixed positional slots and never reorder.
                  key={`empty-${weekIndex}-${dayIndex}`}
                  className="contribution-cell--empty"
                />
              ),
            ),
          )}
        </div>
        <span
          ref={tooltipRef}
          className="contribution-tooltip"
          data-visible={tooltip !== null}
          role="tooltip"
          style={
            {
              "--contribution-tooltip-left": `${tooltipLeft}px`,
              "--contribution-tooltip-top": `${tooltip?.top ?? 0}px`,
            } as CSSProperties
          }
        >
          {tooltip ? (
            <>
              <strong>
                {tooltip.day.count} contribution
                {tooltip.day.count > 1 ? "s" : ""}
              </strong>{" "}
              ·{" "}
              {new Date(`${tooltip.day.date}T00:00:00Z`).toLocaleDateString(
                "en-US",
                {
                  day: "numeric",
                  month: "long",
                  timeZone: "UTC",
                },
              )}
            </>
          ) : null}
        </span>
      </div>
    </div>
  );
}

export function SocialLinks({
  contributions,
}: {
  contributions: Contributions;
}) {
  const navRef = useRef<HTMLElement>(null);
  const githubPanelRef = useRef<HTMLDivElement>(null);
  const linkedinPanelRef = useRef<HTMLDivElement>(null);
  const lastTargetRef = useRef<SocialTarget>("github");
  const [active, setActive] = useState<SocialTarget | null>(null);
  const [direction, setDirection] = useState<SlideDirection>("none");
  const [switching, setSwitching] = useState(false);
  const [left, setLeft] = useState(20.4);
  const [size, setSize] = useState({ height: 0, width: 0 });

  const activate = (target: SocialTarget, element: HTMLElement) => {
    if (active === target) return;

    const nav = navRef.current;
    if (nav) {
      const navRect = nav.getBoundingClientRect();
      const targetRect = element.getBoundingClientRect();
      setLeft(targetRect.left - navRect.left + targetRect.width / 2);
    }

    const previousTarget = active ?? lastTargetRef.current;
    const difference = socialOrder[target] - socialOrder[previousTarget];
    setDirection(
      difference > 0 ? "forward" : difference < 0 ? "backward" : "none",
    );
    setSwitching(active !== null);
    setActive(target);
    lastTargetRef.current = target;
  };

  const close = () => {
    setActive(null);
    setSwitching(false);
  };

  useLayoutEffect(() => {
    if (!active) return;
    const panel =
      active === "github" ? githubPanelRef.current : linkedinPanelRef.current;
    if (!panel) return;

    setSize({ height: panel.offsetHeight, width: panel.offsetWidth });
  }, [active]);

  const popoverStyle = {
    "--social-popover-height": `${size.height}px`,
    "--social-popover-left": `${left}px`,
    "--social-popover-width": `${size.width}px`,
  } as CSSProperties;

  return (
    <nav
      ref={navRef}
      className="social-links"
      data-active={active ?? "none"}
      data-direction={direction}
      data-switching={switching}
      style={popoverStyle}
      aria-label="Contact and profile links"
      onPointerLeave={close}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) close();
      }}
    >
      {socialItems.map((item) => {
        const Icon = item.icon;
        return (
          <a
            key={item.id}
            className="social-icon-link"
            data-social-target={item.id}
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={item.label}
            onPointerEnter={(event) => {
              if (event.pointerType === "mouse") {
                activate(item.id, event.currentTarget);
              }
            }}
            onFocus={(event) => activate(item.id, event.currentTarget)}
          >
            <Icon aria-hidden="true" />
          </a>
        );
      })}
      <a
        className="resume-link"
        href={contact.resume}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Open Suhyeon Yu's résumé"
        onPointerEnter={close}
        onFocus={close}
      >
        <FileText aria-hidden="true" />
        <span>Résumé</span>
      </a>

      <div className="social-popover-bridge" aria-hidden="true" />
      <div className="social-popover" aria-hidden={active === null}>
        <div
          ref={githubPanelRef}
          className="social-popover-panel social-popover-panel--github"
          aria-hidden={active !== "github"}
        >
          <div className="social-preview-profile">
            <span className="social-preview-avatar-frame">
              <span className="social-preview-avatar-crop">
                <Image
                  className="social-preview-avatar"
                  src="/images/portrait/suhyeon-mountain-profile.png"
                  alt=""
                  width={96}
                  height={96}
                />
              </span>
              <span className="social-avatar-badge">🎧</span>
            </span>
            <span>
              <strong>ryusudol</strong>
              <small>
                {contributions.total.toLocaleString("en-US")} contributions in
                the last year
              </small>
            </span>
          </div>
          <ContributionGraph contributions={contributions} />
        </div>

        <div
          ref={linkedinPanelRef}
          className="social-popover-panel social-popover-panel--linkedin"
          aria-hidden={active !== "linkedin"}
        >
          <div className="linkedin-preview-banner" />
          <span className="linkedin-preview-avatar-frame">
            <Image
              className="linkedin-preview-avatar"
              src="/images/portrait/suhyeon-mountain-profile.png"
              alt=""
              width={112}
              height={112}
            />
          </span>
          <div className="linkedin-preview-copy">
            <strong>
              Suhyeon Yu
              <ShieldCheck aria-label="Verified profile" />
            </strong>
            <div>
              <span>Software Engineer</span>
              <small>Houston, Texas</small>
            </div>
            <a
              className="linkedin-preview-cta"
              href={contact.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              tabIndex={active === "linkedin" ? 0 : -1}
            >
              Connect
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
}
