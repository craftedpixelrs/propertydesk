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

export type CashFlowGrain = "day" | "month";

export interface CashFlowFilters {
  organizationId: string;
  projectId?: string | null;
  months?: number;
  from?: Date;
  to?: Date;
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
  grain: CashFlowGrain;
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

function toBucketLabel(d: Date, grain: CashFlowGrain): string {
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  if (grain === "day") {
    return `${year}-${month}-${String(d.getUTCDate()).padStart(2, "0")}`;
  }
  return `${year}-${month}`;
}

function startOfLocalDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 0, 0, 0, 0);
}

function endOfLocalDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 23, 59, 59, 999);
}

export function resolveCashFlowWindow(
  filters: Pick<CashFlowFilters, "from" | "to" | "months">,
): {
  from: Date;
  to: Date;
  grain: CashFlowGrain;
  monthsAhead: number;
  bounded: boolean;
} {
  if (filters.from || filters.to) {
    const from = filters.from ?? startOfLocalDay(filters.to!);
    const to = filters.to ?? endOfLocalDay(filters.from!);
    const days = Math.max(1, Math.round((to.getTime() - from.getTime()) / 86_400_000));
    const grain: CashFlowGrain = days <= 62 ? "day" : "month";
    const monthsAhead = Math.max(
      1,
      (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth()) + 1,
    );
    return { from, to, grain, monthsAhead, bounded: true };
  }

  const monthsAhead = Math.max(1, Math.min(24, filters.months ?? 12));
  const monthsBehind = 3;
  const now = new Date();
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsBehind, 1));
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + monthsAhead, 1));
  return { from, to, grain: "month", monthsAhead, bounded: false };
}

function enumerateBucketStarts(from: Date, to: Date, grain: CashFlowGrain): Date[] {
  const starts: Date[] = [];
  if (grain === "day") {
    const cursor = new Date(Date.UTC(from.getFullYear(), from.getMonth(), from.getDate()));
    const last = new Date(Date.UTC(to.getFullYear(), to.getMonth(), to.getDate()));
    while (cursor <= last) {
      starts.push(new Date(cursor));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return starts;
  }
  const cursor = new Date(Date.UTC(from.getFullYear(), from.getMonth(), 1));
  const last = new Date(Date.UTC(to.getFullYear(), to.getMonth(), 1));
  while (cursor <= last) {
    starts.push(new Date(cursor));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return starts;
}

/**
 * Roll up open installments (expected) and payments (received).
 * Without dates the window is the rolling 12-month projection.
 * With Od/Do the chart follows that period — daily buckets up to
 * ~2 months, otherwise monthly.
 */
export async function buildCashFlowProjection(
  filters: CashFlowFilters,
): Promise<CashFlowProjection> {
  const window = resolveCashFlowWindow(filters);
  const { from, to, grain, monthsAhead, bounded } = window;
  const expectedTrunc =
    grain === "day"
      ? Prisma.sql`date_trunc('day', pi."dueDate" AT TIME ZONE ${REPORT_TIME_ZONE})`
      : Prisma.sql`date_trunc('month', pi."dueDate" AT TIME ZONE ${REPORT_TIME_ZONE})`;
  const receivedTrunc =
    grain === "day"
      ? Prisma.sql`date_trunc('day', p."paymentDate" AT TIME ZONE ${REPORT_TIME_ZONE})`
      : Prisma.sql`date_trunc('month', p."paymentDate" AT TIME ZONE ${REPORT_TIME_ZONE})`;
  const dueToClause = bounded
    ? Prisma.sql`AND pi."dueDate" <= ${to}`
    : Prisma.sql`AND pi."dueDate" < ${to}`;
  const paidToClause = bounded
    ? Prisma.sql`AND p."paymentDate" <= ${to}`
    : Prisma.sql`AND p."paymentDate" < ${to}`;
  const overdueBound = bounded
    ? Prisma.sql`AND pi."dueDate" >= ${from} AND pi."dueDate" <= ${to}`
    : Prisma.empty;

  const projectClause = filters.projectId
    ? Prisma.sql`AND s."projectId" = ${filters.projectId}`
    : Prisma.empty;

  // -- Expected: remaining installment amounts due in the window
  const expected = await prisma.$queryRaw<ExpectedRow[]>(Prisma.sql`
    SELECT
      ${expectedTrunc} AS bucket,
      pp."currency"                                                     AS currency,
      COALESCE(SUM(pi."amount" - pi."paidAmount"), 0)::text              AS total
    FROM "payment_installment" pi
    JOIN "payment_plan" pp ON pp."id" = pi."paymentPlanId"
    JOIN "sale" s           ON s."id"  = pp."saleId"
    WHERE pp."organizationId" = ${filters.organizationId}
      AND s."status" <> 'CANCELED'
      AND pi."status" IN ('UPCOMING','DUE','PARTIALLY_PAID','OVERDUE')
      AND pi."dueDate" >= ${from}
      ${dueToClause}
      ${projectClause}
    GROUP BY 1, 2
    ORDER BY 1 ASC
  `);

  // -- Received: actual payments in the same window
  const received = await prisma.$queryRaw<ReceivedRow[]>(Prisma.sql`
    SELECT
      ${receivedTrunc} AS bucket,
      p."currency"                                                          AS currency,
      COALESCE(SUM(p."amount"), 0)::text                                    AS total
    FROM "payment" p
    JOIN "sale" s ON s."id" = p."saleId"
    WHERE p."organizationId" = ${filters.organizationId}
      AND p."reversedAt" IS NULL
      AND p."paymentDate" >= ${from}
      ${paidToClause}
      ${projectClause}
    GROUP BY 1, 2
    ORDER BY 1 ASC
  `);

  // -- Overdue: still-open installments past due (optionally in-window)
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
      ${overdueBound}
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
        bucketLabel: toBucketLabel(bucketDate, grain),
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

  const knownCurrencies = Array.from(currencySet);
  if (knownCurrencies.length > 0) {
    const present = new Set(
      Array.from(bucketMap.values()).map((b) => `${b.bucketLabel}|${b.currency}`),
    );
    for (const currency of knownCurrencies) {
      for (const start of enumerateBucketStarts(from, to, grain)) {
        const label = toBucketLabel(start, grain);
        if (present.has(`${label}|${currency}`)) continue;
        present.add(`${label}|${currency}`);
        bucketMap.set(keyOf(start, currency), {
          bucketStart: start.toISOString(),
          bucketLabel: label,
          currency,
          expected: "0",
          received: "0",
          net: "0",
        });
      }
    }
  }

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
    grain,
    currencies: Array.from(currencySet).sort(),
    buckets,
    summaries,
  };
}
