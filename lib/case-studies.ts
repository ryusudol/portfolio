import { links } from "./content";

export type Result = {
  value: string;
  label: string;
  note: string;
};

export type Highlight = {
  title: string;
  body: string;
};

export type CaseStudy = {
  slug: string;
  href: string;
  kind: "Experience" | "Project";
  title: string;
  role: string;
  when: string;
  summary: string;
  stack: string[];
  links: { label: string; href: string }[];
  results: Result[];
  highlights: Highlight[];
};

export const abcFitness: CaseStudy = {
  slug: "abc-fitness",
  href: "/experience/abc-fitness",
  kind: "Experience",
  title: "ABC Fitness",
  role: "Software Engineering Intern",
  when: "Jun – Aug 2026 · Austin, TX",
  summary:
    "Rewrote the ABC Trainerize profile page from jQuery to React as part of a company-wide modernization — then redesigned it beyond the migration’s original scope.",
  stack: ["React", "TypeScript", "RxJS", "Jest", "LaunchDarkly", "Figma MCP"],
  links: [],
  results: [
    {
      value: "97%",
      label: "branch coverage",
      note: "Jest tests for permissions, role-based access, conditional rendering, and overlapping upload and update requests.",
    },
    {
      value: "400K+",
      label: "fitness professionals",
      note: "use the rewritten profile page on ABC Trainerize.",
    },
    {
      value: "1.6M+",
      label: "clients worldwide",
      note: "are served by the trainers on the platform.",
    },
    {
      value: "React",
      label: "rewritten from jQuery",
      note: "shipped as stacked PRs and rolled out gradually behind a LaunchDarkly flag.",
    },
  ],
  highlights: [],
};

export const unlearningComparator: CaseStudy = {
  slug: "unlearning-comparator",
  href: "/projects/unlearning-comparator",
  kind: "Project",
  title: "Unlearning Comparator",
  role: "Frontend, end to end",
  when: "Published in IEEE TVCG · Mar 2026",
  summary:
    "An interactive visual analytics system for evaluating how machine-unlearning methods affect the accuracy, efficiency, and privacy of ML models.",
  stack: [
    "React",
    "TypeScript",
    "D3",
    "Recharts",
    "Zustand",
    "FastAPI",
    "PyTorch",
  ],
  links: [
    { label: "Live demo", href: links.unlearningDemo },
    { label: "Code", href: links.unlearningCode },
    { label: "Paper", href: links.unlearningPaper },
  ],
  results: [
    {
      value: "100+",
      label: "GitHub stars",
      note: "for the open-source dashboard.",
    },
    {
      value: "−99%",
      label: "DOM work per hover",
      note: "by replacing full SVG redraws with D3 joins and in-place updates.",
    },
    {
      value: "2,000",
      label: "points per scatterplot",
      note: "UMAP projections of penultimate-layer activations, kept interactive.",
    },
    {
      value: "TVCG",
      label: "journal publication",
      note: "IEEE Transactions on Visualization and Computer Graphics, vol. 32, no. 3.",
    },
  ],
  highlights: [
    {
      title: "AI interpretability",
      body: "Built the frontend end to end for comparing unlearning methods side by side on accuracy, efficiency, and privacy.",
    },
    {
      title: "Data-intensive visualization",
      body: "D3/Recharts views including 2,000-point UMAP scatterplots and 400-point stacked dot plots that simulate membership inference attacks via a draggable threshold.",
    },
    {
      title: "Interaction engineering",
      body: "Hover, zoom, and drag stay smooth because updates are joined in place instead of redrawing whole SVGs — 99% fewer DOM manipulations per hover.",
    },
    {
      title: "Backend extension",
      body: "Extended the FastAPI/PyTorch backend to a face-recognition dataset, which let another research lab adopt the system.",
    },
  ],
};

export const pytorchCka: CaseStudy = {
  slug: "pytorch-cka",
  href: "/projects/pytorch-cka",
  kind: "Project",
  title: "PyTorch-CKA",
  role: "Author & maintainer",
  when: "Open source · on PyPI",
  summary:
    "A Python library that compares internal representations across layers of CNNs and LLMs — without the slow computation and memory buildup of existing CKA tools.",
  stack: ["Python", "PyTorch", "GitHub Actions", "PyPI"],
  links: [
    { label: "PyPI", href: links.ckaPypi },
    { label: "Code", href: links.ckaCode },
  ],
  results: [
    {
      value: "5.7×",
      label: "faster overall",
      note: "than an existing CKA library, measured on an H100.",
    },
    {
      value: "−95.7%",
      label: "retained GPU memory",
      note: "versus an existing library (ResNet-18, batch size 1,000).",
    },
    {
      value: "O(B²)",
      label: "HSIC per layer pair",
      note: "down from O(B³), where B is the batch size.",
    },
    {
      value: "~400",
      label: "monthly downloads",
      note: "on PyPI, with CI across Python 3.10–3.14.",
    },
  ],
  highlights: [
    {
      title: "Performance optimization",
      body: "Replaced full matrix multiplication with Frobenius inner products, cutting HSIC trace complexity from O(B³) to O(B²) per layer pair.",
    },
    {
      title: "Memory optimization",
      body: "Automatic activation cleanup and forward-hook removal after each CKA computation, so GPU memory doesn’t pile up between runs.",
    },
    {
      title: "Deployment & maintenance",
      body: "Published on PyPI with automated CI testing across Python 3.10–3.14.",
    },
  ],
};

export const caseStudies = [abcFitness, unlearningComparator, pytorchCka];
