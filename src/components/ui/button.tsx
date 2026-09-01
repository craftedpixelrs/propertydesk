"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 select-none",
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--color-brand-600)] text-white hover:bg-[var(--color-brand-700)] active:bg-[var(--color-brand-700)]",
        secondary:
          "bg-[var(--color-surface-inset)] text-[var(--color-foreground)] hover:bg-[color-mix(in_oklab,var(--color-surface-inset)_80%,var(--color-foreground))]",
        outline:
          "border border-[var(--color-border-strong)] bg-transparent text-[var(--color-foreground)] hover:bg-[var(--color-surface-inset)]",
        ghost:
          "bg-transparent text-[var(--color-foreground)] hover:bg-[var(--color-surface-inset)]",
        destructive:
          "bg-[var(--color-danger)] text-white hover:bg-[color-mix(in_oklab,var(--color-danger)_85%,black)]",
        link: "text-[var(--color-brand-700)] underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-9 px-3 text-sm",
        md: "h-11 px-4 text-sm",
        lg: "h-12 px-5 text-base",
        icon: "size-11",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, loading, disabled, children, ...props }, ref) => {
    // Radix Slot requires a *single* React element child — so when `asChild`
    // is set we never inject the loading spinner (asChild callers can't be
    // "loading" anyway because they usually wrap a <Link>).
    const Comp = asChild ? Slot : "button";
    if (asChild) {
      return (
        <Comp
          ref={ref}
          className={cn(buttonVariants({ variant, size }), className)}
          disabled={disabled || loading}
          {...props}
        >
          {children}
        </Comp>
      );
    }
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <span
            aria-hidden
            className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent"
          />
        ) : null}
        {children}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
