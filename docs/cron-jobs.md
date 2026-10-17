# Cron Jobs

## Overview

All scheduled tasks are exposed as HTTP endpoints under `/api/v1/jobs/*`
guarded by the `x-cron-secret` header. The scheduler is deliberately
external — Vercel Cron, Fly.io cron, Kubernetes `CronJob`, systemd
timer, or a plain crontab all work.

The live app is `https://my.propertydesk.app`. The old hostname
`app.propertydesk.app` is not the production target. Installment
reminders from `due-soon-notifications` go to the salesperson on the
sale and, in the same job, to the buyer (installment due, reservation
expiring). A payment receipt email goes out when a payment is recorded
or reversed. Each buyer email is sent once.

Contract:

- `POST /api/v1/jobs/<name>`
- Header: `x-cron-secret: $CRON_SECRET`
- Response: `{ data: { processed, errors } }` — HTTP 200 even when
  nothing needed doing (jobs are idempotent).

## Job catalog

| Endpoint | Frequency | Purpose |
|----------|-----------|---------|
| `POST /api/v1/jobs/expire-reservations` | Every 15 min | Marks **APPROVED** reservations whose `expiresAt` has passed as `EXPIRED`, releases the unit, and emails the assigned member (or the creator). |
| `POST /api/v1/jobs/expire-reservation-requests` | Every 15 min | Marks public `PENDING` reservation requests past `expiresAt` as `EXPIRED` and releases the unit when no other live request remains. Opening the list still runs the same pass. |
| `POST /api/v1/jobs/expire-buyer-protection` | Hourly | Notifies agencies when a buyer protection is due to expire and records a lifecycle audit entry. |
| `POST /api/v1/jobs/mark-installments-overdue` | `0 3 * * *` | Flips `PaymentInstallment.status` to `OVERDUE` for unpaid installments past `dueDate`. |
| `POST /api/v1/jobs/due-soon-notifications` | `30 6 * * *` | Emails the salesperson about installments due in the next 7 days. Also emails the buyer (installment due within 7 days, approved reservation expiring within 2 days) and creates one high-priority task per deadline. |
| `POST /api/v1/jobs/expire-subscriptions` | `15 4 * * *` | Marks ended **investor** trials as `EXPIRED` and ended paid periods as `RESTRICTED`. **Skips `AGENCY`.** Heals leftover trial/RESTRICTED agencies to ACTIVE + `partner` (keeps `SUSPENDED`/`CLOSED`). |
| `POST /api/v1/jobs/trial-expiration-notifications` | `0 7 * * *` | Notifies organization owners about upcoming trial expirations (14/7/3/1 days ahead). Also runs the same expiry pass as `expire-subscriptions`. |
| `POST /api/v1/jobs/backup-verify` | `30 4 * * 0` | Downloads the latest `pg_dump` from configured storage, runs `pg_restore --list` to validate integrity, writes a `SystemHealthCheck` row, and emails `BACKUP_ALERT_EMAILS` when the two most recent runs are `FAIL`. See [`docs/monitoring.md`](./monitoring.md#backup-verifier). |
| `POST /api/v1/jobs/purge-deleted-documents` | Daily 04:00 | Deletes S3/local objects for documents soft-deleted in the app more than 45 days ago, then sets `Document.storagePurgedAt`. |

## Example crontab

```
*/15 * * * *  curl -fsS -X POST -H "x-cron-secret: $CRON_SECRET" https://my.propertydesk.app/api/v1/jobs/expire-reservations >/dev/null
*/15 * * * *  curl -fsS -X POST -H "x-cron-secret: $CRON_SECRET" https://my.propertydesk.app/api/v1/jobs/expire-reservation-requests >/dev/null
0    3 * * *  curl -fsS -X POST -H "x-cron-secret: $CRON_SECRET" https://my.propertydesk.app/api/v1/jobs/mark-installments-overdue >/dev/null
30   6 * * *  curl -fsS -X POST -H "x-cron-secret: $CRON_SECRET" https://my.propertydesk.app/api/v1/jobs/due-soon-notifications >/dev/null
15   4 * * *  curl -fsS -X POST -H "x-cron-secret: $CRON_SECRET" https://my.propertydesk.app/api/v1/jobs/expire-subscriptions >/dev/null
0    7 * * *  curl -fsS -X POST -H "x-cron-secret: $CRON_SECRET" https://my.propertydesk.app/api/v1/jobs/trial-expiration-notifications >/dev/null
0    * * * *  curl -fsS -X POST -H "x-cron-secret: $CRON_SECRET" https://my.propertydesk.app/api/v1/jobs/expire-buyer-protection >/dev/null
30   4 * * 0  curl -fsS -X POST -H "x-cron-secret: $CRON_SECRET" https://my.propertydesk.app/api/v1/jobs/backup-verify >/dev/null
0    4 * * *  curl -fsS -X POST -H "x-cron-secret: $CRON_SECRET" https://my.propertydesk.app/api/v1/jobs/purge-deleted-documents >/dev/null
0    9 * * *  curl -fsS -X POST -H "x-cron-secret: $CRON_SECRET" https://my.propertydesk.app/api/v1/jobs/billing-generate-invoices >/dev/null
15   * * * *  curl -fsS -X POST -H "x-cron-secret: $CRON_SECRET" https://my.propertydesk.app/api/v1/jobs/billing-send-invoices >/dev/null
30   9 * * *  curl -fsS -X POST -H "x-cron-secret: $CRON_SECRET" https://my.propertydesk.app/api/v1/jobs/billing-send-reminders >/dev/null
0    4 * * *  curl -fsS -X POST -H "x-cron-secret: $CRON_SECRET" https://my.propertydesk.app/api/v1/jobs/billing-process-overdue >/dev/null
45   4 * * *  curl -fsS -X POST -H "x-cron-secret: $CRON_SECRET" https://my.propertydesk.app/api/v1/jobs/billing-extend-subscriptions >/dev/null
45   * * * *  curl -fsS -X POST -H "x-cron-secret: $CRON_SECRET" https://my.propertydesk.app/api/v1/jobs/billing-sync-sef >/dev/null
0    5 * * *  curl -fsS -X POST -H "x-cron-secret: $CRON_SECRET" https://my.propertydesk.app/api/v1/jobs/billing-match-payments >/dev/null
```

`billing-sync-sef` only retries rows already marked `FAILED`. While
`SERBIAN_SEF` is not wired, those retries stay `FAILED` and must not
be read as portal acceptance. Leave the provider on `MANUAL` and
submit through the SEF portal.

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
                - https://my.propertydesk.app/api/v1/jobs/expire-reservations
```

## Observability

- Job runs log via the structured logger with fields
  `{ job, processed, errors, durationMs }`.
- Non-zero `errors` doesn't fail the HTTP response (idempotent
  semantics); check logs for the reason.
- Consider alerting on **absence** of a job run (Dead Man's Snitch,
  Better Uptime, Grafana Cloud) rather than on failure — a stuck
  scheduler is silent otherwise.
