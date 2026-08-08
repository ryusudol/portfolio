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

export type Project = {
  id: "trainerize" | "unlearning-comparator" | "pytorch-cka";
  slug:
  | "trainerize-profile-experience"
  | "unlearning-comparator"
  | "pytorch-cka";
  title: string;
  context: string;
  description: string;
  overviewTitle: string;
  overview: readonly string[];
  highlights: readonly string[];
  metric: string;
  metricLabel: string;
  technologies: readonly string[];
  links: readonly ProjectLink[];
  confidentialityNote?: string;
  visual:
  | { kind: "trainerize" }
  | { kind: "image"; src: string; alt: string; unoptimized?: boolean };
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
      "A portfolio-safe look at modernizing a profile surface for coaches and clients across responsive web experiences.",
    overviewTitle:
      "Turning dense coaching information into a clearer profile experience.",
    overview: [
      "At ABC Fitness, I contribute to a modernized Trainerize profile experience. The work focuses on turning dense account, progress, and coaching information into a clearer interface that behaves consistently across screen sizes.",
    ],
    highlights: [
      "Build responsive interface patterns for a production product surface.",
      "Organize complex profile information into a clearer visual and interaction hierarchy.",
      "Create reusable UI foundations that support consistent iteration across the experience.",
    ],
    metric: "Current",
    metricLabel: "product experience",
    technologies: ["React", "Redux", "RxJS"],
    links: [],
    confidentialityNote:
      "This case study stays intentionally high level. Visuals are reconstructed for the portfolio, and proprietary product details are not disclosed.",
    visual: { kind: "trainerize" },
  },
  {
    id: "unlearning-comparator",
    slug: "unlearning-comparator",
    title: "Machine Unlearning Comparator",
    context: "Research · Visual analytics",
    description:
      "An interactive visual analytics system for comparing how machine-unlearning methods forget data while preserving model utility.",
    overviewTitle:
      "Making unlearning tradeoffs visible across accuracy, efficiency, and privacy.",
    overview: [
      "Machine unlearning aims to remove the influence of specific training data without retraining a model from scratch. In practice, that goal is hard to evaluate: a method can forget targeted samples, damage retain-set utility, leak membership signal under attack, or simply cost too much to run. Comparing methods therefore means reading tradeoffs across accuracy, efficiency, and privacy rather than ranking a single score.",
      "Machine Unlearning Comparator is a web-based visual analytics system designed for that comparative workflow. Researchers move through four stages—Build, Screen, Contrast, and Attack—to configure experiments, scan high-level outcomes, inspect model behavior in detail, and audit residual privacy risk. Linked views connect class-level metrics, prediction matrices, embedding spaces, and layer-wise similarity so analysts can jump from overall method performance to individual samples and representation changes.",
      "The system ships with common unlearning baselines such as Fine-Tuning, Gradient Ascent, Random Labeling, SCRUB, and SalUn, and supports custom methods through a Python registration hook. Interactive Membership Inference Attack views help verify whether forgotten data still leaves detectable traces. The project was developed at the Intelligent Data Computing Lab at SKKU and published in IEEE TVCG 2026.",
    ],
    highlights: [
      "Built interactive comparison surfaces that let researchers move between method-level outcomes and instance-level evidence without breaking context.",
      "Reduced scatterplot interaction latency to p95 ≤ 11 ms at 2,000 points with imperative D3 updates and careful memoization for dense embedding exploration.",
      "Cut React rerenders by about 30% by migrating shared state from Context API to selector-based Zustand subscriptions across linked views.",
      "Iterated interaction workflows through three Figma user-study rounds and contributed to the open-source platform published in IEEE TVCG.",
    ],
    metric: "≤11 ms",
    metricLabel: "p95 interaction latency",
    technologies: ["React", "D3.js", "Zustand"],
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
      src: "/images/projects/unlearning-comparator-teaser.gif",
      alt: "The Machine Unlearning Comparator interface with linked plots and model comparison panels.",
      unoptimized: true,
    },
  },
  {
    id: "pytorch-cka",
    slug: "pytorch-cka",
    title: "PyTorch-CKA",
    context: "Open source · Machine learning",
    description:
      "A one-call PyTorch toolkit for measuring and visualizing representation similarity across models, layers, and checkpoints.",
    overviewTitle:
      "Turning representation similarity analysis into a reusable research workflow.",
    overview: [
      "Centered Kernel Alignment (CKA) is a standard way to measure how similar neural network representations are across layers, models, or training stages. Despite that, many research pipelines still re-implement feature extraction, batching, kernel computation, and plotting for every experiment. That friction slows iteration and makes it harder to compare runs under consistent conditions.",
      "PyTorch-CKA packages the full workflow into a practical library: pass models, dataloaders, and target layers to a single compute call, or feed pre-extracted features directly when activations already exist. The core path is built on vectorized PyTorch operations with GPU acceleration and explicit memory deallocation so larger layer-wise comparisons stay practical. It also supports common research setups such as Hugging Face models, DataParallel, and Distributed Data Parallel.",
      "Beyond the matrix itself, the library includes reusable visualizations—heatmaps for layer-to-layer similarity and trend plots for checkpoint or epoch comparisons—so results can be inspected without bolting on a separate analysis stack. The package is published on PyPI as pytorch-cka and is designed for researchers who want reliable CKA measurements without rebuilding the scaffolding around them.",
    ],
    highlights: [
      "Designed a one-call API that covers model-and-dataloader workflows and feature-only comparison paths.",
      "Accelerated core CKA computation by up to 44× on ResNet-18 layer-wise comparisons through vectorized PyTorch ops and GPU execution.",
      "Added memory-conscious activation handling and support for Hugging Face models, DataParallel, and DDP.",
      "Shipped reusable heatmap and trend visualizations for layer-wise and checkpoint-level analysis, and released the toolkit on PyPI.",
    ],
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
