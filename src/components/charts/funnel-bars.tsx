"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { chartBrandScale, pickColor } from "./palette";

export interface FunnelDatum {
  key: string;
  label: string;
  value: number;
  color?: string;
}

export interface FunnelBarsProps {
  data: FunnelDatum[];
  ariaLabel?: string;
  /**
   * When set, the value labels on each bar are formatted as
   * `n (p%)` where `p` = value / topOfFunnelValue.
   */
  showConversionOfFirst?: boolean;
}

const numberFmt = new Intl.NumberFormat("sr-Latn");

export function FunnelBars({
  data,
  ariaLabel = "Lievak konverzije",
  showConversionOfFirst = true,
}: FunnelBarsProps) {
  const top = data[0]?.value ?? 0;

  const renderLabel = (props: { value?: number; x?: number; y?: number; height?: number; width?: number }) => {
    const value = typeof props.value === "number" ? props.value : 0;
    let text = numberFmt.format(value);
    if (showConversionOfFirst && top > 0 && data[0] && value !== top) {
      const pct = Math.round((value / top) * 100);
      text = `${numberFmt.format(value)} (${pct}%)`;
    }
    return (
      <text
        x={(props.x ?? 0) + (props.width ?? 0) - 8}
        y={(props.y ?? 0) + (props.height ?? 0) / 2}
        textAnchor="end"
        dominantBaseline="middle"
        style={{
          fontSize: 11,
          fontWeight: 600,
          fill: "var(--color-surface)",
        }}
      >
        {text}
      </text>
    );
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
        aria-label={ariaLabel}
      >
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="label"
          tick={{ fontSize: 12, fill: "var(--color-foreground-muted)" }}
          tickLine={false}
          axisLine={false}
          width={140}
        />
        <Tooltip
          cursor={{ fill: "var(--color-surface-inset)" }}
          contentStyle={{
            borderRadius: 8,
            border: "1px solid var(--color-border)",
            fontSize: 12,
          }}
          formatter={(value: number) => numberFmt.format(value)}
        />
        <Bar dataKey="value" radius={[4, 4, 4, 4]} isAnimationActive={false}>
          {data.map((d, i) => (
            <Cell key={d.key} fill={d.color ?? pickColor(i, chartBrandScale)} />
          ))}
          <LabelList dataKey="value" content={renderLabel} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
