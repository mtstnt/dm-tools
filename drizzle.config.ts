import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

const dialect = process.env.NODE_ENV === "production" ? "turso" : "sqlite";

const dbCredentials =
  process.env.NODE_ENV === "production"
    ? {
        url: databaseUrl,
        authToken: process.env.DATABASE_AUTH_TOKEN,
      }
    : {
        url: databaseUrl,
      };

export default defineConfig({
  dialect: dialect,
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dbCredentials: dbCredentials,
});
