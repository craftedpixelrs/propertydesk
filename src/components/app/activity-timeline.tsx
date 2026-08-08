import * as React from "react";
import { DateDisplay } from "@/components/app/date-display";
import { cn } from "@/lib/utils";

export interface TimelineItem {
  id: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  createdAt: Date | string;
  icon?: React.ReactNode;
}

export function ActivityTimeline({
  items,
  className,
}: {
  items: TimelineItem[];
  className?: string;
}) {
  return (
    <ol className={cn("relative border-l border-[var(--color-border)]", className)}>
      {items.map((item, i) => (
        <li key={item.id} className={cn("relative pl-6", i > 0 && "mt-4")}>
          <span
            aria-hidden
            className="absolute left-[-6px] top-1.5 size-3 rounded-full bg-[var(--color-brand-500)] ring-4 ring-[var(--color-surface)]"
          />
          <div className="text-sm font-medium text-[var(--color-foreground)]">{item.title}</div>
          {item.description ? (
            <div className="text-sm text-[var(--color-foreground-muted)] mt-0.5">
              {item.description}
            </div>
          ) : null}
          <div className="text-xs text-[var(--color-foreground-subtle)] mt-1">
            <DateDisplay value={item.createdAt} withTime />
          </div>
        </li>
      ))}
    </ol>
  );
}
