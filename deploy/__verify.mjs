// Verify each phase-6 schema change actually exists on the target database.
// Bypasses Prisma's `_prisma_migrations` bookkeeping — pgcatalog is truth.
import { Pool } from "pg";

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!url) {
  console.error("DIRECT_URL / DATABASE_URL not set");
  process.exit(1);
}

const pool = new Pool({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});

const checks = [
  {
    label: "document.sortOrder",
    sql: `SELECT 1 FROM information_schema.columns
          WHERE table_name = 'document' AND column_name = 'sortOrder'`,
  },
  {
    label: "document.isCover",
    sql: `SELECT 1 FROM information_schema.columns
          WHERE table_name = 'document' AND column_name = 'isCover'`,
  },
  {
    label: "organization_profile.onboardingCompletedAt",
    sql: `SELECT 1 FROM information_schema.columns
          WHERE table_name = 'organization_profile'
            AND column_name = 'onboardingCompletedAt'`,
  },
  {
    label: "organization_profile.onboardingDismissedAt",
    sql: `SELECT 1 FROM information_schema.columns
          WHERE table_name = 'organization_profile'
            AND column_name = 'onboardingDismissedAt'`,
  },
  {
    label: "share_link (table)",
    sql: `SELECT 1 FROM information_schema.tables WHERE table_name = 'share_link'`,
  },
  {
    label: "comment (table)",
    sql: `SELECT 1 FROM information_schema.tables WHERE table_name = 'comment'`,
  },
  {
    label: "floor_plan_area (table)",
    sql: `SELECT 1 FROM information_schema.tables WHERE table_name = 'floor_plan_area'`,
  },
];

const results = [];
for (const c of checks) {
  const r = await pool.query(c.sql);
  results.push({ label: c.label, present: r.rowCount > 0 });
}
await pool.end();

let ok = true;
for (const r of results) {
  console.log(`${r.present ? "OK " : "!! "} ${r.label}`);
  if (!r.present) ok = false;
}
process.exit(ok ? 0 : 2);
