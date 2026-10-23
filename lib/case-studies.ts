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
    | "redraw"
    | "catalog"
    | "vallado"
    | "sieve"
    | "latency";
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
      value: "7",
      label: "sections, one React layout",
      note: "Header, contact, certifications, score and views, intro video, services, and photo feed, each a slot in one shared page layout.",
    },
    {
      value: "8",
      label: "requests sent at once",
      note: "The profile, its view counts, and six photos leave within 2 ms of each other and settle in about a quarter second.",
    },
    {
      value: "0.00",
      label: "layout shift on load",
      note: "Cards hold their final size while data arrives, so nothing on the page jumps. Measured in Chrome on the shipped page.",
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
    "Compares layer representations in CNNs and LLMs, 6.8× faster than torch_cka with 95.7% less retained GPU memory.",
  stack: ["Python", "PyTorch", "pytest", "GitHub Actions", "PyPI"],
  links: [
    { label: "PyPI", href: links.ckaPypi },
    { label: "Code", href: links.ckaCode },
  ],
  results: [
    {
      value: "6.8×",
      label: "faster than torch_cka",
      note: "Two ResNet-18s compared on all 18 layers over 10,000 CIFAR-10 images on an RTX PRO 6000 Blackwell GPU. 30× faster than a plain NumPy version on the CPU.",
      chart: "speed",
    },
    {
      value: "−95.7%",
      label: "retained GPU memory",
      note: "After one pass over the 10,000 CIFAR-10 test images on the same Blackwell GPU, 0.18 GB of GPU memory stays allocated, down from torch_cka’s 4.26 GB.",
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
        value: "5.87 s → 0.86 s",
        label: "same GPU, same layers",
        href: "#benchmark",
      },
    },
  ],
};

export const orbitExplorer: CaseStudy = {
  slug: "orbit-explorer",
  href: "/projects/orbit-explorer",
  kind: "Project",
  title: "Orbit Explorer",
  role: "Solo project, from the Rust engine to the interface",
  when: "Live in the browser",
  summary:
    "A digital twin of Earth orbit that runs in the browser, and flies out to every planet, the Moon, and the Oort cloud. It propagates all 32,583 objects in the public catalog live, routes packets across Starlink’s laser mesh, screens the whole catalog for close approaches, and maps coverage. Beyond Earth, every known moon of Mars and the giant planets and every spacecraft orbiting another world fly on JPL’s trajectories. I wrote the orbital mechanics in Rust from the published model definitions, compiled them to WebAssembly, and checked each result against a published reference.",
  definition: {
    term: "What is SGP4?",
    body: "SGP4 is the standard model for predicting where a tracked object will be. The US Space Force publishes every object’s orbit as a few mean elements, and SGP4 turns them back into a position and velocity at any time, accounting for Earth’s flattening, atmospheric drag, and, on high orbits, the pull of the Sun and Moon. The elements are only good to about a kilometer, so an implementation is judged by how exactly it reproduces the reference code.",
  },
  blurb:
    "A browser digital twin of Earth orbit, with all 32,583 tracked objects at 60 fps, Starlink laser routing, conjunction screening, and flights out to every planet’s moons, on a Rust engine checked against published references.",
  stack: [
    "Rust",
    "WebAssembly",
    "TypeScript",
    "React",
    "Three.js",
    "WebGPU",
    "D3",
    "Zustand",
  ],
  links: [
    { label: "Live demo", href: links.orbitDemo },
    { label: "Code", href: links.orbitCode },
  ],
  results: [
    {
      value: "32,583",
      label: "objects propagated live",
      note: "The full public catalog from Space-Track, at 60 fps on an M1 MacBook Air. Each frame’s JavaScript takes about 2.6 ms, and moving every object takes 0.22 ms of it.",
      chart: "catalog",
    },
    {
      value: "0.10 mm",
      label: "worst error on 666 reference states",
      note: "My SGP4 against the published verification output for the model, deep-space orbits and the cases built to fail included.",
      chart: "vallado",
    },
    {
      value: "423×",
      label: "faster close-approach sieve",
      note: "A sorted spatial grid finds every pair within 10 km in 1.5 ms, where checking all 530 million pairs takes 638 ms. At 100,000 objects it is 1,522× faster.",
      chart: "sieve",
    },
    {
      value: "21 ms",
      label: "London to New York by laser",
      note: "About 6 ms faster than the best fiber possible, a straight cable along the 5,570 km great circle, routed over the satellites’ real positions.",
      chart: "latency",
    },
  ],
  highlights: [
    {
      title: "Check against the reference, not yourself",
      body: "SGP4 has a published verification set. Matching it to a tenth of a millimeter, error codes included, is what made every later number worth trusting. An independent Rust implementation then agreed to 0.7 µm.",
      proof: {
        value: "666 / 666",
        label: "reference states matched",
        href: "#validation",
      },
    },
    {
      title: "Exact to the model, not to the bit",
      body: "Bit-for-bit agreement with satellite.js held only while I kept the reference code’s slow steps. Exact identities in their place made propagation a quarter faster and moved positions by a billionth of a TLE’s own error, so the model is what to match, not its rounding.",
      proof: {
        value: "2 nm",
        label: "median difference from satellite.js",
        href: "#validation",
      },
    },
    {
      title: "Keep the simulation out of React",
      body: "The render loop is a plain class that owns the workers and the GPU. React reads a summary of it five times a second, so a busy panel can never cost the globe a frame.",
      proof: {
        value: "0.22 ms",
        label: "to move all 32,583 objects a frame",
        href: "#pipeline",
      },
    },
    {
      title: "Prove a bound, then test the case that broke it",
      body: "A single speed bound once let a transfer orbit slip past a satellite between samples. Sizing each object’s search from its own top speed closed the gap, and a test now pins that pass.",
      proof: {
        value: "60,756",
        label: "encounters at every step size",
        href: "#bound",
      },
    },
  ],
};

export const caseStudies = [
  abcFitness,
  orbitExplorer,
  unlearningComparator,
  pytorchCka,
];

export const projectStudies = caseStudies.filter((s) => s.kind === "Project");
export const experienceStudies = caseStudies.filter(
  (s) => s.kind === "Experience",
);
