import Image from "next/image";

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
  Redux: "/images/technologies/redux.svg",
  RxJS: "/images/technologies/rxjs.svg",
  SCSS: "/images/technologies/scss.svg",
  "TanStack Query": "/images/technologies/tanstack-query.svg",
  "Tailwind CSS": "/images/technologies/tailwindcss.svg",
  TypeScript: "/images/technologies/typescript.svg",
  Zustand: "/images/technologies/zustand.svg",
};

interface TechnologyIcon {
  name: string;
  className?: string;
}

export function TechnologyIcon({ name, className = "" }: TechnologyIcon) {
  const src = iconPaths[name];
  if (!src) return null;

  const nextJsStyles =
    name === "Next.js" ? "rounded-full bg-white p-[0.06em]" : "";
  // Figma's tall viewBox fills the square and reads oversized next to mark icons.
  const imageClassName =
    name === "Figma" ? "size-[78%] object-contain" : "size-full object-contain";

  return (
    <span
      className={`inline-grid place-items-center ${nextJsStyles} ${className}`.trim()}
      data-technology-icon={name}
      data-testid="technology-icon"
      aria-hidden="true"
    >
      <Image
        src={src}
        alt=""
        width={40}
        height={40}
        className={imageClassName}
      />
    </span>
  );
}
