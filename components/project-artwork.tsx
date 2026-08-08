import Image from "next/image";

import type { Project } from "@/lib/portfolio";

const cardArtHeight = "h-[13.5rem] max-sm:h-[15rem] max-[420px]:h-[13.5rem]";

export function ProjectArtwork({
  project,
  variant = "card",
}: {
  project: Project;
  variant?: "card" | "detail";
}) {
  const isDetail = variant === "detail";

  if (project.visual.kind === "trainerize") {
    return (
      <div
        data-artwork
        data-project={project.id}
        className={`relative grid place-items-center ${
          isDetail
            ? "h-auto w-full overflow-visible bg-transparent py-2"
            : `${cardArtHeight} overflow-visible bg-[#F2F4F6] pt-6 pb-2 dark:bg-surface`
        }`}
        aria-hidden="true"
      >
        <div className="absolute size-36 rounded-full bg-[rgb(120_98_255/28%)] blur-[45px]" />
        <div
          className={`relative z-[2] overflow-hidden rounded-portfolio border border-white/[0.62] bg-white/[0.88] p-3 shadow-[0_18px_45px_rgb(59_44_105/19%)] transition-transform duration-panel ease-in-out group-hover:scale-[1.04] motion-reduce:transition-none dark:border-white/10 dark:bg-[rgb(31_29_42/91%)] ${isDetail ? "w-full" : "w-[78%]"}`}
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
  const isUnlearningComparator = project.id === "unlearning-comparator";

  const imageSizeClass = isDetail
    ? "h-auto w-full object-contain"
    : isPytorchCka
      ? "h-[78%] w-[68%] object-cover object-[center_18%]"
      : isUnlearningComparator
        ? "h-[78%] w-auto"
        : "h-[72%] w-[77%] object-cover";

  const imageWidth = isUnlearningComparator ? 1727 : isPytorchCka ? 1363 : 680;
  const imageHeight = isUnlearningComparator ? 1080 : isPytorchCka ? 1214 : 480;

  const unlearningShadow =
    "border-0 bg-transparent shadow-[0_16px_40px_rgb(24_38_56/30%),0_4px_14px_rgb(46_88_72/14%)] dark:shadow-[0_16px_40px_rgb(255_255_255/22%),0_4px_14px_rgb(255_255_255/10%)]";

  return (
    <div
      data-artwork
      data-project={project.id}
      className={`relative grid place-items-center ${
        isDetail
          ? "h-auto w-full overflow-visible bg-transparent"
          : isUnlearningComparator
            ? `${cardArtHeight} overflow-visible bg-transparent pt-6 pb-2`
            : `${cardArtHeight} overflow-visible bg-[#F2F4F6] pt-6 pb-2 dark:bg-surface`
      }`}
    >
      {isPytorchCka ? (
        <>
          {!isDetail ? (
            <>
              <div
                className="absolute inset-[12%] opacity-[0.46] blur-[35px] saturate-[130%] dark:hidden"
                aria-hidden="true"
              >
                <Image
                  src="/images/projects/cka_identical_resnet18_black.png"
                  alt=""
                  width={imageWidth}
                  height={imageHeight}
                  className="size-full object-cover"
                  unoptimized
                />
              </div>
              <div
                className="absolute inset-[12%] hidden opacity-[0.46] blur-[35px] saturate-[130%] dark:block"
                aria-hidden="true"
              >
                <Image
                  src="/images/projects/cka_identical_resnet18_white.png"
                  alt=""
                  width={imageWidth}
                  height={imageHeight}
                  className="size-full object-cover"
                  unoptimized
                />
              </div>
            </>
          ) : null}
          <Image
            src="/images/projects/cka_identical_resnet18_black.png"
            alt={project.visual.alt}
            width={imageWidth}
            height={imageHeight}
            sizes={isDetail ? "(max-width: 680px) 100vw, 40rem" : "(max-width: 680px) 86vw, 600px"}
            className={`relative z-[2] rounded-[0.9rem] border-0 shadow-none transition-transform duration-panel ease-in-out group-hover:scale-[1.04] motion-reduce:transition-none dark:hidden ${imageSizeClass}`}
            unoptimized
          />
          <Image
            src="/images/projects/cka_identical_resnet18_white.png"
            alt={project.visual.alt}
            width={imageWidth}
            height={imageHeight}
            sizes={isDetail ? "(max-width: 680px) 100vw, 40rem" : "(max-width: 680px) 86vw, 600px"}
            className={`relative z-[2] hidden rounded-[0.9rem] border-0 shadow-none transition-transform duration-panel ease-in-out group-hover:scale-[1.04] motion-reduce:transition-none dark:block ${imageSizeClass}`}
            unoptimized
          />
        </>
      ) : (
        <>
          {!isUnlearningComparator && !isDetail ? (
            <div
              className="absolute inset-[12%] opacity-[0.46] blur-[35px] saturate-[130%]"
              aria-hidden="true"
            >
              <Image
                src={project.visual.src}
                alt=""
                width={imageWidth}
                height={imageHeight}
                className="size-full object-cover"
                unoptimized={project.visual.unoptimized}
              />
            </div>
          ) : null}
          <Image
            src={project.visual.src}
            alt={project.visual.alt}
            width={imageWidth}
            height={imageHeight}
            sizes={isDetail ? "(max-width: 680px) 100vw, 40rem" : "(max-width: 680px) 86vw, 600px"}
            className={`relative z-[2] rounded-[0.9rem] transition-transform duration-panel ease-in-out group-hover:scale-[1.04] motion-reduce:transition-none ${
              isUnlearningComparator
                ? unlearningShadow
                : isDetail
                  ? "border-0 shadow-none"
                  : "border border-white/[0.38] shadow-[0_18px_42px_rgb(35_30_26/18%)]"
            } ${imageSizeClass}`}
            unoptimized={project.visual.unoptimized}
          />
        </>
      )}
    </div>
  );
}
