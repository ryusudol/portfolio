# Suhyeon Yu — Portfolio

A single-page, scroll-told portfolio drawn entirely in dots. One full-viewport
canvas holds ~3–9k particles; each chapter of the page tells them where to be,
so scrolling hands the same dots from one formation to the next.

| #   | Chapter       | What the dots do                                                                 |
| --- | ------------- | -------------------------------------------------------------------------------- |
| 00  | Intro         | Form the name; the cursor pushes through it, a click sends a shockwave.          |
| 01  | Async         | A request tree. Hover fires requests; pick `merge/concat/switch/exhaustMap`.     |
| 02  | Interface     | Rough out code lines, then trace a live card (theme, temperature, scatter).      |
| 03  | Visualization | A 10-class UMAP-like embedding; scrolling unlearns one class into a singularity. |
| 04  | Orchestration | One plan fans out to parallel agents that finish and merge.                      |
| 05  | Performance   | An O(B³) cube collapses into an O(B²) plane, then releases its memory.           |
| 06  | Contact       | Outline a real input that opens your mail app.                                   |

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
