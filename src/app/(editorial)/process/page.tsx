import type { Metadata } from "next";
import { getWiredProcessSteps } from "@/lib/content/live";
import { InfoPageLayout } from "@/components/info/InfoPageLayout";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { RevealGroup } from "@/components/ui/RevealGroup";

export const metadata: Metadata = {
  title: "Process",
  description:
    "The nine steps of an Ocassio.Project engagement, from inquiry to delivery.",
};

export const dynamic = "force-dynamic";

/** Process (§6.7): nine steps, number, title, short explanation, from the CMS. */
export default async function ProcessPage() {
  const steps = await getWiredProcessSteps();

  return (
    <InfoPageLayout
      eyebrow="Process"
      title={
        <>
          How a project <em>runs</em>
        </>
      }
      lede="Nine steps, one conversation at a time. You always know where the project stands and what happens next."
      ctaTitle="Start at step one"
      ctaDescription="The inquiry is just a brief. Everything after it happens with your input at each step."
    >
      <section data-section="steps" className="container-editorial pb-20">
        {steps.length === 0 ? (
          <div className="border-t border-line py-20 text-center">
            <p className="font-display text-display-sm">
              The process overview is being prepared.
            </p>
            <p className="mx-auto mt-2 max-w-md text-body-sm text-secondary">
              In the meantime, see what the studio does and how a brief
              reaches us.
            </p>
            <div className="mt-8 flex justify-center">
              <ButtonLink href="/services" variant="secondary" arrow>
                See what the studio does
              </ButtonLink>
            </div>
          </div>
        ) : (
          <RevealGroup itemSelector=".process-step" stagger={0.06}>
            <ol className="flex flex-col">
              {steps.map((step, index) => (
                <li
                  key={`${step.number}-${index}`}
                  className="process-step grid gap-4 border-t border-line py-8 lg:grid-cols-12 lg:gap-10"
                >
                  <span className="font-display text-display-lg text-muted lg:col-span-2">
                    {step.number}
                  </span>
                  <h2 className="text-title-md font-medium lg:col-span-3">
                    {step.title}
                  </h2>
                  <p className="max-w-xl text-body-sm text-secondary lg:col-span-7">
                    {step.explanation}
                  </p>
                </li>
              ))}
            </ol>
          </RevealGroup>
        )}
      </section>

      <section
        data-section="next-actions"
        className="container-editorial border-t border-line py-12 lg:py-16"
      >
        <RevealGroup itemSelector=".info-next-link" stagger={0.08}>
          <ul className="grid gap-6 sm:grid-cols-2 lg:gap-10">
            <li className="info-next-link">
              <p className="text-label uppercase tracking-label-wide text-muted">
                Not sure where this fits?
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
            <li className="info-next-link">
              <p className="text-label uppercase tracking-label-wide text-muted">
                Prefer to look first?
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
          </ul>
        </RevealGroup>
      </section>
    </InfoPageLayout>
  );
}
