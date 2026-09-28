import { Fragment, type ReactNode } from "react";
import { getPublishedProjects } from "@/lib/content/queries";
import { getStudioPhoto } from "@/lib/content/media";
import { listPublicHomepageSections } from "@/lib/db/queries/homepage-admin";
import {
  getWiredArticles,
  getWiredClients,
  getWiredRecognition,
  getWiredServices,
  getWiredUpcomingEntries,
} from "@/lib/content/live";
import { HeroSection } from "@/components/home/HeroSection";
import { SelectedWorkSection } from "@/components/home/SelectedWorkSection";
import { IntroductionSection } from "@/components/home/IntroductionSection";
import { FeaturedProjectSection } from "@/components/home/FeaturedProjectSection";
import { ServicesSection } from "@/components/home/ServicesSection";
import { ShowreelSection } from "@/components/home/ShowreelSection";
import { ProcessSection } from "@/components/home/ProcessSection";
import { ClientsSection } from "@/components/home/ClientsSection";
import { CurrentlySection } from "@/components/home/CurrentlySection";
import { JournalSection } from "@/components/home/JournalSection";
import { ReviewsSection } from "@/components/home/ReviewsSection";
import { StartCTA } from "@/components/site/StartCTA";

const SELECTED_WORK_COUNT = 4;
const JOURNAL_PREVIEW_COUNT = 3;

export const dynamic = "force-dynamic";

/**
 * Home (§6.1), 11 sections in the documented order. Services, journal,
 * clients, recognition, and current entries come from the CMS; the
 * project sections still resolve media statically until the Portfolio
 * schema lands.
 */
export default async function HomePage() {
  const [projects, wiredServices, articles, upcoming, clients, recognition, homepageConfig] =
    await Promise.all([
      getPublishedProjects(),
      getWiredServices(),
      getWiredArticles(JOURNAL_PREVIEW_COUNT),
      getWiredUpcomingEntries(),
      getWiredClients(),
      getWiredRecognition(),
      listPublicHomepageSections(),
    ]);

  const services = wiredServices.map((entry) => entry.service);
  const selected = projects.slice(0, SELECTED_WORK_COUNT);
  const featured = projects[0];
  const journal = articles.slice(0, JOURNAL_PREVIEW_COUNT);
  const current = upcoming[0];
  const studioHero = getStudioPhoto("hero-1");

  /** One node per documented section key (§10.1 registry). */
  const sectionNodes: Record<string, ReactNode> = {
    hero: (
      <HeroSection
        photo={studioHero ?? featured?.photos[0] ?? null}
        poster={featured?.videos[0]?.poster ?? null}
        alt={
          studioHero
            ? "A printed magazine spread of black and white portraits, held open"
            : featured
              ? `${featured.title}, lead photograph`
              : "Ocassio.Project"
        }
      />
    ),
    selected_work:
      selected.length > 0 ? (
        <SelectedWorkSection projects={selected} />
      ) : null,
    introduction: <IntroductionSection />,
    featured_project: featured ? (
      <FeaturedProjectSection project={featured} />
    ) : null,
    services: <ServicesSection services={services} />,
    showreel: <ShowreelSection />,
    process: <ProcessSection />,
    clients_recognition:
      clients.length > 0 || recognition.length > 0 ? (
        <ClientsSection clients={clients} recognition={recognition} />
      ) : null,
    currently: current ? <CurrentlySection project={current} /> : null,
    journal: <JournalSection articles={journal} />,
    final_cta: <StartCTA celebrate />,
  };

  return (
    <>
      {homepageConfig.map((section) =>
        section.key === "final_cta" ? (
          <Fragment key="final_cta">
            {/* Reviews (studio request) sits ahead of the closing CTA. */}
            <ReviewsSection />
            {sectionNodes.final_cta}
          </Fragment>
        ) : (
          <Fragment key={section.key}>
            {sectionNodes[section.key] ?? null}
          </Fragment>
        ),
      )}
    </>
  );
}
