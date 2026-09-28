import type { Metadata } from "next";
import { getPublishedProjects } from "@/lib/content/queries";
import { ABOUT_PLACEHOLDERS, FOUNDER } from "@/lib/content/studio";
import { getStudioPhoto, largestVariant } from "@/lib/content/media";
import { getWiredClients, getWiredRecognition, getWiredStudioAbout } from "@/lib/content/live";
import { listPublicTeamMembers } from "@/lib/db/queries/studio";
import { InfoPageLayout } from "@/components/info/InfoPageLayout";
import { InlineText } from "@/components/content/InlineText";
import { RealImage, FadeImg } from "@/components/media/RealImage";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ConfettiButton } from "@/components/site/confetti-button";
import { FlipCard, FlipHint } from "@/components/ui/flip-card";
import { HoverCard } from "@/components/ui/hover-card";
import { SITE } from "@/lib/site";
import { Reveal } from "@/components/motion/Reveal";
import { RevealGroup } from "@/components/ui/RevealGroup";

export const metadata: Metadata = {
  title: "About",
  description:
    "Ocassio.Project is a small digital creative studio working across photography and film.",
};

export const dynamic = "force-dynamic";

/**
 * About (§6.8), light, editorial, full documented structure. Studio
 * content comes from the CMS; the founder carries the studio-supplied
 * portrait, the team renders the owner-approved placeholder roster with
 * hover cards, and sections without real data render labeled placeholders
 * instead of invented clients or awards (R-38).
 */
export default async function AboutPage() {
  const [projects, about, clients, recognition, team] = await Promise.all([
    getPublishedProjects(),
    getWiredStudioAbout(),
    getWiredClients(),
    getWiredRecognition(),
    listPublicTeamMembers(),
  ]);
  const moodImage = projects[0]?.photos[0] ?? null;
  const aboutHero = getStudioPhoto("about-hero-1");
  const heroImage = aboutHero ?? moodImage;
  const founderPhoto = getStudioPhoto(FOUNDER.photoId);

  return (
    <InfoPageLayout
      eyebrow="About"
      title={
        <>
          A studio built around <em>attention</em>
        </>
      }
      ctaTitle="Work with the studio"
      ctaDescription="Tell us what you are making. The reply comes from the people who will actually do the work."
    >
      {heroImage ? (
        <section data-section="image">
          <Reveal>
            <div className="container-editorial">
              <RealImage
                photo={heroImage}
                sizes="(max-width: 1200px) 100vw, 1200px"
                aspectOverride="21 / 9"
                imgClassName="media-color-reveal"
                alt={
                  aboutHero
                    ? "Photographs displayed on boards in a dark exhibition room"
                    : "Work from the Ocassio.Project archive"
                }
              />
            </div>
          </Reveal>
        </section>
      ) : null}

      <section
        data-section="about"
        className="container-editorial py-14 lg:py-20"
      >
        <Reveal>
          <div className="mx-auto grid max-w-4xl gap-8 lg:grid-cols-2 lg:gap-20">
            <h2 className="font-display text-display-md">{about.heading}</h2>
            <div className="flex flex-col gap-5">
              {about.paragraphs.map((paragraph, index) => (
                <p key={index} className="text-body text-secondary">
                  <InlineText value={paragraph} />
                </p>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      <section
        data-section="philosophy"
        className="container-editorial border-t border-line py-14 lg:py-20"
      >
        <Reveal>
          <div className="mx-auto grid max-w-4xl gap-8 lg:grid-cols-2 lg:gap-20">
            <h2 className="font-display text-display-md">How we work</h2>
            <ul className="flex flex-col">
              {about.philosophy.map((line) => (
                <li
                  key={line}
                  className="border-b border-line py-5 text-body-sm text-secondary first:pt-1 last:border-0"
                >
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </section>

      <section
        data-section="founder"
        className="container-editorial border-t border-line py-14 lg:py-20"
      >
        <Reveal>
          <div className="mx-auto grid max-w-4xl items-center gap-12 lg:grid-cols-2 lg:gap-20">
            {founderPhoto ? (
              <figure className="media-guard m-0 flex justify-center">
                <FlipCard
                  frontLabel="Show studio details"
                  backLabel="Show the portrait"
                  front={
                    <div className="relative flex size-full flex-col justify-end overflow-hidden rounded-2xl bg-background-deep p-6 text-primary">
                      <FadeImg
                        src={largestVariant(founderPhoto)}
                        alt={`${FOUNDER.name}, ${FOUNDER.role}`}
                        aspect="3 / 4"
                        className="absolute inset-0"
                        imgClassName="h-full w-full object-cover media-color-reveal"
                      />
                      <span className="relative">
                        <span className="text-label uppercase tracking-label-wide text-muted">
                          {FOUNDER.role}
                        </span>
                        <span className="mt-1 block font-display text-display-sm">
                          {FOUNDER.name}
                        </span>
                        <span className="mt-3 block text-secondary">
                          <FlipHint>Details</FlipHint>
                        </span>
                      </span>
                    </div>
                  }
                  back={
                    <div className="flex size-full flex-col justify-between rounded-2xl bg-surface p-6 text-primary ring-1 ring-line ring-inset">
                      <span className="text-label uppercase tracking-label-wide text-muted">
                        Studio details
                      </span>
                      <dl className="flex flex-col">
                        {[
                          ["Role", FOUNDER.role],
                          ["Focus", "Direction, production, finishing"],
                          ["Studio", SITE.name],
                        ].map(([term, value]) => (
                          <div
                            key={term}
                            className="flex items-baseline justify-between border-t border-line py-3 text-body-sm"
                          >
                            <dt className="text-muted">{term}</dt>
                            <dd className="font-medium">{value}</dd>
                          </div>
                        ))}
                      </dl>
                      <p className="text-body-sm text-secondary">
                        {FOUNDER.bio}
                      </p>
                      <span className="flex items-center justify-between text-muted">
                        <span className="truncate text-caption">
                          {founderPhoto.file}
                        </span>
                        <FlipHint>Portrait</FlipHint>
                      </span>
                    </div>
                  }
                />
              </figure>
            ) : null}
            <div>
              <p className="text-label uppercase tracking-label-wide text-muted">
                Founder
              </p>
              <h2 className="mt-4 font-display text-display-md">
                {FOUNDER.name}
              </h2>
              <p className="mt-2 text-caption text-muted">{FOUNDER.role}</p>
              <p className="mt-6 text-body-sm text-secondary">{FOUNDER.bio}</p>
            </div>
          </div>
        </Reveal>
      </section>

      <section
        data-section="team"
        className="container-editorial border-t border-line py-14 lg:py-20"
      >
        <Reveal>
          <div className="mx-auto grid max-w-4xl gap-8 lg:grid-cols-2 lg:gap-20">
            <h2 className="font-display text-display-md">
              Team &amp; collaborators
            </h2>
            {team.length > 0 ? (
              <div className="flex flex-col">
                <ul className="flex flex-col">
                  {team.map((member) => (
                    <li
                      key={member.id}
                      data-team-member
                      className="border-b border-line py-4 last:border-0"
                    >
                      <HoverCard
                        name={member.name}
                        role={member.roleTitle}
                        bio={member.bio}
                      />
                    </li>
                  ))}
                </ul>
                <ConfettiButton
                  className="mt-8"
                  hint="for the people behind the frame."
                />
              </div>
            ) : (
              <p className="text-body-sm text-muted">
                {ABOUT_PLACEHOLDERS.team}
              </p>
            )}
          </div>
        </Reveal>
      </section>

      <section
        data-section="clients"
        className="container-editorial border-t border-line py-14 lg:py-20"
      >
        <Reveal>
          <div className="mx-auto grid max-w-4xl gap-8 lg:grid-cols-2 lg:gap-20">
            <h2 className="font-display text-display-md">Selected clients</h2>
            {clients.length > 0 ? (
              <ul className="grid grid-cols-2 gap-x-8 gap-y-4">
                {clients.map((client) => (
                  <li key={client.name} className="text-title-sm text-secondary">
                    {client.name}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-body-sm text-muted">
                {ABOUT_PLACEHOLDERS.clients}
              </p>
            )}
          </div>
        </Reveal>
      </section>

      <section
        data-section="recognition"
        className="container-editorial border-t border-line py-14 lg:py-20"
      >
        <Reveal>
          <div className="mx-auto grid max-w-4xl gap-8 lg:grid-cols-2 lg:gap-20">
            <h2 className="font-display text-display-md">
              Recognition &amp; publication
            </h2>
            {recognition.length > 0 ? (
              <ul className="flex flex-col">
                {recognition.map((entry) => (
                  <li
                    key={entry.title}
                    className="border-b border-line py-4 last:border-0"
                  >
                    <p className="text-body-sm font-medium text-primary">
                      {entry.title}
                    </p>
                    <p className="mt-1 text-caption text-muted">
                      {entry.organization} · {entry.type} · {entry.year}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-body-sm text-muted">
                {ABOUT_PLACEHOLDERS.recognition}
              </p>
            )}
          </div>
        </Reveal>
      </section>

      <section
        data-section="next-actions"
        className="container-editorial border-t border-line py-12 lg:py-16"
      >
        <RevealGroup itemSelector=".info-next-link" stagger={0.08}>
          <ul className="grid gap-6 sm:grid-cols-2 lg:gap-10">
            <li className="info-next-link">
              <p className="text-label uppercase tracking-label-wide text-muted">
                See the work first?
              </p>
              <ButtonLink
                href="/work"
                variant="tertiary"
                arrow
                className="mt-3"
              >
                Browse the archive
              </ButtonLink>
            </li>
            <li className="info-next-link">
              <p className="text-label uppercase tracking-label-wide text-muted">
                Wondering what we take on?
              </p>
              <ButtonLink
                href="/services"
                variant="tertiary"
                arrow
                className="mt-3"
              >
                See what the studio does
              </ButtonLink>
            </li>
          </ul>
        </RevealGroup>
      </section>
    </InfoPageLayout>
  );
}
