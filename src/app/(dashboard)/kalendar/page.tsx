import { endOfMonth, startOfMonth } from "date-fns";

import { loadUserContext, requireTenantPage } from "@/server/auth/context";
import { loadCalendarEvents } from "@/server/services/calendar/calendar.service";
import { MonthGrid } from "@/features/calendar/month-grid";
import { createT } from "@/lib/i18n";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function readParam(raw: string | string[] | undefined): string | undefined {
  return Array.isArray(raw) ? raw[0] : raw;
}

export default async function KalendarPage({ searchParams }: PageProps) {
  const ctx = await loadUserContext();
  requireTenantPage(ctx, { permission: "reservation.read", orgType: "INVESTOR" });

  const t = createT(ctx.user.locale);
  const sp = await searchParams;
  const now = new Date();
  const year = Number(readParam(sp.year) ?? now.getFullYear()) || now.getFullYear();
  const monthParam = Number(readParam(sp.month) ?? now.getMonth() + 1);
  const month = Math.min(Math.max(monthParam || now.getMonth() + 1, 1), 12);
  const cursor = new Date(year, month - 1, 1);

  const events = await loadCalendarEvents({
    organizationId: ctx.activeOrganization.id,
    from: startOfMonth(cursor),
    to: endOfMonth(cursor),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("nav.calendar")}</h1>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          {t("deals.calendar.subtitle")}
        </p>
      </div>
      <MonthGrid initialYear={year} initialMonth={month} events={events} />
    </div>
  );
}
