import Link from "next/link";
import { redirect } from "next/navigation";
import type { NotificationCategory } from "@prisma/client";

import { Card, CardContent } from "@/components/ui/card";
import { loadUserContext } from "@/server/auth/context";
import { listNotifications } from "@/server/services/notifications.service";
import { formatDateTime } from "@/lib/formatters";
import { MarkAllReadButton } from "@/features/notifications/mark-all-read-button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const CATEGORY_TABS: Array<{ value: NotificationCategory | "ALL"; label: string }> = [
  { value: "ALL", label: "Sve" },
  { value: "RESERVATION", label: "Rezervacije" },
  { value: "SALE", label: "Prodaje" },
  { value: "PAYMENT", label: "Uplate" },
  { value: "COMMISSION", label: "Provizije" },
  { value: "AGENCY", label: "Agencije" },
  { value: "TASK", label: "Zadaci" },
  { value: "BUYER", label: "Kupci" },
  { value: "SYSTEM", label: "Sistem" },
];

export default async function ObavestenjaPage({ searchParams }: PageProps) {
  const ctx = await loadUserContext();
  if (!ctx) redirect("/sign-in");

  const sp = await searchParams;
  const single = (key: string) => {
    const v = sp[key];
    return Array.isArray(v) ? v[0] : v;
  };
  const page = Number(single("page") ?? "1") || 1;
  const pageSize = 30;
  const unreadOnly = single("unread") === "1";
  const rawCategory = single("category") ?? "ALL";
  const category = rawCategory !== "ALL" ? (rawCategory as NotificationCategory) : null;

  const { items, total, unreadCount } = await listNotifications({
    userId: ctx.user.id,
    page,
    pageSize,
    unreadOnly,
    category,
  });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const makeHref = (overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (unreadOnly) params.set("unread", "1");
    if (page > 1) params.set("page", String(page));
    for (const [k, v] of Object.entries(overrides)) {
      if (v === undefined) params.delete(k);
      else if (v === "") params.delete(k);
      else params.set(k, v);
    }
    const s = params.toString();
    return s ? `/obavestenja?${s}` : "/obavestenja";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Obaveštenja</h1>
          <p className="text-sm text-[var(--color-foreground-muted)]">
            {unreadCount > 0 ? `Nepročitanih: ${unreadCount}` : "Sve je pročitano."}
          </p>
        </div>
        <MarkAllReadButton disabled={unreadCount === 0} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {CATEGORY_TABS.map((tab) => {
          const active =
            (tab.value === "ALL" && !category) || tab.value === category;
          return (
            <Link
              key={tab.value}
              href={makeHref({
                category: tab.value === "ALL" ? "" : (tab.value as string),
                page: "",
              })}
              className={cn(
                "rounded-full border px-3 py-1 text-xs",
                active
                  ? "border-[var(--color-brand-500)] bg-[var(--color-brand-50)] text-[var(--color-brand-700)]"
                  : "border-[var(--color-border)] text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)]",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
        <Link
          href={makeHref({ unread: unreadOnly ? "" : "1", page: "" })}
          className={cn(
            "ml-auto rounded-full border px-3 py-1 text-xs",
            unreadOnly
              ? "border-[var(--color-brand-500)] bg-[var(--color-brand-50)] text-[var(--color-brand-700)]"
              : "border-[var(--color-border)] text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)]",
          )}
        >
          {unreadOnly ? "Samo nepročitana ✓" : "Samo nepročitana"}
        </Link>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-[var(--color-foreground-muted)]">
            Nemate obaveštenja.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((n) => {
            const content = (
              <Card className={cn(!n.readAt && "border-[var(--color-brand-300)]")}>
                <CardContent className="py-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium">{n.title}</span>
                    {!n.readAt ? (
                      <span className="mt-1 size-2 flex-none rounded-full bg-[var(--color-brand-500)]" />
                    ) : null}
                  </div>
                  <p className="text-sm text-[var(--color-foreground-muted)]">{n.message}</p>
                  <p className="mt-1 text-xs text-[var(--color-foreground-subtle)]">
                    {formatDateTime(n.createdAt)}
                  </p>
                </CardContent>
              </Card>
            );
            return n.actionUrl ? (
              <Link key={n.id} href={n.actionUrl} className="block">
                {content}
              </Link>
            ) : (
              <div key={n.id}>{content}</div>
            );
          })}
        </div>
      )}

      {totalPages > 1 ? (
        <div className="flex items-center justify-center gap-2 text-xs">
          {page > 1 ? (
            <Link
              href={makeHref({ page: String(page - 1) })}
              className="rounded border border-[var(--color-border)] px-3 py-1 hover:bg-[var(--color-surface-muted)]"
            >
              ← Prethodna
            </Link>
          ) : null}
          <span className="text-[var(--color-foreground-muted)]">
            Strana {page} od {totalPages}
          </span>
          {page < totalPages ? (
            <Link
              href={makeHref({ page: String(page + 1) })}
              className="rounded border border-[var(--color-border)] px-3 py-1 hover:bg-[var(--color-surface-muted)]"
            >
              Sledeća →
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
