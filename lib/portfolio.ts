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
  overview: string;
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
  resume: "/documents/Suhyeon-Yu-Resume.pdf",
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
    technologies: ["React", "TypeScript", "Responsive UI", "Design systems"],
    confidential: true,
    logo: {
      src: "/images/brands/abc-fitness.png",
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
    technologies: ["React", "TypeScript", "D3.js", "Zustand", "Figma"],
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
    overview:
      "At ABC Fitness, I contribute to a modernized Trainerize profile experience. The work focuses on turning dense account, progress, and coaching information into a clearer interface that behaves consistently across screen sizes.",
    highlights: [
      "Build responsive interface patterns for a production product surface.",
      "Organize complex profile information into a clearer visual and interaction hierarchy.",
      "Create reusable UI foundations that support consistent iteration across the experience.",
    ],
    metric: "Current",
    metricLabel: "product experience",
    technologies: ["React", "TypeScript", "Responsive UI"],
    links: [],
    confidentialityNote:
      "This case study stays intentionally high level. Visuals are reconstructed for the portfolio, and proprietary product details are not disclosed.",
    visual: { kind: "trainerize" },
  },
  {
    id: "unlearning-comparator",
    slug: "unlearning-comparator",
    title: "Unlearning Comparator",
    context: "Research · Visual analytics",
    description:
      "An interactive visual analytics system for comparing how machine-unlearning methods forget data while preserving model utility.",
    overview:
      "Unlearning Comparator makes it easier to examine the tradeoffs between forgetting targeted data and preserving a model’s utility. Linked visualizations let researchers compare methods, inspect model behavior, and move between high-level outcomes and individual examples.",
    highlights: [
      "Reduced scatterplot interaction latency to p95 ≤ 11 ms at 2,000 points through imperative D3 updates and memoization.",
      "Reduced React rerenders by about 30% with selector-based Zustand subscriptions.",
      "Iterated through three Figma user-study rounds and contributed to the IEEE TVCG publication.",
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
      alt: "The Unlearning Comparator interface with linked plots and model comparison panels.",
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
    overview:
      "PyTorch-CKA packages Centered Kernel Alignment into a practical workflow for comparing learned representations. It helps researchers inspect similarity across models, layers, and training checkpoints without rebuilding the analysis pipeline for every experiment.",
    highlights: [
      "Designed a one-call API for common representation-similarity workflows.",
      "Accelerated the core computation by up to 44× with vectorized PyTorch operations.",
      "Added reusable visualizations for layer-wise and checkpoint-level comparisons.",
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
      src: "/images/projects/cka-self-heatmap.png",
      alt: "A CKA heatmap showing layer-wise representation similarity within a neural network.",
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
