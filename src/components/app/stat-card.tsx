import * as React from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  href?: string;
  className?: string;
}

export function StatCard({ label, value, hint, icon, href, className }: StatCardProps) {
  const card = (
    <Card
      className={cn(
        "@container flex min-w-0 flex-col gap-2 px-4 py-3.5 sm:px-5 sm:py-4",
        href && "h-full transition-colors hover:border-[var(--color-brand-400)]",
        className,
      )}
    >
      <div className="flex items-center gap-2.5">
        {icon ? (
          <div
            aria-hidden
            className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-brand-50)] text-[var(--color-brand-700)]"
          >
            {icon}
          </div>
        ) : null}
        <div className="min-w-0 text-[13px] leading-snug font-medium text-[var(--color-foreground-muted)]">
          {label}
        </div>
      </div>
      <div className="min-w-0 text-[clamp(0.875rem,7.5cqi,1.35rem)] leading-tight font-semibold tracking-tight text-[var(--color-foreground)] tabular-nums">
        {value}
      </div>
      {hint ? (
        <div className="text-xs leading-snug text-[var(--color-foreground-muted)]">{hint}</div>
      ) : null}
    </Card>
  );
  if (!href) return card;
  return (
    <Link
      href={href}
      className="block min-w-0 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand-600)]"
    >
      {card}
    </Link>
  );
}
