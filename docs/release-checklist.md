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
      hostname exactly.

## Post-deploy smoke

- [ ] `curl -f https://<host>/api/v1/health` → 200
- [ ] `curl -f https://<host>/api/v1/ready` → 200 with `db:"ok"`
- [ ] Sign in and open the dashboard.
- [ ] Trigger `POST /api/v1/jobs/expire-reservations` with the cron
      secret → 200.
- [ ] Recent audit log rows appear in `/administracija/audit-log`.
- [ ] Send a test email (invite a fake member to a demo org) — arrives
      via the configured provider.

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
