import type { Metadata } from "next";
import { ProjectsPanel } from "@/components/admin/ProjectsPanel";

export const metadata: Metadata = { title: "Projects" };

/** Admin → Portfolio → Projects (§11, §12). */
export default function AdminProjectsPage() {
  return (
    <>
      <h1 className="font-display text-display-sm">Projects</h1>
      <p className="mt-2 max-w-2xl text-body-sm text-secondary">
        The portfolio case studies. Editorial fields, credits, relations,
        attached uploads, SEO, and publishing all live here; the media
        pipeline keeps supplying the existing galleries.
      </p>
      <div className="mt-8">
        <ProjectsPanel />
      </div>
    </>
  );
}
