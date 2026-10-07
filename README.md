# Suhyeon Yu — Portfolio

A scroll-told portfolio drawn entirely in dots. One full-viewport canvas holds
5–11k particles (scaled to the viewport); each chapter of the page tells them
where to be, so scrolling hands the same dots from one formation to the next.

**Home (`/`)**

| #   | Chapter               | What the dots do                                                                |
| --- | --------------------- | ------------------------------------------------------------------------------- |
| 00  | Intro                 | A stippled portrait beside the name; the cursor pushes through, a click pulses. |
| 01  | Unlearning Comparator | A 10-class UMAP-like embedding; scrolling scatters one class into the others.   |
| 02  | PyTorch-CKA           | A layer-by-layer CKA heatmap of two ResNet-18s fills in, pair by pair.          |
| 03  | Experience            | Assemble a wireframe of the rebuilt Trainerize profile, section by section.    |
| 04  | Contact               | Outline a message form that emails me directly.                                 |

The footer under Contact lists education, links, and skills.

**Case studies** open with results (not a hero): title, role, summary, and
result cards, each with a small particle chart of its evidence. Each one ends
with a "More" section linking to the other case studies.

- `/projects/unlearning-comparator` — a scroll-driven story told with the
  demo's real data: motivation, the model-screening blind spot, the four-stage
  workflow, the embedding, prediction-matrix, layer-wise-similarity, and attack
  views, then the engineering (Context → Zustand, SVG vs. canvas, the hover
  redraw fix) and lessons.
- `/projects/pytorch-cka` — motivation, the linear-algebra groundwork, the
  O(B³) cube collapsing into an O(B²) plane, the batched one-pass redesign,
  GPU memory cleanup, a benchmark race, and lessons.
- `/experience/abc-fitness` — **under construction** (the case study is being
  rewritten). It currently has an RxJS request tree with a live
  `merge/concat/switch/exhaustMap` picker, a code-to-card interface rewrite,
  and parallel AI agents merging into one flag-gated rollout.

Case study content lives in `lib/case-studies.ts`; the story chapters are in
`components/muc-story.tsx` and `components/cka-story.tsx`.

**Work (`/work`)** — an index of experience and projects as cards that open the
case studies, plus other projects that link out (`alsoBuilt` in
`lib/content.ts`).

**Playground (`/playground`)** — side interests outside the main work
(`playground` in `lib/content.ts`), revealed by a parting curtain of dots. Also
marked under construction.

The logo is a live particle black hole (`components/logo.tsx`). A fixed dock
holds back-to-top, social links, and an opt-in music player that keeps playing
across page navigations (`components/site-audio.tsx`, never autoplays).

### Portrait

The hero portrait is ~7k stippled dots in `public/portrait/dots.bin` (28 KB);
the source photo is never committed. To regenerate it from a new photo:

```bash
python -m venv .venv && .venv/bin/pip install "rembg[cpu]" opencv-python-headless scipy
.venv/bin/python scripts/portrait.py path/to/photo.png --cut "x,y x,y …"
```

`--cut` is a polyline along the jaw (in photo pixels); everything below it is
removed so only the head remains. Add `--preview out.png` to check the result,
or `--out` to write somewhere other than `public/portrait/dots.bin`.

Inspired by the dot-motion "describe yourself" site shown in
[this video](https://www.youtube.com/watch?v=nQw17ND2-fA) (10:02–11:46).

## How it works

- `components/dot-stage.tsx` — mounts the canvas and starts the engine. Each
  page renders its own `<DotStage />`.
- `lib/dots/engine.ts` — the particle engine: springs, pointer repulsion,
  click shockwaves, temperature, scroll-driven chapter switching, and batched
  Canvas 2D rendering (particles are bucketed by colour/alpha, one fill each).
- `lib/dots/types.ts` — particles are structure-of-arrays typed buffers.
  Scenes write goals; the engine commits them to targets after each particle's
  stagger delay, then eases position, alpha, tint, and class colour.
- `lib/dots/scenes/*` — one scene per chapter, registered in
  `scenes/index.ts` under the section's `data-scene` name (`muc-*` and `cka-*`
  for the two case studies). A scene writes a goal position, alpha, and tint
  for every particle each frame; unused particles become dust.
- `lib/dots/shapes.ts` — lets markup place dots. Elements tagged
  `data-dots="outline|rule|disc|ring|bar|fill"` are traced every frame, so the
  dots follow real, keyboard-accessible controls.
- `lib/dots/story.ts` — keeps a chapter's `[data-step]` captions and
  `[data-counter]` readouts in sync with its scene.
- `lib/dots/cka-data.ts`, `lib/dots/muc-data.ts` — the measured benchmark and
  demo data the case study charts are drawn from.
- `lib/dots/runtime.ts` — a tiny external store shared by the engine and React
  islands (`useSyncExternalStore`).
- Sections are ordinary server-rendered HTML; the canvas is decorative
  (`aria-hidden`) and the page still reads correctly without JavaScript.
  `prefers-reduced-motion` freezes ambient motion.

The chapter lists in `lib/content.ts` (`homeChapters`, `mucChapters`,
`ckaChapters`, `abcChapters`) drive the side navigation and must stay in the
same order as the page's `data-scene` sections.

The contact form posts to a Server Action (`app/actions/contact.ts`) that
delivers through [Resend](https://resend.com) with the visitor as Reply-To.
Create `.env.local` with:

```bash
RESEND_API_KEY=re_...                 # required; without it the form asks visitors to email directly
CONTACT_FROM="Portfolio <you@domain>" # optional; defaults to onboarding@resend.dev
CONTACT_TO=you@example.com            # optional; defaults to the email in lib/content.ts
```

Themes are **ink** (dark) and **paper** (light). The first visit follows the
system preference; toggling uses a circular View Transition and persists the
choice in `localStorage`.

## Development

```bash
pnpm install
pnpm dev
```

Quality checks (CI runs lint, typecheck, and e2e on every push and PR to
`main`):

```bash
pnpm lint        # Biome
pnpm typecheck   # next typegen && tsc --noEmit
pnpm build
pnpm test:e2e    # Playwright smoke tests + axe accessibility checks
```

Icons come from `reicon-react` only; don't add another icon library.

Site copy lives in `lib/content.ts`; case study copy in `lib/case-studies.ts`.
