"use client";

export function FilePicker({
  accept,
  disabled,
  fileName,
  buttonLabel,
  emptyLabel,
  onChange,
}: {
  accept: string;
  disabled?: boolean;
  fileName: string | null;
  buttonLabel: string;
  emptyLabel: string;
  onChange: (file: File | null) => void;
}) {
  return (
    <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-4">
      <label
        className={`inline-flex h-10 shrink-0 cursor-pointer items-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm font-medium ${
          disabled ? "pointer-events-none opacity-60" : "hover:bg-[var(--color-surface-inset)]"
        }`}
      >
        {buttonLabel}
        <input
          type="file"
          accept={accept}
          disabled={disabled}
          className="sr-only"
          onChange={(event) => onChange(event.target.files?.[0] ?? null)}
        />
      </label>
      <span className="max-w-full truncate text-sm text-[var(--color-foreground-muted)]">
        {fileName || emptyLabel}
      </span>
    </div>
  );
}
