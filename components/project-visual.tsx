import Image from "next/image";

import type { Project } from "@/lib/projects";
import { cn } from "@/lib/utils";

type ProjectVisualProps = {
  project: Project;
  className?: string;
  eager?: boolean;
};

const profileStats = [
  {
    label: "Workouts",
    value: "18",
    detail: "This month",
  },
  {
    label: "Habits",
    value: "86%",
    detail: "On track",
  },
  {
    label: "Check-ins",
    value: "12",
    detail: "Current streak",
  },
] as const;

function TrainerizeVisual({ project }: { project: Project }) {
  return (
    <div className="project-visual-shell trainerize-visual">
      <div className="trainerize-topbar">
        <span className="trainerize-mark">T</span>
        <strong>Trainerize</strong>
        <span className="trainerize-context">Client profile</span>
      </div>
      <div className="trainerize-profile-card">
        <div className="trainerize-avatar" aria-hidden="true">
          SY
        </div>
        <div className="trainerize-profile-copy">
          <span className="visual-kicker">Active client</span>
          <strong>Suhyeon Yu</strong>
          <small>Strength · Mobility · 4 sessions / week</small>
        </div>
        <span className="trainerize-edit-profile" aria-hidden="true">
          Edit profile
        </span>
      </div>
      <div className="trainerize-stat-grid" aria-hidden="true">
        {profileStats.map((stat) => (
          <div key={stat.label}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
            <small>{stat.detail}</small>
          </div>
        ))}
      </div>
      <div className="trainerize-lower-grid" aria-hidden="true">
        <div className="trainerize-progress-card">
          <div>
            <span>Weekly progress</span>
            <strong>4 of 5 goals</strong>
          </div>
          <div className="trainerize-progress-ring">
            <span>80%</span>
          </div>
        </div>
        <div className="trainerize-coach-card">
          <span>Coach note</span>
          <p>Great consistency this week. Let’s build on your current pace.</p>
          <small>Updated today</small>
        </div>
      </div>
      <div className="trainerize-activity" aria-hidden="true">
        <span>Today</span>
        <div>
          <i />
          <p>
            <strong>Upper body strength</strong>
            <small>45 min · Completed</small>
          </p>
          <span>✓</span>
        </div>
        <div>
          <i />
          <p>
            <strong>Daily mobility</strong>
            <small>10 min · Next up</small>
          </p>
          <span>→</span>
        </div>
      </div>
      <span className="visual-provenance">
        {project.visual.kind === "trainerize" ? project.visual.label : null}
      </span>
    </div>
  );
}

function DashboardVisual({
  project,
  eager,
}: {
  project: Project;
  eager: boolean;
}) {
  if (project.visual.kind !== "image") {
    return null;
  }

  return (
    <div className="project-visual-shell dashboard-visual">
      <div className="visual-browser-bar" aria-hidden="true">
        <span />
        <span />
        <span />
        <small>unlearning-comparator / analysis</small>
      </div>
      <div className="dashboard-image-wrap">
        <Image
          src={project.visual.src}
          alt=""
          fill
          loading={eager ? "eager" : "lazy"}
          unoptimized
          sizes="(min-width: 1024px) 40vw, 92vw"
          className="object-contain"
        />
      </div>
      <span className="visual-provenance">{project.visual.label}</span>
    </div>
  );
}

function CkaVisual({ project, eager }: { project: Project; eager: boolean }) {
  if (project.visual.kind !== "cka-composite") {
    return null;
  }

  return (
    <div className="project-visual-shell cka-visual">
      <div className="cka-heading">
        <div>
          <span className="visual-kicker">Representation analysis</span>
          <strong>ResNet-18 · CIFAR-10</strong>
        </div>
        <span>CKA / 01</span>
      </div>
      <div className="cka-benchmark">
        <Image
          src={project.visual.lightSrc}
          alt=""
          width={975}
          height={208}
          loading={eager ? "eager" : "lazy"}
          sizes="(min-width: 1024px) 36vw, 88vw"
          className="h-auto w-full object-contain dark:hidden"
        />
        <Image
          src={project.visual.darkSrc}
          alt=""
          width={975}
          height={208}
          loading={eager ? "eager" : "lazy"}
          sizes="(min-width: 1024px) 36vw, 88vw"
          className="hidden h-auto w-full object-contain dark:block"
        />
      </div>
      <div className="cka-heatmap">
        <Image
          src={project.visual.heatmapSrc}
          alt=""
          width={1362}
          height={1214}
          loading={eager ? "eager" : "lazy"}
          sizes="(min-width: 1024px) 30vw, 76vw"
          className="size-full object-contain"
        />
      </div>
      <span className="visual-provenance">{project.visual.label}</span>
    </div>
  );
}

export function ProjectVisual({
  project,
  className,
  eager = false,
}: ProjectVisualProps) {
  return (
    <div
      className={cn("project-visual", className)}
      role="img"
      aria-label={project.visual.alt}
      data-project-visual={project.id}
    >
      {project.visual.kind === "trainerize" ? (
        <TrainerizeVisual project={project} />
      ) : null}
      {project.visual.kind === "image" ? (
        <DashboardVisual project={project} eager={eager} />
      ) : null}
      {project.visual.kind === "cka-composite" ? (
        <CkaVisual project={project} eager={eager} />
      ) : null}
    </div>
  );
}
