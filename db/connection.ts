import { drizzle } from "drizzle-orm/libsql";

import { schemaRelations } from "./schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

console.log("Database URL", databaseUrl);

/**
 * Single Drizzle instance for the application.
 *
 * Supports both Turso (remote) and local SQLite via `@libsql/client`:
 * - Turso: `DATABASE_URL=libsql://...` + `DATABASE_AUTH_TOKEN=...`
 * - Local dev: `DATABASE_URL=file:./local.db` (no auth token needed)
 */
export const db = drizzle({
  connection: {
    url: databaseUrl,
    authToken: process.env.DATABASE_AUTH_TOKEN || undefined,
  },
  relations: schemaRelations,
});
