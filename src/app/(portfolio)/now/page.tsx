import type { Metadata } from "next";
import { getPublishedProjects } from "@/lib/content/queries";
import { getWiredUpcomingEntries } from "@/lib/content/live";
import { listPublicNowEntries } from "@/lib/db/queries/upcoming";
import { Reveal } from "@/components/motion/Reveal";
import { RevealGroup } from "@/components/ui/RevealGroup";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { UpcomingCard } from "@/components/now/UpcomingCard";
import { NowSpiral } from "@/components/now/NowSpiral";
import { StartCTA } from "@/components/site/StartCTA";

export const metadata: Metadata = {
  title: "Now",
  description:
    "Selected studio activity currently in production, and what is coming next from Ocassio.Project.",
};

export const dynamic = "force-dynamic";

/** Now (§6.11), dark, selected studio activity in progress, from the CMS. */
export default async function NowPage() {
  const [entries, projects, nowEntries] = await Promise.all([
    getWiredUpcomingEntries(),
    getPublishedProjects(),
    listPublicNowEntries(),
  ]);
  const projectBySlug = new Map(
    projects.map((project) => [project.slug, project]),
  );
  const spiralEntries = nowEntries.filter((entry) => entry.image);

  return (
    <>
      <header
        data-section="header"
        className="container-editorial pb-14 pt-20 lg:pb-20 lg:pt-28"
      >
        <Reveal>
          <p className="text-label uppercase tracking-label-wide text-muted">
            Now · In Production &amp; Coming Soon
          </p>
          <h1 className="mt-6 max-w-4xl font-display text-display-xl">
            What we are <em>making</em> right now
          </h1>
          <p className="mt-6 max-w-xl text-body text-secondary">
            Selected studio activity that is currently in progress, shared
            while it is still becoming.
          </p>
        </Reveal>
      </header>

      {spiralEntries.length >= 3 ? (
        <section data-section="spiral" className="container-editorial pb-12">
          <div className="h-[440px] sm:h-[520px]">
            <NowSpiral entries={spiralEntries} />
          </div>
        </section>
      ) : null}

      <section data-section="entries" className="container-editorial pb-10">
        {entries.length > 0 ? (
          <RevealGroup
            itemSelector=".now-entry"
            className="flex flex-col gap-16 lg:gap-24"
            stagger={0.1}
          >
            {entries.map((entry, index) => {
              const related = entry.relatedProjectSlug
                ? projectBySlug.get(entry.relatedProjectSlug)
                : undefined;
              return (
                <UpcomingCard
                  key={entry.slug}
                  entry={entry}
                  index={index}
                  relatedHref={related ? `/work/${related.slug}` : undefined}
                />
              );
            })}
          </RevealGroup>
        ) : (
          <div className="border-t border-line py-24 text-center">
            <p className="font-display text-display-sm">
              Nothing public right now.
            </p>
            <p className="mx-auto mt-2 max-w-md text-body-sm text-secondary">
              New work in progress is shared here as soon as it can be
              announced. In the meantime, the archive is open.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <ButtonLink href="/start-project" variant="primary">
                Start a Project
              </ButtonLink>
              <ButtonLink href="/work" variant="secondary">
                View Work
              </ButtonLink>
            </div>
          </div>
        )}
      </section>

      <StartCTA
        title="Want to be next in line?"
        description="Tell us about your project, we will review your brief and get back to you."
      />
    </>
  );
}
