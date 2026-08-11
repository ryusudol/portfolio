# Playground / UI Craft demos

## Stage chrome vs. canvas

| Piece | Role |
| --- | --- |
| **`DemoPanel`** | Outer frame only (border, radius, scroll-driven width/height). Used by the workspace — not by individual demos. |
| **`DemoCanvas`** | Full-bleed stage surface **inside** the panel. Every component demo should use this as its outermost root. |

## Adding a component demo

1. Create `components/playground/ui-craft/<slug>/index.tsx`.
2. Wrap the demo UI in **`DemoCanvas`**.
3. Register the component in `components/playground/ui-craft/index.ts`.
4. Add entry metadata in `lib/playground/ui.ts`.

Public entry point: **`/playground/ui`** — the UI Craft workspace with in-page
component tabs (not routed by slug).

Personal stages live at **`/playground/ui/<slug>`** (not linked from the public
index). These routes render only `DemoCanvas` and the component — no site chrome,
nav, or copy.

### Default stage background

```tsx
import { DemoCanvas } from "@/components/playground/demo-canvas";

export function MyComponent() {
  return (
    <DemoCanvas>
      {/* demo UI */}
    </DemoCanvas>
  );
}
```

### Custom stage background

Pass Tailwind classes via `className` on `DemoCanvas` (overrides the default fill):

```tsx
import { DemoCanvas } from "@/components/playground/demo-canvas";

export function TestimonialCard() {
  return (
    <DemoCanvas className="bg-linear-to-br from-[#F9FAFB] to-[#D2D6DB] dark:from-[#1c1b19] dark:to-[#2a2825]">
      {/* demo UI */}
    </DemoCanvas>
  );
}
```

Do **not** put the stage background on `DemoPanel`. Background belongs on `DemoCanvas` (or an equivalent full-bleed root with `flex w-full flex-1`). Prefer `DemoCanvas` so padding and fill stay consistent across demos.
