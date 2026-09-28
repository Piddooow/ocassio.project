/**
 * Seeds the Services module from the studio content modules: services,
 * their 1:1 details, selected-work relations, pricing entries, and the
 * process steps. Wholesale refresh; the static modules are the seed
 * source until the admin editors own this content.
 *
 * Usage: bun scripts/seed-services.mjs
 */
import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { SERVICES } from "../src/lib/content/services.ts";
import { PRICING } from "../src/lib/content/pricing.ts";
import { PROCESS_STEPS } from "../src/lib/content/process.ts";

export function seedServices(sqlite) {
  sqlite.query("DELETE FROM service_project_relations").run();
  sqlite.query("DELETE FROM service_faq_relations").run();
  sqlite.query("DELETE FROM service_details").run();
  sqlite.query("DELETE FROM pricing").run();
  sqlite.query("DELETE FROM services").run();
  sqlite.query("DELETE FROM process_steps").run();

  const insertService = sqlite.query(
    `INSERT INTO services (name, slug, service_type, short_description, sort_order, status)
     VALUES (?, ?, ?, ?, ?, ?) RETURNING id`,
  );
  const insertDetails = sqlite.query(
    `INSERT INTO service_details (service_id, body_blocks, deliverables) VALUES (?, ?, ?)`,
  );
  const insertRelation = sqlite.query(
    `INSERT INTO service_project_relations (service_id, project_slug, sort_order) VALUES (?, ?, ?)`,
  );

  const serviceIdBySlug = new Map();
  for (const service of SERVICES) {
    const row = insertService.get(
      service.name,
      service.slug,
      service.serviceType,
      service.shortDescription,
      service.sortOrder,
      service.status,
    );
    serviceIdBySlug.set(service.slug, row.id);
    insertDetails.run(
      row.id,
      JSON.stringify({
        paragraphs: service.description,
        whoItIsFor: service.whoItIsFor,
      }),
      JSON.stringify(service.deliverables),
    );
    service.relatedProjectSlugs.forEach((slug, index) => {
      insertRelation.run(row.id, slug, index);
    });
  }

  const insertPricing = sqlite.query(
    `INSERT INTO pricing
       (service_id, package_name, price_type, amount, duration, deliverables, notes, sort_order, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  for (const entry of PRICING) {
    const serviceId = serviceIdBySlug.get(entry.serviceSlug);
    if (!serviceId) {
      throw new Error(`Missing service for pricing entry ${entry.id}`);
    }
    insertPricing.run(
      serviceId,
      entry.packageName,
      entry.priceType,
      entry.amount === null ? null : Number(entry.amount),
      entry.duration,
      JSON.stringify(entry.deliverables),
      entry.notes,
      entry.sortOrder,
      entry.status,
    );
  }

  const insertStep = sqlite.query(
    `INSERT INTO process_steps (step_number, title, explanation, sort_order, status)
     VALUES (?, ?, ?, ?, ?)`,
  );
  PROCESS_STEPS.forEach((step, index) => {
    insertStep.run(
      Number(step.number),
      step.title,
      step.explanation,
      index + 1,
      step.status,
    );
  });
}

function main() {
  const dbPath = process.env.OCASSIO_DB_PATH ?? "data/ocassio.db";
  mkdirSync(dirname(dbPath), { recursive: true });
  const sqlite = new Database(dbPath, { create: true });

  const tableExists =
    sqlite
      .query(
        "SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name = 'services'",
      )
      .get().count > 0;
  if (!tableExists) {
    throw new Error(
      "Database is not migrated yet. Run `bun run db:migrate` first.",
    );
  }

  seedServices(sqlite);

  const services = sqlite
    .query("SELECT COUNT(*) AS count FROM services")
    .get().count;
  const pricing = sqlite
    .query("SELECT COUNT(*) AS count FROM pricing")
    .get().count;
  const steps = sqlite
    .query("SELECT COUNT(*) AS count FROM process_steps")
    .get().count;
  const relations = sqlite
    .query("SELECT COUNT(*) AS count FROM service_project_relations")
    .get().count;
  sqlite.close();
  console.log(
    `Seeded ${services} services, ${relations} work relations, ${pricing} pricing entries, ${steps} process steps into ${dbPath}`,
  );
}

if (import.meta.main) {
  main();
}
