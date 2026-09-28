import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PRICE_TYPE_LABEL } from "@/lib/content/pricing";
import { getWiredProcessSteps, getWiredServiceBySlug } from "@/lib/content/live";
import { getServiceSeo } from "@/lib/db/queries/seo";
import { InlineText } from "@/components/content/InlineText";
import { RealImage, FadeImg } from "@/components/media/RealImage";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Reveal } from "@/components/motion/Reveal";
import { RevealGroup } from "@/components/ui/RevealGroup";
import { ProjectGrid } from "@/components/work/ProjectGrid";
import { StartCTA } from "@/components/site/StartCTA";

interface ServicePageProps {
  params: Promise<{ slug: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: ServicePageProps): Promise<Metadata> {
  const { slug } = await params;
  const [data, seo] = await Promise.all([
    getWiredServiceBySlug(slug),
    getServiceSeo(slug),
  ]);
  if (!data) return { title: "Service not found" };
  return {
    title: seo?.seoMetaTitle ?? data.wired.service.name,
    description: seo?.seoMetaDescription ?? data.wired.service.shortDescription,
    ...(seo?.ogImage ? { openGraph: { images: [seo.ogImage] } } : {}),
  };
}

const PROCESS_PREVIEW_COUNT = 4;

/** Service Detail (§6.5), light, editorial, one service per page, from the CMS. */
export default async function ServiceDetailPage({ params }: ServicePageProps) {
  const { slug } = await params;
  const data = await getWiredServiceBySlug(slug);
  if (!data) notFound();

  const { wired, pricing } = data;
  const { service, coverProject, relatedProjects } = wired;
  const coverPhoto = coverProject?.photos[0] ?? null;
  const coverFilm = coverProject?.videos[0] ?? null;
  const processPreview = (await getWiredProcessSteps()).slice(
    0,
    PROCESS_PREVIEW_COUNT,
  );

  return (
    <>
      <section
        data-section="hero"
        className="container-editorial pb-10 pt-20 lg:pb-14 lg:pt-28"
      >
        <Reveal>
          <p className="text-label uppercase tracking-label-wide text-muted">
            Service
          </p>
          <h1 className="mt-6 max-w-4xl font-display text-display-xl">
            {service.name}
          </h1>
          <p className="mt-6 max-w-xl text-body text-secondary">
            {service.shortDescription}
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <ButtonLink href="/start-project" variant="primary">
              Start a Project
            </ButtonLink>
            <ButtonLink href="/pricing" variant="secondary">
              See pricing
            </ButtonLink>
          </div>
        </Reveal>
        {coverPhoto || coverFilm?.poster ? (
          <Reveal variant="media" className="mt-12">
            <div className="container-editorial">
              {coverPhoto ? (
                <RealImage
                  photo={coverPhoto}
                  sizes="(max-width: 1200px) 100vw, 1200px"
                  aspectOverride="21 / 9"
                  imgClassName="media-color-reveal"
                  alt={`${service.name}, work sample`}
                />
              ) : (
                <FadeImg
                  src={coverFilm?.poster ?? null}
                  aspect="21 / 9"
                  imgClassName="media-color-reveal"
                  alt={`${service.name}, work sample`}
                />
              )}
            </div>
          </Reveal>
        ) : null}
      </section>

      {service.description.length > 0 ? (
        <section
          data-section="description"
          className="container-editorial py-10 lg:py-14"
        >
          <Reveal>
            <div className="mx-auto flex max-w-2xl flex-col gap-5">
              {service.description.map((paragraph, index) => (
                <p key={index} className="text-body text-secondary">
                  <InlineText value={paragraph} />
                </p>
              ))}
            </div>
          </Reveal>
        </section>
      ) : null}

      {service.whoItIsFor.length > 0 ? (
        <section
          data-section="audience"
          className="container-editorial py-10 lg:py-14"
        >
          <Reveal>
            <div className="mx-auto grid max-w-4xl gap-8 lg:grid-cols-2 lg:gap-20">
              <h2 className="font-display text-display-sm">Who this is for</h2>
              <ul className="flex flex-col gap-3">
                {service.whoItIsFor.map((line) => (
                  <li key={line} className="text-body-sm text-secondary">
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </section>
      ) : null}

      {service.deliverables.length > 0 ? (
        <section
          data-section="deliverables"
          className="container-editorial py-10 lg:py-14"
        >
          <Reveal>
            <div className="mx-auto grid max-w-4xl gap-8 lg:grid-cols-2 lg:gap-20">
              <h2 className="font-display text-display-sm">What we deliver</h2>
              <ul className="flex flex-col">
                {service.deliverables.map((item) => (
                  <li
                    key={item}
                    className="border-b border-line py-4 text-body-sm text-secondary last:border-0"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </section>
      ) : null}

      <section
        data-section="work"
        className="container-editorial border-t border-line py-16 lg:py-24"
      >
        <SectionHeader
          label="Selected Work"
          title={
            <>
              Recent <em>commissions</em>
            </>
          }
          action={{ label: "All work", href: "/work" }}
        />
        {relatedProjects.length > 0 ? (
          <ProjectGrid projects={relatedProjects} className="mt-12" />
        ) : (
          <p className="mt-8 max-w-xl text-body text-secondary">
            Work for this service is being prepared for the site. The archive
            shows what the studio has been making lately.
          </p>
        )}
      </section>

      {processPreview.length > 0 ? (
        <section
          data-section="process"
          className="container-editorial border-t border-line py-16 lg:py-24"
        >
          <SectionHeader
            label="Process"
            title={
              <>
                How it <em>runs</em>
              </>
            }
            action={{ label: "Full process", href: "/process" }}
          />
          <RevealGroup className="mt-12" itemSelector=".service-process-step">
            <ol className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
              {processPreview.map((step, index) => (
                <li
                  key={`${step.number}-${index}`}
                  className="service-process-step"
                >
                  <span className="font-display text-display-lg text-muted">
                    {step.number}
                  </span>
                  <h3 className="mt-4 text-title-sm font-medium">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-body-sm text-secondary">
                    {step.explanation}
                  </p>
                </li>
              ))}
            </ol>
          </RevealGroup>
        </section>
      ) : null}

      {pricing.length > 0 ? (
        <section
          data-section="pricing"
          className="container-editorial border-t border-line py-16 lg:py-24"
        >
          <SectionHeader
            label="Pricing Preview"
            title={
              <>
                What it <em>includes</em>
              </>
            }
            action={{ label: "Full pricing", href: "/pricing" }}
          />
          <div className="mt-10 flex flex-col">
            {pricing.map((entry) => (
              <div
                key={entry.id}
                data-pricing-entry={entry.id}
                className="grid gap-6 border-b border-line py-8 lg:grid-cols-12 lg:gap-10"
              >
                <div className="lg:col-span-4">
                  <h3 className="font-display text-display-sm">
                    {entry.packageName}
                  </h3>
                  <p className="mt-2 text-caption text-muted">
                    {PRICE_TYPE_LABEL[entry.priceType]}
                    {entry.duration ? ` · ${entry.duration}` : ""}
                  </p>
                </div>
                <ul className="flex flex-col gap-2 lg:col-span-5">
                  {entry.deliverables.map((item) => (
                    <li key={item} className="text-body-sm text-secondary">
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="lg:col-span-3 lg:text-right">
                  <p className="text-body-sm font-medium text-primary">
                    Quote on request
                  </p>
                  {entry.notes ? (
                    <p className="mt-2 text-caption text-muted">
                      {entry.notes}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-6 text-caption text-muted">
            Numbers are published per project once scope, location, and usage
            are known.{" "}
            <Link
              href="/start-project"
              className="text-secondary underline underline-offset-4 transition-colors duration-300 hover:text-primary"
            >
              Send a brief for a quote
            </Link>
            .
          </p>
        </section>
      ) : null}

      <StartCTA
        title={`Start a ${service.name} project`}
        description="Tell the studio what you are making. Every brief gets a reply with next steps and a clear quote."
      />
    </>
  );
}
