import type { Metadata } from "next";
import Link from "next/link";
import { PRICE_TYPE_LABEL, PRICING_FACTORS } from "@/lib/content/pricing";
import { listPublishedPricing } from "@/lib/db/queries/services";
import { slugify } from "@/lib/utils";
import { Reveal } from "@/components/motion/Reveal";
import { StartCTA } from "@/components/site/StartCTA";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "How Ocassio.Project prices photography and film work: every commission is quoted per project scope.",
};

export const dynamic = "force-dynamic";

function priceLabel(entry: {
  amount: number | null;
  currency: string | null;
}): string {
  if (entry.amount === null) return "Quote on request";
  const formatted = new Intl.NumberFormat("id-ID").format(entry.amount);
  if (!entry.currency || entry.currency === "IDR") return `Rp ${formatted}`;
  return `${entry.currency} ${formatted}`;
}

/**
 * Pricing (§6.6): editorial rows, not SaaS tiers, served from the CMS.
 * Entries without a published number quote on request (R-17).
 */
export default async function PricingPage() {
  const entries = await listPublishedPricing();

  return (
    <>
      <header
        data-section="header"
        className="container-editorial pb-14 pt-20 lg:pb-20 lg:pt-28"
      >
        <Reveal>
          <p className="text-label uppercase tracking-label-wide text-muted">
            Pricing
          </p>
          <h1 className="mt-6 max-w-4xl font-display text-display-xl">
            Priced per <em>project</em>
          </h1>
          <p className="mt-6 max-w-xl text-body text-secondary">
            Photography and film are scoped like productions, not subscriptions.
            Each package below shows what a typical engagement includes; the
            final number follows the brief.
          </p>
        </Reveal>
      </header>

      <section data-section="packages" className="container-editorial pb-16">
        {entries.length === 0 ? (
          <div className="border-t border-line py-20 text-center">
            <p className="font-display text-display-sm">
              Pricing is being prepared.
            </p>
            <p className="mx-auto mt-2 max-w-md text-body-sm text-secondary">
              Every commission is quoted per project scope. Send a brief and
              the studio will reply with a number.
            </p>
            <div className="mt-8 flex justify-center">
              <Link href="/start-project">
                <span className="inline-flex h-11 items-center rounded-pill bg-cta px-5 text-button font-medium text-cta-foreground transition-opacity duration-300 hover:opacity-80">
                  Start a Project
                </span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex flex-col">
          {entries.map((entry, index) => (
            <Reveal key={entry.id}>
              <div
                data-pricing-entry={
                  slugify(entry.packageName) || `pricing-${entry.id}`
                }
                className="grid gap-6 border-t border-line py-10 lg:grid-cols-12 lg:gap-10"
              >
                <div className="lg:col-span-4">
                  <span
                    aria-hidden
                    className="text-label tabular-nums tracking-label-wide text-muted"
                  >
                    ({String(index + 1).padStart(2, "0")})
                  </span>
                  <h2 className="mt-2 font-display text-display-md">
                    {entry.packageName}
                  </h2>
                  <p className="mt-2 text-caption text-muted">
                    <Link
                      href={`/services/${entry.serviceSlug}`}
                      className="underline-offset-4 transition-colors duration-300 hover:text-primary hover:underline"
                    >
                      {entry.serviceName}
                    </Link>
                    {entry.duration ? ` · ${entry.duration}` : ""}
                  </p>
                </div>
                <div className="lg:col-span-5">
                  <p className="text-label uppercase tracking-label-wide text-muted">
                    Includes
                  </p>
                  <ul className="mt-4 flex flex-col gap-2">
                    {entry.deliverables.map((item) => (
                      <li key={item} className="text-body-sm text-secondary">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="lg:col-span-3 lg:text-right">
                  <p className="text-label uppercase tracking-label-wide text-muted">
                    {PRICE_TYPE_LABEL[entry.priceType]}
                  </p>
                  <p className="mt-2 text-body-sm font-medium text-primary">
                    {priceLabel(entry)}
                  </p>
                  {entry.notes ? (
                    <p className="mt-2 text-caption text-muted">
                      {entry.notes}
                    </p>
                  ) : null}
                </div>
              </div>
            </Reveal>
          ))}
          </div>
        )}

        {entries.length > 0 ? (
          <Reveal>
          <div className="border-t border-line pt-8">
            <p className="max-w-2xl text-body-sm text-secondary">
              Prefer something outside these packages? Custom scopes are
              normal. Send the brief and the studio will quote it, or{" "}
              <Link
                href="/process"
                className="text-primary underline underline-offset-4 transition-colors duration-300 hover:opacity-70"
              >
                read how a project runs
              </Link>{" "}
              first.
            </p>
            <p className="mt-3 max-w-2xl text-caption text-muted">
              What shapes a quote: {PRICING_FACTORS.join(" · ")}.
            </p>
          </div>
        </Reveal>
        ) : null}
      </section>

      <StartCTA
        title="Get a quote for your project"
        description="Send the brief with scope and timing. The reply comes with next steps and a clear number."
      />
    </>
  );
}
