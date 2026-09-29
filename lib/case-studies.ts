import { links } from "./content";

export type Result = {
  value: string;
  label: string;
  note: string;
  /** A particle mini-chart of the evidence, drawn by the page's results scene. */
  chart?:
    | "speed"
    | "memory"
    | "complexity"
    | "downloads"
    | "views"
    | "linked"
    | "stars"
    | "redraw";
};

export type Highlight = {
  title: string;
  body: string;
  /** The number that shows the lesson, linking to the chapter it came from. */
  proof?: { value: string; label: string; href: string };
};

export type CaseStudy = {
  slug: string;
  href: string;
  kind: "Experience" | "Project";
  title: string;
  role: string;
  when: string;
  summary: string;
  /** A term the rest of the page leans on, defined under the summary. */
  definition?: { term: string; body: string };
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
      note: "Redesigned the hierarchy with a streamlined header, grouped cards, modal editing, and drag-and-drop certification reordering.",
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
  role: "Frontend Engineering, Data Visualization",
  when: "Published in IEEE TVCG",
  summary:
    "An interactive dashboard for comparing machine unlearning methods by putting two models side by side. Researchers build candidate models with different methods and settings, then screen them all on accuracy, efficiency, and privacy in one table. They pick two to contrast class by class, image by image, and layer by layer, and run a simulated privacy attack to check whether the data a model was asked to forget can still be detected. Together, the views catch a method that matches retraining on every accuracy score yet has forgotten almost nothing.",
  definition: {
    term: "What is machine unlearning?",
    body: "Machine unlearning removes part of what a trained model learned, like every airplane in its training images, so that it behaves as if it had never seen them. Retraining from scratch without that data is exact but slow and computationally expensive, so unlearning methods adjust the trained model instead. The hard part is telling how close they got.",
  },
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
      value: "TVCG",
      label: "journal paper, second author",
      note: "Published in IEEE Transactions on Visualization and Computer Graphics. I built the interface it presents, where every view reads the same pair of models.",
      chart: "views",
    },
    {
      value: "4,000",
      label: "SVG points, linked by hover",
      note: "Each model’s 2,000 training images as UMAP points, one element each, so hovering an image in one plot finds it in the other.",
      chart: "linked",
    },
    {
      value: "−99%",
      label: "SVG nodes rebuilt per hover",
      note: "1,133 down to 8 in the Attack Simulation view once a hover restyled the plot in place. The embedding view’s first hover fell from about 70 ms to 10 ms.",
      chart: "redraw",
    },
    {
      value: "101",
      label: "GitHub stars",
      note: "Starred since December 2024, with a live demo that runs in the browser on precomputed results, no GPU needed.",
      chart: "stars",
    },
  ],
  highlights: [
    {
      title: "Summary numbers can hide a failure",
      body: "Random Labeling matched retraining on every accuracy column. Only the views of images, predictions, and layers showed that it had renamed the airplanes without forgetting them.",
      proof: {
        value: "0.003",
        label: "its privacy score, out of 1",
        href: "#problem",
      },
    },
    {
      title: "Test an encoding on its readers",
      body: "The bubble matrix read fine to me, but the researchers struggled with it. A glyph that small can’t carry two numbers, so each number got its own half of the cell.",
      proof: {
        value: "90% · 0.16",
        label: "share and confidence, one cell",
        href: "#matrix",
      },
    },
    {
      title: "A store is only as narrow as its selectors",
      body: "Zustand lets a component subscribe to one slice of state, but only when it passes a selector. The model table’s selector kept it still through every poll, while the components that still take a whole store re-render as often as they did under Context.",
      proof: {
        value: "1 → 0",
        label: "table re-renders per poll",
        href: "#state",
      },
    },
    {
      title: "Draw once, then update",
      body: "A React effect that redraws a D3 chart runs again on every state change, hovers included. Building the SVG once and changing attributes in place gives the same picture for a fraction of the work, and kept the per-element events that made SVG worth choosing.",
      proof: {
        value: "1,133 → 8",
        label: "SVG nodes rebuilt per hover",
        href: "#redraw",
      },
    },
  ],
};

export const pytorchCka: CaseStudy = {
  slug: "pytorch-cka",
  href: "/projects/pytorch-cka",
  kind: "Project",
  title: "PyTorch-CKA",
  role: "Author & maintainer",
  when: "Published on PyPI",
  summary:
    "A Python library that computes layer-wise representation similarity, showing how similarly neural networks see the same inputs. I started it when the CKA library inside my own research tool became its bottleneck, and ended up rewriting the math so every layer pair comes out of a single GPU pass.",
  definition: {
    term: "What is CKA?",
    body: "Centered Kernel Alignment (CKA) scores how similarly two layers represent the same inputs, from 0 to 1. It feeds one batch through both layers and compares how each arranges the inputs relative to one another. A score of 1 means the arrangements match, even if one is rotated or evenly scaled. The layers can differ in width and come from different models, which makes CKA a common way to ask which layers of two networks learned alike.",
  },
  blurb:
    "Compares layer representations in CNNs and LLMs, 7.7× faster than torch_cka with 95.7% less retained GPU memory.",
  stack: ["Python", "PyTorch", "pytest", "GitHub Actions", "PyPI"],
  links: [
    { label: "PyPI", href: links.ckaPypi },
    { label: "Code", href: links.ckaCode },
  ],
  results: [
    {
      value: "7.7×",
      label: "faster than torch_cka",
      note: "Two ResNet-18s, before and after unlearning, compared on all 18 layers over 10,000 CIFAR-10 images on an H100. 44× faster than a NumPy reference.",
      chart: "speed",
    },
    {
      value: "−95.7%",
      label: "retained GPU memory",
      note: "After one pass over the 10,000 CIFAR-10 test images on an A100, 0.18 GB of GPU memory stays allocated, down from torch_cka’s 4.26 GB.",
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
      proof: {
        value: "B³ → B²",
        label: "multiply-adds per layer pair",
        href: "#insight",
      },
    },
    {
      title: "Don’t make the GPU wait on Python",
      body: "An .item() inside a hot loop stalls the GPU until Python catches up. Keeping every value a tensor until the final division removed 1,998 syncs per batch.",
      proof: {
        value: "1,998 → 0",
        label: ".item() syncs per batch",
        href: "#redesign",
      },
    },
    {
      title: "Memory has an owner",
      body: "A forward hook keeps its object reachable, so del and gc can’t free what it points to. Scoping hooks to a with block and clearing features every batch cut retained memory from 4.26 GB to 0.18 GB.",
      proof: {
        value: "4.26 → 0.18 GB",
        label: "retained after one pass",
        href: "#memory",
      },
    },
    {
      title: "Measure against the real thing",
      body: "My first version felt fast and was only 2.1× faster. Benchmarking against existing libraries on real models is what pointed at the loop, and later proved the rewrite.",
      proof: {
        value: "8.98 s → 1.16 s",
        label: "same H100, same layers",
        href: "#benchmark",
      },
    },
  ],
};

export const caseStudies = [abcFitness, unlearningComparator, pytorchCka];

export const projectStudies = caseStudies.filter((s) => s.kind === "Project");
export const experienceStudies = caseStudies.filter(
  (s) => s.kind === "Experience",
);
