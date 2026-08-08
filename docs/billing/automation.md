# Billing automation

## Cron jobs

| Name | Suggested cron (Europe/Belgrade) | Toggle | Purpose |
| --- | --- | --- | --- |
| `billing.generate-invoices` | daily 09:00 | `autoGenerateInvoicesEnabled` | Create AUTOMATIC invoices for subscriptions whose next billing date has arrived. |
| `billing.send-invoices` | daily 09:15 | `autoSendInvoicesEnabled` | Send ISSUED invoices via email + in-app; mark as SENT. |
| `billing.reminders` | daily 09:30 | `autoRemindersEnabled` | Send pre-due, due-day, post-due, and final-notice reminders. |
| `billing.overdue` | daily 09:45 | `autoOverdueEnabled` | Advance subscriptions PAYMENT_DUE → PAST_DUE → RESTRICTED → SUSPENDED. |
| `billing.extend-subscriptions` | daily 10:00 | `autoExtendSubscriptions` | Reconcile subscription periods after PAID invoices. |
| `billing.sync-sef` | daily 10:15 | `electronicInvoiceEnabled` | Retry failed SEF submissions. |
| `billing.match-payments` | daily 10:30 | (always on when statement present) | Re-run the 5-signal matcher on pending bank statement lines. |

Cron is set up externally (Vercel Cron, GitHub Actions, or your CI) and
POSTs to `/api/v1/cron/run/{name}` with the shared secret `CRON_SECRET`.

## Manual runs

Super-admin can trigger any job immediately at
`/administracija/naplata/automatizacija` — the button posts to
`/api/v1/billing/jobs/{name}/run`. The run is subject to the same lock
and audit as a cron-triggered run, so a manual trigger cannot fight with
a concurrent cron pass.

## Feature toggles

Each job first calls `resolveBillingSettings(organizationId)` and skips
the tenant when either `billingEnabled === false` or the automation flag
is off. That means:

- Turning off `autoRestrictAccessEnabled` won't _reverse_ existing
  RESTRICTED subscriptions — it just prevents new ones. Reactivate them
  via the org billing tab.
- Turning off `autoGenerateInvoicesEnabled` prevents new AUTOMATIC
  invoices — manually-drafted invoices still work.

## Concurrency guarantees

Every job runs inside `runBillingJob(type, fn)`:

1. Attempts to `INSERT` a `BillingJobRun` row with `status = 'RUNNING'`.
2. If the partial unique index blocks the insert, records "already
   running" and exits cleanly.
3. Otherwise executes `fn`, captures the summary, updates the row to
   `COMPLETED` or `FAILED` on catch.
4. Emits an audit event `billing.job_run` with the summary payload.

This means a stuck cron run doesn't multiply — the second run
short-circuits until the first row is closed (or a super-admin nukes it
from `/administracija/naplata/automatizacija`).
