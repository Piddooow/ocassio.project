import Link from "next/link";
import type { UpcomingProject } from "@/lib/content/upcoming";
import { MediaPlaceholder } from "@/components/ui/MediaPlaceholder";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Reveal } from "@/components/motion/Reveal";

interface CurrentlySectionProps {
  project: UpcomingProject;
}

const STATUS_LABEL: Record<UpcomingProject["status"], string> = {
  in_production: "In Production",
  coming_soon: "Coming Soon",
};

/** 09 Currently / Coming Soon, dark by default (§31.14, §6.11). */
export function CurrentlySection({ project }: CurrentlySectionProps) {
  return (
    <section
      data-section="currently"
      className="border-t border-line text-primary"
    >
      <div className="container-editorial py-20 lg:py-28">
        <SectionHeader
          label="Currently"
          title={
            <>
              In the <em>works</em>
            </>
          }
          action={{ label: "Now & coming soon", href: "/now" }}
        />

        <Reveal className="mt-12">
          <Link href="/now" className="group block">
            <div className="grid items-center gap-10 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <MediaPlaceholder
                  aspect={project.cover.aspect}
                  label={project.cover.label}
                  mediaClassName="transition-transform duration-1000 ease-out group-hover:scale-[1.02]"
                />
              </div>
              <div className="lg:col-span-5">
                <span className="inline-flex items-center rounded-pill border border-line-strong px-3 py-1 text-label uppercase tracking-label-wide text-secondary">
                  {STATUS_LABEL[project.status]}
                </span>
                <h3 className="mt-5 font-display text-display-md">
                  {project.title}
                </h3>
                <p className="mt-2 text-caption text-muted">
                  {project.projectType}, {project.location} · Expected{" "}
                  {project.expectedRelease}
                </p>
                <p className="mt-5 max-w-md text-body-sm text-secondary">
                  {project.teaser}
                </p>
                <span className="mt-6 inline-flex items-center gap-2 text-button font-medium text-primary">
                  Follow the progress
                  <span
                    aria-hidden
                    className="transition-transform duration-300 group-hover:translate-x-1"
                  >
                    →
                  </span>
                </span>
              </div>
            </div>
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
