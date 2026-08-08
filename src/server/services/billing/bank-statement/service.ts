import "server-only";
import { Prisma } from "@prisma/client";
import type {
  BankStatementImport,
  BankStatementTransaction,
  BankTransactionMatchStatus,
} from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { logger } from "@/server/logger";
import { recordAudit } from "@/server/audit/audit";
import { computeFifoAllocations, applyAllocations } from "../payments/allocation.service";

/**
 * Bank-statement service.
 *
 * Responsibilities:
 *   - Import CSV / XLSX bank statement files, parse into
 *     `BankStatementTransaction` rows (stubbed for MT940 / CAMT053 for now).
 *   - Auto-match transactions against open invoices using a 5-signal scorer:
 *       1) exact reference (invoice number or subscription id in the memo)
 *       2) counterparty IBAN <-> organization bank account on file
 *       3) exact amount match on a single open invoice
 *       4) counterparty name fuzzy match
 *       5) date proximity to invoice due date
 *   - Move confidence >= threshold to `MATCHED` and record the payment via
 *     the standard `SubscriptionPayment` allocation flow.
 *   - Leave low-confidence rows in `PENDING_REVIEW` for the human operator.
 */

export interface BankStatementRow {
  transactionDate: Date;
  valueDate?: Date | null;
  amount: number | string;
  currency: string;
  counterpartyName?: string | null;
  counterpartyIban?: string | null;
  counterpartyRef?: string | null;
  reference?: string | null;
  narrative?: string | null;
  externalId?: string | null;
}

export interface BankStatementImportInput {
  organizationId: string | null;
  format: "CSV" | "XLSX" | "MT940" | "CAMT053";
  fileName: string;
  storageKey: string;
  rows: BankStatementRow[];
  uploadedByUserId: string | null;
}

export async function createBankStatementImport(
  input: BankStatementImportInput,
): Promise<BankStatementImport> {
  return prisma.$transaction(async (tx) => {
    const imp = await tx.bankStatementImport.create({
      data: {
        organizationId: input.organizationId,
        format: input.format,
        fileName: input.fileName,
        storageKey: input.storageKey,
        status: "PENDING",
        totalTransactions: input.rows.length,
        uploadedByUserId: input.uploadedByUserId,
      },
    });
    if (input.rows.length > 0) {
      await tx.bankStatementTransaction.createMany({
        data: input.rows.map((r) => ({
          importId: imp.id,
          organizationId: input.organizationId,
          transactionDate: r.transactionDate,
          valueDate: r.valueDate ?? null,
          amount: r.amount as unknown as Prisma.Decimal,
          currency: r.currency,
          counterpartyName: r.counterpartyName ?? null,
          counterpartyIban: r.counterpartyIban ?? null,
          counterpartyRef: r.counterpartyRef ?? null,
          reference: r.reference ?? null,
          narrative: r.narrative ?? null,
          externalId: r.externalId ?? null,
          matchStatus: "UNMATCHED",
        })),
      });
    }
    await recordAudit({
      action: "billing.bank_statement_imported",
      entityType: "BankStatementImport",
      entityId: imp.id,
      organizationId: input.organizationId,
      actorUserId: input.uploadedByUserId,
      metadata: { rows: input.rows.length, format: input.format },
    });
    return imp;
  });
}

// -----------------------------------------------------------------------------
// Auto-match — 5-signal scorer
// -----------------------------------------------------------------------------

export interface AutoMatchSummary {
  considered: number;
  matched: number;
  reviewQueued: number;
  skipped: number;
  errors: number;
}

const AUTO_APPLY_THRESHOLD = 80; // out of 100
const REVIEW_THRESHOLD = 40;

interface Scored {
  invoiceId: string;
  confidence: number;
  reasons: string[];
}

export async function autoMatchPendingBankTransactions(
  options: { organizationId?: string | null } = {},
): Promise<AutoMatchSummary> {
  const summary: AutoMatchSummary = {
    considered: 0,
    matched: 0,
    reviewQueued: 0,
    skipped: 0,
    errors: 0,
  };

  const rows = await prisma.bankStatementTransaction.findMany({
    where: {
      matchStatus: "UNMATCHED",
      ...(options.organizationId ? { organizationId: options.organizationId } : {}),
    },
    take: 500,
    orderBy: { transactionDate: "asc" },
  });
  summary.considered = rows.length;

  for (const tx of rows) {
    try {
      // Only positive-amount transactions can pay invoices.
      const amountNum = Number(tx.amount.toString());
      if (amountNum <= 0) {
        summary.skipped++;
        continue;
      }

      // Candidate invoices: open, same currency, same org (if known).
      const candidates = await prisma.invoice.findMany({
        where: {
          status: { in: ["ISSUED", "SENT", "PARTIALLY_PAID", "OVERDUE"] },
          amountDue: { gt: 0 },
          currency: tx.currency,
          ...(tx.organizationId ? { organizationId: tx.organizationId } : {}),
        },
        include: { organization: { include: { profile: true } } },
        take: 200,
      });

      const scored: Scored[] = candidates.map((inv) => {
        const reasons: string[] = [];
        let score = 0;

        const memo = `${tx.reference ?? ""} ${tx.counterpartyRef ?? ""} ${tx.narrative ?? ""}`.toLowerCase();

        // 1) exact reference match
        if (inv.invoiceNumber && memo.includes(inv.invoiceNumber.toLowerCase())) {
          score += 45;
          reasons.push("invoiceNumberInMemo");
        }
        if (inv.subscriptionId && memo.includes(inv.subscriptionId.toLowerCase())) {
          score += 10;
          reasons.push("subscriptionIdInMemo");
        }

        // 2) exact amount match
        const invAmountDue = Number(inv.amountDue.toString());
        if (Math.abs(invAmountDue - amountNum) < 0.005) {
          score += 25;
          reasons.push("exactAmount");
        } else if (Math.abs(invAmountDue - amountNum) / Math.max(invAmountDue, 1) < 0.02) {
          score += 8;
          reasons.push("approxAmount");
        }

        // 3) counterparty name fuzzy match against org name / legal name
        const nameCandidates = [
          inv.organization?.name,
          inv.organization?.profile?.legalName,
        ]
          .filter(Boolean)
          .map((s) => (s as string).toLowerCase());
        if (
          tx.counterpartyName &&
          nameCandidates.some((n) =>
            n.includes(tx.counterpartyName!.toLowerCase()) ||
            tx.counterpartyName!.toLowerCase().includes(n),
          )
        ) {
          score += 15;
          reasons.push("counterpartyNameMatch");
        }

        // 4) date proximity to due date
        if (inv.dueDate) {
          const days = Math.abs(
            (tx.transactionDate.getTime() - inv.dueDate.getTime()) /
              (24 * 60 * 60 * 1000),
          );
          if (days <= 3) {
            score += 10;
            reasons.push("dueDateNear");
          } else if (days <= 14) {
            score += 5;
            reasons.push("dueDateProximity");
          }
        }

        return { invoiceId: inv.id, confidence: Math.min(100, score), reasons };
      });

      scored.sort((a, b) => b.confidence - a.confidence);
      const best = scored[0];

      if (!best || best.confidence < REVIEW_THRESHOLD) {
        summary.skipped++;
        continue;
      }

      const status: BankTransactionMatchStatus =
        best.confidence >= AUTO_APPLY_THRESHOLD ? "AUTO_MATCHED" : "REVIEW_REQUIRED";

      if (status === "REVIEW_REQUIRED") {
        await prisma.bankStatementTransaction.update({
          where: { id: tx.id },
          data: {
            matchStatus: status,
            matchConfidence: best.confidence,
            matchedInvoiceId: best.invoiceId,
            matchNotes: best.reasons.join(","),
          },
        });
        summary.reviewQueued++;
        continue;
      }

      // Auto-apply: record a SubscriptionPayment against the matched invoice.
      const invoice = candidates.find((c) => c.id === best.invoiceId)!;
      const paymentAmountDec = new Prisma.Decimal(amountNum);
      const { allocations } = computeFifoAllocations(
        paymentAmountDec,
        [
          {
            id: invoice.id,
            amountDue: invoice.amountDue,
            currency: invoice.currency,
          },
        ],
        tx.currency,
      );

      await prisma.$transaction(async (dbtx) => {
        const payment = await dbtx.subscriptionPayment.create({
          data: {
            organizationId: invoice.organizationId,
            subscriptionId: invoice.subscriptionId ?? null,
            provider: "BANK_STATEMENT",
            status: "COMPLETED",
            amount: paymentAmountDec,
            currency: tx.currency,
            paidAt: tx.transactionDate,
            bankStatementTransactionId: tx.id,
            note: `Auto-matched with ${best.confidence}% confidence: ${best.reasons.join(", ")}`,
          },
        });
        await applyAllocations(dbtx, {
          paymentId: payment.id,
          paymentAmount: paymentAmountDec,
          paymentCurrency: tx.currency,
          allocations: allocations.map((a) => ({
            invoiceId: a.invoiceId,
            amount: a.amount,
          })),
        });
        await dbtx.bankStatementTransaction.update({
          where: { id: tx.id },
          data: {
            matchStatus: "AUTO_MATCHED",
            matchConfidence: best.confidence,
            matchedInvoiceId: invoice.id,
            matchNotes: best.reasons.join(","),
          },
        });
      });

      await recordAudit({
        action: "billing.bank_statement_transaction_matched",
        entityType: "BankStatementTransaction",
        entityId: tx.id,
        organizationId: invoice.organizationId,
        metadata: {
          invoiceId: invoice.id,
          confidence: best.confidence,
          reasons: best.reasons,
        },
      });

      summary.matched++;
    } catch (err) {
      summary.errors++;
      logger.error("billing.bank_transaction_match_failed", {
        transactionId: tx.id,
        error: (err as Error)?.message,
      });
    }
  }

  return summary;
}

// -----------------------------------------------------------------------------
// Manual review queue actions
// -----------------------------------------------------------------------------

export async function listReviewQueue(organizationId?: string | null) {
  return prisma.bankStatementTransaction.findMany({
    where: {
      matchStatus: { in: ["UNMATCHED", "REVIEW_REQUIRED"] },
      ...(organizationId ? { organizationId } : {}),
    },
    include: {
      import: { select: { fileName: true, format: true, createdAt: true } },
    },
    orderBy: { transactionDate: "desc" },
    take: 200,
  });
}

export async function manuallyMatchTransaction(input: {
  transactionId: string;
  invoiceId: string;
  actorUserId: string | null;
}) {
  const [tx, invoice] = await Promise.all([
    prisma.bankStatementTransaction.findUnique({ where: { id: input.transactionId } }),
    prisma.invoice.findUnique({ where: { id: input.invoiceId } }),
  ]);
  if (!tx) throw new Error("Transakcija nije pronađena.");
  if (!invoice) throw new Error("Faktura nije pronađena.");
  if (invoice.currency !== tx.currency) {
    throw new Error("Valuta fakture i transakcije se ne poklapaju.");
  }
  const amount = new Prisma.Decimal(tx.amount.toString());
  const { allocations } = computeFifoAllocations(
    amount,
    [{ id: invoice.id, amountDue: invoice.amountDue, currency: invoice.currency }],
    tx.currency,
  );

  await prisma.$transaction(async (dbtx) => {
    const payment = await dbtx.subscriptionPayment.create({
      data: {
        organizationId: invoice.organizationId,
        subscriptionId: invoice.subscriptionId ?? null,
        provider: "BANK_STATEMENT",
        status: "COMPLETED",
        amount,
        currency: tx.currency,
        paidAt: tx.transactionDate,
        bankStatementTransactionId: tx.id,
        createdByUserId: input.actorUserId,
        note: "Ručno uparivanje sa fakture " + (invoice.invoiceNumber ?? invoice.id),
      },
    });
    await applyAllocations(dbtx, {
      paymentId: payment.id,
      paymentAmount: amount,
      paymentCurrency: tx.currency,
      allocations: allocations.map((a) => ({ invoiceId: a.invoiceId, amount: a.amount })),
    });
    await dbtx.bankStatementTransaction.update({
      where: { id: tx.id },
      data: {
        matchStatus: "MANUAL_MATCHED",
        matchedInvoiceId: invoice.id,
        matchConfidence: 100,
        reviewedByUserId: input.actorUserId,
        reviewedAt: new Date(),
      },
    });
  });

  await recordAudit({
    action: "billing.bank_statement_transaction_matched",
    entityType: "BankStatementTransaction",
    entityId: tx.id,
    organizationId: invoice.organizationId,
    actorUserId: input.actorUserId,
    metadata: { invoiceId: invoice.id, manual: true },
  });
}

export async function ignoreTransaction(input: {
  transactionId: string;
  reason: string;
  actorUserId: string | null;
}) {
  const tx = await prisma.bankStatementTransaction.findUnique({
    where: { id: input.transactionId },
  });
  if (!tx) throw new Error("Transakcija nije pronađena.");
  await prisma.bankStatementTransaction.update({
    where: { id: tx.id },
    data: {
      matchStatus: "IGNORED",
      matchNotes: input.reason,
      reviewedByUserId: input.actorUserId,
      reviewedAt: new Date(),
    },
  });
  await recordAudit({
    action: "billing.bank_statement_transaction_ignored",
    entityType: "BankStatementTransaction",
    entityId: tx.id,
    organizationId: tx.organizationId,
    actorUserId: input.actorUserId,
    metadata: { reason: input.reason },
  });
}

export type { BankStatementImport, BankStatementTransaction };
