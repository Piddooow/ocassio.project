import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.OCASSIO_DB_PATH ?? "data/ocassio.db",
  },
  strict: true,
  verbose: true,
});
