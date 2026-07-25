# Backup

## What to back up

1. **Postgres** — the DB is the sole source of truth for tenant data.
2. **Object storage** — uploaded documents. Local dev writes to
   `./storage/`; production uses S3.
3. **Environment / secrets** — the `.env` file (or platform secret
   store) is not backed up automatically. Keep a versioned encrypted
   copy off-host.

## Postgres — automated backups

### Neon

Neon takes automatic point-in-time backups. Configure the retention
window in the Neon console. Verify quarterly by cloning a branch from a
1-hour-ago snapshot.

### Self-hosted / Compose

Use `pg_dump` from the `db` service:

```bash
docker compose exec -T db \
  pg_dump -U propertydesk -d propertydesk --format=custom \
  > "backups/propertydesk-$(date +%Y%m%dT%H%M%S).pgcustom"
```

Schedule via host cron (Linux):

```
15 2 * * *  cd /opt/propertydesk && ./scripts/backup-db.sh
```

Retain 14 daily + 8 weekly. Rotate to encrypted off-host storage
(`rclone`, `restic`, `borg`, or S3 versioned bucket).

### Encryption

All backups must be encrypted at rest:

```bash
gpg --encrypt --recipient ops@propertydesk.app \
    backups/propertydesk-2026-07-15.pgcustom
```

## Object storage

- S3: enable **Versioning** + **Object Lock (Governance)** on the
  bucket. Cross-region replication to a second AWS region gives DR
  coverage for free.
- Local: rsync `storage/` alongside the DB dump.

## Verification

A backup that hasn't been restored is a guess. Run
[`docs/restore.md`](./restore.md) end-to-end on a fresh Postgres
quarterly and record the timing / row count in the incident channel.

## Retention policy

| Artifact | Daily | Weekly | Monthly | Yearly |
|----------|-------|--------|---------|--------|
| Postgres | 14 | 8 | 12 | 3 |
| Documents (S3) | infinite (versioned) | — | — | — |
| Audit log | infinite (never delete) | — | — | — |
