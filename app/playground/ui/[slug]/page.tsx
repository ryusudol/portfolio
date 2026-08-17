import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "reicon-react";

import { getUICraftDemo } from "@/components/playground/ui-craft";
import { buttonVariants } from "@/components/ui/button";
import {
  getUICraftEntry,
  uiCraftCategory,
  uiCraftEntries,
} from "@/lib/playground/ui";
import { cn } from "@/lib/utils";

type UICraftComponentPageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return uiCraftEntries.map((entry) => ({ slug: entry.slug }));
}

export async function generateMetadata({
  params,
}: UICraftComponentPageProps): Promise<Metadata> {
  const { slug } = await params;
  const entry = getUICraftEntry(slug);

  if (!entry) return {};

  return {
    title: `${entry.title} — ${uiCraftCategory.title} — Suhyeon Yu`,
    description: entry.description,
  };
}

export default async function UICraftComponentPage({
  params,
}: UICraftComponentPageProps) {
  const { slug } = await params;
  const entry = getUICraftEntry(slug);
  const Demo = getUICraftDemo(slug);

  if (!entry || !Demo) notFound();

  return (
    <div
      data-testid="ui-craft-stage"
      data-slug={slug}
      className="relative flex h-svh w-full flex-col"
    >
      <h1 className="sr-only">{entry.title}</h1>
      <Link
        href={uiCraftCategory.href}
        className={cn(
          buttonVariants({ variant: "link" }),
          "absolute top-36 left-5 z-10 h-auto w-fit items-center gap-[0.45rem] p-0 text-[0.8rem] text-muted-foreground no-underline transition-colors duration-instant ease-in-out hover:text-foreground hover:no-underline motion-reduce:transition-none max-sm:top-28 sm:left-6 [&>svg]:size-4",
        )}
      >
        <ArrowLeft aria-hidden="true" />
        Back to UI Craft
      </Link>
      <Demo />
    </div>
  );
}
