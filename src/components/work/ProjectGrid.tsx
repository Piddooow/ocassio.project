"use client";

import { useRef } from "react";
import type { Project } from "@/lib/content/types";
import { useMediaReveal } from "@/lib/media-reveal";
import { ProjectCard } from "@/components/work/ProjectCard";

interface ProjectGridProps {
  projects: Project[];
  className?: string;
}

/** Editorial project grid (2-up on desktop) with the shared media entrance. */
export function ProjectGrid({ projects, className }: ProjectGridProps) {
  const scope = useRef<HTMLDivElement>(null);

  useMediaReveal(scope, { selector: "[data-work-card]" });

  return (
    <div ref={scope} className={className}>
      <div className="grid grid-cols-1 gap-x-6 gap-y-12 lg:grid-cols-2 lg:gap-y-16">
        {projects.map((project, index) => (
          <ProjectCard
            key={project.slug}
            project={project}
            index={index}
            frameAspect="3 / 2"
          />
        ))}
      </div>
    </div>
  );
}
