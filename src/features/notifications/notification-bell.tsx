"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, BellOff, CheckCheck, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/formatters";
import { intlLocale, type Locale } from "@/lib/i18n";
import { useI18n } from "@/components/app/i18n-provider";
import { notificationGlyph } from "@/features/notifications/notification-visual";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  category?: string | null;
  actionUrl: string | null;
  readAt: string | null;
  createdAt: string;
}

function noticeTime(iso: string, locale: Locale): string {
  const diffMs = new Date(iso).getTime() - Date.now();
  const abs = Math.abs(diffMs);
  const rtf = new Intl.RelativeTimeFormat(intlLocale(locale), { numeric: "auto" });
  if (abs < 45_000) return rtf.format(0, "second");
  if (abs < 3_600_000) return rtf.format(Math.round(diffMs / 60_000), "minute");
  if (abs < 86_400_000) return rtf.format(Math.round(diffMs / 3_600_000), "hour");
  if (abs < 30 * 86_400_000) return rtf.format(Math.round(diffMs / 86_400_000), "day");
  if (abs < 365 * 86_400_000) {
    return rtf.format(Math.round(diffMs / (30 * 86_400_000)), "month");
  }
  return formatDate(iso, undefined, locale);
}

interface Envelope {
  data: NotificationItem[];
  meta?: { unreadCount?: number };
}

export interface NotificationBellProps {
  /**
   * Which side of the trigger button the popover should extend from.
   *
   * - `"end"` (default): popover's *right* edge is anchored to the button's
   *   right edge, panel expands leftward. Use when the bell sits near the
   *   right edge of the viewport (mobile top bar).
   * - `"start"`: popover appears *to the right* of the button, expanding
   *   into the main content area. Use when the bell is inside a narrow
   *   left sidebar (desktop) — otherwise the panel would extend off-screen.
   */
  align?: "start" | "end";
}

/**
 * Header notification bell. Polls the notification feed, shows an unread
 * badge, and offers a dropdown with the latest items and a "mark all read"
 * action. Reads the raw envelope so it can access `meta.unreadCount`.
 */
export function NotificationBell({ align = "end" }: NotificationBellProps) {
  const { t, locale } = useI18n();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/notifications?pageSize=10", {
        headers: { accept: "application/json" },
        credentials: "include",
      });
      if (!res.ok) return;
      const body = (await res.json()) as Envelope;
      setItems(body.data ?? []);
      setUnread(body.meta?.unreadCount ?? 0);
    } catch {
      // Silent — the bell is non-critical UI.
    }
  }, []);

  useEffect(() => {
    void load();
    const interval = setInterval(() => void load(), 60_000);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  async function markAllRead() {
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => (n.readAt ? n : { ...n, readAt: now })));
    setUnread(0);
    await fetch("/api/v1/notifications/read-all", {
      method: "POST",
      credentials: "include",
    }).catch(() => null);
    await load();
  }

  async function markRead(id: string) {
    setItems((prev) =>
      prev.map((n) => (n.id === id && !n.readAt ? { ...n, readAt: new Date().toISOString() } : n)),
    );
    setUnread((count) => {
      const wasUnread = items.some((n) => n.id === id && !n.readAt);
      return wasUnread ? Math.max(0, count - 1) : count;
    });
    await fetch(`/api/v1/notifications/${id}/read`, {
      method: "POST",
      credentials: "include",
    }).catch(() => null);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label={t("ui.notifications.title")}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="relative flex size-9 items-center justify-center rounded-md text-[var(--color-foreground-muted)] hover:bg-[var(--color-surface-inset)]"
      >
        <Bell aria-hidden className="size-5" />
        {unread > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label={t("ui.notifications.title")}
          className={cn(
            "absolute z-40 mt-2 w-[24rem] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl",
            align === "start" ? "top-0 left-full mt-0 ml-2" : "right-0",
          )}
        >
          <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] px-3 py-2.5">
            <div className="flex min-w-0 items-center gap-2">
              <span className="text-sm font-semibold">{t("ui.notifications.title")}</span>
              {unread > 0 ? (
                <span className="rounded-full bg-[var(--color-brand-600)] px-1.5 py-0.5 text-[10px] leading-none font-semibold text-white">
                  {unread > 99 ? "99+" : unread}
                </span>
              ) : null}
            </div>
            {unread > 0 ? (
              <button
                type="button"
                onClick={markAllRead}
                className="inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium text-[var(--color-brand-700)] hover:bg-[var(--color-surface-inset)]"
              >
                <CheckCheck aria-hidden className="size-3.5" />
                {t("ui.notifications.markAllRead")}
              </button>
            ) : null}
          </div>
          <div className="max-h-[min(28rem,70vh)] [scrollbar-width:thin] overflow-y-auto">
            {items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                <BellOff aria-hidden className="size-8 text-[var(--color-foreground-subtle)]" />
                <p className="text-sm font-medium text-[var(--color-foreground-muted)]">
                  {t("ui.notifications.empty")}
                </p>
                <p className="text-xs text-[var(--color-foreground-subtle)]">
                  {t("crm.notifications.emptyHint")}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-[var(--color-border)]">
                {items.map((n) => {
                  const { Icon, tile } = notificationGlyph(n.category);
                  const body = (
                    <div
                      className={cn(
                        "flex gap-3 border-l-2 px-3 py-3 text-sm transition-colors hover:bg-[var(--color-surface-inset)]",
                        n.readAt
                          ? "border-l-transparent"
                          : "border-l-[var(--color-brand-600)] bg-[color-mix(in_oklab,var(--color-brand-600)_10%,transparent)]",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg",
                          tile,
                        )}
                      >
                        <Icon aria-hidden className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span
                            className={cn(
                              "truncate text-[var(--color-foreground)]",
                              n.readAt ? "font-medium" : "font-semibold",
                            )}
                          >
                            {n.title}
                          </span>
                          <time
                            dateTime={n.createdAt}
                            className="shrink-0 text-[11px] text-[var(--color-foreground-subtle)]"
                          >
                            {noticeTime(n.createdAt, locale)}
                          </time>
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-[var(--color-foreground-muted)]">
                          {n.message}
                        </p>
                      </div>
                    </div>
                  );
                  return (
                    <li key={n.id}>
                      {n.actionUrl ? (
                        <Link
                          href={n.actionUrl}
                          onClick={() => {
                            void markRead(n.id);
                            setOpen(false);
                          }}
                        >
                          {body}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          className="w-full text-left"
                          onClick={() => void markRead(n.id)}
                        >
                          {body}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <Link
            href="/obavestenja"
            onClick={() => setOpen(false)}
            className="flex items-center justify-center gap-1 border-t border-[var(--color-border)] px-3 py-2.5 text-sm font-medium text-[var(--color-brand-700)] hover:bg-[var(--color-surface-inset)]"
          >
            {t("ui.notifications.viewAll")}
            <ChevronRight aria-hidden className="size-4" />
          </Link>
        </div>
      ) : null}
    </div>
  );
}
