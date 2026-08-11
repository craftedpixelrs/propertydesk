"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { chartBrandScale, pickColor } from "./palette";

export interface CategoryBarDatum {
  key: string;
  label: string;
  color?: string;
  [seriesKey: string]: string | number | undefined;
}

export interface CategoryBarSeries {
  key: string;
  label: string;
  color?: string;
}

export interface CategoryBarsProps {
  data: CategoryBarDatum[];
  series?: CategoryBarSeries[];
  ariaLabel?: string;
  /**
   * When true (default) uses the `color` field on each datum to colour
   * the bar. Only meaningful for single-series charts.
   */
  colorPerBar?: boolean;
  /**
   * Client-side callback for numeric-axis tick formatting. Only usable
   * from other Client Components — Server Components cannot serialize
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
  stacked?: boolean;
  layout?: "horizontal" | "vertical";
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

export function CategoryBars({
  data,
  series,
  ariaLabel = "Distribucija",
  colorPerBar = true,
  yTickFormatter,
  yTickFormat,
  stacked = false,
  layout = "horizontal",
}: CategoryBarsProps) {
  const tickFormatter = resolveYTickFormatter(yTickFormatter, yTickFormat);
  const resolvedSeries: CategoryBarSeries[] = series ?? [
    { key: "value", label: "Broj" },
  ];
  const isVertical = layout === "vertical";

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        layout={layout}
        margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
        aria-label={ariaLabel}
      >
        <CartesianGrid
          stroke="var(--color-border)"
          strokeDasharray="3 3"
          vertical={isVertical}
          horizontal={!isVertical}
        />
        {isVertical ? (
          <>
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: "var(--color-foreground-muted)" }}
              tickLine={false}
              axisLine={{ stroke: "var(--color-border)" }}
              tickFormatter={tickFormatter}
            />
            <YAxis
              type="category"
              dataKey="label"
              tick={{ fontSize: 11, fill: "var(--color-foreground-muted)" }}
              tickLine={false}
              axisLine={{ stroke: "var(--color-border)" }}
              width={130}
            />
          </>
        ) : (
          <>
            <XAxis
              type="category"
              dataKey="label"
              tick={{ fontSize: 11, fill: "var(--color-foreground-muted)" }}
              tickLine={false}
              axisLine={{ stroke: "var(--color-border)" }}
            />
            <YAxis
              type="number"
              tick={{ fontSize: 11, fill: "var(--color-foreground-muted)" }}
              tickLine={false}
              axisLine={{ stroke: "var(--color-border)" }}
              tickFormatter={tickFormatter}
              width={56}
            />
          </>
        )}
        <Tooltip
          cursor={{ fill: "var(--color-surface-inset)" }}
          contentStyle={{
            borderRadius: 8,
            border: "1px solid var(--color-border)",
            fontSize: 12,
          }}
          formatter={(value: number) => numberFmt.format(value)}
        />
        {resolvedSeries.length > 1 || !colorPerBar ? (
          <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
        ) : null}
        {resolvedSeries.map((s, seriesIndex) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.label}
            stackId={stacked ? "stack" : undefined}
            fill={s.color ?? pickColor(seriesIndex, chartBrandScale)}
            radius={stacked ? 0 : [4, 4, 0, 0]}
            isAnimationActive={false}
          >
            {colorPerBar && resolvedSeries.length === 1
              ? data.map((d, i) => (
                  <Cell
                    key={d.key}
                    fill={d.color ?? pickColor(i, chartBrandScale)}
                  />
                ))
              : null}
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
