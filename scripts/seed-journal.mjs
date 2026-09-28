/**
 * Seeds journal categories, articles, and article blocks into SQLite.
 *
 * Source of truth for the placeholder content is the frontend content
 * module (src/lib/content/journal.ts), so the database and the current
 * site cannot drift apart. Idempotent: safe to run repeatedly.
 *
 * Usage: bun scripts/seed-journal.mjs
 * Also imported by scripts/verify-backend.mjs against a throwaway DB.
 */
import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import {
  ARTICLES,
  JOURNAL_CATEGORIES,
} from "../src/lib/content/journal.ts";

const CATEGORY_SLUGS = {
  "Project Stories": "project-stories",
  "Behind The Scenes": "behind-the-scenes",
  Photography: "photography",
  Film: "film",
  "Studio Notes": "studio-notes",
};

export function seedJournal(sqlite) {
  sqlite.exec("PRAGMA foreign_keys = ON;");

  const run = sqlite.transaction(() => {
    /* Categories: upsert by slug. */
    const upsertCategory = sqlite.query(
      `INSERT INTO journal_categories (name, slug, sort_order)
       VALUES (?, ?, ?)
       ON CONFLICT(slug) DO UPDATE SET name = excluded.name, sort_order = excluded.sort_order`,
    );
    JOURNAL_CATEGORIES.forEach((name, index) => {
      upsertCategory.run(name, CATEGORY_SLUGS[name], index + 1);
    });

    const categoryIdBySlug = new Map(
      sqlite
        .query("SELECT id, slug FROM journal_categories")
        .all()
        .map((row) => [row.slug, row.id]),
    );

    /* Articles: upsert by slug, then replace blocks. */
    const upsertArticle = sqlite.query(
      `INSERT INTO articles
         (title, slug, category_id, excerpt, publish_date, status, visibility)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(slug) DO UPDATE SET
         title = excluded.title,
         category_id = excluded.category_id,
         excerpt = excluded.excerpt,
         publish_date = excluded.publish_date,
         status = excluded.status,
         visibility = excluded.visibility`,
    );
    const articleIdBySlug = new Map(
      sqlite
        .query("SELECT id, slug FROM articles")
        .all()
        .map((row) => [row.slug, row.id]),
    );
    const deleteBlocks = sqlite.query(
      "DELETE FROM article_blocks WHERE article_id = ?",
    );
    const insertBlock = sqlite.query(
      `INSERT INTO article_blocks
         (article_id, block_type, sort_order, text_content, media_id, reference_project_id)
       VALUES (?, ?, ?, ?, NULL, NULL)`,
    );

    for (const article of ARTICLES) {
      const categoryId = categoryIdBySlug.get(
        CATEGORY_SLUGS[article.category],
      );
      if (!categoryId) {
        throw new Error(`Missing category for article ${article.slug}`);
      }
      upsertArticle.run(
        article.title,
        article.slug,
        categoryId,
        article.excerpt,
        article.publishDate,
        article.status,
        article.visibility,
      );
      const articleId =
        articleIdBySlug.get(article.slug) ??
        sqlite
          .query("SELECT id FROM articles WHERE slug = ?")
          .get(article.slug).id;

      deleteBlocks.run(articleId);
      article.blocks.forEach((block, index) => {
        insertBlock.run(
          articleId,
          block.type,
          index + 1,
          block.text ?? null,
        );
      });
    }
  });

  run();
}

function main() {
  const dbPath = process.env.OCASSIO_DB_PATH ?? "data/ocassio.db";
  mkdirSync(dirname(dbPath), { recursive: true });
  const sqlite = new Database(dbPath, { create: true });

  const tableExists =
    sqlite
      .query(
        "SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name = 'journal_categories'",
      )
      .get().count > 0;
  if (!tableExists) {
    throw new Error(
      "Database is not migrated yet. Run `bun run db:migrate` first.",
    );
  }

  seedJournal(sqlite);

  const summary = sqlite
    .query(
      `SELECT a.status, a.visibility, COUNT(b.id) AS blocks
       FROM articles a LEFT JOIN article_blocks b ON b.article_id = a.id
       GROUP BY a.id ORDER BY a.slug`,
    )
    .all();
  const categories = sqlite
    .query("SELECT COUNT(*) AS count FROM journal_categories")
    .get().count;
  const articles = summary.length;
  const blocks = summary.reduce((sum, row) => sum + row.blocks, 0);

  console.log(
    `Seeded ${categories} categories, ${articles} articles, ${blocks} blocks into ${dbPath}`,
  );
  sqlite.close();
}

if (import.meta.main) {
  main();
}
