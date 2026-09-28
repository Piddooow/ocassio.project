import { and, desc, eq, sql } from "drizzle-orm";
import { db as defaultDb } from "@/lib/db/client";
import { INQUIRY_STATUSES, inquiries } from "@/lib/db/schema";
import type { QueryDatabase } from "./upcoming";
import type { InquiryInput } from "@/lib/api/inquiry-validation";

/**
 * Inquiry persistence for the public project brief (§6.13) and the
 * admin pipeline (§17). Creates rows with the NEW pipeline stage.
 */

export type InquiryStatus = (typeof INQUIRY_STATUSES)[number];

/** Display labels for the pipeline stages (§17, §31.34). */
export const INQUIRY_STATUS_LABEL: Record<InquiryStatus, string> = {
  new: "New",
  reviewed: "Reviewed",
  contacted: "Contacted",
  discovery: "Discovery",
  proposal_sent: "Proposal Sent",
  booked: "Booked",
  completed: "Completed",
  declined: "Declined",
};

/** Chip tone per stage: neutral for lifecycle, warning for Declined. */
export const INQUIRY_STATUS_TONE: Record<
  InquiryStatus,
  "neutral" | "success" | "warning" | "error" | "info"
> = {
  new: "info",
  reviewed: "neutral",
  contacted: "neutral",
  discovery: "neutral",
  proposal_sent: "neutral",
  booked: "success",
  completed: "success",
  declined: "error",
};

export async function createInquiry(
  input: InquiryInput,
  database: QueryDatabase = defaultDb,
) {
  return database
    .insert(inquiries)
    .values({
      fullName: input.fullName,
      company: input.company,
      email: input.email,
      whatsapp: input.whatsapp,
      service: input.service,
      projectType: input.projectType,
      projectDescription: input.description,
      desiredDate: input.desiredDate,
      location: input.location,
      budgetRange: input.budgetRange,
      expectedDeliverables: input.expectedDeliverables,
      referenceUrl: input.referenceUrl,
      attachments:
        input.attachments.length > 0 ? input.attachments : null,
      status: "new",
    })
    .returning({
      id: inquiries.id,
      status: inquiries.status,
      createdAt: inquiries.createdAt,
    })
    .all()[0];
}

/**
 * Admin queue (§17): every brief, newest first, with optional stage
 * filter. Attachment storage keys never leave this layer; the queue
 * shows filename, type, and size only.
 */
export interface InquiryQueueParams {
  status?: InquiryStatus;
  limit: number;
  offset: number;
}

export interface InquiryQueueItem {
  id: number;
  fullName: string;
  company: string | null;
  email: string;
  whatsapp: string | null;
  service: string;
  projectType: string;
  projectDescription: string;
  desiredDate: string | null;
  location: string | null;
  budgetRange: string | null;
  expectedDeliverables: string | null;
  referenceUrl: string | null;
  attachments: { filename: string; mimeType: string; size: number }[];
  status: InquiryStatus;
  createdAt: Date;
  updatedAt: Date;
}

export async function listInquiryQueue(
  { status, limit, offset }: InquiryQueueParams,
  database: QueryDatabase = defaultDb,
): Promise<{ items: InquiryQueueItem[]; total: number }> {
  const where = status ? eq(inquiries.status, status) : undefined;

  const rows = database
    .select()
    .from(inquiries)
    .where(where)
    .orderBy(desc(inquiries.createdAt), desc(inquiries.id))
    .limit(limit)
    .offset(offset)
    .all();

  const total = database
    .select({ count: sql<number>`COUNT(*)` })
    .from(inquiries)
    .where(where)
    .all()[0].count;

  return {
    items: rows.map((row) => ({
      id: row.id,
      fullName: row.fullName,
      company: row.company,
      email: row.email,
      whatsapp: row.whatsapp,
      service: row.service,
      projectType: row.projectType,
      projectDescription: row.projectDescription,
      desiredDate: row.desiredDate,
      location: row.location,
      budgetRange: row.budgetRange,
      expectedDeliverables: row.expectedDeliverables,
      referenceUrl: row.referenceUrl,
      attachments: (row.attachments ?? []).map((attachment) => ({
        filename: attachment.filename,
        mimeType: attachment.mimeType,
        size: attachment.size,
      })),
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    })),
    total,
  };
}

export async function updateInquiryStatus(
  id: number,
  status: InquiryStatus,
  database: QueryDatabase = defaultDb,
) {
  return database
    .update(inquiries)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(inquiries.id, id)))
    .returning({
      id: inquiries.id,
      status: inquiries.status,
      updatedAt: inquiries.updatedAt,
    })
    .all()[0];
}

export async function getInquiryById(
  id: number,
  database: QueryDatabase = defaultDb,
) {
  return database
    .select({ id: inquiries.id })
    .from(inquiries)
    .where(eq(inquiries.id, id))
    .limit(1)
    .all()[0];
}
