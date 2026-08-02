import Image from "next/image";

import type { Project } from "@/lib/portfolio";

export function ProjectArtwork({ project }: { project: Project }) {
  if (project.visual.kind === "trainerize") {
    return (
      <div className="project-art trainerize-art" aria-hidden="true">
        <div className="trainerize-glow" />
        <div className="trainerize-window">
          <div className="trainerize-window-top">
            <span className="trainerize-mark">T</span>
            <span />
            <span />
          </div>
          <div className="trainerize-profile-row">
            <i />
            <div>
              <span />
              <span />
            </div>
          </div>
          <div className="trainerize-stat-row">
            <span />
            <span />
            <span />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`project-art project-art--${project.id}`}>
      <div className="project-image-glow" aria-hidden="true">
        <Image
          src={project.visual.src}
          alt=""
          width={680}
          height={480}
          unoptimized={project.visual.unoptimized}
        />
      </div>
      <Image
        src={project.visual.src}
        alt={project.visual.alt}
        width={680}
        height={480}
        sizes="(max-width: 680px) 86vw, 600px"
        className="project-image"
        unoptimized={project.visual.unoptimized}
      />
    </div>
  );
}
