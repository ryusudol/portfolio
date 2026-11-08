import type { Metadata } from "next";

import { CaseStudyMore, CaseStudyResults } from "@/components/case-study";
import { ChapterNav } from "@/components/chapter-nav";
import { DotStage } from "@/components/dot-stage";
import {
  ApprovalChapter,
  ExtractionChapter,
  MatchingChapter,
  OrchestrationChapter,
  PaymentChapter,
  PersistenceChapter,
  PolicyChapter,
  PrincipleChapter,
  TestingChapter,
} from "@/components/invoice-story";
import { SiteHeader } from "@/components/site-header";
import { invoicePipeline } from "@/lib/case-studies";
import { invoiceChapters, profile } from "@/lib/content";

const description =
  "How I built an invoice pipeline where Grok agents read, match, and audit invoices while deterministic code does the arithmetic, enforces the approval policy, catches duplicates by content, and pays only what is owed. It matched the answer key on 20 of 20 sample invoices against live Grok.";

export const metadata: Metadata = {
  title: `${invoicePipeline.title} — ${profile.name}`,
  description,
  openGraph: {
    title: `${invoicePipeline.title} — ${profile.name}`,
    description,
  },
};

export default function InvoicePipelineCaseStudy() {
  return (
    <>
      <SiteHeader />
      <ChapterNav chapters={invoiceChapters} />
      <DotStage />

      <main id="chapters">
        <CaseStudyResults study={invoicePipeline} />
        <PrincipleChapter />
        <OrchestrationChapter />
        <ExtractionChapter />
        <MatchingChapter />
        <PolicyChapter />
        <ApprovalChapter />
        <PaymentChapter />
        <PersistenceChapter />
        <TestingChapter />
        <CaseStudyMore study={invoicePipeline} />
      </main>
    </>
  );
}
