# Incident Response

## Severity levels

| SEV | Meaning | Example |
|-----|---------|---------|
| SEV 1 | Site down or tenant data corruption. | 5xx on `/api/v1/ready`, DB unreachable, cross-tenant leak reported. |
| SEV 2 | Major feature broken for many tenants. | Payments not recording, reservations cannot be approved. |
| SEV 3 | Single tenant affected or minor bug. | One tenant sees stale count in dashboard. |

## Playbook

### 1. Acknowledge

Within 15 min of alert or user report. Post in the incident channel with
severity, one-line symptom, and the incident owner ("IC"). Rotate IC
if the incident lasts longer than 2 hours.

### 2. Contain

- If the DB is being written destructively — engage maintenance mode
  by rewriting all inbound routes to `src/app/(system)/odrzavanje` in
  the reverse proxy (nginx `try_files`, Vercel middleware, …).
- If a tenant is being abused — suspend the tenant via
  `POST /api/v1/platform/organizations/:id/suspend`. Audit log captures
  the action.
- If credentials leak is suspected — rotate `BETTER_AUTH_SECRET` (kills
  sessions), `CRON_SECRET`, `IMPERSONATION_SECRET`, S3 keys.

### 3. Diagnose

- Check `/api/v1/health` and `/api/v1/ready`.
- Read structured logs — `logger.error` fields include `requestId`,
  `route`, `userId`, `organizationId`, and (for jobs) `job`.
- Sentry: filter by tag `route:` or by `requestId` correlator.
- Postgres: `SELECT * FROM pg_stat_activity WHERE state <> 'idle';`

### 4. Mitigate

Preferred order:

1. **Roll back the release** — redeploy the previous Docker image tag.
2. **Feature-flag off** the offending route via a hot env var if one
   exists.
3. **Patch forward** with a targeted fix, running the full quality gate
   (`pnpm lint && pnpm typecheck && pnpm test && pnpm build`) before
   deploy.

### 5. Communicate

- SEV 1: user-visible banner + email to affected tenants.
- SEV 2: email to affected tenants once mitigated.
- SEV 3: internal-only unless the user asks for confirmation.

### 6. Post-mortem

Within 5 working days for SEV 1 & 2. Include:

- Timeline (detection → containment → mitigation → resolution).
- Root cause.
- What went well / what went badly.
- Action items with owner + due date. Track them until closed.

## Contact points

Kept in the ops runbook (internal wiki), not in this repo. This file
should never contain a phone number.
