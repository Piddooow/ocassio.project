import type { Metadata } from "next";
import { getPublishedProjects } from "@/lib/content/queries";
import { WORK_FILTERS, type WorkFilter } from "@/lib/content/types";
import { WorkBrowser } from "@/components/work/WorkBrowser";
import { StartCTA } from "@/components/site/StartCTA";
import { Reveal } from "@/components/motion/Reveal";

export const metadata: Metadata = {
  title: "Work",
  description:
    "Selected photography, film, and commercial projects by Ocassio.Project.",
};

interface WorkPageProps {
  searchParams: Promise<{ filter?: string | string[] }>;
}

export default async function WorkPage({ searchParams }: WorkPageProps) {
  const projects = await getPublishedProjects();
  const params = await searchParams;
  const raw = Array.isArray(params.filter) ? params.filter[0] : params.filter;
  const initialFilter: WorkFilter =
    WORK_FILTERS.find((option) => option === raw) ?? "All";

  return (
    <>
      <header className="container-editorial pb-14 pt-20 lg:pb-20 lg:pt-28">
        <Reveal>
          <p className="text-label uppercase tracking-label-wide text-muted">
            Portfolio · All Work
          </p>
          <h1 className="mt-6 max-w-4xl font-display text-display-xl">
            Selected work: <em>still &amp; motion</em>
          </h1>
          <p className="mt-6 max-w-xl text-body text-secondary">
            Photography and film made with care for light, texture, and story.
            Filter by discipline, or browse the full archive.
          </p>
        </Reveal>
      </header>

      <WorkBrowser projects={projects} initialFilter={initialFilter} />

      <StartCTA />
    </>
  );
}
