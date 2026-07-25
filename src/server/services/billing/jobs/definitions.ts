import "server-only";
import type { BillingJobType } from "@prisma/client";

import { getJob, registerJob } from "@/server/jobs";
import { logger } from "@/server/logger";

import { runBillingJob, type BillingJobSummary } from "./runner";
import { getOrCreateGlobalBillingSettings } from "../settings/global.service";
import { generateDueSubscriptionInvoices } from "../invoices/generation.service";
import { sendIssuedInvoices } from "./send-invoices";
import { sendDueReminders } from "../reminders/service";
import { processOverdueSubscriptions } from "../overdue/service";

/**
 * Registers all seven billing cron jobs. Each is protected by:
 *   - the singleton `billing_job_run_type_running_unique` lock, and
 *   - the master `GlobalBillingSettings.billingEnabled` kill-switch, and
 *   - per-domain automation toggles (e.g. `autoGenerateInvoicesEnabled`).
 *
 * When the master switch is off, the job returns immediately without doing
 * work and reports `skipped=1`. When a per-domain toggle is off, individual
 * subscriptions/invoices are still filtered inside each service so a manual
 * "Generate now" for a specific org keeps working.
 *
 * Job outputs are structured in the standard `JobRunResult` shape so the
 * `/api/v1/jobs/{name}` route reports them uniformly.
 */

function ensure(name: string, register: () => void): void {
  if (!getJob(name)) register();
}

async function isBillingMasterEnabled(): Promise<boolean> {
  try {
    const settings = await getOrCreateGlobalBillingSettings();
    return settings.billingEnabled === true;
  } catch (err) {
    logger.error("billing.settings_read_failed", {
      error: (err as Error)?.message,
    });
    return false;
  }
}

function toResult(summary: {
  status: string;
  summary: BillingJobSummary;
  durationMs: number;
}) {
  return {
    processed: summary.summary.processed ?? 0,
    updated: summary.summary.succeeded ?? 0,
    skipped: summary.summary.skipped ?? 0,
    errors: summary.summary.errors ?? 0,
    details: {
      status: summary.status,
      durationMs: summary.durationMs,
      ...(summary.summary.detail ?? {}),
    },
  };
}

// -----------------------------------------------------------------------------
// 1) generate-invoices — daily
// -----------------------------------------------------------------------------

ensure("billing-generate-invoices", () =>
  registerJob({
    name: "billing-generate-invoices",
    description:
      "Kreira automatske fakture za sve pretplate čiji je period naplate stigao. Idempotentno.",
    suggestedCron: "0 9 * * *",
    run: async () => {
      if (!(await isBillingMasterEnabled())) {
        return { processed: 0, skipped: 1, details: { reason: "billing_disabled" } };
      }
      const result = await runBillingJob(
        "GENERATE_INVOICES" satisfies BillingJobType,
        async (): Promise<BillingJobSummary> => {
          const s = await generateDueSubscriptionInvoices({ autoIssue: false });
          return {
            processed: s.total,
            succeeded: s.generated,
            errors: s.errors,
            skipped: s.skipped,
            detail: { invoiceIds: s.invoiceIds, errorDetails: s.errorDetails },
          };
        },
        { triggeredBy: "cron" },
      );
      return toResult(result);
    },
  }),
);

// -----------------------------------------------------------------------------
// 2) auto-send — hourly (issued invoices become sent)
// -----------------------------------------------------------------------------

ensure("billing-send-invoices", () =>
  registerJob({
    name: "billing-send-invoices",
    description:
      "Šalje izdate (ISSUED) fakture — email + in-app obaveštenje — kada je autoSend uključen.",
    suggestedCron: "15 * * * *",
    run: async () => {
      if (!(await isBillingMasterEnabled())) {
        return { processed: 0, skipped: 1, details: { reason: "billing_disabled" } };
      }
      const result = await runBillingJob(
        "SEND_INVOICES" satisfies BillingJobType,
        async (): Promise<BillingJobSummary> => {
          const s = await sendIssuedInvoices();
          return {
            processed: s.invoicesConsidered,
            succeeded: s.sent,
            errors: s.errors,
            skipped: s.skipped,
            detail: { errorDetails: s.errorDetails },
          };
        },
        { triggeredBy: "cron" },
      );
      return toResult(result);
    },
  }),
);

// -----------------------------------------------------------------------------
// 3) send-reminders — daily
// -----------------------------------------------------------------------------

ensure("billing-send-reminders", () =>
  registerJob({
    name: "billing-send-reminders",
    description:
      "Šalje podsetnike za neplaćene fakture prema podešenom rasporedu (T-7, T-1, T+1, T+7, T+14).",
    suggestedCron: "30 9 * * *",
    run: async () => {
      if (!(await isBillingMasterEnabled())) {
        return { processed: 0, skipped: 1, details: { reason: "billing_disabled" } };
      }
      const result = await runBillingJob(
        "SEND_REMINDERS" satisfies BillingJobType,
        async (): Promise<BillingJobSummary> => {
          const s = await sendDueReminders();
          return {
            processed: s.invoicesConsidered,
            succeeded: s.remindersSent,
            errors: s.errors,
            skipped: s.skipped,
            detail: { errorDetails: s.errorDetails },
          };
        },
        { triggeredBy: "cron" },
      );
      return toResult(result);
    },
  }),
);

// -----------------------------------------------------------------------------
// 4) process-overdue — daily
// -----------------------------------------------------------------------------

ensure("billing-process-overdue", () =>
  registerJob({
    name: "billing-process-overdue",
    description:
      "Prelazi pretplate kroz PAYMENT_DUE → PAST_DUE → RESTRICTED → SUSPENDED prema pragovima.",
    suggestedCron: "0 4 * * *",
    run: async () => {
      if (!(await isBillingMasterEnabled())) {
        return { processed: 0, skipped: 1, details: { reason: "billing_disabled" } };
      }
      const result = await runBillingJob(
        "PROCESS_OVERDUE" satisfies BillingJobType,
        async (): Promise<BillingJobSummary> => {
          const s = await processOverdueSubscriptions();
          return {
            processed: s.subscriptionsConsidered,
            succeeded: s.transitioned,
            errors: s.errors,
            skipped: s.skipped,
            detail: { transitions: s.transitions, errorDetails: s.errorDetails },
          };
        },
        { triggeredBy: "cron" },
      );
      return toResult(result);
    },
  }),
);

// -----------------------------------------------------------------------------
// 5) extend-subscriptions — daily reconciliation
// -----------------------------------------------------------------------------

ensure("billing-extend-subscriptions", () =>
  registerJob({
    name: "billing-extend-subscriptions",
    description:
      "Rekoncilijacija: proširuje aktivne pretplate čije je plaćanje registrovano ali currentPeriodEnd nije pomeren.",
    suggestedCron: "45 4 * * *",
    run: async () => {
      if (!(await isBillingMasterEnabled())) {
        return { processed: 0, skipped: 1, details: { reason: "billing_disabled" } };
      }
      const result = await runBillingJob(
        "EXTEND_SUBSCRIPTIONS" satisfies BillingJobType,
        async (): Promise<BillingJobSummary> => {
          const { reconcileSubscriptionExtensions } = await import(
            "./extend-subscriptions"
          );
          const s = await reconcileSubscriptionExtensions();
          return {
            processed: s.considered,
            succeeded: s.extended,
            errors: s.errors,
            skipped: s.skipped,
            detail: {},
          };
        },
        { triggeredBy: "cron" },
      );
      return toResult(result);
    },
  }),
);

// -----------------------------------------------------------------------------
// 6) sync-sef — hourly
// -----------------------------------------------------------------------------

ensure("billing-sync-sef", () =>
  registerJob({
    name: "billing-sync-sef",
    description:
      "Ponovo pokušava slanje elektronskih faktura koje su ostale u statusu FAILED (SEF integracija).",
    suggestedCron: "45 * * * *",
    run: async () => {
      if (!(await isBillingMasterEnabled())) {
        return { processed: 0, skipped: 1, details: { reason: "billing_disabled" } };
      }
      const result = await runBillingJob(
        "SYNC_SEF" satisfies BillingJobType,
        async (): Promise<BillingJobSummary> => {
          const { retrySefSubmissions } = await import(
            "../electronic-invoice/service"
          );
          const s = await retrySefSubmissions();
          return {
            processed: s.considered,
            succeeded: s.retried,
            errors: s.errors,
            skipped: s.skipped,
            detail: { errorDetails: s.errorDetails ?? [] },
          };
        },
        { triggeredBy: "cron" },
      );
      return toResult(result);
    },
  }),
);

// -----------------------------------------------------------------------------
// 7) match-payments — daily (auto-match pending bank statement transactions)
// -----------------------------------------------------------------------------

ensure("billing-match-payments", () =>
  registerJob({
    name: "billing-match-payments",
    description:
      "Automatsko sparivanje uvezenih transakcija sa bankovnog izvoda uz otvorene fakture.",
    suggestedCron: "0 5 * * *",
    run: async () => {
      if (!(await isBillingMasterEnabled())) {
        return { processed: 0, skipped: 1, details: { reason: "billing_disabled" } };
      }
      const result = await runBillingJob(
        "MATCH_PAYMENTS" satisfies BillingJobType,
        async (): Promise<BillingJobSummary> => {
          const { autoMatchPendingBankTransactions } = await import(
            "../bank-statement/service"
          );
          const s = await autoMatchPendingBankTransactions();
          return {
            processed: s.considered,
            succeeded: s.matched,
            errors: s.errors,
            skipped: s.skipped,
            detail: {},
          };
        },
        { triggeredBy: "cron" },
      );
      return toResult(result);
    },
  }),
);
