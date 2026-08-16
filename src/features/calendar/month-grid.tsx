"use client";

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
import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/app/i18n-provider";
import { intlLocale, type TranslateFn } from "@/lib/i18n";
import type {
  CalendarEvent,
  CalendarEventType,
} from "@/server/services/calendar/calendar.service";

interface Props {
  initialYear: number;
  initialMonth: number; // 1-12
  events: CalendarEvent[];
}

const TYPE_TONE: Record<CalendarEventType, string> = {
  "reservation-expiry": "bg-amber-100 text-amber-800",
  "payment-due": "bg-sky-100 text-sky-800",
  task: "bg-emerald-100 text-emerald-800",
  "sale-handover": "bg-indigo-100 text-indigo-800",
};

const EVENT_TYPES: CalendarEventType[] = [
  "reservation-expiry",
  "payment-due",
  "task",
  "sale-handover",
];

function typeLabel(type: CalendarEventType, t: TranslateFn): string {
  switch (type) {
    case "reservation-expiry":
      return t("nav.reservations");
    case "payment-due":
      return t("nav.payments");
    case "task":
      return t("nav.tasks");
    case "sale-handover":
      return t("deals.calendar.handovers");
  }
}

/**
 * Month-grid calendar built on `date-fns` primitives. The grid uses a
 * Monday-first week (Serbian convention) and pads to full weeks so
 * columns stay aligned across months.
 */
export function MonthGrid({ initialYear, initialMonth, events }: Props) {
  const { t, locale } = useI18n();
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [types, setTypes] = useState<Set<CalendarEventType>>(
    () => new Set<CalendarEventType>(EVENT_TYPES),
  );

  const cursor = useMemo(() => new Date(year, month - 1, 1), [year, month]);
  const gridStart = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const evt of events) {
      if (!types.has(evt.type)) continue;
      const d = new Date(evt.date);
      const key = format(d, "yyyy-MM-dd");
      const list = map.get(key) ?? [];
      list.push(evt);
      map.set(key, list);
    }
    return map;
  }, [events, types]);

  function shift(delta: number) {
    const next = delta < 0 ? subMonths(cursor, 1) : addMonths(cursor, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth() + 1);
  }

  function toggleType(eventType: CalendarEventType) {
    setTypes((prev) => {
      const next = new Set(prev);
      if (next.has(eventType)) next.delete(eventType);
      else next.add(eventType);
      return next;
    });
  }

  const monthLabel = new Intl.DateTimeFormat(intlLocale(locale), {
    month: "long",
    year: "numeric",
  }).format(cursor);
  const today = new Date();
  const weekdays = [
    t("deals.calendar.weekday.mon"),
    t("deals.calendar.weekday.tue"),
    t("deals.calendar.weekday.wed"),
    t("deals.calendar.weekday.thu"),
    t("deals.calendar.weekday.fri"),
    t("deals.calendar.weekday.sat"),
    t("deals.calendar.weekday.sun"),
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => shift(-1)}>
            <ChevronLeft className="size-4" />
          </Button>
          <div className="min-w-40 text-center text-base font-semibold capitalize">
            {monthLabel}
          </div>
          <Button variant="outline" size="sm" onClick={() => shift(1)}>
            <ChevronRight className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setYear(today.getFullYear());
              setMonth(today.getMonth() + 1);
            }}
          >
            {t("common.today")}
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {EVENT_TYPES.map((eventType) => (
            <button
              key={eventType}
              type="button"
              onClick={() => toggleType(eventType)}
              aria-pressed={types.has(eventType)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs ${
                types.has(eventType)
                  ? "border-transparent " + TYPE_TONE[eventType]
                  : "border-[var(--color-border)] bg-white text-[var(--color-foreground-muted)]"
              }`}
            >
              <span
                className={`size-2 rounded-full ${TYPE_TONE[eventType].split(" ")[0]}`}
                aria-hidden
              />
              {typeLabel(eventType, t)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-7 overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-sm">
        {weekdays.map((label) => (
          <div
            key={label}
            className="border-b border-[var(--color-border)] bg-[var(--color-surface-inset)] px-2 py-1.5 text-center text-[11px] font-semibold uppercase tracking-wide text-[var(--color-foreground-muted)]"
          >
            {label}
          </div>
        ))}
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const cellEvents = eventsByDay.get(key) ?? [];
          const inMonth = isSameMonth(day, cursor);
          const isToday = isSameDay(day, today);
          return (
            <div
              key={key}
              className={`min-h-24 border-b border-r border-[var(--color-border)] p-1 ${
                inMonth ? "bg-white" : "bg-[var(--color-surface-inset)]/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`inline-flex size-6 items-center justify-center rounded-full text-[11px] font-medium ${
                    isToday
                      ? "bg-[var(--color-brand-600)] text-white"
                      : inMonth
                        ? "text-[var(--color-foreground)]"
                        : "text-[var(--color-foreground-muted)]"
                  }`}
                >
                  {format(day, "d")}
                </span>
                {cellEvents.length > 3 ? (
                  <span className="text-[10px] text-[var(--color-foreground-muted)]">
                    +{cellEvents.length - 3}
                  </span>
                ) : null}
              </div>
              <div className="mt-1 space-y-0.5">
                {cellEvents.slice(0, 3).map((evt) => (
                  <EventPill key={evt.id} event={evt} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function eventTitle(event: CalendarEvent, t: TranslateFn): string {
  switch (event.type) {
    case "reservation-expiry":
      return t("deals.calendar.reservationExpires", {
        code: String(event.meta?.unitCode ?? event.title),
      });
    case "payment-due":
      return t("deals.calendar.paymentDue", { name: event.title });
    case "sale-handover":
      return t("deals.calendar.handover", {
        code: String(event.meta?.unitCode ?? event.title),
      });
    default:
      return event.title;
  }
}

function EventPill({ event }: { event: CalendarEvent }) {
  const { t } = useI18n();
  const tone = TYPE_TONE[event.type];
  const title = eventTitle(event, t);
  const inner = (
    <div
      title={event.subtitle ? `${title} · ${event.subtitle}` : title}
      className={`truncate rounded-sm px-1.5 py-0.5 text-[10px] leading-4 ${tone}`}
    >
      {title}
    </div>
  );
  if (event.href) {
    return (
      <Link href={event.href} className="block">
        {inner}
      </Link>
    );
  }
  return inner;
}
