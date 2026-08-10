<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Icons

Use **`reicon-react` only**. Do not install or import Lucide, Tabler, Phosphor, Remix, Hugeicons, Radix Icons, react-icons, or any other icon library. If `shadcn add` injects another icon package, replace those icons with `reicon-react` and remove the extra dependency.

# UI Craft demos

Each playground component demo must use **`DemoCanvas`** as its outermost root (default or custom stage background via `className`). Do not paint stage backgrounds on `DemoPanel`. See `components/playground/README.md`.
