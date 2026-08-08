"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export interface SearchInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder,
  className,
  ...props
}: SearchInputProps) {
  return (
    <div className={cn("relative", className)}>
      <Search
        aria-hidden
        className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-foreground-subtle)]"
      />
      <Input
        {...props}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? t("common.search")}
        className="pl-9 pr-9"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label={t("common.close")}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[var(--color-foreground-subtle)] hover:bg-[var(--color-surface-inset)]"
        >
          <X className="size-4" />
        </button>
      ) : null}
    </div>
  );
}
