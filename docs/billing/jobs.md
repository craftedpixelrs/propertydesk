# Billing jobs runtime

## Job registry

All jobs live in
[`billing/jobs/definitions.ts`](../../src/server/services/billing/jobs/definitions.ts).
They register with the app-wide job registry at boot via
`src/server/jobs/definitions.ts`, so a single `runJob(name)` call
executes them just like any other cron.

## The `runBillingJob` wrapper

Every billing job wraps its worker in
[`runBillingJob(type, fn)`](../../src/server/services/billing/jobs/runner.ts):

```ts
await runBillingJob('GENERATE_INVOICES', async ({ actorUserId }) => {
  const summary = await generateDueSubscriptionInvoices({ actorUserId });
  return { totals: summary };
});
```

The wrapper:

1. `INSERT`s a `BillingJobRun { type, status: 'RUNNING', startedAt: now }`.
   The partial unique index `billing_job_run_type_running_unique` on
   `(type) WHERE status = 'RUNNING'` prevents two concurrent runs of the
   same job. P2002 is caught and reported as `alreadyRunning: true`.
2. Times the run and captures the returned summary.
3. On success, updates the row to `COMPLETED` with the summary payload.
4. On thrown error, updates to `FAILED` and stores the error message and
   stack trace.
5. Records an audit entry `billing.job_run` regardless of outcome.

## Master toggle

`GlobalBillingSettings.billingEnabled = false` disables every billing
job wholesale. Individual jobs are toggled by the automation flags —
see [automation.md](./automation.md) for the matrix.

## Manual run + monitoring

`/administracija/naplata/automatizacija` provides:

- One-click "Pokreni odmah" for each job (audit + concurrency guard
  still enforced).
- The last 20 runs per job, with per-run summary, error message, and
  duration.

The endpoint is `POST /api/v1/billing/jobs/{name}/run` — the name must
start with `billing-` to prevent operators from running non-billing jobs
through the billing surface.

## Failure semantics

- **Transient failure** (e.g. DB blip): job marked `FAILED`, next
  scheduled run re-attempts. No state change on the affected entities.
- **Domain error** (e.g. SEF rejects invoice): the record is marked
  appropriately and the job continues with the next tenant. Nothing
  short-circuits the outer loop.
- **Panic** (uncaught throw): `runBillingJob` catches it, records
  `FAILED`, and re-throws so any external monitor (Sentry, Vercel logs)
  captures the stack.

## Adding a new job

1. Write your worker in `services/billing/jobs/{name}.ts`. It must
   return a JSON-serializable summary.
2. Register it in `services/billing/jobs/definitions.ts` inside `ensure`,
   using a new value from the `BillingJobType` enum in the Prisma
   schema.
3. Wire the corresponding automation toggle in `GlobalBillingSettings`
   if the job should be opt-out.
4. Add a suggested cron entry to [automation.md](./automation.md).
