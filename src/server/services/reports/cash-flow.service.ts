import "server-only";
import { Prisma } from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { toDecimal } from "@/lib/formatters/money";

/**
 * Cash-flow projection service — Faza 8.1 (A3).
 *
 * Groups every open `PaymentInstallment` (across every active
 * PaymentPlan in the org) into monthly buckets ("expected inflow")
 * and pairs them with historical `Payment` totals ("actual inflow")
 * over the same window so the investor sees the runway at a glance.
 *
 * We deliberately exclude `PAID` installments — the historical
 * `payment` table is the source of truth for what actually landed;
 * the `installment.status='PAID'` row is only a reconciliation
 * artefact.
 */

const REPORT_TIME_ZONE = "Europe/Belgrade";

export interface CashFlowFilters {
  organizationId: string;
  projectId?: string | null;
  months?: number;
}

export interface CashFlowBucket {
  bucketStart: string;
  bucketLabel: string;
  currency: string;
  expected: string;
  received: string;
  net: string;
}

export interface CashFlowSummary {
  currency: string;
  expectedTotal: string;
  receivedTotal: string;
  overdueTotal: string;
}

export interface CashFlowProjection {
  filters: CashFlowFilters;
  monthsAhead: number;
  currencies: string[];
  buckets: CashFlowBucket[];
  summaries: CashFlowSummary[];
}

type ExpectedRow = {
  bucket: Date | string;
  currency: string;
  total: string | null;
};

type ReceivedRow = {
  bucket: Date | string;
  currency: string;
  total: string | null;
};

function toBucketLabel(d: Date): string {
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth() + 1;
  return `${year}-${month.toString().padStart(2, "0")}`;
}

/**
 * Roll up `Payment` and `PaymentInstallment` rows into `months`-long
 * monthly buckets. The window is `[from, to)` where `from` is the
 * first day of "N-1 months ago" and `to` is the first day of
 * "N months ahead".
 */
export async function buildCashFlowProjection(
  filters: CashFlowFilters,
): Promise<CashFlowProjection> {
  const monthsAhead = Math.max(1, Math.min(24, filters.months ?? 12));
  const monthsBehind = 3;

  const now = new Date();
  const from = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsBehind, 1),
  );
  const to = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + monthsAhead, 1),
  );

  const projectClause = filters.projectId
    ? Prisma.sql`AND s."projectId" = ${filters.projectId}`
    : Prisma.empty;

  // -- Expected: sum of `amount - paidAmount` per installment,
  //    grouped by due-month + currency, restricted to non-final states
  const expected = await prisma.$queryRaw<ExpectedRow[]>(Prisma.sql`
    SELECT
      date_trunc('month', pi."dueDate" AT TIME ZONE ${REPORT_TIME_ZONE}) AS bucket,
      pp."currency"                                                     AS currency,
      COALESCE(SUM(pi."amount" - pi."paidAmount"), 0)::text              AS total
    FROM "payment_installment" pi
    JOIN "payment_plan" pp ON pp."id" = pi."paymentPlanId"
    JOIN "sale" s           ON s."id"  = pp."saleId"
    WHERE pp."organizationId" = ${filters.organizationId}
      AND s."status" <> 'CANCELED'
      AND pi."status" IN ('UPCOMING','DUE','PARTIALLY_PAID','OVERDUE')
      AND pi."dueDate" >= ${from}
      AND pi."dueDate" <  ${to}
      ${projectClause}
    GROUP BY 1, 2
    ORDER BY 1 ASC
  `);

  // -- Received: sum of actual payments in the same window, currency
  const received = await prisma.$queryRaw<ReceivedRow[]>(Prisma.sql`
    SELECT
      date_trunc('month', p."paymentDate" AT TIME ZONE ${REPORT_TIME_ZONE}) AS bucket,
      p."currency"                                                          AS currency,
      COALESCE(SUM(p."amount"), 0)::text                                    AS total
    FROM "payment" p
    JOIN "sale" s ON s."id" = p."saleId"
    WHERE p."organizationId" = ${filters.organizationId}
      AND p."reversedAt" IS NULL
      AND p."paymentDate" >= ${from}
      AND p."paymentDate" <  ${to}
      ${projectClause}
    GROUP BY 1, 2
    ORDER BY 1 ASC
  `);

  // -- Overdue right-now (dueDate < today, still open) per currency
  const overdue = await prisma.$queryRaw<
    Array<{ currency: string; total: string | null }>
  >(Prisma.sql`
    SELECT
      pp."currency"                                     AS currency,
      COALESCE(SUM(pi."amount" - pi."paidAmount"), 0)::text AS total
    FROM "payment_installment" pi
    JOIN "payment_plan" pp ON pp."id" = pi."paymentPlanId"
    JOIN "sale" s           ON s."id" = pp."saleId"
    WHERE pp."organizationId" = ${filters.organizationId}
      AND s."status" <> 'CANCELED'
      AND pi."status" IN ('UPCOMING','DUE','PARTIALLY_PAID','OVERDUE')
      AND pi."dueDate" < NOW()
      ${projectClause}
    GROUP BY 1
  `);

  const currencySet = new Set<string>();
  const bucketMap = new Map<string, CashFlowBucket>();

  function keyOf(bucketDate: Date, currency: string): string {
    return `${bucketDate.toISOString()}|${currency}`;
  }

  function upsertBucket(
    row: { bucket: Date | string; currency: string; total: string | null },
    kind: "expected" | "received",
  ) {
    const bucketDate =
      row.bucket instanceof Date ? row.bucket : new Date(row.bucket);
    const currency = row.currency;
    currencySet.add(currency);
    const key = keyOf(bucketDate, currency);
    const total = toDecimal(row.total ?? 0);

    let existing = bucketMap.get(key);
    if (!existing) {
      existing = {
        bucketStart: bucketDate.toISOString(),
        bucketLabel: toBucketLabel(bucketDate),
        currency,
        expected: "0",
        received: "0",
        net: "0",
      };
      bucketMap.set(key, existing);
    }
    if (kind === "expected") existing.expected = total.toString();
    else existing.received = total.toString();
    existing.net = toDecimal(existing.received)
      .sub(toDecimal(existing.expected))
      .toString();
  }

  for (const row of expected) upsertBucket(row, "expected");
  for (const row of received) upsertBucket(row, "received");

  const buckets = Array.from(bucketMap.values()).sort((a, b) =>
    a.bucketStart.localeCompare(b.bucketStart),
  );

  const summaries: CashFlowSummary[] = [];
  for (const currency of Array.from(currencySet).sort()) {
    const expectedTotal = expected
      .filter((r) => r.currency === currency)
      .reduce((acc, r) => acc.add(toDecimal(r.total ?? 0)), toDecimal(0));
    const receivedTotal = received
      .filter((r) => r.currency === currency)
      .reduce((acc, r) => acc.add(toDecimal(r.total ?? 0)), toDecimal(0));
    const overdueTotal = overdue
      .filter((r) => r.currency === currency)
      .reduce((acc, r) => acc.add(toDecimal(r.total ?? 0)), toDecimal(0));
    summaries.push({
      currency,
      expectedTotal: expectedTotal.toString(),
      receivedTotal: receivedTotal.toString(),
      overdueTotal: overdueTotal.toString(),
    });
  }

  return {
    filters,
    monthsAhead,
    currencies: Array.from(currencySet).sort(),
    buckets,
    summaries,
  };
}
