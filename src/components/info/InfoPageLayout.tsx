import { Reveal } from "@/components/motion/Reveal";
import { StartCTA } from "@/components/site/StartCTA";

interface InfoPageLayoutProps {
  /** Small uppercase label above the title (e.g. "About", "Process"). */
  eyebrow: string;
  title: React.ReactNode;
  /** Intro paragraph under the title. */
  lede?: string;
  /** Optional conversion band title; omitted when undefined. */
  ctaTitle?: string;
  ctaDescription?: string;
  children: React.ReactNode;
}

/**
 * Shared editorial layout for informational pages (§31.15: light theme).
 * Establishes the section rhythm every info page reuses: header eyebrow,
 * display title, lede, content sections, closing conversion band, with
 * the same reveal choreography everywhere.
 */
export function InfoPageLayout({
  eyebrow,
  title,
  lede,
  ctaTitle,
  ctaDescription,
  children,
}: InfoPageLayoutProps) {
  return (
    <div data-info-layout={eyebrow.toLowerCase()}>
      <header
        data-section="header"
        className="container-editorial pb-14 pt-20 lg:pb-20 lg:pt-28"
      >
        <Reveal>
          <p className="text-label uppercase tracking-label-wide text-muted">
            {eyebrow}
          </p>
          <h1 className="mt-6 max-w-4xl font-display text-display-xl">
            {title}
          </h1>
          {lede ? (
            <p className="mt-6 max-w-xl text-body text-secondary">{lede}</p>
          ) : null}
        </Reveal>
      </header>

      {children}

      {ctaTitle ? (
        <StartCTA title={ctaTitle} description={ctaDescription} />
      ) : null}
    </div>
  );
}
