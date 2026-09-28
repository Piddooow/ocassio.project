"use client";

import type { Project } from "@/lib/content/types";
import { MediaMasonry } from "@/components/media/media-masonry";
import { ProjectCard } from "@/components/work/ProjectCard";

/** Client wrapper so the Home page (server) can use the masonry grid. */
export function SelectedWorkGrid({ projects }: { projects: Project[] }) {
  return (
    <MediaMasonry
      items={projects}
      className="mt-12"
      columnsClassName="columns-1 sm:columns-2"
      label="Selected work"
      getKey={(project) => project.slug}
      renderItem={(project, index) => (
        <ProjectCard project={project} index={index} />
      )}
    />
  );
}
