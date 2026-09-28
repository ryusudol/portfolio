import { links } from "./content";

export type Result = {
  value: string;
  label: string;
  note: string;
  /** A particle mini-chart of the evidence, drawn by the page's results scene. */
  chart?: "speed" | "memory" | "complexity" | "downloads";
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
  /** One line for the /work card; falls back to `summary`. */
  blurb?: string;
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
    "Rebuilt the ABC Trainerize profile page from scratch, from jQuery to React. The platform serves 1.6M+ clients and 400,000+ fitness professionals, so the existing business logic was carried over carefully and backed by unit tests to roll out safely.",
  blurb:
    "Rebuilt the ABC Trainerize profile page from jQuery to React for 1.6M+ clients, shipped behind a feature flag with 97% branch coverage.",
  stack: ["React", "TypeScript", "RxJS", "Redux", "Jest", "LaunchDarkly"],
  links: [],
  results: [
    {
      value: "React",
      label: "rewritten from scratch",
      note: "The whole jQuery profile page, rebuilt with its existing business logic carried over intact.",
    },
    {
      value: "Flagged",
      label: "gradual rollout",
      note: "Landed as independently reviewable stacked PRs behind a LaunchDarkly feature flag.",
    },
    {
      value: "Beyond",
      label: "the migration scope",
      note: "Redesigned the hierarchy: a streamlined header, grouped cards, modal editing, and drag-and-drop certification reordering.",
    },
    {
      value: "97%",
      label: "branch coverage",
      note: "Jest tests for permissions, role-based access, conditional rendering, and overlapping upload and update requests.",
    },
  ],
  highlights: [],
};

export const unlearningComparator: CaseStudy = {
  slug: "unlearning-comparator",
  href: "/projects/unlearning-comparator",
  kind: "Project",
  title: "Machine Unlearning Comparator",
  role: "Full stack, Data Visualization",
  when: "Published in IEEE TVCG · Mar 2026",
  summary:
    "An interactive visual analytics system for evaluating how machine-unlearning methods affect the accuracy, efficiency, and privacy of ML models.",
  blurb:
    "An interactive system for comparing machine-unlearning methods on accuracy, efficiency, and privacy, with 100+ stars on GitHub.",
  stack: ["React", "TypeScript", "D3", "Zustand", "FastAPI", "PyTorch"],
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
  when: "PyPI",
  summary:
    "A Python library that computes layer-wise representation similarity, showing how similarly neural networks see the same inputs. I started it when the CKA library inside my own research tool became its bottleneck, and ended up rewriting the math so every layer pair comes out of a single GPU pass.",
  blurb:
    "Compares layer representations in CNNs and LLMs, 5.7× faster than an existing CKA library with 95.7% less retained GPU memory.",
  stack: ["Python", "PyTorch", "CUDA", "pytest", "GitHub Actions", "PyPI"],
  links: [
    { label: "PyPI", href: links.ckaPypi },
    { label: "Code", href: links.ckaCode },
    { label: "CKA paper", href: links.ckaPaper },
  ],
  results: [
    {
      value: "7.7×",
      label: "faster than torch_cka",
      note: "All 18 layers of two ResNet-18s over CIFAR-10, on the same H100. 44× faster than a NumPy reference.",
      chart: "speed",
    },
    {
      value: "−95.7%",
      label: "retained GPU memory",
      note: "Still allocated after one pass over CIFAR-10, compared with torch_cka.",
      chart: "memory",
    },
    {
      value: "O(B²)",
      label: "HSIC per layer pair",
      note: "Down from O(B³), where B is the batch size, because the trace never needed the full K @ L product.",
      chart: "complexity",
    },
    {
      value: "~400",
      label: "monthly downloads",
      note: "The May–August 2026 average on PyPI, across 11 releases tested on Python 3.10–3.14.",
      chart: "downloads",
    },
  ],
  highlights: [
    {
      title: "Derive it before optimizing it",
      body: "Every implementation I read computed tr(K @ L) because that is how the formula is written. Working the estimator out term by term is what showed me the product was optional.",
    },
    {
      title: "Don’t make the GPU wait on Python",
      body: "An .item() inside a hot loop stalls the GPU until Python catches up. Keeping every value a tensor until the final division removed 1,998 syncs per batch.",
    },
    {
      title: "Memory has an owner",
      body: "A forward hook holds references, so del and gc can’t free what it points to. Scoping hooks to a with block and clearing features every batch is what gave the 4.26 GB back.",
    },
    {
      title: "Measure against the real thing",
      body: "My first version felt fast and was only 2.1× faster. Benchmarking against existing libraries on real models is what pointed at the loop, and later proved the rewrite.",
    },
  ],
};

export const caseStudies = [abcFitness, unlearningComparator, pytorchCka];

export const projectStudies = caseStudies.filter((s) => s.kind === "Project");
export const experienceStudies = caseStudies.filter(
  (s) => s.kind === "Experience",
);
