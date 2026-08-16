"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartCard } from "@/components/charts/chart-card";
import { TrendLine } from "@/components/charts/trend-line";
import { useT } from "@/components/app/i18n-provider";
import { formatMoney } from "@/lib/formatters/money";
import type { SupportedCurrency } from "@/lib/constants/app";
import type {
  CashFlowProjection,
  CashFlowSummary,
} from "@/server/services/reports/cash-flow.service";

/**
 * Faza 8.1 (A3) — cash-flow projection card. Two visuals per
 * currency: a monthly Expected vs Received trend line and a
 * compact summary row (Očekivano / Naplaćeno / U dospeću).
 *
 * Renders a soft empty state when the org has no active payment
 * plans in the requested window.
 */
export function CashFlowCard(props: {
  projection: CashFlowProjection;
  title?: string;
  description?: string;
}) {
  const t = useT();
  const { projection } = props;
  const isEmpty = projection.buckets.length === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">
          {props.title ?? t("ops.reports.cashFlowDefaultTitle")}
        </CardTitle>
        {props.description ? (
          <p className="text-xs text-[var(--color-foreground-muted)]">
            {props.description}
          </p>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-6">
        {isEmpty ? (
          <p className="rounded-md border border-dashed border-[var(--color-border)] p-6 text-center text-sm text-[var(--color-foreground-muted)]">
            {t("ops.reports.cashFlowEmpty")}
          </p>
        ) : (
          projection.currencies.map((currency) => {
            const currencyBuckets = projection.buckets.filter(
              (b) => b.currency === currency,
            );
            const summary =
              projection.summaries.find((s) => s.currency === currency) ??
              (undefined as unknown as CashFlowSummary);
            return (
              <div key={currency} className="space-y-3">
                <SummaryRow
                  summary={summary}
                  currency={currency as SupportedCurrency}
                />
                <ChartCard
                  title={t("ops.reports.monthlyFlow", { currency })}
                  isEmpty={currencyBuckets.length === 0}
                  height={280}
                >
                  <TrendLine
                    yTickFormat="compact"
                    buckets={currencyBuckets.map((b) => ({
                      key: b.bucketStart,
                      label: b.bucketLabel,
                      expected: Number(b.expected),
                      received: Number(b.received),
                    }))}
                    series={[
                      { key: "expected", label: t("ops.reports.expected") },
                      { key: "received", label: t("ops.reports.received") },
                    ]}
                    ariaLabel={t("ops.reports.cashFlowAria")}
                  />
                </ChartCard>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

function SummaryRow(props: {
  summary: CashFlowSummary | undefined;
  currency: SupportedCurrency;
}) {
  const t = useT();
  if (!props.summary) return null;
  return (
    <div className="grid grid-cols-3 gap-3 text-sm">
      <SummaryStat
        label={t("ops.reports.expected")}
        value={formatMoney(props.summary.expectedTotal, props.currency)}
        tone="neutral"
      />
      <SummaryStat
        label={t("ops.reports.received")}
        value={formatMoney(props.summary.receivedTotal, props.currency)}
        tone="positive"
      />
      <SummaryStat
        label={t("ops.reports.overduePast")}
        value={formatMoney(props.summary.overdueTotal, props.currency)}
        tone={Number(props.summary.overdueTotal) > 0 ? "warning" : "neutral"}
      />
    </div>
  );
}

function SummaryStat(props: {
  label: string;
  value: string;
  tone: "neutral" | "positive" | "warning";
}) {
  const toneClass =
    props.tone === "positive"
      ? "text-emerald-700"
      : props.tone === "warning"
        ? "text-amber-700"
        : "text-[var(--color-foreground)]";
  return (
    <div className="rounded-md border border-[var(--color-border)] p-3">
      <div className="text-xs text-[var(--color-foreground-muted)]">
        {props.label}
      </div>
      <div className={`mt-1 text-base font-semibold ${toneClass}`}>
        {props.value}
      </div>
    </div>
  );
}
