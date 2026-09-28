import { formatArticleDate } from "@/lib/format";
import { Reveal } from "@/components/motion/Reveal";
import { StartCTA } from "@/components/site/StartCTA";

interface LegalPageViewProps {
  /** Minimal page shape shared by the static module and the database. */
  page: {
    title: string;
    slug: string;
    updatedDate: string;
    blocks: { type: "heading" | "paragraph"; text: string }[];
  };
  /** Short context word for the eyebrow: Privacy / Terms. */
  eyebrow: string;
}

/** Shared legal page layout (§6.14): title, updated date, structured body. */
export function LegalPageView({ page, eyebrow }: LegalPageViewProps) {
  return (
    <>
      <header
        data-section="header"
        className="container-editorial pb-10 pt-20 lg:pb-14 lg:pt-28"
      >
        <Reveal>
          <p className="text-label uppercase tracking-label-wide text-muted">
            Legal · {eyebrow}
          </p>
          <h1 className="mt-6 max-w-3xl font-display text-display-xl">
            {page.title}
          </h1>
          <p className="mt-4 text-caption text-muted">
            Last updated{" "}
            <time dateTime={page.updatedDate}>
              {formatArticleDate(page.updatedDate)}
            </time>
          </p>
        </Reveal>
      </header>

      <section data-section="body" className="container-editorial pb-20 lg:pb-28">
        <Reveal>
          <div className="mx-auto flex max-w-2xl flex-col gap-6">
            {page.blocks.map((block, index) =>
              block.type === "heading" ? (
                <h2
                  key={`${block.type}-${index}`}
                  className="mt-6 font-display text-display-sm"
                >
                  {block.text}
                </h2>
              ) : (
                <p
                  key={`${block.type}-${index}`}
                  className="text-body text-secondary"
                >
                  {block.text}
                </p>
              ),
            )}
          </div>
        </Reveal>
      </section>

      <StartCTA />
    </>
  );
}
