export type ProjectId =
  | "trainerize-profile"
  | "unlearning-comparator"
  | "pytorch-cka";

export type ProjectLink = {
  label: "Demo" | "Source" | "Paper" | "GitHub" | "PyPI";
  href: string;
};

export type ProjectVisual =
  | {
      kind: "trainerize";
      label: "Interface concept";
      alt: string;
    }
  | {
      kind: "image";
      src: string;
      alt: string;
      label: string;
    }
  | {
      kind: "cka-composite";
      lightSrc: string;
      darkSrc: string;
      heatmapSrc: string;
      alt: string;
      label: string;
    };

export type Project = {
  id: ProjectId;
  title: string;
  summary: string;
  narrative: string;
  metrics: readonly {
    value: string;
    label: string;
  }[];
  technologies: readonly string[];
  links: readonly ProjectLink[];
  visual: ProjectVisual;
};

export const projects = [
  {
    id: "trainerize-profile",
    title: "Modernizing the Trainerize Profile Experience",
    summary:
      "A modernization concept for a core Trainerize profile surface, bringing account details, progress, and coaching context into a clearer responsive hierarchy.",
    narrative:
      "The interface focuses on making high-value profile information easier to scan while keeping editing actions predictable across desktop and mobile. The visual shown here is a portfolio reconstruction while the final product details remain private.",
    metrics: [
      { value: "Profile", label: "core product surface" },
      { value: "Responsive", label: "desktop to mobile" },
      { value: "Systemized", label: "reusable UI patterns" },
    ],
    technologies: ["React", "TypeScript", "Responsive UI", "Design systems"],
    links: [],
    visual: {
      kind: "trainerize",
      label: "Interface concept",
      alt: "A colorful reconstruction of a Trainerize client profile with progress, activity, and coaching information.",
    },
  },
  {
    id: "unlearning-comparator",
    title: "Unlearning Comparator",
    summary:
      "An interactive visual analytics system for comparing how machine-unlearning methods forget data while preserving model utility.",
    narrative:
      "I engineered dense comparison views to stay responsive under analysis workloads, redesigned client state to reduce unnecessary updates, and iterated on the interface through three user-study rounds. The research was published in IEEE Transactions on Visualization and Computer Graphics.",
    metrics: [
      { value: "≤11 ms", label: "p95 interaction latency" },
      { value: "2,000", label: "points per view" },
      { value: "≈30%", label: "fewer React rerenders" },
    ],
    technologies: [
      "React",
      "TypeScript",
      "D3.js",
      "Zustand",
      "Figma",
      "Python",
    ],
    links: [
      {
        label: "Demo",
        href: "https://gnueaj.github.io/Machine-Unlearning-Comparator/",
      },
      {
        label: "Source",
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
      label: "Project interface",
      alt: "The Unlearning Comparator dashboard showing linked scatterplots, metric summaries, filters, and model comparison panels.",
    },
  },
  {
    id: "pytorch-cka",
    title: "PyTorch-CKA",
    summary:
      "A one-call PyTorch toolkit for measuring and visualizing representation similarity across models, layers, and training checkpoints.",
    narrative:
      "I redesigned the computation path to stream activations instead of retaining them, then packaged the workflow with publication-ready heatmaps and trend plots. The resulting API makes large comparison studies substantially faster and more memory efficient.",
    metrics: [
      { value: "44×", label: "faster computation" },
      { value: "≈96%", label: "lower GPU-memory retention" },
      { value: "1 call", label: "comparison workflow" },
    ],
    technologies: ["Python", "PyTorch", "CUDA", "NumPy", "Matplotlib", "PyPI"],
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
      kind: "cka-composite",
      lightSrc: "/images/projects/cka-benchmark-light.png",
      darkSrc: "/images/projects/cka-benchmark-dark.png",
      heatmapSrc: "/images/projects/cka-self-heatmap.png",
      label: "Benchmark and heatmap",
      alt: "A benchmark chart and CKA similarity heatmap comparing the representations of neural-network layers.",
    },
  },
] as const satisfies readonly Project[];
