"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, BellOff } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/formatters";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  actionUrl: string | null;
  readAt: string | null;
  createdAt: string;
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
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function markAllRead() {
    await fetch("/api/v1/notifications/read-all", {
      method: "POST",
      credentials: "include",
    }).catch(() => null);
    await load();
  }

  async function markRead(id: string) {
    await fetch(`/api/v1/notifications/${id}/read`, {
      method: "POST",
      credentials: "include",
    }).catch(() => null);
    await load();
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label="Obaveštenja"
        onClick={() => setOpen((v) => !v)}
        className="relative flex size-9 items-center justify-center rounded-md text-[var(--color-foreground-muted)] hover:bg-[var(--color-surface-inset)]"
      >
        <Bell aria-hidden className="size-5" />
        {unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Obaveštenja"
          className={cn(
            "absolute z-40 mt-2 w-[22rem] max-w-[calc(100vw-1rem)] overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl",
            align === "start"
              ? "left-full top-0 ml-2 mt-0"
              : "right-0",
          )}
        >
          <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] px-4 py-2.5">
            <span className="text-sm font-semibold">Obaveštenja</span>
            {unread > 0 ? (
              <button
                type="button"
                onClick={markAllRead}
                className="rounded-md text-xs font-medium text-[var(--color-brand-700)] hover:underline"
              >
                Označi sve kao pročitano
              </button>
            ) : null}
          </div>
          <div className="max-h-[26rem] overflow-y-auto">
            {items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                <BellOff
                  aria-hidden
                  className="size-8 text-[var(--color-foreground-subtle)]"
                />
                <p className="text-sm font-medium text-[var(--color-foreground-muted)]">
                  Nemate obaveštenja
                </p>
                <p className="text-xs text-[var(--color-foreground-subtle)]">
                  Kada se nešto dogodi, prikazaće se ovde.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-[var(--color-border)]">
                {items.map((n) => {
                  const body = (
                    <div
                      className={cn(
                        "flex gap-3 px-4 py-3 text-sm transition-colors hover:bg-[var(--color-surface-inset)]",
                        !n.readAt && "bg-[var(--color-brand-50)]",
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "mt-1.5 size-2 flex-none rounded-full",
                          n.readAt
                            ? "bg-transparent"
                            : "bg-[var(--color-brand-500)]",
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium text-[var(--color-foreground)]">
                          {n.title}
                        </div>
                        <p className="line-clamp-2 text-[13px] leading-snug text-[var(--color-foreground-muted)]">
                          {n.message}
                        </p>
                        <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-[var(--color-foreground-subtle)]">
                          {formatDateTime(n.createdAt)}
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
          <div className="border-t border-[var(--color-border)] bg-[var(--color-surface-inset)]/40 px-4 py-2 text-center">
            <Link
              href="/obavestenja"
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-[var(--color-brand-700)] hover:underline"
            >
              Sva obaveštenja →
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
