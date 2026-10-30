# Release Checklist

Run through this list before every production deploy.

## Pre-flight

- [ ] Working tree clean (`git status`).
- [ ] `main` (or the release branch) rebased on the target base.
- [ ] Version bumped in `package.json` if this is a tagged release.
- [ ] `CHANGELOG.md` updated with user-visible changes.

## Quality gates

- [ ] `pnpm install --frozen-lockfile`
- [ ] `pnpm prisma generate`
- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `pnpm test`
- [ ] `pnpm test:e2e`
- [ ] `pnpm build`

Every one must exit 0.

## Migrations

- [ ] Any new migration is **additive** (no destructive `DROP` /
      `RENAME` in the same release).
- [ ] Migration reviewed for lock impact on large tables (index
      creation `CONCURRENTLY` where possible).
- [ ] `pnpm prisma migrate deploy` tested against a copy of production
      data.

## Docker

- [ ] `docker compose build` succeeds locally.
- [ ] `docker run --rm <image> node -e "require('./server.js')"` starts
      cleanly (or equivalent smoke test).
- [ ] Image tagged with both `latest` and the semver.

## Environment

- [ ] All new env vars added to `.env.example` **and** to the platform
      secret store (Vercel / Fly / K8s Secret).
- [ ] `BETTER_AUTH_SECRET`, `CRON_SECRET`, `IMPERSONATION_SECRET`
      are set and ≥ 32 chars.
- [ ] `NEXT_PUBLIC_APP_URL` and `BETTER_AUTH_URL` match the deploy
      hostname exactly (`https://my.propertydesk.app` today). See
      [`environments.md`](./environments.md).
- [ ] Production mail: `EMAIL_PROVIDER=resend`,
      `EMAIL_FROM_ADDRESS=noreply@propertydesk.app`,
      `EMAIL_REPLY_TO=hello@propertydesk.app`, `RESEND_API_KEY` set.
      See [`email.md`](./email.md).
- [ ] `SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN` present, or Sentry is
      explicitly disabled for this environment (dev usually has both
      unset). See [`docs/monitoring.md`](./monitoring.md).
- [ ] `BACKUP_STORAGE_KIND` (`local` / `s3`) and matching credentials
      set so the weekly `backup-verify` job can read the latest dump.
- [ ] `BACKUP_ALERT_EMAILS` populated with at least one address for
      failure alerts.

## Post-deploy smoke

- [ ] `curl -f https://<host>/api/v1/health` → 200
- [ ] `curl -f https://<host>/api/v1/health/ready` → 200 with `db:"ok"`
- [ ] Sign in and open the dashboard.
- [ ] Trigger `POST /api/v1/jobs/expire-reservations` with the cron
      secret → 200. Public reservation requests are not a cron job:
      they expire when someone opens `/rezervacije/zahtevi`.
- [ ] Trigger `POST /api/v1/jobs/backup-verify` with the cron secret
      → 200. `/administracija/monitoring` should show a fresh row.
- [ ] Trigger `POST /api/v1/jobs/purge-deleted-documents` with the
      cron secret → 200 (idempotent when nothing is 45 days old).
- [ ] Recent audit log rows appear in `/administracija/audit-log`.
- [ ] Send a test email (forgot-password to an inbox you control, or
      billing template *Send test*) — From is `noreply@propertydesk.app`,
      Reply-To is `hello@propertydesk.app`. Logs must not show
      `[email:console]`.
- [ ] Trigger a client error on any page (e.g. `throw` in devtools
      inside a Server Action) → appears in Sentry within 1 minute.
- [ ] Open a public share link and reservation form (`/p/[token]`):
      the confirmation page shows the deposit IPS QR (the email is
      text only) and the row shows up in `/rezervacije/zahtevi`.
- [ ] Open the agency referral URL (`/p/r/<code>`): catalog or
      project, **no sign-in**. Cookie `pd_ref` is set. A later
      reservation on `/p/[token]` carries the code.

### MANAGER module (Faza 11, run only when `OrganizationType.MANAGER` is in use)

- [ ] Trigger `POST /api/v1/jobs/manager-generate-dues` with the cron
      secret → 200. First run on day 1 of the month creates charges;
      a second run returns 200 with 0 new rows (idempotent on
      `(unitId, periodYear, periodMonth)`).
- [ ] Sign in as a seeded manager owner
      (`vlasnik@upravnikplus.test` / `PropertyDesk!2026`) and open
      `/zgrade`, `/zgrade/zaduzenja`, `/zgrade/kvarovi`,
      `/zgrade/skupstine`. Each list loads.
- [ ] Download one uplatnica PDF
      (`GET /api/v1/manager/dues/<id>/pdf`) and verify the IPS QR
      block + 14-digit model-97 reference print on the slip.
- [ ] Send a resident invitation from `/zgrade/stanari` and open the
      magic-link URL from the email in an incognito window. Cookie
      `pd_resident` is set; `/stanar/pocetna` lists only that
      resident's units. `DELETE /api/v1/manager/residents/<id>?reason=…`
      immediately revokes access (next refresh falls back to the
      sign-in page).
- [ ] From an investor seed account, open `/projekti/[id]` for a
      project with at least one `PAID` sale. Click **Predaj
      upravniku**, pick the manager org, submit. Switch to the manager
      account and open `/zgrade/predaje/[id]` → **Prihvati**. The
      transaction creates `ManagedBuilding`, `ManagedUnit`,
      `BuildingPerson`, `UnitOwnership` rows. Confirm
      `BuildingPerson` has **no** JMBG / `identityNumber` / `taxId`
      (ZZPL — see [`docs/obrada-podataka.md`](./obrada-podataka.md)).
- [ ] Download `GET /api/v1/manager/reports/godisnji/pdf?year=YYYY`
      and `GET /api/v1/manager/reports/export?report=manager-financial&format=xlsx`
      — both return a non-empty body.

## Communication

- [ ] Release note posted in the ops channel with the tag and the top
      3 user-visible changes.
- [ ] User-facing changelog updated on the marketing site (if the
      release changes user behaviour).

## Rollback readiness

- [ ] Previous image tag noted in the release channel — one command
      rollback available: `docker compose up -d --scale app=1` with the
      old image tag.
- [ ] Last known-good migration id recorded (for
      `prisma migrate resolve --rolled-back`).
