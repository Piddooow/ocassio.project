import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/motion/Reveal";
import { StartProjectForm } from "@/components/forms/StartProjectForm";

export const metadata: Metadata = {
  title: "Start a Project",
  description:
    "Submit a project brief to Ocassio.Project, contact, project, production, and references in one workflow.",
};

/** Start a Project (§6.13), the primary conversion page (light, editorial). */
export default function StartProjectPage() {
  return (
    <>
      <header
        data-section="header"
        className="container-editorial pb-14 pt-20 lg:pb-20 lg:pt-28"
      >
        <Reveal>
          <p className="text-label uppercase tracking-label-wide text-muted">
            Start a Project
          </p>
          <h1 className="mt-6 max-w-4xl font-display text-display-xl">
            Tell us what you are <em>making</em>
          </h1>
          <p className="mt-6 max-w-xl text-body text-secondary">
            One brief, four short sections. We review every request and reply
            with next steps, usually within two working days.
          </p>
          <p className="mt-4 text-body-sm text-secondary">
            Prefer to see how we work first?{" "}
            <Link
              href="/process"
              className="text-primary underline underline-offset-4 transition-opacity duration-300 hover:opacity-70"
            >
              Read the process
            </Link>
            . A general question instead?{" "}
            <Link
              href="/contact"
              className="text-primary underline underline-offset-4 transition-opacity duration-300 hover:opacity-70"
            >
              Go to Contact
            </Link>
            .
          </p>
        </Reveal>
      </header>

      <section data-section="form" className="container-editorial pb-24 lg:pb-32">
        <StartProjectForm />
      </section>
    </>
  );
}
