import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * Prisma 7 configuration.
 *
 * The Prisma CLI (migrate / db push / db execute / db seed) uses this
 * connection. For Neon this must be the DIRECT (non-pooled) URL because
 * DDL cannot run through PgBouncer's transaction-mode pooler.
 *
 * At runtime the Prisma Client is created with the standard pg driver
 * adapter and the pooled DATABASE_URL (see src/server/db/prisma.ts).
 *
 * NOTE: we intentionally read from `process.env` instead of Prisma's own
 * `env()` helper. In production containers where the runtime env is
 * injected by docker-compose (`env_file:`) rather than a `.env` file on
 * disk, `env()` from `prisma/config` returns a lazy proxy that
 * `migrate deploy` fails to resolve, surfacing as:
 *   "The datasource.url property is required in your Prisma config file
 *    when using prisma migrate deploy."
 * Reading `process.env` directly sidesteps the proxy entirely.
 */
const datasourceUrl =
  process.env.DIRECT_URL || process.env.DATABASE_URL || "";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: datasourceUrl,
  },
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
});
