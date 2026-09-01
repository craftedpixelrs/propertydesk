import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
  {
    variants: {
      tone: {
        neutral: "bg-[var(--color-surface-inset)] text-[var(--color-foreground-muted)]",
        info: "bg-[var(--color-info-bg)] text-[var(--color-info)]",
        success: "bg-[var(--color-success-bg)] text-[var(--color-success)]",
        warning: "bg-[var(--color-warning-bg)] text-[var(--color-warning)]",
        danger: "bg-[var(--color-danger-bg)] text-[var(--color-danger)]",
        brand: "bg-[var(--color-brand-100)] text-[var(--color-brand-700)]",
        violet: "bg-[var(--color-violet-bg)] text-[var(--color-violet-fg)]",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
