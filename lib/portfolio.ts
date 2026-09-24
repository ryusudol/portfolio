export type Experience = {
  company: string;
  role: string;
  period: string;
  summary?: string;
  bullets: readonly string[];
  technologies: readonly string[];
  confidential?: boolean;
  logo: {
    src: string;
    variant: "abc" | "skku";
  };
};

export type ProjectLink = {
  label: "Demo" | "GitHub" | "Paper" | "PyPI";
  href: string;
};

export type CaseStudyText = {
  title: string;
  paragraphs?: readonly string[];
  bullets?: readonly string[];
};

export type CaseStudyPoint = {
  title: string;
  body: string;
};

export type ProjectWalkthrough = {
  why: CaseStudyText;
  goals: CaseStudyText;
  approach: CaseStudyText & {
    decisions: readonly CaseStudyPoint[];
  };
  highlights: {
    title: string;
    items: readonly CaseStudyPoint[];
  };
  outcome: CaseStudyText;
  reflection?: CaseStudyText;
};

export type Project = {
  id: "trainerize" | "machine-unlearning-comparator" | "pytorch-cka";
  slug:
    | "trainerize-profile-experience"
    | "machine-unlearning-comparator"
    | "pytorch-cka";
  title: string;
  context: string;
  description: string;
  role: string;
  period: string;
  team?: string;
  metric: string;
  metricLabel: string;
  technologies: readonly string[];
  links: readonly ProjectLink[];
  confidentialityNote?: string;
  visual:
    | { kind: "trainerize" }
    | { kind: "image"; src: string; alt: string; unoptimized?: boolean };
  walkthrough: ProjectWalkthrough;
};

export type Technology = {
  name: string;
};

export const contact = {
  email: "suhyeon.yu.2789@gmail.com",
  github: "https://github.com/ryusudol",
  linkedin: "https://www.linkedin.com/in/suhyeon-yu",
  source: "https://github.com/ryusudol/portfolio",
} as const;

export const experiences: readonly Experience[] = [
  {
    company: "ABC Fitness",
    role: "Software Engineering Intern",
    period: "2026 — Present",
    summary:
      "Contributing to a modernized Trainerize profile experience with responsive, reusable interface patterns.",
    bullets: [
      "Working across a production web surface used by coaches and clients.",
      "Translating complex account, progress, and coaching information into a clearer responsive hierarchy.",
    ],
    technologies: ["React", "TypeScript", "Redux", "SCSS", "RxJS"],
    confidential: true,
    logo: {
      src: "/images/brands/abc-fitness-logo.png",
      variant: "abc",
    },
  },
  {
    company: "Intelligent Data Computing Lab @ SKKU",
    role: "Research Intern",
    period: "Jun. 2024 — Aug. 2025",
    bullets: [
      "Optimized scatterplot interaction latency to p95 ≤ 11 ms at 2,000 points with imperative D3 updates and memoization.",
      "Cut React rerenders by about 30% by migrating shared state from Context API to selector-based Zustand subscriptions.",
      "Iterated on interaction workflows through three Figma user-study rounds and helped ship an IEEE TVCG-published open-source platform.",
    ],
    technologies: [
      "React",
      "TypeScript",
      "D3.js",
      "Zustand",
      "Tailwind CSS",
      "Figma",
    ],
    logo: {
      src: "/images/brands/skku.png",
      variant: "skku",
    },
  },
  {
    company: "Department of CSE @ SKKU",
    role: "Frontend Engineering Intern",
    period: "Jan. 2023 — Jan. 2024",
    bullets: [
      "Improved initial load time by about 30% with lazy loading and TanStack Query, while strengthening SEO through Next.js SSR and SSG.",
      "Built and deployed a TypeScript web platform that scaled to more than 5,000 users on Docker and AWS EC2.",
      "Led Agile delivery and migrated the styling layer from Styled Components to Tailwind CSS.",
    ],
    technologies: [
      "Next.js",
      "TypeScript",
      "TanStack Query",
      "Tailwind CSS",
      "Redux",
      "AWS",
    ],
    logo: {
      src: "/images/brands/skku.png",
      variant: "skku",
    },
  },
];

export const projects: readonly Project[] = [
  {
    id: "trainerize",
    slug: "trainerize-profile-experience",
    title: "Trainerize Profile Experience",
    context: "ABC Fitness · Product engineering",
    description:
      "A production rewrite of the coach profile, moving a long jQuery page into React so dense coaching information is easier to scan.",
    role: "Software Engineering Intern",
    period: "Jun 2026 — Aug 2026",
    team: "ABC Trainerize",
    metric: "30+",
    metricLabel: "reviewable pull requests",
    technologies: ["React", "TypeScript", "Redux", "RxJS", "SCSS"],
    links: [],
    confidentialityNote:
      "This case study stays intentionally high level. Visuals are reconstructed for the portfolio, and proprietary product details are not disclosed.",
    visual: { kind: "trainerize" },
    walkthrough: {
      why: {
        title: "A high-visibility profile that had outgrown its stack.",
        paragraphs: [
          "Trainerize is the product coaches use to run training businesses and stay close to their clients. The user profile is one of the first surfaces they see: identity, credentials, social proof, and offerings all live there.",
          "When I joined, that page was still a **single long jQuery implementation**. It was harder to maintain, harder to extend, and less consistent with the React design system used elsewhere. I took the work on because it was a real modernization problem in a multi-year production codebase, not a greenfield rewrite I could shape in isolation.",
        ],
      },
      goals: {
        title: "Parity first, then a clearer hierarchy.",
        bullets: [
          "Move the profile into the React app with **content and action parity** for every existing section.",
          "Reorganize the same information into focused cards instead of one scrolling wall.",
          "Stay inside the production stack and design system so the rewrite did not create a parallel UI language.",
          "Ship the epic as **reviewable pull requests**, not one unreviewable migration.",
        ],
      },
      approach: {
        title: "Modernize in place, one section at a time.",
        paragraphs: [
          "The constraint that shaped every decision was the existing product. The profile already had users, data contracts, and a team review process. I needed a path that could land incrementally without freezing the rest of the web app.",
        ],
        decisions: [
          {
            title: "Section-by-section migration, not a big-bang port",
            body: "A one-shot rewrite would have produced an unreviewable diff and blocked QA until the end. I split the epic into isolated tickets so each card could go through design, engineering review, and QA on its own.",
          },
          {
            title: "React with the team's Redux and RxJS patterns",
            body: "The modern app already modeled async profile updates as observables feeding Redux. Matching that pattern kept the rewrite compatible with surrounding pages instead of inventing a new state model for one surface.",
          },
          {
            title:
              "Design-system consistency over a pixel-perfect one-off look",
            body: "When mockups disagreed with existing components, I confirmed intent with design and chose the direction that reused shared primitives. Consistency across the product mattered more than a profile that looked unique.",
          },
        ],
      },
      highlights: {
        title: "What was hard, and what I changed.",
        items: [
          {
            title: "Owning the rewrite end to end",
            body: "I carried the profile from the legacy jQuery page through a redesigned React experience. Across the epic I opened **30+ pull requests** on a platform used by **400,000+ trainers**.",
          },
          {
            title: "Keeping quality while moving fast",
            body: "New profile modules and middleware landed with about **97% test coverage**, which reduced regression risk as sections replaced the old page. Isolated git worktrees let me develop multiple sections in parallel without collisions.",
          },
          {
            title: "Redesign, not only a port",
            body: "Parity was the original scope. Once the shell and data path were in place, I proposed clearer empty states, more meaningful statistics, and a tighter visual hierarchy, then aligned engineering, design, and QA on the updated experience.",
          },
        ],
      },
      outcome: {
        title: "A React profile ready for production review.",
        paragraphs: [
          "By the end of the internship, the modernized profile had gone through engineering review and into QA. Success here was not a single public KPI. It was **parity, reviewability, and design-system consistency** on a surface coaches actually use.",
        ],
      },
      reflection: {
        title: "Confirm first, then build.",
        paragraphs: [
          "The most expensive mistakes were the ones I almost made by inferring requirements from nearby code. Writing unclear points as specific questions, then aligning before a large implementation, was slower at first and faster overall.",
          "I also learned that **reviewability is part of the work**. Splitting an epic so other people can actually read it is as much an engineering skill as the React rewrite itself.",
        ],
      },
    },
  },
  {
    id: "machine-unlearning-comparator",
    slug: "machine-unlearning-comparator",
    title: "Machine Unlearning Comparator",
    context: "Research · Visual analytics",
    description:
      "A visual analytics system for comparing how unlearning methods forget data while preserving accuracy, efficiency, and privacy.",
    role: "Research Intern · Frontend",
    period: "Jun 2024 — Aug 2025",
    team: "Intelligent Data Computing Lab @ SKKU",
    metric: "≤11 ms",
    metricLabel: "p95 interaction latency",
    technologies: ["React", "TypeScript", "D3.js", "Zustand"],
    links: [
      {
        label: "Demo",
        href: "https://gnueaj.github.io/Machine-Unlearning-Comparator/",
      },
      {
        label: "GitHub",
        href: "https://github.com/gnueaj/Machine-Unlearning-Comparator",
      },
      {
        label: "Paper",
        href: "https://ieeexplore.ieee.org/document/11364307",
      },
    ],
    visual: {
      kind: "image",
      src: "/images/projects/machine-unlearning-comparator-teaser.gif",
      alt: "The Machine Unlearning Comparator interface with linked plots and model comparison panels.",
      unoptimized: true,
    },
    walkthrough: {
      why: {
        title: "Unlearning is a tradeoff problem, not a single score.",
        paragraphs: [
          "Machine unlearning tries to remove the influence of specific training data **without retraining from scratch**. In practice a method can forget the target, damage retain-set utility, leak membership under attack, or simply cost too much to run.",
          "Researchers still had to stitch those signals together from separate scripts and plots. I joined the lab to build the **interactive comparison surfaces** that make those tradeoffs visible in one workflow.",
        ],
      },
      goals: {
        title: "Compare methods the way researchers actually decide.",
        bullets: [
          "Compare methods across **accuracy, efficiency, and privacy**, not a single ranking.",
          "Let analysts jump from method-level outcomes to **instance-level evidence** without losing context.",
          "Keep dense embedding views fast enough to explore, not just to screenshot.",
          "Iterate the workflow with domain experts before treating the UI as finished.",
        ],
      },
      approach: {
        title: "A staged workflow with linked views.",
        paragraphs: [
          "The system is organized around how researchers evaluate unlearning, not around a dashboard of unrelated charts.",
        ],
        decisions: [
          {
            title: "Build, Screen, Contrast, then Attack",
            body: "Users configure experiments, scan high-level outcomes, inspect model behavior in detail, and finally audit residual privacy risk. The sequence keeps expensive or noisy views from appearing before they have a question.",
          },
          {
            title: "Linked views instead of isolated plots",
            body: "Class-level metrics, prediction matrices, embedding spaces, and layer-wise similarity stay connected. Selecting a method or sample should update the rest of the workspace so comparison stays in context.",
          },
          {
            title: "D3 for the hot path, Zustand for shared state",
            body: "React is a poor fit for dragging 2,000 embedding points. I kept D3 in charge of imperative scatterplot updates and moved shared state from Context to **selector-based Zustand subscriptions**, so linked views rerender only when their slice changes.",
          },
        ],
      },
      highlights: {
        title: "The moments that made the comparison usable.",
        items: [
          {
            title: "Interaction that keeps up with inspection",
            body: "Imperative D3 updates and careful memoization brought scatterplot interaction latency to **p95 ≤ 11 ms at 2,000 points**, which is fast enough to brush, zoom, and compare embeddings without breaking the analysis loop.",
          },
          {
            title: "Fewer rerenders across linked views",
            body: "The Context-to-Zustand migration cut React rerenders by about **30%**. That mattered because one selection can fan out to several coordinated plots.",
          },
          {
            title: "Privacy as a first-class view",
            body: "Interactive Membership Inference Attack views sit in the Attack stage so forgotten data can be checked for leftover signal, not only for a drop in forget-set accuracy.",
          },
          {
            title: "Three rounds of expert iteration",
            body: "I iterated interaction workflows through **three Figma user-study rounds** with the lab, then helped ship the open-source platform.",
          },
        ],
      },
      outcome: {
        title: "An open platform published in IEEE TVCG.",
        paragraphs: [
          "The system ships with common baselines — Fine-Tuning, Gradient Ascent, Random Labeling, SCRUB, and SalUn — and a Python hook for custom methods. We published it in **IEEE TVCG 2026**. The open-source repository has about **100 GitHub stars**.",
        ],
      },
      reflection: {
        title: "Treat interaction latency as part of the method.",
        paragraphs: [
          "The research question only becomes usable if the interface stays fast. The most transferable lesson was treating **interaction latency as part of the analysis method**, not as polish after the plots exist.",
          "Selector-based state was the other unlock. Linked views are easy to describe and easy to make accidentally expensive.",
        ],
      },
    },
  },
  {
    id: "pytorch-cka",
    slug: "pytorch-cka",
    title: "PyTorch-CKA",
    context: "Open source · Machine learning",
    description:
      "A one-call PyTorch toolkit for measuring and visualizing representation similarity across models, layers, and checkpoints.",
    role: "Author",
    period: "Open source",
    metric: "44×",
    metricLabel: "faster computation",
    technologies: ["Python", "PyTorch", "CUDA"],
    links: [
      {
        label: "GitHub",
        href: "https://github.com/ryusudol/Centered-Kernel-Alignment",
      },
      {
        label: "PyPI",
        href: "https://pypi.org/project/pytorch-cka/",
      },
    ],
    visual: {
      kind: "image",
      src: "/images/projects/cka_identical_resnet18_black.png",
      alt: "A CKA heatmap showing layer-wise representation similarity within a neural network.",
      unoptimized: true,
    },
    walkthrough: {
      why: {
        title: "CKA was standard. The workflow around it was not.",
        paragraphs: [
          "Centered Kernel Alignment is a common way to ask whether two networks represent a dataset similarly across layers, models, or training stages. The math is well known. The scaffolding is not.",
          "Most research pipelines still re-implement feature extraction, batching, kernel computation, and plotting for every experiment. I started the library because I wanted **reliable CKA measurements without rebuilding that stack** each time.",
        ],
      },
      goals: {
        title: "Make the common experiment a single call.",
        bullets: [
          "One function call for the common case: models, dataloaders, and target layers.",
          "A second path for people who already have activations.",
          "Stay practical on larger layer-wise comparisons: **fast on GPU, careful with memory**.",
          "Include visualizations so results can be inspected without a second toolkit.",
        ],
      },
      approach: {
        title: "Design the API around the experiment, not the kernel.",
        paragraphs: [
          "The library only works if a researcher can start an experiment without first becoming a CKA implementer. Speed and memory matter, but they come after a path that is short enough to reuse.",
        ],
        decisions: [
          {
            title: "One compute call, two entry points",
            body: "`compute_cka` handles models and dataloaders. `cka_from_features` accepts pre-extracted activations, including mixed layer shapes. The split keeps the happy path short without blocking advanced setups.",
          },
          {
            title: "Vectorized PyTorch on GPU, not a Python loop over layers",
            body: "The original pain was wall-clock time. I implemented the core path with vectorized ops and GPU execution so a full ResNet-18 layer-wise comparison could finish in a research loop, not overnight.",
          },
          {
            title: "Accumulate HSIC in batches and free activations",
            body: "Speed is useless if the run OOMs. Batch-wise HSIC accumulation and explicit deallocation cut GPU memory retention by about **96%**, and the same path supports Hugging Face models, DataParallel, and DDP.",
          },
        ],
      },
      highlights: {
        title: "What made the toolkit worth publishing.",
        items: [
          {
            title: "A 44× faster core path",
            body: "On ResNet-18 layer-wise comparisons over CIFAR-10 — 18 representational layers, NVIDIA H100 — the library is up to **44× faster** than a common reimplementation baseline.",
          },
          {
            title: "Visualizations that ship with the measurement",
            body: "Heatmaps cover layer-to-layer similarity. Trend plots cover checkpoints and epochs. Researchers can inspect a matrix without bolting on a separate plotting stack.",
          },
          {
            title: "Published where researchers already install tools",
            body: "The package is on PyPI as **pytorch-cka**, so the workflow is `pip install` plus one function call.",
          },
        ],
      },
      outcome: {
        title: "A reusable CKA workflow on PyPI.",
        paragraphs: [
          "The library is public on GitHub and PyPI, with about **400 monthly downloads**. The useful outcome is not the number. It is that a representation-similarity experiment can start from a documented API instead of another notebook rewrite.",
        ],
      },
      reflection: {
        title: "Setup friction was the real product problem.",
        paragraphs: [
          "The kernel was the obvious problem. The product problem was **setup friction**. A one-call API and a feature-only escape hatch mattered as much as the 44× speedup.",
          "Memory was the other surprise. Making CKA faster without making it smaller would have failed on the exact layer-wise comparisons the library exists to run.",
        ],
      },
    },
  },
];

export const technologies = [
  { name: "TypeScript" },
  { name: "React" },
  { name: "Next.js" },
  { name: "Tailwind CSS" },
  { name: "D3.js" },
  { name: "Zustand" },
  { name: "Python" },
  { name: "PyTorch" },
  { name: "Node.js" },
  { name: "PostgreSQL" },
  { name: "AWS" },
  { name: "Docker" },
] as const satisfies readonly Technology[];

export function getProject(slug: string) {
  return projects.find((project) => project.slug === slug);
}
