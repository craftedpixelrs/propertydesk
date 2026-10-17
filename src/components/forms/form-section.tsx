import * as React from "react";
import { cn } from "@/lib/utils";

export interface FormSectionProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Vertical section within a form. Single-column layout on mobile,
 * two-column on desktop for optional side notes.
 */
export function FormSection({ title, description, children, className }: FormSectionProps) {
  return (
    <section className={cn("grid gap-4 lg:grid-cols-3 lg:gap-8", className)}>
      {title || description ? (
        <div className="lg:col-span-1">
          {title ? (
            <h3 className="text-base font-semibold text-[var(--color-foreground)]">{title}</h3>
          ) : null}
          {description ? (
            <p className="mt-1 text-sm text-[var(--color-foreground-muted)]">{description}</p>
          ) : null}
        </div>
      ) : null}
      <div className={cn("space-y-4", title || description ? "lg:col-span-2" : "lg:col-span-3")}>
        {children}
      </div>
    </section>
  );
}

export interface FormFieldProps {
  label: React.ReactNode;
  htmlFor?: string;
  hint?: React.ReactNode;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}

/**
 * Field container that pairs a label, control, and optional hint/error.
 * Errors are announced via aria-live for screen readers.
 */
export function FormField({ label, htmlFor, hint, error, required, children }: FormFieldProps) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-sm font-medium text-[var(--color-foreground)]"
      >
        {label}
        {required ? (
          <span aria-hidden className="ml-0.5 text-[var(--color-danger)]">
            *
          </span>
        ) : null}
      </label>
      {children}
      {hint && !error ? (
        <p className="mt-1 text-xs text-[var(--color-foreground-muted)]">{hint}</p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-1 text-xs text-[var(--color-danger)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
