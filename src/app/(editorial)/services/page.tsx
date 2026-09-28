import type { Metadata } from "next";
import { getWiredServices } from "@/lib/content/live";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Reveal } from "@/components/motion/Reveal";
import { RevealGroup } from "@/components/ui/RevealGroup";
import { ServiceCard } from "@/components/services/ServiceCard";
import { CategoryList } from "@/components/services/CategoryList";
import { StartCTA } from "@/components/site/StartCTA";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Photography, film, and production services from Ocassio.Project, quoted per project scope.",
};

export const dynamic = "force-dynamic";

/** Services (§6.4), light, structured, editorial, served from the CMS. */
export default async function ServicesPage() {
  const wired = await getWiredServices();
  const services = wired.map((entry) => entry.service);

  return (
    <>
      <header
        data-section="header"
        className="container-editorial pb-14 pt-20 lg:pb-20 lg:pt-28"
      >
        <Reveal>
          <p className="text-label uppercase tracking-label-wide text-muted">
            Services
          </p>
          <h1 className="mt-6 max-w-4xl font-display text-display-xl">
            What the studio <em>does</em>
          </h1>
          <p className="mt-6 max-w-xl text-body text-secondary">
            Photography and film for weddings, celebrations, portraits, and
            commissioned stories. Every engagement is quoted per project, so
            the scope fits the work rather than a package.
          </p>
        </Reveal>
      </header>

      <section data-section="services" className="container-editorial pb-10">
        {wired.length > 0 ? (
          <>
            <Reveal>
              <div data-section="service-index" className="mb-12 lg:mb-16">
                <CategoryList
                  items={services.map((service) => ({
                    slug: service.slug,
                    title: service.name,
                    description: service.shortDescription,
                    serviceType: service.serviceType,
                  }))}
                />
              </div>
            </Reveal>
            <RevealGroup variant="media" itemSelector="[data-service-card]">
              <div className="grid grid-cols-1 gap-x-6 gap-y-14 lg:grid-cols-2 lg:gap-y-20">
                {wired.map((entry, index) => (
                  <ServiceCard
                    key={entry.service.slug}
                    service={entry.service}
                    index={index}
                    coverProject={entry.coverProject}
                    relatedTitles={entry.relatedTitles}
                  />
                ))}
              </div>
            </RevealGroup>
          </>
        ) : (
          <div className="border-t border-line py-20 text-center">
            <p className="font-display text-display-sm">
              Services are being prepared.
            </p>
            <p className="mx-auto mt-2 max-w-md text-body-sm text-secondary">
              The studio is writing these pages now. In the meantime, the
              archive shows the work.
            </p>
            <div className="mt-8 flex justify-center">
              <ButtonLink href="/work" variant="secondary" arrow>
                Browse the archive
              </ButtonLink>
            </div>
          </div>
        )}
      </section>

      <StartCTA
        title="Not sure where your project fits?"
        description="Send the brief anyway. The studio will point you to the right service and scope it with you."
      />
    </>
  );
}
