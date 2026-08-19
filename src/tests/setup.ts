import "@testing-library/jest-dom/vitest";

// Provide minimum env values expected by the modules under test. The env
// module's Zod schema fails fast if any required variable is missing, so
// we set safe placeholders here.
process.env.DATABASE_URL ??=
  "postgres://user:pass@localhost:5432/propertydesk_test?sslmode=disable";
process.env.DIRECT_URL ??= process.env.DATABASE_URL;
process.env.BETTER_AUTH_SECRET ??=
  "test-secret-that-is-longer-than-32-characters-for-real";
process.env.BETTER_AUTH_URL ??= "http://localhost:3000";
process.env.NEXT_PUBLIC_APP_URL ??= "http://localhost:3000";
process.env.APP_NAME ??= "PropertyDesk";
process.env.APP_DOMAIN ??= "propertydesk.app";
process.env.NEXT_PUBLIC_APP_NAME ??= "PropertyDesk";
process.env.NEXT_PUBLIC_APP_DOMAIN ??= "propertydesk.app";
process.env.APP_LOCALE ??= "sr-Latn";
process.env.NEXT_PUBLIC_APP_LOCALE ??= "sr-Latn";
process.env.APP_TIMEZONE ??= "Europe/Belgrade";
process.env.NEXT_PUBLIC_APP_TIMEZONE ??= "Europe/Belgrade";
process.env.EMAIL_PROVIDER ??= "console";
process.env.EMAIL_FROM_NAME ??= "PropertyDesk";
process.env.EMAIL_FROM_ADDRESS ??= "noreply@propertydesk.test";
process.env.EMAIL_REPLY_TO ??= "hello@propertydesk.test";
process.env.STORAGE_PROVIDER ??= "local";
process.env.STORAGE_LOCAL_DIR ??= "./storage";
process.env.CRON_SECRET ??= "test-cron-secret-that-is-long-enough-for-tests";
process.env.SEED_SUPER_ADMIN_EMAIL ??= "admin@propertydesk.test";
process.env.SEED_SUPER_ADMIN_PASSWORD ??= "PropertyDesk!2026";
