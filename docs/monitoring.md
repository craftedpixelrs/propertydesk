# Monitoring (Faza 8.3 C3 + C4)

Two independent pillars:

1. **Sentry** — application error + performance telemetry, always on
   in production and staging.
2. **Backup verifier** — weekly automated check that the latest
   `pg_dump` in configured storage is restorable, with email alerts
   on consecutive failures.

Neither replaces uptime monitoring (Better Uptime / Pingdom / Grafana
Cloud). Set up one of those on `/api/v1/health` and `/api/v1/ready`
before you rely on either of the below.

---

## Sentry (`@sentry/nextjs`)

### Configuration

Three runtimes, three config files:

- [`sentry.client.config.ts`](../sentry.client.config.ts) — browser.
  Includes session replay (10% sample) + tracing (10% sample).
- [`sentry.server.config.ts`](../sentry.server.config.ts) — Node.js
  runtime for API routes and Server Actions. `beforeSend` strips
  headers named `authorization`, `cookie`, `x-cron-secret`.
- [`sentry.edge.config.ts`](../sentry.edge.config.ts) — Edge
  Middleware. Minimal init — no replay, no filesystem-based
  integrations.

All three read `SENTRY_DSN` (server / edge) and
`NEXT_PUBLIC_SENTRY_DSN` (client). If both are unset, the SDK is a
no-op and every `captureException` call falls through — this is what
dev environments look like.

`next.config.ts` wraps the config with
`withSentryConfig({ silent: !process.env.CI, hideSourceMaps: true })`
so source maps are uploaded on release builds but not exposed via
HTTP.

### Public facade

`src/server/monitoring/index.ts` exports a stable API used
throughout the codebase:

```ts
captureException(err: unknown, context?: Record<string, unknown>): void
captureMessage(msg: string, level?: 'info' | 'warning' | 'error'): void
setUserContext(user: { id: string; organizationId?: string }): void
```

Feature code always uses this facade — never import `@sentry/nextjs`
directly. This is what lets us swap providers or turn Sentry off
without touching every call site.

### Env vars

| Var | Where | Notes |
|-----|-------|-------|
| `SENTRY_DSN` | Server + edge runtime | Set on the platform secret store. |
| `NEXT_PUBLIC_SENTRY_DSN` | Client bundle | Same value; the leak-safe view for the browser. |
| `SENTRY_ORG` / `SENTRY_PROJECT` | Build time | Used by `withSentryConfig` for source-map upload. |
| `SENTRY_AUTH_TOKEN` | Build time | Fine-grained token, scoped to the project. Never commit. |
| `SENTRY_ENVIRONMENT` | Runtime | Defaults to `production` / `preview` / `development` based on `NEXT_PUBLIC_APP_URL`. |

### PII scrubbing

- `beforeSend` redacts `req.headers.authorization`,
  `req.headers.cookie`, `req.headers['x-cron-secret']`.
- `sendDefaultPii: false` on the server config prevents Sentry from
  attaching the IP address.
- Do not log JMBG / PIB / IBAN into `metadata` — the audit-log
  service masks these, but ad-hoc `captureMessage(...)` calls do
  not. Prefer `resource_id` references over raw values.

### Testing

The Sentry SDK is expensive to boot in unit tests, so the
`vitest.config.ts` maps `@sentry/nextjs` to
`src/test-utils/sentry-stub.ts` under `NODE_ENV=test`. Feature tests
can still assert on `captureException` via the stub's spy.

---

## Backup verifier

Weekly automated check that the most recent `pg_dump` file in
configured storage is (a) present, (b) not truncated, (c) can be
listed by `pg_restore --list` without errors.

### How it works

1. `pnpm cron:backup-verify` (or the HTTP endpoint below) invokes
   `runBackupVerify()`.
2. The service picks the storage adapter based on
   `BACKUP_STORAGE_KIND` (`local` — reads from `BACKUP_LOCAL_DIR`;
   `s3` — reads from `BACKUP_S3_BUCKET` / `BACKUP_S3_PREFIX`).
3. Lists dumps sorted by name descending (dumps follow the
   `pg_YYYY-MM-DDTHH-mm-ssZ.dump` convention), picks the newest.
4. Streams the file to a tmp path and shells out to `pg_restore
   --list <tmp>`. Non-zero exit code, empty list, or a file smaller
   than `BACKUP_MIN_SIZE_BYTES` = FAIL.
5. Writes a `SystemHealthCheck` row (`kind = 'BACKUP_VERIFY'`,
   `status = 'OK' | 'FAIL'`, `message`).
6. If **both** the current run and the previous run are `FAIL`, sends
   an alert email to every address in `BACKUP_ALERT_EMAILS`
   (comma-separated). One consecutive failure is a soft warning
   surfaced in the admin UI; two in a row is escalation-worthy.

### Endpoints

- `POST /api/v1/jobs/backup-verify` — cron entrypoint, guarded by
  `x-cron-secret`. Runs weekly (Monday 03:00, see
  [`docs/cron-jobs.md`](./cron-jobs.md)).
- `POST /api/v1/platform/monitoring/backup-verify` — manual trigger.
  `requireSuperAdmin()` only. Same code path, same response shape.

Response:

```json
{
  "data": {
    "status": "OK",
    "message": "Restored 342 objects from pg_2026-08-11T03-00-00Z.dump (152.4 MB)",
    "fileName": "pg_2026-08-11T03-00-00Z.dump",
    "fileSize": 159768932,
    "recordId": "clr…",
    "runAt": "2026-08-11T03:00:12.482Z"
  }
}
```

### Admin UI

`/administracija/monitoring` — SUPER_ADMIN only. Renders:

- The last 12 `SystemHealthCheck` rows in a table, colour-coded.
- "Pokreni proveru sada" button that hits
  `POST /api/v1/platform/monitoring/backup-verify` and refreshes.
- Retention chart: file size of the most recent 12 dumps.

### Env vars

| Var | Notes |
|-----|-------|
| `BACKUP_STORAGE_KIND` | `local` or `s3`. Required. |
| `BACKUP_LOCAL_DIR` | Absolute path when `KIND=local`. |
| `BACKUP_S3_BUCKET`, `BACKUP_S3_PREFIX`, `BACKUP_S3_REGION`, `BACKUP_S3_ACCESS_KEY_ID`, `BACKUP_S3_SECRET_ACCESS_KEY`, `BACKUP_S3_ENDPOINT` | Standard S3-compatible creds. `ENDPOINT` supports MinIO, Cloudflare R2, Wasabi, etc. |
| `BACKUP_MIN_SIZE_BYTES` | Optional. Defaults to 1 MB — smaller dumps almost always mean a broken backup script. |
| `BACKUP_ALERT_EMAILS` | Comma-separated list. Alerts fire after two consecutive `FAIL` rows. |

### Runbook — receiving an alert

1. Read the alert email — it includes the `message` and the last two
   `SystemHealthCheck` rows.
2. Open `/administracija/monitoring` for the timeline.
3. Common failure modes:
   - **File missing / too small** — the actual backup script has
     stopped. Check the cron on the DB host (`pg_dump ...`) and its
     logs.
   - **`pg_restore --list` returns non-zero** — the dump is
     truncated. Force a fresh `pg_dump` and re-run the verifier.
   - **S3 credentials expired** — the service logs
     `NoSuchBucket` / `InvalidAccessKeyId` in Sentry. Rotate the
     access key and update the secret store.
4. After the fix, hit "Pokreni proveru sada" so the follow-up run
   flips the status back to `OK` and prevents further alerts.

### Testing

`src/server/services/monitoring/backup-verify.service.test.ts`
covers:

- OK path with a fake local dump.
- FAIL for missing file, tiny file, and `pg_restore --list` failure.
- Alert firing exactly when the two most recent runs are FAIL.
- Idempotency — running twice back-to-back doesn't double the alert.
