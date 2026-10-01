"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  width?: string;
  align?: "left" | "right" | "center";
}

export interface DesktopDataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  className?: string;
}

/**
 * Simple, accessible table for desktop viewports. Deliberately
 * un-decorated; use `MobileCardList` on small screens.
 */
export function DesktopDataTable<T>({
  columns,
  data,
  rowKey,
  onRowClick,
  className,
}: DesktopDataTableProps<T>) {
  return (
    <div className={cn("overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_1px_2px_var(--color-shadow),0_12px_28px_-18px_var(--color-shadow)]", className)}>
      <table className="w-full border-collapse text-sm">
        <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-foreground-subtle)]">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "px-4 py-3 font-medium",
                  col.align === "right" && "text-right",
                  col.align === "center" && "text-center",
                )}
                style={col.width ? { width: col.width } : undefined}
                scope="col"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border)] bg-[var(--color-surface)]">
          {data.map((row) => (
            <tr
              key={rowKey(row)}
              className={cn(
                "transition-colors hover:bg-[color-mix(in_oklab,var(--color-brand-50)_70%,var(--color-surface))]",
                onRowClick && "cursor-pointer",
              )}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    "px-4 py-3 align-middle text-[var(--color-foreground)]",
                    col.align === "right" && "text-right",
                    col.align === "center" && "text-center",
                  )}
                >
                  {col.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
