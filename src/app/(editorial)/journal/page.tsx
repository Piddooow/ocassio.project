import type { Metadata } from "next";
import { getWiredArticles } from "@/lib/content/live";
import { JournalBrowser } from "@/components/journal/JournalBrowser";
import { StartCTA } from "@/components/site/StartCTA";
import { Reveal } from "@/components/motion/Reveal";

export const metadata: Metadata = {
  title: "Journal",
  description:
    "Project stories, behind the scenes, and studio notes from Ocassio.Project.",
};

export const dynamic = "force-dynamic";

/** Journal feed (§6.9), light, editorial, served from the CMS. */
export default async function JournalPage() {
  const articles = await getWiredArticles();

  return (
    <>
      <header className="container-editorial pb-14 pt-20 lg:pb-20 lg:pt-28">
        <Reveal>
          <p className="text-label uppercase tracking-label-wide text-muted">
            Journal · Notes &amp; Stories
          </p>
          <h1 className="mt-6 max-w-4xl font-display text-display-xl">
            Thinking out loud, <em>in writing</em>
          </h1>
          <p className="mt-6 max-w-xl text-body text-secondary">
            Behind the scenes, project stories, and studio notes from the
            Ocassio.Project team.
          </p>
        </Reveal>
      </header>

      <JournalBrowser articles={articles} />

      <StartCTA />
    </>
  );
}
