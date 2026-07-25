# Deployment

## Environments

- **Local**: Docker Compose, Postgres in a container, hot reload.
- **Neon**: hosted Postgres for cloud/managed deployments.
- **Self-hosted VPS**: single node running Docker + nginx reverse proxy
  in front of the containerized app.

## Deployment targets

### 1. Docker Compose (recommended for VPS)

```bash
git pull
docker compose build
docker compose up -d
docker compose exec app pnpm prisma migrate deploy
docker compose exec app pnpm prisma db seed  # first run only
```

Compose provides a `db` service (Postgres 16) and an `app` service
(the standalone Next.js build). Volume `app-storage` persists uploaded
documents.

### 2. Managed platform (Vercel / Fly / Railway)

- Set every var from `.env.example` in the platform's secret store.
- Build command: `pnpm build`.
- Start command: `node .next/standalone/server.js`.
- Attach a persistent Postgres (Neon) and a persistent object store
  (S3-compatible) — see [`docs/security.md`](./security.md#storage).

### 3. Kubernetes

The Docker image is stateless. The recommended shape:

- Postgres via CloudNativePG / Neon.
- Object storage via S3 (`STORAGE_PROVIDER=s3`).
- One `Deployment` for the app with the Compose healthcheck.
- A `CronJob` per entry in [`docs/cron-jobs.md`](./cron-jobs.md) posting
  to `/api/v1/jobs/*` with `x-cron-secret: $CRON_SECRET`.

## Env vars in production

The critical vars (see [`src/lib/env.ts`](../src/lib/env.ts)):

| Variable | Notes |
|----------|-------|
| `NODE_ENV` | Must be `production`. |
| `DATABASE_URL`, `DIRECT_URL` | Postgres URL. Use `sslmode=require` in production. |
| `BETTER_AUTH_SECRET` | ≥ 32 chars, rotated with care (invalidates sessions). |
| `BETTER_AUTH_URL` | Fully-qualified HTTPS origin. |
| `NEXT_PUBLIC_APP_URL` | Same as above, exposed to the browser. |
| `EMAIL_PROVIDER` | `smtp` in prod. Set `SMTP_*` correctly. |
| `STORAGE_PROVIDER` | `s3` in prod. Set `S3_*`. |
| `CRON_SECRET` | ≥ 32 chars, injected into every cron platform. |
| `SENTRY_DSN` | Optional. Enables monitoring facade forwarding. |
| `IMPERSONATION_SECRET` | ≥ 32 chars. Guards platform admin impersonation. |
| `RATE_LIMIT_ENABLED` | Leave `true` in prod. |

## HTTPS & headers

- Terminate TLS in front of the app (nginx / Cloudflare / platform). The
  app emits `Strict-Transport-Security` only in production. The rest of
  the security headers ship on every response (see
  [`next.config.ts`](../next.config.ts)).
- `X-Frame-Options: DENY` prevents framing.
- CSP forbids inline scripts except the Next hydration inline; there
  is no `unsafe-eval` in production.

## Rollout & rollback

- Migrations are additive by convention. Never rename or drop columns
  in the same release; ship a two-step migration.
- Rollback:
  1. Redeploy the previous image tag (`docker compose up -d` with the
     old `image:`).
  2. If the migration must be reverted, run
     `pnpm prisma migrate resolve --rolled-back <migration>` and apply
     a corrective migration. Prisma has no automatic rollback.

## Backups

See [`docs/backup.md`](./backup.md).

## Post-deploy smoke checks

1. `curl -f https://<host>/api/v1/health` returns `200`.
2. `curl -f https://<host>/api/v1/ready` returns `200` with `db:"ok"`.
3. Sign in with the demo user and verify the dashboard loads.
4. Trigger `POST /api/v1/jobs/expire-reservations` with `x-cron-secret`
   and confirm 200 + no errors in logs.
