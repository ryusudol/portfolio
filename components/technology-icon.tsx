import type { ReactNode } from "react";
import { Devices, Palette } from "reicon-react";

const iconPaths: Record<string, string> = {
  AWS: "/images/technologies/aws.svg",
  CUDA: "/images/technologies/cuda.svg",
  "D3.js": "/images/technologies/d3.svg",
  Docker: "/images/technologies/docker.svg",
  Figma: "/images/technologies/figma.svg",
  "Next.js": "/images/technologies/nextjs.svg",
  "Node.js": "/images/technologies/nodejs.svg",
  PostgreSQL: "/images/technologies/postgresql.svg",
  PyTorch: "/images/technologies/pytorch.svg",
  Python: "/images/technologies/python.svg",
  React: "/images/technologies/react.svg",
  "TanStack Query": "/images/technologies/tanstack-query.svg",
  "Tailwind CSS": "/images/technologies/tailwindcss.svg",
  TypeScript: "/images/technologies/typescript.svg",
  Zustand: "/images/technologies/zustand.svg",
};

export function TechnologyIcon({
  name,
  className = "",
}: {
  name: string;
  className?: string;
}) {
  let icon: ReactNode = null;

  if (name === "Responsive UI") {
    icon = <Devices style={{ color: "#4f8cff" }} />;
  } else if (name === "Design systems") {
    icon = <Palette style={{ color: "#e265a7" }} />;
  } else {
    const src = iconPaths[name];
    if (src) {
      icon = (
        // biome-ignore lint/performance/noImgElement: these are tiny local SVG marks that do not benefit from image optimization
        <img src={src} alt="" width="40" height="40" />
      );
    }
  }

  if (!icon) return null;

  return (
    <span
      className={`technology-logo ${className}`.trim()}
      data-technology-icon={name}
      aria-hidden="true"
    >
      {icon}
    </span>
  );
}
