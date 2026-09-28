import { HOME_INTRO } from "@/lib/content/home";
import { Reveal } from "@/components/motion/Reveal";

/** 03 Introduction, light editorial reset (§31.14). */
export function IntroductionSection() {
  return (
    <section
      data-section="introduction"
      className="text-primary"
    >
      <div className="container-editorial py-24 lg:py-32">
        <Reveal className="mx-auto max-w-3xl text-center">
          <p className="text-label uppercase tracking-label-wide text-muted">
            {HOME_INTRO.label}
          </p>
          <p className="mt-8 font-display text-display-lg">
            {HOME_INTRO.statement}
          </p>
          <p className="mx-auto mt-6 max-w-xl text-body text-secondary">
            {HOME_INTRO.body}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
