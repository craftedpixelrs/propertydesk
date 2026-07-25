"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface MobileCardListProps<T> {
  data: T[];
  rowKey: (row: T) => string;
  renderItem: (row: T) => React.ReactNode;
  onItemClick?: (row: T) => void;
  className?: string;
}

/**
 * Vertical stack of touch-friendly cards, used on small viewports as the
 * mobile replacement for a desktop data table.
 */
export function MobileCardList<T>({
  data,
  rowKey,
  renderItem,
  onItemClick,
  className,
}: MobileCardListProps<T>) {
  return (
    <ul className={cn("flex flex-col gap-2", className)}>
      {data.map((row) => (
        <li key={rowKey(row)}>
          {onItemClick ? (
            <button
              type="button"
              onClick={() => onItemClick(row)}
              className="w-full min-h-14 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-left transition-colors hover:bg-[var(--color-surface-muted)]"
            >
              {renderItem(row)}
            </button>
          ) : (
            <div className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              {renderItem(row)}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
