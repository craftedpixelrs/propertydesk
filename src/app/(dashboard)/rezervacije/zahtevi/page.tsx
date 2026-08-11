import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReservationRequestStatus } from "@prisma/client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { loadUserContext } from "@/server/auth/context";
import {
  expireStaleReservationRequests,
  listReservationRequests,
} from "@/server/services/reservations/reservation-requests.service";
import { formatDateTime, formatMoney } from "@/lib/formatters";
import type { SupportedCurrency } from "@/lib/constants/app";
import { ReservationRequestActions } from "@/features/reservations/reservation-request-actions";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<ReservationRequestStatus, string> = {
  PENDING: "Na čekanju",
  CONFIRMED: "Potvrđen",
  DECLINED: "Odbijen",
  EXPIRED: "Istekao",
};

const STATUS_TONE: Record<ReservationRequestStatus, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  CONFIRMED: "bg-emerald-100 text-emerald-700",
  DECLINED: "bg-rose-100 text-rose-700",
  EXPIRED: "bg-neutral-200 text-neutral-700",
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function readParam(raw: string | string[] | undefined): string | undefined {
  return Array.isArray(raw) ? raw[0] : raw;
}

export default async function ReservationRequestsPage({ searchParams }: PageProps) {
  const ctx = await loadUserContext();
  if (!ctx) redirect("/sign-in");
  if (!ctx.activeOrganization) redirect("/podesavanja");
  if (!ctx.permissions.includes("reservation.read")) {
    redirect("/dashboard");
  }

  const sp = await searchParams;
  const rawStatus = readParam(sp.status);
  const status =
    rawStatus === "ALL" ||
    rawStatus === "PENDING" ||
    rawStatus === "CONFIRMED" ||
    rawStatus === "DECLINED" ||
    rawStatus === "EXPIRED"
      ? rawStatus
      : "PENDING";

  await expireStaleReservationRequests();
  const { items, total, pendingCount } = await listReservationRequests({
    organizationId: ctx.activeOrganization.id,
    status,
    page: 1,
    pageSize: 100,
  });

  const canApprove = ctx.permissions.includes("reservation.approve");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/rezervacije"
            className="text-sm text-[var(--color-foreground-muted)] hover:underline"
          >
            ← Rezervacije
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">Zahtevi sa javne ponude</h1>
          <p className="text-sm text-[var(--color-foreground-muted)]">
            {pendingCount} aktivnih zahteva sa kaparom.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 text-sm">
            {(["PENDING", "CONFIRMED", "DECLINED", "EXPIRED", "ALL"] as const).map(
              (s) => (
                <Link
                  key={s}
                  href={{ pathname: "/rezervacije/zahtevi", query: { status: s } }}
                  className={`rounded-full border px-3 py-1 text-xs ${
                    status === s
                      ? "border-[var(--color-brand-600)] bg-[var(--color-brand-50)] text-[var(--color-brand-800)]"
                      : "border-[var(--color-border)] hover:bg-[var(--color-surface-inset)]"
                  }`}
                >
                  {s === "ALL" ? "Sve" : STATUS_LABELS[s]}
                </Link>
              ),
            )}
          </div>
        </CardContent>
      </Card>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-[var(--color-foreground-muted)]">
            Nema zahteva u ovom statusu.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm">Zahtevi ({total})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-[var(--color-border)]">
              {items.map((r) => (
                <div key={r.id} className="flex flex-wrap items-start justify-between gap-4 px-5 py-4">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">
                        {r.firstName} {r.lastName}
                      </span>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_TONE[r.status]}`}
                      >
                        {STATUS_LABELS[r.status]}
                      </span>
                    </div>
                    <div className="text-xs text-[var(--color-foreground-muted)]">
                      {r.unit ? (
                        <>
                          Jedinica{" "}
                          <Link
                            href={`/jedinice/${r.unit.id}`}
                            className="text-[var(--color-brand-700)] hover:underline"
                          >
                            {r.unit.code}
                          </Link>{" "}
                          · {r.unit.project?.name ?? ""}
                        </>
                      ) : (
                        "Jedinica obrisana"
                      )}
                    </div>
                    <div className="text-xs text-[var(--color-foreground-muted)]">
                      <a
                        href={`mailto:${r.email}`}
                        className="text-[var(--color-brand-700)] hover:underline"
                      >
                        {r.email}
                      </a>{" "}
                      ·{" "}
                      <a
                        href={`tel:${r.phone}`}
                        className="text-[var(--color-brand-700)] hover:underline"
                      >
                        {r.phone}
                      </a>
                    </div>
                    {r.referralCode ? (
                      <div className="text-xs text-[var(--color-foreground-muted)]">
                        Referral: <code>{r.referralCode}</code>
                      </div>
                    ) : null}
                    {r.notes ? (
                      <p className="max-w-2xl text-xs italic text-[var(--color-foreground-muted)]">
                        “{r.notes}”
                      </p>
                    ) : null}
                    <div className="text-[10px] text-[var(--color-foreground-subtle)]">
                      Kreirano {formatDateTime(r.createdAt)} · Ističe{" "}
                      {formatDateTime(r.expiresAt)}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 text-right">
                    <div className="text-lg font-semibold">
                      {formatMoney(
                        r.depositAmount.toString(),
                        r.currency as SupportedCurrency,
                      )}
                    </div>
                    <code className="text-[10px] text-[var(--color-foreground-subtle)]">
                      {r.ipsReference}
                    </code>
                    {r.status === "PENDING" ? (
                      <ReservationRequestActions
                        requestId={r.id}
                        canApprove={canApprove}
                      />
                    ) : r.decidedByUser?.name ? (
                      <span className="text-[10px] text-[var(--color-foreground-subtle)]">
                        {r.decidedByUser.name}
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="flex flex-col gap-2 py-4 text-xs text-[var(--color-foreground-muted)] sm:flex-row sm:items-center sm:justify-between">
          <span>
            Ne primaju se novi zahtevi automatski? Otvorite podešavanja
            profila i unesite IPS račun za primanje depozita.
          </span>
          <Button asChild size="sm" variant="outline">
            <Link href="/administracija/naplata/profil-firme">
              Profil firme
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
