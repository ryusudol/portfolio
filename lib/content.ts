export const profile = {
  name: "Suhyeon Yu",
  role: "Software Engineer",
  tagline: "Software that makes complex systems easy to see and use.",
  location: "Houston, TX",
  email: "suhyeon.yu.2789@gmail.com",
  github: "https://github.com/ryusudol",
  linkedin: "https://www.linkedin.com/in/suhyeon-yu",
} as const;

export type Chapter = {
  id: string;
  label: string;
};

export const pad = (n: number) => String(n).padStart(2, "0");

/** Order matches the `data-scene` sections rendered on the home page. */
export const homeChapters: Chapter[] = [
  { id: "intro", label: "Intro" },
  { id: "experience", label: "Experience" },
  { id: "unlearning-comparator", label: "Unlearning Comparator" },
  { id: "pytorch-cka", label: "PyTorch-CKA" },
  { id: "contact", label: "Contact" },
];

/** Order matches the `data-scene` sections of the ABC Fitness case study. */
export const abcChapters: Chapter[] = [
  { id: "results", label: "Results" },
  { id: "async", label: "Async" },
  { id: "interface", label: "Interface" },
  { id: "orchestration", label: "Orchestration" },
  { id: "more", label: "More" },
];

/** Order matches the `data-scene` sections of a featured-project case study. */
export const projectChapters: Chapter[] = [
  { id: "results", label: "Results" },
  { id: "walkthrough", label: "Walkthrough" },
  { id: "highlights", label: "What I built" },
  { id: "more", label: "More" },
];

export const operators = [
  "mergeMap",
  "concatMap",
  "switchMap",
  "exhaustMap",
] as const;

export type Operator = (typeof operators)[number];

export const operatorNotes: Record<Operator, string> = {
  mergeMap: "Every request runs. Nothing is cancelled.",
  concatMap: "Requests wait in line, one at a time.",
  switchMap: "A new request cancels the stale one.",
  exhaustMap: "Busy? New requests are ignored.",
};

export const links = {
  unlearningDemo: "https://gnueaj.github.io/Machine-Unlearning-Comparator/",
  unlearningCode: "https://github.com/gnueaj/Machine-Unlearning-Comparator",
  unlearningPaper: "https://ieeexplore.ieee.org/document/11364307",
  ckaCode: "https://github.com/ryusudol/Centered-Kernel-Alignment",
  ckaPypi: "https://pypi.org/project/pytorch-cka/",
} as const;

export const experience = [
  {
    title: "Software Engineering Intern",
    org: "ABC Fitness",
    place: "Austin, TX",
    period: "Jun – Aug 2026",
    href: "/experience/abc-fitness",
  },
];

export const education = [
  {
    title: "Master of Computer Science · GPA 3.91",
    org: "Rice University",
    place: "Houston, TX",
    period: "2025 – 2026",
  },
  {
    title: "B.S. Computer Science & Engineering",
    org: "Sungkyunkwan University",
    place: "Suwon, KR",
    period: "2018 – 2024",
  },
];

export const alsoBuilt = [
  {
    title: "Online MyeongNyunDang",
    note: "Next.js education platform for 5,000+ students — homepage load cut ~40% with SSR and lazy images.",
  },
];

export const publication = {
  title:
    "Unlearning Comparator: A Visual Analytics System for Comparative Evaluation of Machine Unlearning Methods",
  venue: "IEEE TVCG · vol. 32, no. 3 · Mar 2026",
  authors: "J. Lee, S. Yu, Y. Jang, S. S. Woo, J. Jo",
  href: links.unlearningPaper,
};

export const stack = [
  "TypeScript",
  "React",
  "Next.js",
  "RxJS",
  "D3",
  "Zustand",
  "TanStack Query",
  "Redux",
  "Jest",
  "Vitest",
  "Node.js",
  "FastAPI",
  "Python",
  "PyTorch",
  "AWS",
  "Docker",
];
