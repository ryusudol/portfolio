const waveMask = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='22' height='8' viewBox='0 0 22 8'%3E%3Cpath d='M0 4 Q5.5 0 11 4 T22 4' fill='none' stroke='currentColor' stroke-width='1' stroke-linecap='round'/%3E%3C/svg%3E") repeat-x center / 1.375rem 0.5rem`;

export function WaveSeparator() {
  return (
    <hr
      data-testid="wave-separator"
      className="m-0 h-2 w-full border-0 bg-border-strong"
      style={{ mask: waveMask, WebkitMask: waveMask }}
    />
  );
}
