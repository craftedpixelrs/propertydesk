"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Input, type InputProps } from "@/components/ui/input";
import { useI18n, useT } from "@/components/app/i18n-provider";
import {
  dateInputPlaceholder,
  dateTimeInputPlaceholder,
  formatDateInputValue,
  formatDateTimeInputValue,
  parseDateInputValue,
  parseDateTimeInputValue,
} from "@/lib/formatters/date";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type SharedProps = Omit<InputProps, "type" | "value" | "onChange" | "defaultValue"> & {
  value: string;
  onChange: (iso: string) => void;
};

/**
 * Date field that shows `DD.MM.YYYY` in Serbian and `MM/DD/YYYY` in English.
 * Parent state stays ISO `yyyy-MM-dd`, so a language switch reformats the same day.
 */
export function DateInput({ value, onChange, name, className, ...props }: SharedProps) {
  const { locale } = useI18n();
  const [text, setText] = useState(() => (value ? formatDateInputValue(value, locale) : ""));
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setText(value ? formatDateInputValue(value, locale) : "");
  }, [value, locale]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      {name ? <input type="hidden" name={name} value={value} /> : null}
      <Input
        {...props}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder={props.placeholder ?? dateInputPlaceholder(locale)}
        value={text}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onChange={(event) => {
          const next = event.target.value;
          setText(next);
          if (!next.trim()) {
            onChange("");
            return;
          }
          const iso = parseDateInputValue(next, locale);
          if (iso) onChange(iso);
        }}
        onBlur={() => {
          if (!text.trim()) {
            onChange("");
            setText("");
            return;
          }
          const iso = parseDateInputValue(text, locale);
          if (iso) setText(formatDateInputValue(iso, locale));
        }}
        className={cn(className)}
      />
      {open ? (
        <DateCalendar
          value={value}
          locale={locale}
          onSelect={(iso) => {
            onChange(iso);
            setText(formatDateInputValue(iso, locale));
            setOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}

function DateCalendar({
  value,
  locale,
  onSelect,
}: {
  value: string;
  locale: Locale;
  onSelect: (iso: string) => void;
}) {
  const t = useT();
  const titleId = useId();
  const selected = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(Number(value.slice(0, 4)), Number(value.slice(5, 7)) - 1, Number(value.slice(8, 10)))
    : null;
  const [visible, setVisible] = useState(() => startOfMonth(selected ?? new Date()));
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(visible), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(visible), { weekStartsOn: 1 }),
  });
  const weekdays = [
    t("deals.calendar.weekday.mon"),
    t("deals.calendar.weekday.tue"),
    t("deals.calendar.weekday.wed"),
    t("deals.calendar.weekday.thu"),
    t("deals.calendar.weekday.fri"),
    t("deals.calendar.weekday.sat"),
    t("deals.calendar.weekday.sun"),
  ];
  const monthLabel = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "sr-Latn", {
    month: "long",
    year: "numeric",
  }).format(visible);

  return (
    <div
      role="dialog"
      aria-labelledby={titleId}
      className="absolute top-full left-0 z-30 mt-1 w-[17.5rem] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-lg"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <button
          type="button"
          className="inline-flex size-8 items-center justify-center rounded-md hover:bg-[var(--color-surface-inset)]"
          aria-label={t("common.previous")}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setVisible((month) => subMonths(month, 1))}
        >
          <ChevronLeft aria-hidden className="size-4" />
        </button>
        <div id={titleId} className="text-sm font-semibold capitalize">
          {monthLabel}
        </div>
        <button
          type="button"
          className="inline-flex size-8 items-center justify-center rounded-md hover:bg-[var(--color-surface-inset)]"
          aria-label={t("common.next")}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setVisible((month) => addMonths(month, 1))}
        >
          <ChevronRight aria-hidden className="size-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-[var(--color-foreground-muted)]">
        {weekdays.map((day) => (
          <div key={day} className="py-1">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const iso = format(day, "yyyy-MM-dd");
          const inMonth = isSameMonth(day, visible);
          const isSelected = selected ? isSameDay(day, selected) : false;
          return (
            <button
              key={iso}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onSelect(iso)}
              className={cn(
                "h-8 rounded-md text-sm",
                inMonth
                  ? "text-[var(--color-foreground)]"
                  : "text-[var(--color-foreground-subtle)]",
                isSelected
                  ? "bg-[#0b1020] text-[#f7f3ea]"
                  : "hover:bg-[var(--color-surface-inset)]",
              )}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Date+time field. Value stays `yyyy-MM-ddTHH:mm`.
 * Serbian: `DD.MM.YYYY HH:mm`. English: `MM/DD/YYYY HH:mm`.
 */
export function DateTimeInput({ value, onChange, name, className, ...props }: SharedProps) {
  const { locale } = useI18n();
  const [text, setText] = useState(() => (value ? formatDateTimeInputValue(value, locale) : ""));

  useEffect(() => {
    setText(value ? formatDateTimeInputValue(value, locale) : "");
  }, [value, locale]);

  return (
    <>
      {name ? <input type="hidden" name={name} value={value} /> : null}
      <Input
        {...props}
        type="text"
        autoComplete="off"
        placeholder={props.placeholder ?? dateTimeInputPlaceholder(locale)}
        value={text}
        onChange={(event) => {
          const next = event.target.value;
          setText(next);
          if (!next.trim()) {
            onChange("");
            return;
          }
          const local = parseDateTimeInputValue(next, locale);
          if (local) onChange(local);
        }}
        onBlur={() => {
          if (!text.trim()) {
            onChange("");
            setText("");
            return;
          }
          const local = parseDateTimeInputValue(text, locale);
          if (local) setText(formatDateTimeInputValue(local, locale));
        }}
        className={cn(className)}
      />
    </>
  );
}
