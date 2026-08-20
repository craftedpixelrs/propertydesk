"use client";

import { formatDate, formatDateTime } from "@/lib/formatters";
import { useI18n } from "@/components/app/i18n-provider";
import { cn } from "@/lib/utils";

export interface DateDisplayProps {
  value: Date | string | number;
  withTime?: boolean;
  className?: string;
}

export function DateDisplay({ value, withTime, className }: DateDisplayProps) {
  const { locale } = useI18n();
  const formatted = withTime
    ? formatDateTime(value, undefined, locale)
    : formatDate(value, undefined, locale);
  const iso = value instanceof Date ? value.toISOString() : new Date(value).toISOString();
  return (
    <time dateTime={iso} className={cn("tabular-nums", className)}>
      {formatted}
    </time>
  );
}
