import { ArrowUpRight } from "reicon-react";

export function ExternalLink({
  href,
  children,
}: {
  href: string;
  children: string;
}) {
  return (
    <a
      className="action action--external"
      href={href}
      target="_blank"
      rel="noreferrer"
    >
      {children}
      <ArrowUpRight size={12} aria-hidden />
    </a>
  );
}
