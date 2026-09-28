import type { Metadata } from "next";
import Link from "next/link";
import { StatusChip } from "@/components/ui/StatusChip";
import { getPublicSiteSettings } from "@/lib/db/queries/settings";
import { listSeoOverview } from "@/lib/db/queries/seo";

export const metadata: Metadata = { title: "SEO" };

function SeoTable({
  label,
  rows,
  dataAttribute,
}: {
  label: string;
  rows: Array<{
    id: number;
    title: string;
    slug: string;
    hasTitle: boolean;
    hasDescription: boolean;
  }>;
  dataAttribute: string;
}) {
  return (
    <section className="mt-10">
      <h2 className="text-title-sm font-medium text-primary">
        {label} ({rows.length})
      </h2>
      <ul className="mt-4" {...{ [dataAttribute]: true }}>
        {rows.map((row) => (
          <li
            key={row.id}
            className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-3 first:border-t"
          >
            <span className="min-w-0 truncate text-body-sm text-primary">
              {row.title}
              <span className="ml-2 text-caption text-muted">/{row.slug}</span>
            </span>
            <span className="flex items-center gap-2">
              <StatusChip tone={row.hasTitle ? "success" : "neutral"}>
                {row.hasTitle ? "SEO title" : "No SEO title"}
              </StatusChip>
              <StatusChip tone={row.hasDescription ? "success" : "neutral"}>
                {row.hasDescription ? "Meta description" : "No description"}
              </StatusChip>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Admin → SEO (§8, §12): global defaults plus per-content coverage. */
export default async function AdminSeoPage() {
  const [settings, overview] = await Promise.all([
    getPublicSiteSettings(),
    listSeoOverview(),
  ]);
  const seo = settings?.globalMeta?.seo;
  const socialImage = settings?.globalMeta?.defaultSocialImage;

  return (
    <>
      <h1 className="font-display text-display-sm">SEO</h1>
      <p className="mt-2 max-w-2xl text-body-sm text-secondary">
        Default metadata and where the per-content SEO fields still need
        attention. The defaults live in Global Settings; each article and
        service carries its own overrides.
      </p>

      <section className="mt-8 border border-line p-5">
        <h2 className="text-title-sm font-medium text-primary">
          Default metadata
        </h2>
        <dl className="mt-4 grid gap-3 text-body-sm">
          <div className="flex flex-wrap gap-2">
            <dt className="w-40 text-muted">SEO title</dt>
            <dd className="text-primary">
              {seo?.title ?? "Using the static default"}
            </dd>
          </div>
          <div className="flex flex-wrap gap-2">
            <dt className="w-40 text-muted">Meta description</dt>
            <dd className="text-primary">
              {seo?.description ?? "Using the static default"}
            </dd>
          </div>
          <div className="flex flex-wrap gap-2">
            <dt className="w-40 text-muted">Default social image</dt>
            <dd className="text-primary">
              {socialImage ?? "Not set"}
            </dd>
          </div>
        </dl>
        <Link
          href="/admin/website/settings"
          className="mt-4 inline-block text-body-sm text-primary underline"
        >
          Edit in Global Settings
        </Link>
      </section>

      <SeoTable
        label="Articles"
        rows={overview.articles}
        dataAttribute="data-seo-articles"
      />
      <SeoTable
        label="Services"
        rows={overview.services}
        dataAttribute="data-seo-services"
      />
    </>
  );
}
