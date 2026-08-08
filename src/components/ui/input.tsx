"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "block w-full min-w-0 rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-base text-[var(--color-foreground)] shadow-sm outline-none",
        "placeholder:text-[var(--color-foreground-subtle)]",
        "focus:border-[var(--color-brand-600)] focus:ring-2 focus:ring-[var(--color-brand-100)]",
        "disabled:cursor-not-allowed disabled:bg-[var(--color-surface-inset)] disabled:text-[var(--color-foreground-muted)]",
        "min-h-11 sm:min-h-10 sm:text-sm",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
