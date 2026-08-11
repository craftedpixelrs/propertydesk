"use client";

import * as React from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { chartBrandScale, pickColor } from "./palette";

export interface TrendSeries {
  key: string;
  label: string;
  color?: string;
}

export interface TrendLineProps {
  /** X axis labels (e.g. "avg", "sep", …) — one entry per bucket. */
  buckets: Array<{ key: string; label: string } & Record<string, number | string>>;
  /** Series definitions; each key must exist on every bucket. */
  series: TrendSeries[];
  /**
   * Client-side callback for Y-axis tick formatting. Only usable from
   * other Client Components — Server Components cannot serialize
   * functions across the RSC boundary. Prefer `yTickFormat` in that case.
   */
  yTickFormatter?: (value: number) => string;
  /**
   * Serializable formatter selector, safe to pass from Server Components.
   * "compact" uses `Intl.NumberFormat(..., { notation: "compact" })`.
   * When both `yTickFormatter` and `yTickFormat` are provided, the
   * explicit function wins.
   */
  yTickFormat?: "compact" | "number";
  tooltipFormatter?: (value: number, seriesLabel: string) => string;
  ariaLabel?: string;
}

const numberFmt = new Intl.NumberFormat("sr-Latn");
const compactFmt = new Intl.NumberFormat("sr-Latn", {
  notation: "compact",
  maximumFractionDigits: 1,
});

function resolveYTickFormatter(
  explicit: ((v: number) => string) | undefined,
  named: "compact" | "number" | undefined,
): (v: number) => string {
  if (explicit) return explicit;
  if (named === "compact") return (v) => compactFmt.format(v);
  return (v) => numberFmt.format(v);
}

export function TrendLine({
  buckets,
  series,
  yTickFormatter,
  yTickFormat,
  tooltipFormatter,
  ariaLabel = "Trend",
}: TrendLineProps) {
  const tickFormatter = resolveYTickFormatter(yTickFormatter, yTickFormat);
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={buckets}
        margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
        aria-label={ariaLabel}
      >
        <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "var(--color-foreground-muted)" }}
          tickLine={false}
          axisLine={{ stroke: "var(--color-border)" }}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "var(--color-foreground-muted)" }}
          tickLine={false}
          axisLine={{ stroke: "var(--color-border)" }}
          tickFormatter={tickFormatter}
          width={56}
        />
        <Tooltip
          contentStyle={{
            borderRadius: 8,
            border: "1px solid var(--color-border)",
            fontSize: 12,
          }}
          formatter={(value: number, name: string) =>
            tooltipFormatter
              ? tooltipFormatter(value, name)
              : numberFmt.format(value)
          }
        />
        <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
        {series.map((s, i) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={s.color ?? pickColor(i, chartBrandScale)}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 4 }}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
