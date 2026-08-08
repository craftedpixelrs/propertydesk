"use client";

import * as React from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface ChartCardProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  isEmpty?: boolean;
  emptyLabel?: string;
  className?: string;
  height?: number;
  children: React.ReactNode;
}

/**
 * Thin wrapper around `Card` that gives every dashboard/report chart a
 * consistent height, title row and empty-state so pages don't collapse
 * to zero when the underlying dataset is empty.
 */
export function ChartCard({
  title,
  description,
  action,
  isEmpty = false,
  emptyLabel = "Nema podataka za prikaz.",
  className,
  height = 240,
  children,
}: ChartCardProps) {
  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="text-sm">{title}</CardTitle>
          {description ? (
            <p className="mt-1 text-xs text-[var(--color-foreground-muted)]">
              {description}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </CardHeader>
      <CardContent className="flex-1">
        {isEmpty ? (
          <div
            className="flex items-center justify-center rounded-md bg-[var(--color-surface-muted)] text-sm text-[var(--color-foreground-muted)]"
            style={{ height }}
          >
            {emptyLabel}
          </div>
        ) : (
          <div style={{ height, width: "100%" }}>{children}</div>
        )}
      </CardContent>
    </Card>
  );
}
