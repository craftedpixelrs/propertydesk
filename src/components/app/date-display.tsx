import { formatDate, formatDateTime } from "@/lib/formatters";
import { cn } from "@/lib/utils";

export interface DateDisplayProps {
  value: Date | string | number;
  withTime?: boolean;
  className?: string;
}

export function DateDisplay({ value, withTime, className }: DateDisplayProps) {
  const formatted = withTime ? formatDateTime(value) : formatDate(value);
  const iso = value instanceof Date ? value.toISOString() : new Date(value).toISOString();
  return (
    <time dateTime={iso} className={cn("tabular-nums", className)}>
      {formatted}
    </time>
  );
}
