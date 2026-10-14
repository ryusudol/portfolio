# Suhyeon Yu — Portfolio

A scroll-told portfolio drawn entirely in dots. One full-viewport canvas holds
5–11k particles (scaled to the viewport); each chapter of the page tells them
where to be, so scrolling hands the same dots from one formation to the next.

**Home (`/`)**

| #   | Chapter               | What the dots do                                                                       |
| --- | --------------------- | -------------------------------------------------------------------------------------- |
| 00  | Intro                 | A stippled portrait beside the name; the cursor pushes through, a click pulses.        |
| 01  | Orbit Explorer        | The tracked catalog orbits a dot-matrix Earth; scrolling pulls back to the GEO ring. |
| 02  | Unlearning Comparator | A 10-class UMAP-like embedding; scrolling scatters one class into the others.          |
| 03  | PyTorch-CKA           | A layer-by-layer CKA heatmap of two ResNet-18s fills in, pair by pair.                 |
| 04  | Contact               | Outline a message form that emails me directly.                                        |

The footer under Contact lists education, links, and skills.

**Case studies** open with results (not a hero): title, role, summary, and
result cards, each with a small particle chart of its evidence. Each one ends
with a "More" section linking to the other case studies.

- `/projects/orbit-explorer` — a digital twin of Earth orbit that flies out
  to every planet. Its feature chapters redraw the app itself in dots, inside a
  dark app window with its header, world headline and legend, Fly to list,
  zoom controls, mode panels, and time dock (`lib/dots/orbit-app.ts`); worlds
  beyond the Earth are ray-cast dot lattices seen through a small pinhole
  camera (`lib/dots/orbit-worlds.ts`). In order: Explore over North America
  with the reference-frame switch; selecting and following a real V1.5
  Starlink down to its dot model, then a V2 Mini and a V3; Starlink's 53°
  shell routing London to New York live on a port of the engine's +Grid and
  Dijkstra; the hour's 2,981 conjunctions and "Watch it happen" on the closest
  pair; the coverage heatmap and latitude profile; the catalog unfolded into
  an altitude–inclination map; the app's log-distance flight to the Moon and
  its five orbiters; Link to Earth relay passes at three lunar sites and on
  Mars; Jupiter's and Saturn's moons (every one) and Saturn's rings strewn by
  optical depth; and the solar system from outside, through the real Kuiper
  belt, the Voyagers and the heliopause to the model Oort cloud. Then the
  engineering: SGP4 validation against Vallado and satellite.js, the
  shared-memory keyframe pipeline as a profiler trace, float32 jitter and
  camera-relative rendering, the conjunction grid and its sampling bound.
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
`components/orbit-story.tsx`, `components/muc-story.tsx`, and
`components/cka-story.tsx`.

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

### Orbit Explorer data

The Orbit Explorer case study draws from small files in `public/orbit/`. Four
binaries (about 250 KB together) are exported from the app's own Rust engine
run on its October 9, 2026, Space-Track snapshot (32,583 objects):

| File             | What it holds                                                                                         |
| ---------------- | ----------------------------------------------------------------------------------------------------- |
| `catalog.bin`    | a random 8,192 of the catalog (mean altitude, eccentricity, inclination, node, perigee, anomaly, group) |
| `shell.bin`      | the 4,640 satellites of the 53° shell the engine recovers, by plane, with their state at the snapshot     |
| `earth.bin`      | a 1° surface map (ocean, green, arid, ice from the app's day texture; city lights from its night texture) and the engine's 2° Starlink coverage grid |
| `encounters.bin` | the 2,981 encounters under 5 km the engine finds in the hour after the snapshot, with where each happens  |

The validation numbers (`VALLADO_LOG`, `SATJS`), the Catalog card's
altitude histograms (`ALTITUDE`), and benchmarks are inlined in
`lib/dots/orbit-data.ts` from the app's `docs/`. To regenerate the binaries,
with Orbit Explorer checked out next to this repository:

```bash
cd scripts/orbit/export
cargo run --release -- ../../../../orbit-explorer/web/public/data/catalog.bin /tmp/orbit/csv
cd ../../..
python3 scripts/orbit/pack.py /tmp/orbit/csv \
  ../orbit-explorer/web/public/textures/earth-day-2k.jpg \
  ../orbit-explorer/web/public/textures/earth-night-2k.jpg public/orbit
```

`pack.py` needs Pillow. The export also prints the figures the page quotes
(shells, links, the London → New York route, the screening counts), and the
same snapshot gives identical files.

Everything beyond Earth orbit comes from the app's own TypeScript, run at the
snapshot's instant (`scripts/orbit/worlds.mjs` imports its `web/src/sim`
modules from its Vite dev server in headless Chromium):

| File          | What it holds                                                                                                     |
| ------------- | ----------------------------------------------------------------------------------------------------------------- |
| `worlds.json` | Starlink generations by NORAD id, distances between worlds, the Moon, Mars and giants' orientation, every moon's and orbiter's osculating elements from the JPL Horizons snapshots, and the relay planner's 24-hour passes over each landing site |
| `solar.bin`   | the planets' orbits (VSOP87), the 7,299 trans-Neptunian objects at the snapshot, and the Voyagers' paths since 1977 |
| `maps.bin`    | the Moon, Mars, Jupiter and Saturn's 2k textures at 256 × 128, quantized to a few colors by k-means              |

```bash
pnpm --dir ../orbit-explorer dev        # serves the app at http://localhost:5173
node scripts/orbit/worlds.mjs http://localhost:5173 public/orbit
```

## How it works

- `components/dot-stage.tsx` — mounts the canvas and starts the engine. Each
  page renders its own `<DotStage />`.
- `lib/dots/engine.ts` — the particle engine: springs, pointer repulsion,
  click shockwaves, temperature, scroll-driven chapter switching, and batched
  Canvas 2D rendering (particles are bucketed by color/alpha, one fill each).
- `lib/dots/types.ts` — particles are structure-of-arrays typed buffers.
  Scenes write goals; the engine commits them to targets after each particle's
  stagger delay, then eases position, alpha, tint, and class color.
- `lib/dots/scenes/*` — one scene per chapter, registered in
  `scenes/index.ts` under the section's `data-scene` name (`muc-*`, `cka-*`, and
  `orbit-*` for the case studies). A scene writes a goal position, alpha, and tint
  for every particle each frame; unused particles become dust.
- `lib/dots/shapes.ts` — lets markup place dots. Elements tagged
  `data-dots="outline|rule|disc|ring|bar|fill"` are traced every frame, so the
  dots follow real, keyboard-accessible controls.
- `lib/dots/story.ts` — keeps a chapter's `[data-step]` captions and
  `[data-counter]` readouts in sync with its scene.
- `lib/dots/cka-data.ts`, `lib/dots/muc-data.ts`, `lib/dots/orbit-data.ts` —
  the measured benchmark, demo, and engine data the case study charts are
  drawn from. Orbit Explorer's larger datasets load from `public/orbit/*.bin`
  (see below), and `lib/dots/orbit-mesh.ts` is a dependency-free port of the
  engine's laser-mesh routing that the page runs live.
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
