"use client";

import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ShieldCheck } from "reicon-react";
import { Temporal } from "temporal-polyfill";

import { GitHubIcon, LinkedInIcon } from "@/components/brand-icons";
import { PortraitAvatar } from "@/components/portrait-avatar";
import { buttonVariants } from "@/components/ui/button";
import {
  type ContributionDay,
  type Contributions,
  toWeeks,
} from "@/lib/github-contributions";
import { contact } from "@/lib/portfolio";
import { cn } from "@/lib/utils";

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

/** GitHub contribution greens; empty cells use foreground tint. */
const contributionLevels = [
  "bg-foreground/10",
  "bg-[#9be9a8] dark:bg-[#0e4429]",
  "bg-[#40c463] dark:bg-[#006d32]",
  "bg-[#30a14e] dark:bg-[#26a641]",
  "bg-[#216e39] dark:bg-[#39d353]",
] as const;

function ContributionGraph({
  contributions,
}: {
  contributions: Contributions;
}) {
  const weeks = useMemo(() => toWeeks(contributions), [contributions]);
  const graphRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const [tooltip, setTooltip] = useState<ContributionTooltip | null>(null);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [graphWidth, setGraphWidth] = useState(0);
  const [tooltipWidth, setTooltipWidth] = useState(0);

  const showTooltip = (
    day: ContributionDay,
    event: ReactPointerEvent<HTMLElement>,
  ) => {
    const cell = event.currentTarget;
    setTooltip({
      day,
      left: cell.offsetLeft + cell.offsetWidth / 2,
      top: cell.offsetTop,
    });
    setTooltipVisible(true);
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
    <div
      ref={graphRef}
      className="contribution-graph relative flex w-[min(22rem,calc(100vw-6rem))] flex-col gap-2"
      onPointerLeave={() => setTooltipVisible(false)}
      role="presentation"
    >
      <div
        className="contribution-grid grid grid-flow-col grid-rows-7 gap-[1.5px]"
        data-testid="contribution-grid"
        style={
          {
            gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))`,
          } as CSSProperties
        }
      >
        {weeks.flatMap((week, weekIndex) =>
          week.map((day, dayIndex) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: Calendar slots are fixed positional cells and never reorder.
              key={day?.date ?? `empty-${weekIndex}-${dayIndex}`}
              className={cn(
                "aspect-square w-full rounded-[1.5px]",
                day && (contributionLevels[day.level] ?? contributionLevels[0]),
              )}
              data-count={day?.count}
              data-date={day?.date}
              data-level={day?.level}
              onPointerEnter={
                day ? (event) => showTooltip(day, event) : undefined
              }
            />
          )),
        )}
      </div>
      <span
        ref={tooltipRef}
        className="contribution-tooltip pointer-events-none absolute z-[2] w-max -translate-x-1/2 -translate-y-[calc(100%+0.25rem)] rounded-lg bg-stone-900 px-2 py-1 text-center text-xs leading-normal whitespace-nowrap text-stone-100 opacity-0 shadow-xl transition-[left,top,opacity] duration-instant ease-out data-[visible=true]:opacity-100 motion-reduce:transition-none dark:bg-stone-950 [&_strong]:font-[650]"
        data-visible={tooltipVisible}
        role="tooltip"
        style={
          tooltip
            ? {
              left: tooltipLeft,
              top: tooltip.top,
            }
            : undefined
        }
      >
        {tooltip ? (
          <>
            <strong className="font-[650]">
              {tooltip.day.count} contribution
              {tooltip.day.count > 1 ? "s" : ""}
            </strong>{" "}
            ·{" "}
            {Temporal.PlainDate.from(tooltip.day.date).toLocaleString("en-US", {
              day: "numeric",
              month: "long",
            })}
          </>
        ) : null}
      </span>
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
      className="social-links group relative flex items-center gap-[0.05rem] max-[420px]:-ml-[0.4rem]"
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
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon" }),
              "social-icon-link relative z-[2] size-[2.55rem] rounded-xl text-muted-foreground opacity-[0.88] transition-[color,opacity] duration-instant hover:bg-transparent hover:text-foreground hover:opacity-100 focus-visible:border-transparent focus-visible:bg-transparent focus-visible:text-foreground focus-visible:opacity-100 focus-visible:ring-0 group-data-[active=github]:data-[social-target=github]:text-foreground group-data-[active=github]:data-[social-target=github]:opacity-100 group-data-[active=linkedin]:data-[social-target=linkedin]:text-foreground group-data-[active=linkedin]:data-[social-target=linkedin]:opacity-100 motion-reduce:transition-none",
            )}
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
            <Icon aria-hidden="true" className="size-[1.6rem]" />
          </a>
        );
      })}

      <div
        className="social-popover-bridge pointer-events-none absolute bottom-[calc(100%-0.1rem)] left-[calc(var(--social-popover-left)-var(--social-popover-width)/2)] z-[2] h-3 w-[var(--social-popover-width)] group-data-[active=github]:pointer-events-auto group-data-[active=linkedin]:pointer-events-auto"
        aria-hidden="true"
      />
      <div
        className="social-popover pointer-events-none absolute bottom-[calc(100%+0.5rem)] left-[var(--social-popover-left)] z-[3] flex h-[var(--social-popover-height)] w-[var(--social-popover-width)] -translate-x-1/2 items-end overflow-hidden rounded-2xl border border-border bg-[color-mix(in_srgb,var(--color-surface)_94%,transparent)] opacity-0 shadow-[0_16px_42px_rgb(62_54_47/14%)] backdrop-blur-[16px] backdrop-saturate-[145%] transition-opacity duration-instant ease-in-out group-data-[switching=true]:transition-[left,width,height,opacity] group-data-[switching=true]:duration-panel group-data-[switching=true]:ease-out group-data-[active=github]:pointer-events-auto group-data-[active=github]:opacity-100 group-data-[active=linkedin]:pointer-events-auto group-data-[active=linkedin]:opacity-100 motion-reduce:transition-none"
        data-testid="social-popover"
        aria-hidden={active === null}
      >
        <div
          ref={githubPanelRef}
          className="social-popover-panel social-popover-panel--github absolute bottom-0 left-0 box-border grid w-[min(23.5rem,calc(100vw-3rem))] gap-3 p-3 opacity-0 blur-[2px] pointer-events-none transition-[translate,opacity,filter] duration-panel ease-out [translate:-200px_0] group-data-[direction=none]:[translate:0_0] group-data-[direction=none]:transition-[opacity,filter] group-data-[active=github]:pointer-events-auto group-data-[active=github]:[translate:0_0] group-data-[active=github]:opacity-100 group-data-[active=github]:blur-none group-data-[active=linkedin]:[translate:-200px_0] motion-reduce:transition-none"
          aria-hidden={active !== "github"}
        >
          <div className="social-preview-profile flex items-center gap-[0.65rem]">
            <PortraitAvatar
              size="lg"
              className="social-preview-avatar-frame size-10 after:border-2 after:border-surface after:mix-blend-normal"
              imageClassName="social-preview-avatar"
              imageSize={96}
              alt=""
            />
            <span className="grid min-w-0 gap-[0.12rem]">
              <strong className="text-base font-[450]">ryusudol</strong>
              <small className="truncate text-sm text-muted-foreground">
                {contributions.total.toLocaleString("en-US")} contributions in
                the last year
              </small>
            </span>
          </div>
          <ContributionGraph contributions={contributions} />
        </div>

        <div
          ref={linkedinPanelRef}
          className="social-popover-panel social-popover-panel--linkedin absolute bottom-0 left-0 box-border w-[min(18rem,calc(100vw-3rem))] opacity-0 blur-[2px] pointer-events-none transition-[translate,opacity,filter] duration-panel ease-out [translate:200px_0] group-data-[direction=none]:[translate:0_0] group-data-[direction=none]:transition-[opacity,filter] group-data-[active=linkedin]:pointer-events-auto group-data-[active=linkedin]:[translate:0_0] group-data-[active=linkedin]:opacity-100 group-data-[active=linkedin]:blur-none group-data-[active=github]:[translate:200px_0] motion-reduce:transition-none"
          data-testid="social-popover-linkedin"
          aria-hidden={active !== "linkedin"}
        >
          <div className="linkedin-preview-banner h-16 bg-[radial-gradient(circle_at_120%_200%,#0000000a_0%,#0000000a_50%,#c5c5c50a_50%,#c5c5c50a_100%),radial-gradient(circle_at_130%_-10%,#4040400a_0%,#4040400a_50%,#ffffff0a_50%,#ffffff0a_100%),linear-gradient(to_right,#0a66c2,#0a66c280)]" />
          <PortraitAvatar
            className="linkedin-preview-avatar-frame absolute top-8 left-3 size-14 overflow-hidden rounded-full border-2 border-surface bg-surface after:hidden"
            imageClassName="linkedin-preview-avatar"
            imageSize={112}
            alt=""
          />

          <div className="linkedin-preview-copy grid grid-cols-[minmax(0,1fr)_auto] gap-1 px-3 pt-8 pb-3">
            <strong className="col-span-full flex items-center gap-1 text-base font-[450] [&_svg]:size-[0.9rem] [&_svg]:text-muted-foreground dark:[&_svg]:text-muted-foreground">
              Suhyeon Yu
              <ShieldCheck aria-label="Verified profile" />
            </strong>
            <div className="grid text-muted-foreground/55">
              <span className="text-sm">Software Engineer</span>
              <small className="text-sm">Houston, Texas</small>
            </div>
            <a
              className={cn(
                buttonVariants({ variant: "default" }),
                "linkedin-preview-cta h-auto self-end rounded-full bg-[#0a66c2] px-3 py-1 text-sm leading-[1.2] font-[560] text-white transition-[filter] duration-instant hover:bg-[#0a66c2] hover:brightness-[1.2] focus-visible:brightness-[1.2] focus-visible:ring-0 dark:bg-[#71b7fb] dark:text-[#071829] dark:hover:bg-[#71b7fb]",
              )}
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
