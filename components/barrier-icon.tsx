import { useId } from "react";

/**
 * A striped roadwork barrier (🚧). Drawn by hand because reicon-react has no
 * construction sign; stripes use the accent color, the frame `currentColor`.
 */
export function BarrierIcon({ size = 22 }: { size?: number }) {
  const clip = useId();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="barrier-icon"
    >
      <clipPath id={clip}>
        <rect x="2" y="7" width="20" height="7" rx="1.5" />
      </clipPath>
      <g clipPath={`url(#${clip})`} fill="var(--accent)">
        <path d="M1 14 8 7h3.5l-7 7Z" />
        <path d="M8 14l7-7h3.5l-7 7Z" />
        <path d="M15 14l7-7h3.5l-7 7Z" />
      </g>
      <rect
        x="2"
        y="7"
        width="20"
        height="7"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M6 14v7M18 14v7M4 21h4M16 21h4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="6" cy="4.5" r="1.5" fill="var(--accent)" />
      <circle cx="18" cy="4.5" r="1.5" fill="var(--accent)" />
    </svg>
  );
}
