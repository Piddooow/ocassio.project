import { eq } from "drizzle-orm";
import { db as defaultDb } from "@/lib/db/client";
import {
  articles,
  clients,
  faq,
  legalPages,
  pricing,
  recognition,
  services,
  teamMembers,
} from "@/lib/db/schema";
import type { QueryDatabase } from "./upcoming";

/**
 * Publishing queues (§8): one aggregated view across every publishable
 * content type for the Drafts, Scheduled, and Published screens. Read
 * only; each item still publishes from its own module.
 */

export const PUBLISHING_QUEUES = ["drafts", "scheduled", "published"] as const;
export type PublishingQueue = (typeof PUBLISHING_QUEUES)[number];

const QUEUE_STATUS: Record<PublishingQueue, string> = {
  drafts: "draft",
  scheduled: "scheduled",
  published: "published",
};

export interface PublishingQueueItem {
  entityType: string;
  id: number;
  title: string;
  slugOrKey: string | null;
  status: string;
  publishAt: string | null;
  updatedAt: Date;
}

export function isPublishingQueue(value: unknown): value is PublishingQueue {
  return (
    typeof value === "string" &&
    (PUBLISHING_QUEUES as readonly string[]).includes(value)
  );
}

export async function listPublishingQueue(
  queue: PublishingQueue,
  database: QueryDatabase = defaultDb,
): Promise<PublishingQueueItem[]> {
  const status = QUEUE_STATUS[queue];
  const items: PublishingQueueItem[] = [];

  const articleRows = database
    .select({
      id: articles.id,
      title: articles.title,
      slug: articles.slug,
      status: articles.status,
      publishAt: articles.publishAt,
      updatedAt: articles.updatedAt,
    })
    .from(articles)
    .where(eq(articles.status, status as "draft"))
    .all();
  for (const row of articleRows) {
    items.push({
      entityType: "article",
      id: row.id,
      title: row.title,
      slugOrKey: row.slug,
      status: row.status,
      publishAt: row.publishAt,
      updatedAt: row.updatedAt,
    });
  }

  const legalRows = database
    .select({
      id: legalPages.id,
      title: legalPages.title,
      slug: legalPages.slug,
      status: legalPages.status,
      publishAt: legalPages.publishAt,
      updatedAt: legalPages.updatedAt,
    })
    .from(legalPages)
    .where(eq(legalPages.status, status as "draft"))
    .all();
  for (const row of legalRows) {
    items.push({
      entityType: "legal",
      id: row.id,
      title: row.title,
      slugOrKey: row.slug,
      status: row.status,
      publishAt: row.publishAt,
      updatedAt: row.updatedAt,
    });
  }

  const serviceRows = database
    .select({
      id: services.id,
      name: services.name,
      slug: services.slug,
      status: services.status,
      updatedAt: services.updatedAt,
    })
    .from(services)
    .where(eq(services.status, status as "draft"))
    .all();
  for (const row of serviceRows) {
    items.push({
      entityType: "service",
      id: row.id,
      title: row.name,
      slugOrKey: row.slug,
      status: row.status,
      publishAt: null,
      updatedAt: row.updatedAt,
    });
  }

  const pricingRows = database
    .select({
      id: pricing.id,
      packageName: pricing.packageName,
      status: pricing.status,
      updatedAt: pricing.updatedAt,
    })
    .from(pricing)
    .where(eq(pricing.status, status as "draft"))
    .all();
  for (const row of pricingRows) {
    items.push({
      entityType: "pricing",
      id: row.id,
      title: row.packageName,
      slugOrKey: null,
      status: row.status,
      publishAt: null,
      updatedAt: row.updatedAt,
    });
  }

  const faqRows = database
    .select({
      id: faq.id,
      question: faq.question,
      status: faq.status,
      updatedAt: faq.updatedAt,
    })
    .from(faq)
    .where(eq(faq.status, status as "draft"))
    .all();
  for (const row of faqRows) {
    items.push({
      entityType: "faq",
      id: row.id,
      title: row.question,
      slugOrKey: null,
      status: row.status,
      publishAt: null,
      updatedAt: row.updatedAt,
    });
  }

  const teamRows = database
    .select({
      id: teamMembers.id,
      name: teamMembers.name,
      status: teamMembers.status,
      updatedAt: teamMembers.updatedAt,
    })
    .from(teamMembers)
    .where(eq(teamMembers.status, status as "draft"))
    .all();
  for (const row of teamRows) {
    items.push({
      entityType: "team",
      id: row.id,
      title: row.name,
      slugOrKey: null,
      status: row.status,
      publishAt: null,
      updatedAt: row.updatedAt,
    });
  }

  const clientRows = database
    .select({
      id: clients.id,
      name: clients.name,
      status: clients.status,
      updatedAt: clients.updatedAt,
    })
    .from(clients)
    .where(eq(clients.status, status as "draft"))
    .all();
  for (const row of clientRows) {
    items.push({
      entityType: "client",
      id: row.id,
      title: row.name,
      slugOrKey: null,
      status: row.status,
      publishAt: null,
      updatedAt: row.updatedAt,
    });
  }

  const recognitionRows = database
    .select({
      id: recognition.id,
      title: recognition.title,
      status: recognition.status,
      updatedAt: recognition.updatedAt,
    })
    .from(recognition)
    .where(eq(recognition.status, status as "draft"))
    .all();
  for (const row of recognitionRows) {
    items.push({
      entityType: "recognition",
      id: row.id,
      title: row.title,
      slugOrKey: null,
      status: row.status,
      publishAt: null,
      updatedAt: row.updatedAt,
    });
  }

  if (queue === "scheduled") {
    items.sort((a, b) =>
      (a.publishAt ?? "9999").localeCompare(b.publishAt ?? "9999"),
    );
  } else {
    items.sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
    );
  }

  return items;
}

/** Queue counts for the dashboard and the tab labels (§9). */
export async function publishingQueueCounts(
  database: QueryDatabase = defaultDb,
): Promise<Record<PublishingQueue, number>> {
  const tables = [
    { table: articles, status: articles.status },
    { table: legalPages, status: legalPages.status },
    { table: services, status: services.status },
    { table: pricing, status: pricing.status },
    { table: faq, status: faq.status },
    { table: teamMembers, status: teamMembers.status },
    { table: clients, status: clients.status },
    { table: recognition, status: recognition.status },
  ] as const;

  const countFor = (status: string) =>
    tables.reduce(
      (sum, entry) =>
        sum +
        database
          .select({ id: entry.table.id })
          .from(entry.table)
          .where(eq(entry.status, status as "draft"))
          .all().length,
      0,
    );

  return {
    drafts: countFor("draft"),
    scheduled: countFor("scheduled"),
    published: countFor("published"),
  };
}
