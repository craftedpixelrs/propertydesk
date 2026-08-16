# Cron Jobs

## Overview

All scheduled tasks are exposed as HTTP endpoints under `/api/v1/jobs/*`
guarded by the `x-cron-secret` header. The scheduler is deliberately
external — Vercel Cron, Fly.io cron, Kubernetes `CronJob`, systemd
timer, or a plain crontab all work.

Contract:

- `POST /api/v1/jobs/<name>`
- Header: `x-cron-secret: $CRON_SECRET`
- Response: `{ data: { processed, errors } }` — HTTP 200 even when
  nothing needed doing (jobs are idempotent).

## Job catalog

| Endpoint | Frequency | Purpose |
|----------|-----------|---------|
| `POST /api/v1/jobs/expire-reservations` | Every 15 min | Marks `REQUESTED`/`APPROVED` reservations whose `expiresAt` has passed as `EXPIRED`, releases the unit, notifies the buyer + agency. |
| `POST /api/v1/jobs/expire-reservation-requests` | Every 15 min | Faza 8.1 A2. Marks public `ReservationRequest` rows past `expiresAt` as `EXPIRED`, releases the unit (`HELD` → `AVAILABLE`), notifies the applicant + investor. |
| `POST /api/v1/jobs/expire-buyer-protection` | Hourly | Notifies agencies when a buyer protection is due to expire and records a lifecycle audit entry. |
| `POST /api/v1/jobs/mark-installments-overdue` | Daily 01:15 | Flips `PaymentInstallment.status` to `OVERDUE` for unpaid installments past `dueDate`. |
| `POST /api/v1/jobs/due-soon-notifications` | Daily 07:00 | Emails + in-app notifications for installments due in the next 7 days. |
| `POST /api/v1/jobs/expire-subscriptions` | Daily 04:15 | Marks ended trials as `EXPIRED` and ended paid periods as `RESTRICTED`; org profile becomes `RESTRICTED` so the tenant cannot keep using the app. |
| `POST /api/v1/jobs/trial-expiration-notifications` | Daily 06:30 | Notifies organization owners about upcoming trial expirations (14/7/3/1 days ahead). Also runs the same expiry pass as `expire-subscriptions`. |
| `POST /api/v1/jobs/backup-verify` | Weekly Mon 03:00 | Faza 8.3 C4. Downloads the latest `pg_dump` from configured storage, runs `pg_restore --list` to validate integrity, writes a `SystemHealthCheck` row, and emails `BACKUP_ALERT_EMAILS` when the two most recent runs are `FAIL`. See [`docs/monitoring.md`](./monitoring.md#backup-verifier). |
| `POST /api/v1/jobs/purge-deleted-documents` | Daily 04:00 | Deletes S3/local objects for documents soft-deleted in the app more than 45 days ago, then sets `Document.storagePurgedAt`. |

## Example crontab

```
*/15 * * * *  curl -fsS -X POST -H "x-cron-secret: $CRON_SECRET" https://app.propertydesk.app/api/v1/jobs/expire-reservations >/dev/null
*/15 * * * *  curl -fsS -X POST -H "x-cron-secret: $CRON_SECRET" https://app.propertydesk.app/api/v1/jobs/expire-reservation-requests >/dev/null
15   1 * * *  curl -fsS -X POST -H "x-cron-secret: $CRON_SECRET" https://app.propertydesk.app/api/v1/jobs/mark-installments-overdue >/dev/null
0    7 * * *  curl -fsS -X POST -H "x-cron-secret: $CRON_SECRET" https://app.propertydesk.app/api/v1/jobs/due-soon-notifications >/dev/null
15   4 * * *  curl -fsS -X POST -H "x-cron-secret: $CRON_SECRET" https://app.propertydesk.app/api/v1/jobs/expire-subscriptions >/dev/null
30   6 * * *  curl -fsS -X POST -H "x-cron-secret: $CRON_SECRET" https://app.propertydesk.app/api/v1/jobs/trial-expiration-notifications >/dev/null
0    * * * *  curl -fsS -X POST -H "x-cron-secret: $CRON_SECRET" https://app.propertydesk.app/api/v1/jobs/expire-buyer-protection >/dev/null
0    3 * * 1  curl -fsS -X POST -H "x-cron-secret: $CRON_SECRET" https://app.propertydesk.app/api/v1/jobs/backup-verify >/dev/null
0    4 * * *  curl -fsS -X POST -H "x-cron-secret: $CRON_SECRET" https://app.propertydesk.app/api/v1/jobs/purge-deleted-documents >/dev/null
```

Kubernetes `CronJob` example:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: expire-reservations
spec:
  schedule: "*/15 * * * *"
  concurrencyPolicy: Forbid
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: Never
          containers:
            - name: curl
              image: curlimages/curl:8.7.1
              env:
                - name: CRON_SECRET
                  valueFrom: { secretKeyRef: { name: propertydesk, key: CRON_SECRET } }
              args:
                - -fsS
                - -X
                - POST
                - -H
                - "x-cron-secret: $(CRON_SECRET)"
                - https://app.propertydesk.app/api/v1/jobs/expire-reservations
```

## Observability

- Job runs log via the structured logger with fields
  `{ job, processed, errors, durationMs }`.
- Non-zero `errors` doesn't fail the HTTP response (idempotent
  semantics); check logs for the reason.
- Consider alerting on **absence** of a job run (Dead Man's Snitch,
  Better Uptime, Grafana Cloud) rather than on failure — a stuck
  scheduler is silent otherwise.
