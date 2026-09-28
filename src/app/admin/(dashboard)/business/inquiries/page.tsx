import type { Metadata } from "next";
import Link from "next/link";
import {
  INQUIRY_STATUS_LABEL,
  INQUIRY_STATUS_TONE,
  listInquiryQueue,
} from "@/lib/db/queries/inquiries";
import { INQUIRY_STATUSES } from "@/lib/db/schema";
import { StatusChip } from "@/components/ui/StatusChip";

export const metadata: Metadata = {
  title: "Project Inquiries",
};

const DATE_TIME_FORMAT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

interface InquiriesPageProps {
  searchParams: Promise<{ status?: string }>;
}

/**
 * Admin → Business → Project Inquiries (§17, §31.31-32).
 * Server-rendered table with stage filter; brief details arrive with
 * the inquiry detail task.
 */
export default async function AdminInquiriesPage({
  searchParams,
}: InquiriesPageProps) {
  const { status: statusParam } = await searchParams;
  const activeStatus = INQUIRY_STATUSES.includes(
    statusParam as (typeof INQUIRY_STATUSES)[number],
  )
    ? (statusParam as (typeof INQUIRY_STATUSES)[number])
    : undefined;

  const { items, total } = await listInquiryQueue({
    status: activeStatus,
    limit: 50,
    offset: 0,
  });

  return (
    <div className="mx-auto max-w-6xl">
      <div>
        <h1 className="text-title-md font-medium">Project Inquiries</h1>
        <p className="mt-1 text-body-sm text-secondary">
          Briefs submitted through Start a Project. Move each one through the
          pipeline as the conversation develops.
        </p>
      </div>

      <div
        role="group"
        aria-label="Filter inquiries by stage"
        className="mt-8 flex flex-wrap gap-2"
      >
        <Link
          href="/admin/business/inquiries"
          aria-current={activeStatus === undefined ? "true" : undefined}
          className={`inline-flex min-h-9 items-center rounded-pill border px-3 text-label uppercase tracking-[0.08em] transition-colors duration-300 ${
            activeStatus === undefined
              ? "border-primary text-primary"
              : "border-line text-muted hover:border-line-strong hover:text-secondary"
          }`}
        >
          All
        </Link>
        {INQUIRY_STATUSES.map((stage) => (
          <Link
            key={stage}
            href={`/admin/business/inquiries?status=${stage}`}
            aria-current={activeStatus === stage ? "true" : undefined}
            className={`inline-flex min-h-9 items-center rounded-pill border px-3 text-label uppercase tracking-[0.08em] transition-colors duration-300 ${
              activeStatus === stage
                ? "border-primary text-primary"
                : "border-line text-muted hover:border-line-strong hover:text-secondary"
            }`}
          >
            {INQUIRY_STATUS_LABEL[stage]}
          </Link>
        ))}
      </div>

      <p className="mt-6 text-caption text-muted">
        {total} {total === 1 ? "inquiry" : "inquiries"}
        {activeStatus ? ` in ${INQUIRY_STATUS_LABEL[activeStatus]}` : ""}.
      </p>

      {items.length === 0 ? (
        <div className="mt-4 border-t border-line py-20 text-center" data-inquiries-empty>
          <p className="font-display text-display-sm">
            No inquiries{activeStatus ? " in this stage" : ""} yet.
          </p>
          <p className="mx-auto mt-2 max-w-md text-body-sm text-secondary">
            Briefs submitted through the public Start a Project form land in
            this queue with the stage New.
          </p>
          <Link
            href="/start-project"
            className="mt-6 inline-flex min-h-11 items-center text-button font-medium text-primary underline underline-offset-4"
          >
            View the public brief form
          </Link>
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto border-t border-line">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="border-b border-line">
                {["Client", "Service", "Type", "Stage", "Received"].map(
                  (heading) => (
                    <th
                      key={heading}
                      scope="col"
                      className="py-3 pr-4 text-label uppercase tracking-[0.08em] text-muted"
                    >
                      {heading}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {items.map((inquiry) => (
                <tr
                  key={inquiry.id}
                  data-inquiry-row={inquiry.id}
                  className="border-b border-line transition-colors duration-200 hover:bg-surface-hover"
                >
                  <td className="py-4 pr-4">
                    <p className="text-body-sm font-medium text-primary">
                      {inquiry.fullName}
                    </p>
                    <p className="mt-0.5 text-caption text-muted">
                      {inquiry.email}
                      {inquiry.company ? ` · ${inquiry.company}` : ""}
                    </p>
                  </td>
                  <td className="py-4 pr-4 text-body-sm text-secondary">
                    {inquiry.service}
                  </td>
                  <td className="py-4 pr-4 text-body-sm text-secondary">
                    {inquiry.projectType}
                  </td>
                  <td className="py-4 pr-4">
                    <StatusChip tone={INQUIRY_STATUS_TONE[inquiry.status]}>
                      {INQUIRY_STATUS_LABEL[inquiry.status]}
                    </StatusChip>
                  </td>
                  <td className="py-4 pr-4 text-caption tabular-nums text-muted">
                    {DATE_TIME_FORMAT.format(inquiry.createdAt)} UTC
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
