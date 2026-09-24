# Suhyeon Yu — Portfolio

A scroll-told portfolio drawn entirely in dots. One full-viewport
canvas holds ~3–9k particles; each chapter of the page tells them where to be,
so scrolling hands the same dots from one formation to the next.

**Home (`/`)**

| #   | Chapter               | What the dots do                                                                 |
| --- | --------------------- | -------------------------------------------------------------------------------- |
| 00  | Intro                 | Form the name; the cursor pushes through it, a click sends a shockwave.          |
| 01  | Experience            | Assemble a wireframe of the rebuilt Trainerize profile, section by section.     |
| 02  | Unlearning Comparator | A 10-class UMAP-like embedding; scrolling unlearns one class into a singularity. |
| 03  | PyTorch-CKA           | An O(B³) cube collapses into an O(B²) plane, then releases its memory.           |
| 04  | Contact               | Outline a message form that emails me directly.                                  |

**Case studies** open with results (not a hero): title, role, summary, and
dot-outlined result cards.

- `/experience/abc-fitness` — then an RxJS request tree with a live
  `merge/concat/switch/exhaustMap` picker, a code-to-card interface rewrite, and
  parallel AI agents merging into one flag-gated rollout.
- `/projects/unlearning-comparator`, `/projects/pytorch-cka` — then the
  interactive walkthrough and what I built. Content lives in
  `lib/case-studies.ts`.

The logo is a live particle black hole (`components/logo.tsx`).

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
