# Suhyeon Yu — Portfolio

A scroll-told portfolio drawn entirely in dots. One full-viewport
canvas holds ~3–9k particles; each chapter of the page tells them where to be,
so scrolling hands the same dots from one formation to the next.

**Home (`/`)**

| #   | Chapter               | What the dots do                                                                 |
| --- | --------------------- | -------------------------------------------------------------------------------- |
| 00  | Intro                 | A stippled portrait beside the name; the cursor pushes through, a click pulses.  |
| 01  | Experience            | Assemble a wireframe of the rebuilt Trainerize profile, section by section.     |
| 02  | Unlearning Comparator | A 10-class UMAP-like embedding; scrolling scatters one class into the others.     |
| 03  | PyTorch-CKA           | A layer-by-layer CKA heatmap of two ResNet-18s fills in, pair by pair.          |
| 04  | Contact               | Outline a message form that emails me directly.                                  |

**Case studies** open with results (not a hero): title, role, summary, and
dot-outlined result cards.

- `/experience/abc-fitness` — then an RxJS request tree with a live
  `merge/concat/switch/exhaustMap` picker, a code-to-card interface rewrite, and
  parallel AI agents merging into one flag-gated rollout.
- `/projects/unlearning-comparator`, `/projects/pytorch-cka` — then the
  interactive walkthrough (PyTorch-CKA's O(B³) cube collapsing into an O(B²)
  plane) and what I built. Content lives in `lib/case-studies.ts`.

**Playground (`/playground`)** — side interests outside the main work
(`playground` in `lib/content.ts`).

The logo is a live particle black hole (`components/logo.tsx`).

### Portrait

The hero portrait is ~7k stippled dots in `public/portrait/dots.bin` (28 KB);
the source photo is never committed. To regenerate it from a new photo:

```bash
python -m venv .venv && .venv/bin/pip install "rembg[cpu]" opencv-python-headless scipy
.venv/bin/python scripts/portrait.py path/to/photo.png --cut "x,y x,y …"
```

`--cut` is a polyline along the jaw (in photo pixels); everything below it is
removed so only the head remains. Add `--preview out.png` to check the result.

Inspired by the dot-motion "describe yourself" site shown in
[this video](https://www.youtube.com/watch?v=nQw17ND2-fA) (10:02–11:46).

## How it works

- `lib/dots/engine.ts` — the particle engine: springs, pointer repulsion,
  click shockwaves, temperature, scroll-driven chapter switching, and batched
  Canvas 2D rendering (particles are bucketed by colour/alpha, one fill each).
- `lib/dots/scenes/*` — one scene per chapter. A scene writes a goal position,
  alpha, and tint for every particle each frame; unused particles become dust.
- `lib/dots/shapes.ts` — lets markup place dots. Elements tagged
  `data-dots="outline|rule|disc|ring|bar"` are traced every frame, so the dots
  follow real, keyboard-accessible controls.
- `lib/dots/runtime.ts` — a tiny external store shared by the engine and React
  islands (`useSyncExternalStore`).
- Sections are ordinary server-rendered HTML; the canvas is decorative
  (`aria-hidden`) and the page still reads correctly without JavaScript.
  `prefers-reduced-motion` freezes ambient motion.

The contact form posts to a Server Action (`app/actions/contact.ts`) that
delivers through [Resend](https://resend.com) with the visitor as Reply-To.
Copy `.env.example` to `.env.local` and set `RESEND_API_KEY`.

Themes are **ink** (dark) and **paper** (light), switched with a circular
View Transition and persisted in `localStorage`.

## Development

```bash
pnpm install
pnpm dev
```

Quality checks:

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm test:e2e
```

Content lives in `lib/content.ts`.
