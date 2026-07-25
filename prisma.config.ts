import "dotenv/config";
import { defineConfig, env } from "prisma/config";

/**
 * Prisma 7 configuration.
 *
 * The Prisma CLI (migrate / db push / db execute / db seed) uses this
 * connection. For Neon this must be the DIRECT (non-pooled) URL because
 * DDL cannot run through PgBouncer's transaction-mode pooler.
 *
 * At runtime the Prisma Client is created with the standard pg driver
 * adapter and the pooled DATABASE_URL (see src/server/db/prisma.ts).
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // Fall back to DATABASE_URL if DIRECT_URL is not configured (e.g. when
    // running against a plain local Postgres without a pooler).
    url: env("DIRECT_URL") ?? env("DATABASE_URL"),
  },
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
});
