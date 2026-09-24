import type { ReactNode } from "react";
import { ArrowUpRight } from "reicon-react";

import { buttonVariants } from "@/components/ui/button";
import type { CaseStudyPoint, ProjectLink } from "@/lib/portfolio";
import { cn } from "@/lib/utils";

function tokenizeRichText(text: string) {
  const tokens: {
    key: string;
    type: "text" | "bold" | "code";
    value: string;
  }[] = [];
  const pattern = /\*\*([^*]+)\*\*|`([^`]+)`/g;
  let cursor = 0;

  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > cursor) {
      tokens.push({
        key: `text-${cursor}`,
        type: "text",
        value: text.slice(cursor, index),
      });
    }

    tokens.push({
      key: `${match[1] ? "bold" : "code"}-${index}`,
      type: match[1] ? "bold" : "code",
      value: match[1] ?? match[2] ?? "",
    });
    cursor = index + match[0].length;
  }

  if (cursor < text.length) {
    tokens.push({
      key: `text-${cursor}`,
      type: "text",
      value: text.slice(cursor),
    });
  }

  return tokens;
}

export function RichText({ children }: { children: string }) {
  return tokenizeRichText(children).map((token) => {
    if (token.type === "bold") {
      return (
        <strong key={token.key} className="font-[580] text-foreground">
          {token.value}
        </strong>
      );
    }

    if (token.type === "code") {
      return (
        <code
          key={token.key}
          className="rounded-[0.35rem] bg-surface-alt px-[0.28rem] py-[0.06rem] font-[450] text-[0.86em] text-foreground"
        >
          {token.value}
        </code>
      );
    }

    return <span key={token.key}>{token.value}</span>;
  });
}

export function CaseStudySection({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-4">
      <p className="m-0 text-[0.7rem] font-[590] tracking-[0.12em] text-muted-foreground uppercase">
        {eyebrow}
      </p>
      <h2 className="m-0 max-w-[34rem] text-[1.18rem] font-[610] tracking-[-0.015em]">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function CaseStudyParagraphs({
  paragraphs,
}: {
  paragraphs: readonly string[];
}) {
  return (
    <div className="grid gap-[0.9rem]">
      {paragraphs.map((paragraph) => (
        <p
          key={paragraph}
          className="m-0 text-[0.94rem] leading-[1.72] text-pretty text-muted-foreground"
        >
          <RichText>{paragraph}</RichText>
        </p>
      ))}
    </div>
  );
}

export function CaseStudyBullets({ items }: { items: readonly string[] }) {
  return (
    <ul className="m-0 grid list-[circle] gap-[0.65rem] pl-[1.1rem] text-[0.9rem] leading-[1.65] text-muted-foreground">
      {items.map((item) => (
        <li key={item}>
          <RichText>{item}</RichText>
        </li>
      ))}
    </ul>
  );
}

export function CaseStudyPoints({
  items,
}: {
  items: readonly CaseStudyPoint[];
}) {
  return (
    <div className="mt-2 grid gap-6">
      {items.map((item) => (
        <div key={item.title} className="grid gap-[0.4rem]">
          <h3 className="m-0 text-[0.95rem] font-[600] tracking-[-0.012em]">
            {item.title}
          </h3>
          <p className="m-0 text-[0.9rem] leading-[1.68] text-pretty text-muted-foreground">
            <RichText>{item.body}</RichText>
          </p>
        </div>
      ))}
    </div>
  );
}

export function ProjectLinks({
  title,
  links,
}: {
  title: string;
  links: readonly ProjectLink[];
}) {
  if (links.length === 0) return null;

  return (
    <nav
      className="flex flex-wrap gap-[0.65rem]"
      aria-label={`${title} external links`}
    >
      {links.map((link) => (
        <a
          key={link.href}
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-auto min-h-[2.4rem] gap-[0.4rem] rounded-[0.8rem] border-border bg-surface-alt px-[0.85rem] py-[0.55rem] text-[0.8rem] font-[560] transition-[transform,background-color] duration-instant ease-in-out hover:-translate-y-0.5 hover:bg-surface-hover focus-visible:ring-0 motion-reduce:transition-none [&>svg]:size-[0.9rem]",
          )}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
        >
          {link.label}
          <ArrowUpRight aria-hidden="true" />
        </a>
      ))}
    </nav>
  );
}
