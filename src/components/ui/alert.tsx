import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const alertVariants = cva(
  "flex gap-3 rounded-md border p-4 text-sm",
  {
    variants: {
      tone: {
        info: "border-[var(--color-border)] bg-[var(--color-info-bg)] text-[var(--color-info)]",
        success:
          "border-[var(--color-border)] bg-[var(--color-success-bg)] text-[var(--color-success)]",
        warning:
          "border-[var(--color-border)] bg-[var(--color-warning-bg)] text-[var(--color-warning)]",
        danger:
          "border-[var(--color-border)] bg-[var(--color-danger-bg)] text-[var(--color-danger)]",
        neutral:
          "border-[var(--color-border)] bg-[var(--color-surface-inset)] text-[var(--color-foreground-muted)]",
      },
    },
    defaultVariants: { tone: "info" },
  },
);

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {}

export function Alert({ className, tone, ...props }: AlertProps) {
  return <div role="alert" className={cn(alertVariants({ tone }), className)} {...props} />;
}

export function AlertTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("font-medium leading-none mb-1", className)} {...props} />;
}

export function AlertDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm opacity-90", className)} {...props} />;
}
