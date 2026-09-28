import { PROCESS_STEPS } from "@/lib/content/process";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { RevealGroup } from "@/components/ui/RevealGroup";

const PREVIEW_COUNT = 4;

/** 07 How We Work, light, editorial (§31.14). Concise workflow preview. */
export function ProcessSection() {
  const steps = PROCESS_STEPS.filter(
    (step) => step.status === "visible",
  ).slice(0, PREVIEW_COUNT);

  return (
    <section
      data-section="process"
      className="border-t border-line text-primary"
    >
      <div className="container-editorial py-20 lg:py-28">
        <SectionHeader
          label="How We Work"
          title={
            <>
              A clear way of <em>working</em>
            </>
          }
          action={{ label: "Full process", href: "/process" }}
        />
        <RevealGroup className="mt-12" itemSelector=".process-step">
          <ol className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step) => (
              <li key={step.number} className="process-step">
                <span className="font-display text-display-lg text-muted">
                  {step.number}
                </span>
                <h3 className="mt-4 text-title-sm font-medium">{step.title}</h3>
                <p className="mt-2 text-body-sm text-secondary">
                  {step.explanation}
                </p>
              </li>
            ))}
          </ol>
        </RevealGroup>
      </div>
    </section>
  );
}
