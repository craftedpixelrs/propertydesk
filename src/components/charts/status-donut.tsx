"use client";

import * as React from "react";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import { chartBrandScale, pickColor } from "./palette";

export interface StatusDonutDatum {
  key: string;
  label: string;
  value: number;
  color?: string;
}

export interface StatusDonutProps {
  data: StatusDonutDatum[];
  ariaLabel?: string;
  hideZero?: boolean;
  centerLabel?: string;
  centerValue?: string;
}

const numberFmt = new Intl.NumberFormat("sr-Latn");

/**
 * Donut chart for status/enum distributions. Renders a centered
 * "total" label unless a custom `centerValue` is provided.
 *
 * The chart itself is deliberately unstyled beyond colours — the parent
 * `ChartCard` supplies the title and card chrome.
 */
export function StatusDonut({
  data,
  ariaLabel = "Raspodela po statusu",
  hideZero = true,
  centerLabel,
  centerValue,
}: StatusDonutProps) {
  const filtered = React.useMemo(
    () => (hideZero ? data.filter((d) => d.value > 0) : data),
    [data, hideZero],
  );

  const total = React.useMemo(
    () => filtered.reduce((sum, d) => sum + d.value, 0),
    [filtered],
  );

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart aria-label={ariaLabel}>
        <Pie
          data={filtered}
          dataKey="value"
          nameKey="label"
          innerRadius="55%"
          outerRadius="85%"
          paddingAngle={1}
          stroke="var(--color-surface)"
          strokeWidth={2}
          isAnimationActive={false}
        >
          {filtered.map((d, i) => (
            <Cell
              key={d.key}
              fill={d.color ?? pickColor(i, chartBrandScale)}
            />
          ))}
          <Label
            centerLabel={centerLabel}
            centerValue={centerValue ?? numberFmt.format(total)}
          />
        </Pie>
        <Tooltip
          contentStyle={{
            borderRadius: 8,
            border: "1px solid var(--color-border)",
            fontSize: 12,
          }}
          formatter={(value: number) => numberFmt.format(value)}
        />
        <Legend
          verticalAlign="bottom"
          height={32}
          wrapperStyle={{ fontSize: 12 }}
          iconType="circle"
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

/**
 * Custom SVG label rendered in the middle of the donut. Kept as an
 * inner component so it can access parent `viewBox` supplied by
 * Recharts.
 */
function Label({
  viewBox,
  centerLabel,
  centerValue,
}: {
  viewBox?: { cx: number; cy: number };
  centerLabel?: string;
  centerValue?: string;
}) {
  if (!viewBox) return null;
  const { cx, cy } = viewBox;
  return (
    <g>
      <text
        x={cx}
        y={centerLabel ? cy - 6 : cy}
        textAnchor="middle"
        dominantBaseline="central"
        style={{
          fontSize: 20,
          fontWeight: 600,
          fill: "var(--color-foreground)",
        }}
      >
        {centerValue}
      </text>
      {centerLabel ? (
        <text
          x={cx}
          y={cy + 14}
          textAnchor="middle"
          dominantBaseline="central"
          style={{
            fontSize: 11,
            fill: "var(--color-foreground-muted)",
          }}
        >
          {centerLabel}
        </text>
      ) : null}
    </g>
  );
}
