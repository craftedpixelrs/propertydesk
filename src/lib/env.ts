import { z } from "zod";

/**
 * Server-side environment variable validation.
 *
 * Parsed at module import time. Missing or invalid variables cause a fast,
 * verbose failure at server startup rather than surprising errors later.
 *
 * Do not import this file from client components. Use `publicEnv` there.
 */

const booleanish = z
  .union([z.boolean(), z.enum(["true", "false", "1", "0"])])
  .transform((v) => v === true || v === "true" || v === "1");

// Env variables loaded from `.env` are always strings; an empty variable
// arrives here as `""`. Treat that as "not set" for optional fields so a
// blank value in .env does not fail URL / integer validation.
const optionalString = z
  .string()
  .optional()
  .transform((v) => (v === undefined || v.trim() === "" ? undefined : v));
const optionalUrl = optionalString.pipe(z.string().url().optional());
const optionalInt = optionalString.transform((v) =>
  v === undefined ? undefined : Number.parseInt(v, 10),
);

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  DATABASE_URL: z.string().url().min(1, "DATABASE_URL is required"),
  DIRECT_URL: optionalUrl,

  BETTER_AUTH_SECRET: z
    .string()
    .min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
  BETTER_AUTH_URL: z.string().url().min(1, "BETTER_AUTH_URL is required"),

  APP_NAME: z.string().min(1).default("PropertyDesk"),
  APP_DOMAIN: z.string().min(1).default("propertydesk.app"),
  APP_LOCALE: z.string().min(2).default("sr-Latn"),
  APP_TIMEZONE: z.string().min(1).default("Europe/Belgrade"),

  EMAIL_PROVIDER: z.enum(["resend", "smtp", "console"]).default("console"),
  EMAIL_FROM_NAME: z.string().min(1).default("PropertyDesk"),
  EMAIL_FROM_ADDRESS: z.string().email().default("noreply@propertydesk.app"),
  /** Human inbox (Google Workspace). Replies to transactional mail go here. */
  EMAIL_REPLY_TO: z.string().email().default("hello@propertydesk.app"),
  RESEND_API_KEY: optionalString,

  SMTP_HOST: optionalString,
  SMTP_PORT: optionalInt,
  SMTP_USER: optionalString,
  SMTP_PASSWORD: optionalString,
  SMTP_SECURE: booleanish.default(false),

  STORAGE_PROVIDER: z.enum(["local", "s3"]).default("local"),
  STORAGE_BUCKET: optionalString,
  STORAGE_ENDPOINT: optionalUrl,
  STORAGE_REGION: optionalString,
  STORAGE_ACCESS_KEY: optionalString,
  STORAGE_SECRET_KEY: optionalString,
  STORAGE_PUBLIC_URL: optionalUrl,
  STORAGE_LOCAL_DIR: z.string().default("./storage"),

  CRON_SECRET: optionalString,
  IMPERSONATION_SECRET: optionalString,

  // Loops (loops.so) transactional API key. When present, the marketing
  // lead-capture endpoint (`/api/v1/marketing/leads`) upserts each
  // submission as a Loops contact via the server-to-server API. The key
  // is server-only — it must never ship to the browser.
  LOOPS_API_KEY: optionalString,
  // Optional Loops "mailing list" id to auto-subscribe leads to. When
  // empty the contact is created but not added to any specific list.
  LOOPS_MAILING_LIST_ID: optionalString,

  // Base64-encoded 32-byte key used to encrypt sensitive billing secrets at
  // rest (e.g. the SEF API key). Required in production; in dev/test we fall
  // back to a deterministic dev key derived from `BETTER_AUTH_SECRET`.
  BILLING_SECRET_KEY: optionalString,

  SEED_SUPER_ADMIN_EMAIL: z
    .string()
    .email()
    .default("admin@propertydesk.test"),
  SEED_SUPER_ADMIN_PASSWORD: z
    .string()
    .min(10)
    .default("PropertyDesk!2026"),

  RATE_LIMIT_ENABLED: booleanish.default(true),

  SENTRY_DSN: optionalString,
  // Sentry org/project/auth-token are only consumed by
  // `withSentryConfig(...)` at build-time for source-map upload. They are
  // never read at runtime. They live in the same env schema so a
  // misconfigured build fails fast rather than silently shipping a build
  // without symbolication.
  SENTRY_ORG: optionalString,
  SENTRY_PROJECT: optionalString,
  SENTRY_AUTH_TOKEN: optionalString,
  SENTRY_ENVIRONMENT: optionalString,
  // Server-side sampling rates (0..1). Defaults are conservative to keep
  // event quota small. Override in production if needed.
  SENTRY_TRACES_SAMPLE_RATE: optionalString,
  SENTRY_PROFILES_SAMPLE_RATE: optionalString,

  // Faza 8.3 (C4) — automatic backup verifier.
  //
  // Where the backup-verify job looks for the most recent `pg_dump` file.
  // Two supported modes:
  //   * `local`: a filesystem directory containing `*.pgcustom` (or
  //     `*.dump`, `*.pgdump`, `*.tar`) files. `BACKUP_VERIFY_LOCAL_DIR`
  //     must point at that directory.
  //   * `s3`: an S3-compatible bucket. Reuses the STORAGE_* env vars for
  //     credentials and endpoint. `BACKUP_VERIFY_S3_PREFIX` narrows the
  //     search (e.g. `backups/`).
  //
  // When unset the job records an "OK: skipped (verifier disabled)"
  // status so operators can see the check is running but there is
  // nothing to verify. It never fails hard.
  BACKUP_VERIFY_SOURCE: z
    .enum(["disabled", "local", "s3"])
    .default("disabled"),
  BACKUP_VERIFY_LOCAL_DIR: optionalString,
  BACKUP_VERIFY_S3_BUCKET: optionalString,
  BACKUP_VERIFY_S3_PREFIX: optionalString,
  // Comma-separated list of email addresses that receive an alert when
  // two consecutive backup-verify runs fail. Falls back to the
  // SEED_SUPER_ADMIN_EMAIL when empty.
  BACKUP_VERIFY_ALERT_EMAILS: optionalString,
});

const publicSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().min(1, "NEXT_PUBLIC_APP_URL is required"),
  NEXT_PUBLIC_APP_NAME: z.string().min(1).default("PropertyDesk"),
  NEXT_PUBLIC_APP_DOMAIN: z.string().min(1).default("propertydesk.app"),
  NEXT_PUBLIC_APP_LOCALE: z.string().min(1).default("sr-Latn"),
  NEXT_PUBLIC_APP_TIMEZONE: z.string().min(1).default("Europe/Belgrade"),
  // Public URL of the authenticated app subdomain. The marketing landing at
  // the apex domain (propertydesk.app) links to this for every "sign in" or
  // "open the app" call to action.
  NEXT_PUBLIC_MY_APP_URL: z
    .string()
    .url()
    .default("https://my.propertydesk.app"),
  // Loops (loops.so) public newsletter/form ID. When present, the landing
  // lead form POSTs directly to Loops' public form endpoint. An empty value
  // is tolerated at build time; the form will surface a clear "not
  // configured" error in the client rather than fail the build.
  NEXT_PUBLIC_LOOPS_FORM_ID: optionalString,
  // Google Calendar Appointment Schedules embed URL. When set, the demo
  // booking iframe on `/demo` (and the DemoTraining section) points to
  // this URL. When empty, both surfaces show a soft fallback pointing
  // to the lead form. Full URL, e.g.:
  //   https://calendar.google.com/calendar/appointments/schedules/AcZssZ...
  NEXT_PUBLIC_GOOGLE_APPOINTMENT_URL: optionalUrl,
  // Public URL of a short (90-180 s) product overview video. Two modes
  // are auto-detected by the ProductVideo component:
  //   * YouTube (URL contains youtube.com or youtu.be) - lite embed
  //   * `.mp4` file  - native <video> element with metadata preload
  // Empty value renders a click-to-book placeholder.
  NEXT_PUBLIC_PRODUCT_VIDEO_URL: optionalString,
  NEXT_PUBLIC_SENTRY_DSN: optionalString,
});

export type ServerEnv = z.infer<typeof serverSchema>;
export type PublicEnv = z.infer<typeof publicSchema>;

function formatIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("\n");
}

function parseServerEnv(): ServerEnv {
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    const message = `Invalid server environment variables:\n${formatIssues(parsed.error)}`;
    if (process.env.NODE_ENV === "production") {
      throw new Error(message);
    }
    console.error(message);
    throw new Error(message);
  }
  return parsed.data;
}

function parsePublicEnv(): PublicEnv {
  const raw: Record<string, string | undefined> = {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_APP_DOMAIN: process.env.NEXT_PUBLIC_APP_DOMAIN,
    NEXT_PUBLIC_APP_LOCALE: process.env.NEXT_PUBLIC_APP_LOCALE,
    NEXT_PUBLIC_APP_TIMEZONE: process.env.NEXT_PUBLIC_APP_TIMEZONE,
    NEXT_PUBLIC_MY_APP_URL: process.env.NEXT_PUBLIC_MY_APP_URL,
    NEXT_PUBLIC_LOOPS_FORM_ID: process.env.NEXT_PUBLIC_LOOPS_FORM_ID,
    NEXT_PUBLIC_GOOGLE_APPOINTMENT_URL:
      process.env.NEXT_PUBLIC_GOOGLE_APPOINTMENT_URL,
    NEXT_PUBLIC_PRODUCT_VIDEO_URL: process.env.NEXT_PUBLIC_PRODUCT_VIDEO_URL,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  };
  const parsed = publicSchema.safeParse(raw);
  if (!parsed.success) {
    const message = `Invalid public environment variables:\n${formatIssues(parsed.error)}`;
    throw new Error(message);
  }
  return parsed.data;
}

/**
 * `serverEnv` should only be imported from server-side code
 * (route handlers, server components, service layer).
 */
export const serverEnv: ServerEnv =
  typeof window === "undefined"
    ? parseServerEnv()
    : (undefined as unknown as ServerEnv);

/**
 * `publicEnv` is safe to import from client components.
 * Only variables prefixed with `NEXT_PUBLIC_` are available here.
 */
export const publicEnv: PublicEnv = parsePublicEnv();

/**
 * Combined "from" header used by outgoing emails.
 * Example: `PropertyDesk <noreply@propertydesk.app>`
 */
export function emailFromHeader(): string {
  return `${serverEnv.EMAIL_FROM_NAME} <${serverEnv.EMAIL_FROM_ADDRESS}>`;
}
