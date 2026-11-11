# Suhyeon Yu — Portfolio

A scroll-told portfolio drawn entirely in dots, set in space. One
full-viewport canvas holds 5–11k particles (scaled to the viewport); each
chapter of the page tells them where to be, so scrolling hands the same dots
from one formation to the next. Behind them is a fixed night sky: the Milky
Way toward the galactic center, and a meteor now and then.

**Home (`/`)**

| #   | Chapter               | What the dots do                                                                       |
| --- | --------------------- | -------------------------------------------------------------------------------------- |
| 00  | Intro                 | A band of light writes the name in spaced capitals, then develops a stippled portrait inside four viewfinder marks; scrolling raises a wind that carries both off as grain. |
| 01  | Orbit Explorer        | The tracked catalog orbits a dot-matrix Earth; scrolling pulls back to the GEO ring. |
| 02  | Unlearning Comparator | A 10-class UMAP-like embedding; scrolling unlearns one class: its points lose their color, cross to other clusters, and take theirs. |
| 03  | PyTorch-CKA           | A layer-by-layer CKA heatmap of two ResNet-18s fills in, pair by pair, with the two layers being compared lit on the axes. |
| 04  | Contact               | Outline a message form that emails me directly; a sent message folds into a paper plane and flies off. |

The footer under Contact lists education, links, and skills. It is drawn as
the night side of a planet: the sky ends at a thin lit limb with the sun about
to rise at its middle (`.colophon` in `app/globals.css`, CSS only). Case
studies end on a plain strip instead.

**Case studies** open with results (not a hero): title, role, summary, and
result cards, each with a small particle chart of its evidence. Each one ends
with a "More" section linking to the other case studies, where the grain
gathers into a slow, tilted spiral disk.

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
  redraw fix).
- `/projects/pytorch-cka` — motivation, the linear-algebra groundwork, the
  O(B³) cube collapsing into an O(B²) plane, the batched one-pass redesign,
  GPU memory cleanup, and a benchmark race.
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

**Not found (`app/not-found.tsx`)** — any other address: "Lost in space."
over the same spiral disk that closes the case studies, with links back.

The logo is a planet of fine grain lit by one small amber star
(`components/logo.tsx`). The star orbits it, so the lit side follows the star
round: full when the star is in front, a thin crescent on the limb when it
swings behind. Nothing outlines the planet; it is only the grain the light
reaches. The star trails a wake of dust, and hovering speeds its orbit.
`app/icon.svg` is a still of the same figure with fewer, heavier grains.

A fixed dock holds back-to-top, social links, and an opt-in music player that
keeps playing across page navigations (`components/site-audio.tsx`, never
autoplays).

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

- `components/space-backdrop.tsx` — the far sky, mounted once in the root
  layout so it stays put across page changes. It is a picture of the real
  Milky Way, looking toward the galactic center, rendered ahead of time from
  NASA's [Deep Star Maps 2020](https://svs.gsfc.nasa.gov/4851) and served
  from `public/sky/` as AVIF: a wide frame at five widths up to 8K
  (7680×4320) and an upright one for portrait screens, picked by `srcset` so a
  screen is sent no more pixels than it can show (about 250 KB at 1080p,
  2.3 MB at 8K). The component also fires a meteor (one CSS-animated streak)
  every 16–42 seconds; not under `prefers-reduced-motion`, and not on the
  light theme.
- `scripts/sky/milkyway.py` — renders those frames. It points a camera at the
  galactic center, projects the all-sky map onto a flat frame
  (stereographic, so stars stay round out to the corners), and grades it for
  a page background in linear light: the band's glow is held under the
  luminance at which the site's muted text still clears 4.5:1, its faint
  outskirts are cooled toward the page's blue-black while the bulge stays
  warm, and the stars are exposed separately at each size so they hold their
  brightness from phone to 8K. To change the view or the grade, download
  `starmap_2020_64k_gal.exr` (3.3 GB) from the link above, edit the constants
  at the top of the script, and run:

  ```bash
  pip install numpy opencv-python-headless OpenEXR pillow
  python scripts/sky/milkyway.py starmap_2020_64k_gal.exr public/sky
  ```

  `--preview out.png` renders one small frame instead, and works against the
  40 MB `starmap_2020_4k_gal.exr` for quick tries.
- `components/dot-stage.tsx` — mounts the canvas and starts the engine. Each
  page renders its own `<DotStage />`.
- `lib/dots/engine.ts` — the particle engine: springs, click shockwaves,
  temperature, scroll-driven chapter switching, and batched Canvas 2D
  rendering (particles are bucketed by color/alpha, one fill each). It also
  owns how the dots feel:
  - Each chapter's figure makes its own entrance, set per scene in
    `entrances` (`scenes/index.ts`). The old figure fades where it stands and
    the new one is built in place, in the order it is read: a timeline or flow
    is wiped in left to right, a table top to bottom, a histogram from its
    baseline up; a matrix rains in by column, a scatter comes into focus,
    anything with a center blooms from it, and an outline is drawn like a pen
    stroke. Views of the Orbit Explorer app cut to one another. No dot crosses
    the screen, with one exception: arriving at or leaving the hero, the whole
    swarm flocks round the stage on a slow vortex.
  - A dot already close to its next place just moves there, so a figure two
    chapters share (the globe, say) carries over instead of rebuilding.
  - A fast dot draws its motion as a short streak, is fainter while in flight,
    and glints once as it lands.
  - Accent-tinted dots get a soft bloom from a low-resolution layer drawn
    underneath, so whatever a scene marks as current is also the brightest
    thing on screen. A lone tinted dot doesn't bloom; a dense stroke does.
  - The pointer pushes dots aside, drags a wake through them as it moves, and
    brightens what it touches.
  - All of the motion above is off under `prefers-reduced-motion`.
- `lib/dots/types.ts` — particles are structure-of-arrays typed buffers.
  Scenes write goals; the engine commits them to targets after each particle's
  stagger delay, then eases position, alpha, tint, and class color.
- `lib/dots/scenes/*` — one scene per chapter, registered in
  `scenes/index.ts` under the section's `data-scene` name (`muc-*`, `cka-*`, and
  `orbit-*` for the case studies). A scene writes a goal position, alpha, and tint
  for every particle each frame; unused particles become dust, which has
  depth: near motes are larger and slide past faster as the page scrolls.
- `lib/dots/shapes.ts` — lets markup place dots. Elements tagged
  `data-dots="outline|rule|disc|ring|bar|fill"` are traced every frame, so the
  dots follow real, keyboard-accessible controls. An outline is drawn like a
  viewfinder: bright brackets at the corners joined by a faint dotted run
  (`bracketed` gives the corners most of the dots while keeping their order,
  so the outline is still drawn round in one stroke). An outline that sits
  inside a link, button, or form, or holds exactly one (a card whose title
  link covers it), warms to the accent on hover and focus.
- `lib/dots/marks.ts` — a scene's particles as a list of boxes, lines, curves,
  rings, and fills. A line or curve with `flow` set streams in comet-shaped
  packets, bright head first, so its direction reads at a glance.
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

Themes are **ink** (dark) and **paper** (light), and both are the same sky.
Ink is the night side: a blue-black void, starlight for the dots, and one warm
accent, amber. Paper is that sky as a printed star chart: navy ink on cool
paper, stars as dark specks, the accent darkened to rust so it keeps its
contrast. The first visit follows the system preference; toggling uses a
circular View Transition and persists the choice in `localStorage`. Colors are
the tokens at the top of `app/globals.css`. The Milky Way frame is rendered
onto the ink background; on paper CSS inverts it, drains its color, and
multiplies it into the page.

Type is [Jost](https://fonts.google.com/specimen/Jost), a geometric sans in
the Futura line (the face on the Apollo 11 plaque), with JetBrains Mono for
labels, actions, and code. Panels are cut nearly square (`--radius`); only
round controls stay round.

## Development

```bash
pnpm install
pnpm dev
```

Or, with nothing installed on the host but Docker:

```bash
docker compose up -d                       # installs deps, serves http://localhost:3000
docker compose exec app pnpm lint          # run any command inside the container
docker compose exec app pnpm test:e2e      # reuses the running dev server
docker compose down -v                     # stop and delete node_modules, .next, the pnpm store
```

`node_modules`, `.next` and the pnpm store live in Docker volumes, and
Chromium is baked into the image, so the project folder only holds source.
Editors on the host won't see `node_modules` (no library types or
autocomplete).

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
