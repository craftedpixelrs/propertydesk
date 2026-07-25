# Restore

## Prerequisites

- The most recent DB backup (e.g. `propertydesk-YYYYMMDD.pgcustom`).
- Object-storage snapshot (S3 bucket version or `storage/` copy).
- `.env` with production or restored-into values.

## Postgres

### Point-in-time restore on Neon

1. Open the Neon console → **Branches** → **Create branch from time**.
2. Copy the connection string of the new branch.
3. Set `DATABASE_URL` + `DIRECT_URL` to the new branch URL.
4. Run `pnpm prisma migrate deploy` to make sure the schema matches the
   deployed app.
5. Cut over app traffic to the new branch (env swap + redeploy).
6. When the old branch is safe to delete, do so from the console.

### Self-hosted restore

```bash
# 1. Stop the app so writes stop.
docker compose stop app

# 2. Drop + recreate the DB (or restore into a fresh one).
docker compose exec db psql -U postgres -c "DROP DATABASE propertydesk"
docker compose exec db psql -U postgres -c "CREATE DATABASE propertydesk OWNER propertydesk"

# 3. Restore the dump.
cat backups/propertydesk-YYYYMMDD.pgcustom | \
  docker compose exec -T db pg_restore -U propertydesk -d propertydesk --clean --if-exists

# 4. Apply any pending migrations (usually a no-op).
docker compose exec app pnpm prisma migrate deploy

# 5. Restart the app.
docker compose start app
```

## Object storage

- S3 with versioning: use `aws s3api list-object-versions` +
  `restore-object` (or the console UI) to promote a version to the
  latest.
- Local `storage/`: replace the folder with the snapshot copy.

## Smoke checks after restore

1. `curl -f https://<host>/api/v1/ready` returns 200 (DB reachable).
2. Sign in as the super-admin from the environment.
3. Open `/administracija/pregled` — usage counts populate.
4. Open a project → **Jedinice** — units load with their prices.
5. Trigger `POST /api/v1/jobs/expire-reservations` and confirm 200
   + no errors in logs.

## Post-restore actions

- Rotate `BETTER_AUTH_SECRET` if you suspect the previous DB was
  compromised. This invalidates all sessions and forces re-login.
- Rotate `CRON_SECRET` and `IMPERSONATION_SECRET` at the same time.
- Announce the restore in the incident channel and record the RPO/RTO
  achieved.
