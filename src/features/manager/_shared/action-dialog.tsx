"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useT } from "@/components/app/i18n-provider";
import { ApiClientError } from "@/lib/api-client";

export interface ActionDialogRenderArgs {
  submitting: boolean;
  error: string | null;
  setError: (msg: string | null) => void;
  close: () => void;
}

/**
 * Thin wrapper around Radix `Dialog` that:
 *   - wraps the body in a `<form>` that handles submit state + errors
 *   - standardises Cancel + Submit footer buttons
 *   - refreshes the server component tree on success
 *   - resets the local error on close
 *
 * `onSubmit` returns `true` to close the dialog, `false` to keep it open
 * (for e.g. multi-step flows). Throwing surfaces the error inside the
 * dialog without closing it.
 */
export function ActionDialog({
  trigger,
  title,
  description,
  submitLabel,
  submitVariant = "primary",
  onSubmit,
  onClose,
  children,
}: {
  trigger: ReactNode;
  title: string;
  description?: string;
  submitLabel: string;
  submitVariant?: "primary" | "destructive" | "outline" | "ghost" | "link" | "secondary";
  onSubmit: (args: { close: () => void }) => Promise<boolean | void>;
  onClose?: () => void;
  children: (args: ActionDialogRenderArgs) => ReactNode;
}) {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function close() {
    setOpen(false);
    setError(null);
    onClose?.();
  }

  async function handle(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const result = await onSubmit({ close });
      router.refresh();
      if (result !== false) {
        close();
      }
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message || t("common.unexpectedError"));
      } else {
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(null);
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <form onSubmit={handle} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description ? <DialogDescription>{description}</DialogDescription> : null}
          </DialogHeader>
          <div className="space-y-3">{children({ submitting, error, setError, close })}</div>
          {error ? (
            <p
              role="alert"
              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={close} disabled={submitting}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" variant={submitVariant} disabled={submitting}>
              {submitting ? t("common.saving") : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * One-click confirmation dialog (no form fields). Useful for destructive
 * flows like "Archive building" that need a confirm step but no inputs.
 */
export function ConfirmActionDialog({
  trigger,
  title,
  description,
  confirmLabel,
  confirmVariant = "destructive",
  onConfirm,
}: {
  trigger: ReactNode;
  title: string;
  description?: string;
  confirmLabel: string;
  confirmVariant?: "primary" | "destructive" | "outline";
  onConfirm: () => Promise<void>;
}) {
  return (
    <ActionDialog
      trigger={trigger}
      title={title}
      description={description}
      submitLabel={confirmLabel}
      submitVariant={confirmVariant}
      onSubmit={async () => {
        await onConfirm();
      }}
    >
      {() => null}
    </ActionDialog>
  );
}

export function Field({
  label,
  id,
  value,
  type = "text",
  required,
  placeholder,
  onChange,
  autoFocus,
}: {
  label: string;
  id: string;
  value: string;
  type?: "text" | "number" | "email" | "date" | "datetime-local" | "tel";
  required?: boolean;
  placeholder?: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-medium text-[var(--color-foreground)]">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.currentTarget.value)}
        className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm shadow-sm focus:border-[var(--color-brand-500)] focus:outline-none"
      />
    </div>
  );
}

export function SelectField<V extends string>({
  label,
  id,
  value,
  options,
  onChange,
}: {
  label: string;
  id: string;
  value: V | "";
  options: Array<{ value: V | ""; label: string }>;
  onChange: (value: V | "") => void;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-medium text-[var(--color-foreground)]">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.currentTarget.value as V | "")}
        className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm shadow-sm focus:border-[var(--color-brand-500)] focus:outline-none"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function TextareaField({
  label,
  id,
  value,
  rows = 4,
  required,
  placeholder,
  onChange,
}: {
  label: string;
  id: string;
  value: string;
  rows?: number;
  required?: boolean;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-medium text-[var(--color-foreground)]">
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        rows={rows}
        required={required}
        placeholder={placeholder}
        onChange={(e) => onChange(e.currentTarget.value)}
        className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm shadow-sm focus:border-[var(--color-brand-500)] focus:outline-none"
      />
    </div>
  );
}
