import Image from "next/image";

import type { Project } from "@/lib/portfolio";

const cardArtHeight = "h-[13.5rem] max-sm:h-[15rem] max-[420px]:h-[13.5rem]";
const detailArtHeight = "h-96 max-sm:h-72 max-[420px]:h-56";

export function ProjectArtwork({
  project,
  variant = "card",
}: {
  project: Project;
  variant?: "card" | "detail";
}) {
  const heightClass = variant === "detail" ? detailArtHeight : cardArtHeight;

  if (project.visual.kind === "trainerize") {
    return (
      <div
        data-artwork
        data-project={project.id}
        className={`relative grid ${heightClass} place-items-center overflow-hidden bg-[radial-gradient(circle_at_75%_15%,rgb(125_113_255/26%),transparent_42%),radial-gradient(circle_at_10%_90%,rgb(255_137_76/22%),transparent_46%),#f5f2ff] dark:bg-[radial-gradient(circle_at_75%_15%,rgb(125_113_255/24%),transparent_42%),radial-gradient(circle_at_10%_90%,rgb(255_137_76/18%),transparent_46%),#211f2e]`}
        aria-hidden="true"
      >
        <div className="absolute size-36 rounded-full bg-[rgb(120_98_255/28%)] blur-[45px]" />
        <div
          className={`relative z-[2] overflow-hidden rounded-portfolio border border-white/[0.62] bg-white/[0.88] p-3 shadow-[0_18px_45px_rgb(59_44_105/19%)] transition-transform duration-[220ms] ease-in-out group-hover:scale-[1.025] group-hover:-rotate-[0.4deg] dark:border-white/10 dark:bg-[rgb(31_29_42/91%)] ${variant === "detail" ? "w-[62%] max-sm:w-[72%]" : "w-[78%]"}`}
        >
          <div className="flex items-center gap-[0.35rem]">
            <span className="grid size-[1.4rem] place-items-center rounded-[0.45rem] bg-gradient-to-br from-[#ff875f] to-[#7758ff] text-[0.68rem] font-[750] text-white">
              T
            </span>
            <span className="h-[0.3rem] w-[2.2rem] rounded-full bg-[#dfdbe8] dark:bg-[#4b4658]" />
            <span className="h-[0.3rem] w-[2.2rem] rounded-full bg-[#dfdbe8] dark:bg-[#4b4658]" />
          </div>
          <div className="my-[0.9rem] flex items-center gap-[0.55rem]">
            <i className="size-[2.2rem] rounded-full bg-gradient-to-br from-[#f5c4a7] to-[#b698ee]" />
            <div className="grid flex-1 gap-[0.35rem]">
              <span className="h-[0.38rem] w-[72%] rounded-full bg-[#c8c3d0] dark:bg-[#5b5568]" />
              <span className="h-[0.38rem] w-[48%] rounded-full bg-[#e0dce5] dark:bg-[#403b4a]" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-[0.4rem]">
            <span className="h-[2.4rem] rounded-[0.5rem] bg-[#f0edf5] dark:bg-[#302c38]" />
            <span className="h-[2.4rem] rounded-[0.5rem] bg-[#f0edf5] dark:bg-[#302c38]" />
            <span className="h-[2.4rem] rounded-[0.5rem] bg-[#f0edf5] dark:bg-[#302c38]" />
          </div>
        </div>
      </div>
    );
  }

  const isPytorchCka = project.id === "pytorch-cka";

  const imageSizeClass =
    variant === "detail"
      ? isPytorchCka
        ? "h-[78%] w-[58%]"
        : "h-[76%] w-[78%]"
      : isPytorchCka
        ? "h-[78%] w-[68%] object-[center_18%]"
        : "h-[72%] w-[77%]";

  return (
    <div
      data-artwork
      data-project={project.id}
      className={`relative grid ${heightClass} place-items-center overflow-hidden bg-[color-mix(in_srgb,var(--color-surface)_66%,var(--color-background))]`}
    >
      <div
        className="absolute inset-[12%] opacity-[0.46] blur-[35px] saturate-[130%]"
        aria-hidden="true"
      >
        <Image
          src={project.visual.src}
          alt=""
          width={680}
          height={480}
          className="size-full object-cover"
          unoptimized={project.visual.unoptimized}
        />
      </div>
      <Image
        src={project.visual.src}
        alt={project.visual.alt}
        width={680}
        height={480}
        sizes="(max-width: 680px) 86vw, 600px"
        className={`relative z-[2] rounded-[0.9rem] border border-white/[0.38] object-cover shadow-[0_18px_42px_rgb(35_30_26/18%)] transition-transform duration-[220ms] ease-in-out group-hover:scale-[1.025] motion-reduce:transition-none ${imageSizeClass}`}
        unoptimized={project.visual.unoptimized}
      />
    </div>
  );
}
