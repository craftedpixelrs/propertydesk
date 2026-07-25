import * as React from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export function StatCard({ label, value, hint, icon, className }: StatCardProps) {
  return (
    <Card className={cn("flex items-center gap-3 p-4", className)}>
      {icon ? (
        <div
          aria-hidden
          className="flex size-10 items-center justify-center rounded-md bg-[var(--color-brand-50)] text-[var(--color-brand-700)]"
        >
          {icon}
        </div>
      ) : null}
      <div className="min-w-0">
        <div className="text-xs font-medium uppercase tracking-wide text-[var(--color-foreground-subtle)]">
          {label}
        </div>
        <div className="text-lg font-semibold text-[var(--color-foreground)] sm:text-xl">
          {value}
        </div>
        {hint ? (
          <div className="text-xs text-[var(--color-foreground-muted)] mt-0.5">{hint}</div>
        ) : null}
      </div>
    </Card>
  );
}
