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
    <Card className={cn("flex items-center gap-3.5 px-5 py-4", className)}>
      {icon ? (
        <div
          aria-hidden
          className="flex size-11 items-center justify-center rounded-xl bg-[var(--color-brand-50)] text-[var(--color-brand-700)]"
        >
          {icon}
        </div>
      ) : null}
      <div className="min-w-0">
        <div className="text-[13px] font-medium text-[var(--color-foreground-muted)]">
          {label}
        </div>
        <div className="mt-0.5 text-[1.65rem] font-semibold tabular-nums tracking-tight text-[var(--color-foreground)]">
          {value}
        </div>
        {hint ? (
          <div className="text-xs text-[var(--color-foreground-muted)] mt-0.5">{hint}</div>
        ) : null}
      </div>
    </Card>
  );
}
