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

Public entry point: **`/playground/ui`** — a card grid of live component demos.
Index tiles render each demo in preview mode (`DemoPanel preview`): `DemoCanvas`
drops its stage fill so the component sits on the tile with a drop shadow.

Each card links to **`/playground/ui/<slug>`**, a dedicated page for that
component. Those routes keep the playground chrome (profile menu included) and
render `DemoCanvas` with the component.

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

Pass Tailwind classes via `className` on `DemoCanvas` (overrides the default fill; include `bg-none` when replacing the gradient):

```tsx
import { DemoCanvas } from "@/components/playground/demo-canvas";

export function TestimonialCard() {
  return (
    <DemoCanvas className="bg-[#F4F6F8] bg-none dark:bg-surface-alt">
      {/* demo UI */}
    </DemoCanvas>
  );
}
```

Do **not** put the stage background on `DemoPanel`. Background belongs on `DemoCanvas` (or an equivalent full-bleed root with `flex w-full flex-1`). Prefer `DemoCanvas` so padding and fill stay consistent across demos.
