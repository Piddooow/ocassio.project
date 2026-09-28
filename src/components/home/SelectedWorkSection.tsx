import type { Project } from "@/lib/content/types";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { SelectedWorkGrid } from "./SelectedWorkGrid";

interface SelectedWorkSectionProps {
  projects: Project[];
}

/** 02 Selected Work, dark, immersive (§31.14). 4-6 projects (§6.1). */
export function SelectedWorkSection({ projects }: SelectedWorkSectionProps) {
  return (
    <section
      data-section="selected-work"
      className="border-t border-line text-primary"
    >
      <div className="container-editorial py-20 lg:py-28">
        <SectionHeader
          label="Selected Work"
          title={
            <>
              Recent <em>commissions</em>
            </>
          }
          action={{ label: "View all work", href: "/work" }}
        />
        <SelectedWorkGrid projects={projects} />
      </div>
    </section>
  );
}
