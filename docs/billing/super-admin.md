# Super-admin operator guide (billing)

This is the day-to-day cookbook for operating the billing module. All
routes below are under `/administracija/naplata` and require the
`SUPER_ADMIN` role.

## Where things live

| Section | Route | Purpose |
| --- | --- | --- |
| Dashboard | `/administracija/naplata` | KPIs, outstanding, queues. |
| Global settings | `/administracija/naplata/podesavanja` | Automation toggles, defaults, numbering. |
| Automation | `/administracija/naplata/automatizacija` | Job list, manual run, recent runs. |
| Company profile | `/administracija/naplata/profil-firme` | Issuer identity, SEF API key. |
| Bank accounts | `/administracija/naplata/racuni` | Add/deactivate operator bank accounts. |
| Invoices | `/administracija/naplata/fakture` | All-tenant list + drill-down. |
| Bank imports | `/administracija/naplata/izvodi` | Upload CSV/XLSX, review queue. |
| SEF | `/administracija/naplata/sef` | Provider config, submission history, retry. |
| Templates | `/administracija/naplata/sabloni` | 14 Serbian email templates. |
| Payments | `/administracija/naplata/uplate` | Recent payments across tenants. |
| Reminders | `/administracija/naplata/podsjetnici` | View global reminder schedule. |
| Plans | `/administracija/naplata/planovi` | Cyclical pricing view. |

Per-tenant billing operations live on
`/administracija/organizacije/{id}/naplata` — the "Naplata" tab on the
org detail page.

**Agencies are not billed.** An `AGENCY` org is on the hidden
`partner` plan (0 €). Naplata shows a partner note only — do not
change plan, issue an invoice, or restrict by trial expiry. Use
`SUSPENDED` / `CLOSED` if you must lock the account. Invoice and
overdue jobs skip agencies.

## Common tasks

### "The cron didn't run — help"

1. Open `/administracija/naplata/automatizacija`.
2. Find the job and click "Pokreni odmah". It respects the same
   concurrency lock, so if a run is already active you'll see
   `alreadyRunning: true` — wait it out and refresh.
3. If the last run is `FAILED`, the summary panel shows the error
   message and the stack trace.

### "Manually mark an invoice as paid"

1. Open `/administracija/naplata/fakture/{invoice-id}`.
2. Click "Zabeleži uplatu". Enter amount, method (`BANK_TRANSFER`,
   `CASH`, `CARD`, `IPS_QR`, `OTHER`), reference, and note.
3. The payment allocates FIFO across the invoice; overpayments stay as
   unapplied credit.

### "A tenant paid but we never got the bank statement"

Use "Zabeleži uplatu" (above) with method `BANK_TRANSFER` and paste the
tenant-supplied reference. Then check `/administracija/naplata/izvodi`
next time you upload the statement — the reference-based auto-matcher
will detect the duplicate and skip it (idempotent).

### "Reactivate a suspended tenant after they paid"

1. Record the payment (as above).
2. Open `/administracija/organizacije/{id}/naplata` and click
   "Reaktiviraj". Supply a reason like "Uplata potvrđena 17.07.".

### "Rotate the SEF API key"

1. `/administracija/naplata/profil-firme` → paste new key → save.
2. The old key is discarded (never persisted plain).
3. Watch `/administracija/naplata/sef` — the next `billing.sync-sef`
   run submits pending records with the new key.

### "Change the invoice numbering scheme mid-year"

Don't. Serbian tax law requires sequential numbers per issuer per year.
If you must (e.g. corporate rebrand), do it on Jan 1 and preserve the
old sequence rows for the audit trail.

## Emergencies

- **Runaway cron**: set `billingEnabled = false` on
  `GlobalBillingSettings` to disable all billing jobs. This is a hard
  kill switch — every job skips every tenant until you re-enable it.
- **Duplicate invoices**: the partial unique index prevents automatic
  duplication. If you see one, it was created via the "Nova faktura"
  form — void one via `/administracija/naplata/fakture/{id}` (action
  requires a reason).
- **Wrong amount posted**: reverse the payment
  (`billing.payment_reversed` audit) and re-record with the correct
  amount. Never edit the amount on a completed payment.
