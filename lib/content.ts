export const profile = {
  name: "Suhyeon Yu",
  role: "Software Engineer",
  tagline:
    "I build interactive interfaces that make complex data and ML models clear. And beautiful.",
  location: "Houston, TX",
  email: "suhyeon.yu.2789@gmail.com",
  github: "https://github.com/ryusudol",
  linkedin: "https://www.linkedin.com/in/suhyeon-yu",
} as const;

/** Side interests, shown on /playground rather than the home page. */
export const playground = [
  {
    title: "Systems programming",
    tools: "C++ · Rust",
    body: "Memory, concurrency, and performance, close to the metal.",
  },
  {
    title: "Robotics",
    tools: "Perception · Control",
    body: "Software that senses and acts in the physical world.",
  },
  {
    title: "AI tooling",
    tools: "Agents · Data viz",
    body: "Tools that make models easier to build, inspect, and trust.",
  },
  {
    title: "Full-stack web",
    tools: "APIs · Databases",
    body: "Whole products, from the database to the interface.",
  },
  {
    title: "Infrastructure",
    tools: "Docker · Kubernetes",
    body: "Packaging, shipping, and running software reliably.",
  },
];

export type Chapter = {
  id: string;
  label: string;
};

export const pad = (n: number) => String(n).padStart(2, "0");

/** Order matches the `data-scene` sections rendered on the home page. */
export const homeChapters: Chapter[] = [
  { id: "intro", label: "Intro" },
  { id: "orbit-explorer", label: "Orbit Explorer" },
  { id: "unlearning-comparator", label: "Machine Unlearning Comparator" },
  { id: "pytorch-cka", label: "PyTorch-CKA" },
  { id: "contact", label: "Contact" },
];

/** Order matches the `data-scene` sections of the ABC Fitness case study. */
export const abcChapters: Chapter[] = [
  { id: "results", label: "Results" },
  { id: "redesign", label: "Redesign" },
  { id: "async", label: "Async" },
  { id: "interface", label: "Interface" },
  { id: "orchestration", label: "Orchestration" },
  { id: "more", label: "More" },
];

/** Order matches the `data-scene` sections of the PyTorch-CKA case study. */
export const ckaChapters: Chapter[] = [
  { id: "results", label: "Results" },
  { id: "why", label: "Motivation" },
  { id: "groundwork", label: "Groundwork" },
  { id: "insight", label: "Insight" },
  { id: "redesign", label: "Redesign" },
  { id: "memory", label: "Memory management" },
  { id: "benchmark", label: "Benchmark" },
  { id: "lessons", label: "Lessons" },
  { id: "more", label: "More" },
];

/** Order matches the `data-scene` sections of the Orbit Explorer case study. */
export const orbitChapters: Chapter[] = [
  { id: "results", label: "Results" },
  { id: "earth", label: "Explore" },
  { id: "follow", label: "Follow" },
  { id: "routing", label: "Laser routing" },
  { id: "conjunctions", label: "Conjunctions" },
  { id: "coverage", label: "Coverage" },
  { id: "catalog", label: "Catalog" },
  { id: "flight", label: "Flight to the Moon" },
  { id: "relay", label: "Link to Earth" },
  { id: "giants", label: "Giant planets" },
  { id: "heliosphere", label: "Oort cloud" },
  { id: "validation", label: "Validation" },
  { id: "pipeline", label: "Architecture" },
  { id: "precision", label: "Precision" },
  { id: "sieve", label: "Spatial grid" },
  { id: "bound", label: "Sampling bound" },
  { id: "lessons", label: "Lessons" },
  { id: "more", label: "More" },
];

/** Order matches the `data-scene` sections of the Unlearning Comparator case study. */
export const mucChapters: Chapter[] = [
  { id: "results", label: "Results" },
  { id: "why", label: "Motivation" },
  { id: "problem", label: "Blind spot" },
  { id: "workflow", label: "Workflow" },
  { id: "embedding", label: "Embedding" },
  { id: "matrix", label: "Prediction matrix" },
  { id: "layers", label: "Layers" },
  { id: "attack", label: "Attack" },
  { id: "state", label: "State management" },
  { id: "rendering", label: "SVG or canvas" },
  { id: "redraw", label: "Performance" },
  { id: "lessons", label: "Lessons" },
  { id: "more", label: "More" },
];

export const operators = [
  "mergeMap",
  "concatMap",
  "switchMap",
  "exhaustMap",
] as const;

export type Operator = (typeof operators)[number];

export type Certification = { name: string; issuer: string };

/** Rows for the certifications editor, in the order the live page lists them. */
export const certifications: Certification[] = [
  { name: "Certified Personal Trainer", issuer: "ACE" },
  { name: "Strength and Conditioning Specialist", issuer: "NSCA" },
  { name: "Exercise Therapy Certification", issuer: "ISSA" },
  { name: "Sport Conditioning Specialist", issuer: "CanFitPro" },
];

export const operatorNotes: Record<Operator, string> = {
  mergeMap: "Every request runs. Nothing is canceled.",
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
  ckaPaper: "https://arxiv.org/abs/1905.00414",
  essenceOfLinearAlgebra: "https://www.3blue1brown.com/topics/linear-algebra",
  orbitDemo: "https://orbit-explorer.pages.dev/",
  orbitCode: "https://github.com/ryusudol/orbit-explorer",
  vallado: "https://celestrak.org/publications/AIAA/2006-6753/",
} as const;

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
    href: "https://mrdang.cs.skku.edu/",
    note: "Next.js education platform for 5,000+ students — homepage load cut ~40% with SSR and lazy images.",
  },
];

/** Grouped as on the resume's Skills & Tools section. */
export const skills = [
  { label: "Languages", items: ["TypeScript", "Python", "C/C++"] },
  {
    label: "Frontend",
    items: [
      "HTML",
      "CSS",
      "React",
      "Next.js",
      "Redux",
      "TanStack Query",
      "Tailwind CSS",
      "SCSS",
      "D3",
      "Zustand",
    ],
  },
  { label: "Backend", items: ["Node.js", "FastAPI", "GraphQL", "REST APIs"] },
  {
    label: "Databases",
    items: ["SQL (PostgreSQL, MySQL)", "NoSQL (MongoDB)"],
  },
  { label: "Testing", items: ["Vitest", "Jest", "pytest"] },
  {
    label: "Cloud & DevOps",
    items: [
      "AWS (EC2, S3, Lambda)",
      "CI/CD (GitHub Actions)",
      "Docker",
      "Git",
      "GitHub",
    ],
  },
  {
    label: "AI Tools",
    items: ["Cursor", "Claude Code", "Codex", "Grok Build"],
  },
] as const;
