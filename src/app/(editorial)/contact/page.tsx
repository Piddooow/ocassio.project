import type { Metadata } from "next";
import { getPublicSiteSettings } from "@/lib/db/queries/settings";
import { buildContactChannels, CONTACT_NOTE } from "@/lib/site";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { CopyEmail } from "@/components/ui/copy-email";
import { Reveal } from "@/components/motion/Reveal";
import { StatusChip } from "@/components/ui/StatusChip";
import { StartCTA } from "@/components/site/StartCTA";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "How to reach Ocassio.Project for general questions, and where project requests go.",
};

export const dynamic = "force-dynamic";

/**
 * Contact (§6.12), general communication only; project requests route
 * to Start a Project. Channel values are served from Global Settings
 * (§10.3); unconnected channels stay labeled "Coming soon".
 */
export default async function ContactPage() {
  const settings = await getPublicSiteSettings();
  const channels = buildContactChannels(settings);
  const directChannels = channels.filter(
    (channel) => channel.label !== "New projects",
  );
  const hasUnavailable = directChannels.some(
    (channel) => !channel.available,
  );

  return (
    <>
      <header
        data-section="header"
        className="container-editorial pb-14 pt-20 lg:pb-20 lg:pt-28"
      >
        <Reveal>
          <p className="text-label uppercase tracking-label-wide text-muted">
            Contact
          </p>
          <h1 className="mt-6 max-w-4xl font-display text-display-xl">
            Two doors, <em>one studio</em>
          </h1>
          <p className="mt-6 max-w-xl text-body text-secondary">
            Project requests and general questions take different routes, so
            each one gets the right reply.
          </p>
        </Reveal>
      </header>

      <section
        data-section="routing"
        className="container-editorial pb-14 lg:pb-20"
      >
        <Reveal>
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-20">
            <div className="border-t border-line pt-8">
              <h2 className="font-display text-display-md">
                Starting a project?
              </h2>
              <p className="mt-4 max-w-md text-body-sm text-secondary">
                Project briefs go through Start a Project, so scope, timing,
                and references arrive together.
              </p>
              <div className="mt-8">
                <ButtonLink href="/start-project" variant="primary">
                  Start a Project
                </ButtonLink>
              </div>
            </div>
            <div className="border-t border-line pt-8">
              <h2 className="font-display text-display-md">
                A general question?
              </h2>
              <p className="mt-4 max-w-md text-body-sm text-secondary">
                {hasUnavailable
                  ? CONTACT_NOTE
                  : "Every direct channel is live. Reach the studio wherever you prefer, or send a brief and the studio will reply personally."}
              </p>
            </div>
          </div>
        </Reveal>
      </section>

      <section
        data-section="channels"
        className="container-editorial pb-16 lg:pb-24"
      >
        <Reveal>
          <ul className="mx-auto flex max-w-3xl flex-col">
            {channels.map((channel) => (
              <li
                key={channel.label}
                data-contact-channel={channel.label}
                className="flex flex-wrap items-center justify-between gap-4 border-b border-line py-4 first:border-t"
              >
                <span className="text-body-sm text-secondary">
                  {channel.label}
                </span>
                {channel.available && channel.value ? (
                  channel.label === "General email" ? (
                    <CopyEmail email={channel.value} />
                  ) : channel.href ? (
                    <a
                      href={channel.href}
                      className="text-body-sm font-medium text-primary underline-offset-4 transition-opacity duration-300 hover:underline"
                    >
                      {channel.value}
                    </a>
                  ) : (
                    <span className="max-w-md text-right text-body-sm text-secondary">
                      {channel.value}
                    </span>
                  )
                ) : (
                  <StatusChip>Coming soon</StatusChip>
                )}
              </li>
            ))}
          </ul>
        </Reveal>
      </section>

      <StartCTA
        title="Have a project in mind?"
        description="Send the brief and the studio will reply with next steps, timing, and a clear quote."
      />
    </>
  );
}
