import { ButtonLink } from "@/components/ui/ButtonLink";
import { ConfettiButton } from "@/components/site/confetti-button";

interface StartCTAProps {
  title?: string;
  description?: string;
  /** Adds the confetti control beside the CTA (Home closing band). */
  celebrate?: boolean;
}

/** Consistent conversion band, every public page offers a next action (§7). */
export function StartCTA({
  title = "Have a project in mind?",
  description = "Tell us about it, Ocassio.Project will review your brief and get back to you.",
  celebrate = false,
}: StartCTAProps) {
  return (
    <section
      data-section="cta"
      className="border-t border-line"
      aria-label="Start a project"
    >
      <div className="container-editorial flex flex-col gap-8 py-20 lg:flex-row lg:items-end lg:justify-between lg:py-28">
        <div>
          <h2 className="font-display text-display-lg">{title}</h2>
          <p className="mt-3 max-w-md text-body text-secondary">
            {description}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-6">
          <ButtonLink href="/start-project" variant="primary" arrow>
            Start a Project
          </ButtonLink>
          {celebrate ? <ConfettiButton hint="before you go." /> : null}
        </div>
      </div>
    </section>
  );
}
