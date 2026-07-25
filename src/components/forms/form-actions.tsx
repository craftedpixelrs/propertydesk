import * as React from "react";
import { cn } from "@/lib/utils";

export interface FormActionsProps {
  children: React.ReactNode;
  sticky?: boolean;
  className?: string;
}

/**
 * Container for primary form buttons. On mobile it optionally sticks to the
 * bottom of the viewport (with a safe-area padding) so long forms remain
 * ergonomic — desktop keeps a static row above the fold.
 */
export function FormActions({ children, sticky, className }: FormActionsProps) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3",
        sticky
          ? "sm:static sticky bottom-0 z-10 -mx-4 mt-6 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 safe-bottom sm:mx-0 sm:mt-8 sm:border-0 sm:bg-transparent sm:p-0"
          : "mt-8",
        className,
      )}
    >
      {children}
    </div>
  );
}
