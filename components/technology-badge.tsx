import {
  Atom,
  ChartLine,
  CodeSquare,
  Component2,
  CpuBolt,
  Database,
  Devices,
  Figma,
  Flame,
  Grid,
  Package,
  TerminalSquare,
} from "reicon-react";

const technologyIcons: Record<string, typeof Atom> = {
  React: Atom,
  TypeScript: CodeSquare,
  "Responsive UI": Devices,
  "Design systems": Component2,
  "D3.js": ChartLine,
  Zustand: Database,
  Figma,
  Python: TerminalSquare,
  PyTorch: Flame,
  CUDA: CpuBolt,
  NumPy: Grid,
  Matplotlib: ChartLine,
  PyPI: Package,
};

export function TechnologyBadge({ technology }: { technology: string }) {
  const Icon = technologyIcons[technology] ?? CodeSquare;

  return (
    <li>
      <Icon aria-hidden="true" />
      <span>{technology}</span>
    </li>
  );
}
