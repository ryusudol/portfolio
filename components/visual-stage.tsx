"use client";

import { useEffect, useRef, useState } from "react";

import { ProjectVisual } from "@/components/project-visual";
import { type ProjectId, projects } from "@/lib/projects";

type VisualId = ProjectId | null;

type VisualStageProps = {
  projectsPanelId?: string;
};

export function VisualStage({
  projectsPanelId = "portfolio-panel-projects",
}: VisualStageProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [activeVisual, setActiveVisual] = useState<VisualId>(null);

  useEffect(() => {
    const root = rootRef.current;
    const projectsPanel = document.querySelector<HTMLElement>(
      `#${projectsPanelId}`,
    );
    const projectSections = projects.map((project) =>
      document.querySelector<HTMLElement>(`#${project.id}`),
    );

    if (!root || !projectsPanel) {
      return;
    }

    let frameRequest = 0;
    let lastVisual: VisualId = null;

    const update = () => {
      frameRequest = 0;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const desktop = viewportWidth >= 1024 && viewportHeight >= 700;
      root.dataset.desktop = String(desktop);

      if (!desktop) {
        if (lastVisual !== null) {
          lastVisual = null;
          setActiveVisual(null);
        }
        return;
      }

      const panelRect = projectsPanel.getBoundingClientRect();
      const projectsAreActive =
        window.scrollY > 80 &&
        panelRect.top <= viewportHeight * 0.45 &&
        panelRect.bottom > viewportHeight * 0.2;
      let nextVisual: VisualId = projectsAreActive
        ? (projects[0]?.id ?? null)
        : null;

      if (nextVisual) {
        projectSections.forEach((section, index) => {
          if (
            section &&
            section.getBoundingClientRect().top <= viewportHeight * 0.45
          ) {
            nextVisual = projects[index]?.id ?? nextVisual;
          }
        });
      }

      if (nextVisual !== lastVisual) {
        lastVisual = nextVisual;
        setActiveVisual(nextVisual);
      }
    };

    const scheduleUpdate = () => {
      if (!frameRequest) {
        frameRequest = window.requestAnimationFrame(update);
      }
    };

    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    update();

    return () => {
      window.cancelAnimationFrame(frameRequest);
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, [projectsPanelId]);

  return (
    <div
      ref={rootRef}
      className="visual-stage project-only-stage"
      data-visual-stage=""
      data-active-visual={activeVisual ?? "none"}
      aria-live="off"
    >
      {projects.map((project) => (
        <div
          key={project.id}
          className={`visual-stage-layer project-stage-layer ${
            activeVisual === project.id ? "is-active" : ""
          }`}
          aria-hidden={activeVisual !== project.id}
        >
          <ProjectVisual project={project} eager />
        </div>
      ))}
    </div>
  );
}
