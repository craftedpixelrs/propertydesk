import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadUserContext } from "@/server/auth/context";
import { getReservationById } from "@/server/services/reservations.service";
import { DomainError } from "@/lib/errors";
import { formatDate, formatDateTime } from "@/lib/formatters";
import { ReservationActions } from "@/features/reservations/reservation-actions";
import type { ReservationStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<ReservationStatus, string> = {
  REQUESTED: "Na čekanju",
  APPROVED: "Odobrena",
  REJECTED: "Odbijena",
  EXPIRED: "Istekla",
  CANCELED: "Otkazana",
  CONVERTED: "Pretvorena u prodaju",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function RezervacijaDetaljPage({ params }: PageProps) {
  const ctx = await loadUserContext();
  if (!ctx) redirect("/sign-in");
  if (!ctx.activeOrganization) redirect("/podesavanja");

  const { id } = await params;
  let reservation;
  try {
    reservation = await getReservationById(ctx.activeOrganization.id, id);
  } catch (err) {
    if (err instanceof DomainError && err.code === "NOT_FOUND") notFound();
    throw err;
  }

  const canApprove = ctx.permissions.includes("reservation.approve");
  const canCancel = ctx.permissions.includes("reservation.cancel");

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/rezervacije"
          className="text-sm text-[var(--color-foreground-muted)] hover:underline"
        >
          ← Rezervacije
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">
          Rezervacija · {reservation.unit?.code ?? "—"}
        </h1>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          {STATUS_LABELS[reservation.status]} · {reservation.project?.name ?? ""}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Detalji</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row
                label="Kupac"
                value={
                  reservation.buyer ? (
                    <Link
                      href={`/kupci/${reservation.buyer.id}`}
                      className="text-[var(--color-brand-700)] hover:underline"
                    >
                      {reservation.buyer.firstName} {reservation.buyer.lastName}
                    </Link>
                  ) : (
                    "—"
                  )
                }
              />
              <Row label="Kreirao" value={reservation.createdByUser?.name ?? "—"} />
              <Row label="Zadužen" value={reservation.assignedUser?.name ?? "—"} />
              <Row label="Izvor" value={reservation.sourceType === "AGENCY" ? "Agencija" : "Interno"} />
              <Row label="Kreirana" value={formatDate(reservation.createdAt)} />
              {reservation.approvedAt ? (
                <Row label="Odobrena" value={formatDateTime(reservation.approvedAt)} />
              ) : null}
              {reservation.expiresAt ? (
                <Row label="Ističe" value={formatDateTime(reservation.expiresAt)} />
              ) : null}
              {reservation.rejectionReason ? (
                <Row label="Razlog odbijanja" value={reservation.rejectionReason} />
              ) : null}
              {reservation.notes ? <Row label="Napomena" value={reservation.notes} /> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Istorija statusa</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {reservation.statusHistory.map((h) => (
                  <li
                    key={h.id}
                    className="flex items-center justify-between border-b border-[var(--color-border)] pb-2 last:border-0"
                  >
                    <span>
                      {STATUS_LABELS[h.previousStatus]} → {STATUS_LABELS[h.newStatus]}
                      {h.reason ? (
                        <span className="text-[var(--color-foreground-muted)]"> · {h.reason}</span>
                      ) : null}
                    </span>
                    <span className="text-xs text-[var(--color-foreground-subtle)]">
                      {formatDateTime(h.changedAt)}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Radnje</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ReservationActions
                reservationId={reservation.id}
                status={reservation.status}
                version={reservation.version}
                canApprove={canApprove}
                canCancel={canCancel}
              />
              {reservation.status === "APPROVED" &&
              ctx.permissions.includes("sale.manage") ? (
                <Link
                  href={`/prodaje/nova?reservation=${reservation.id}`}
                  className="inline-flex h-9 items-center rounded-md bg-[var(--color-brand-600)] px-3 text-sm font-medium text-white hover:bg-[var(--color-brand-700)]"
                >
                  Kreiraj prodaju
                </Link>
              ) : null}
              {reservation.status !== "REQUESTED" &&
              reservation.status !== "APPROVED" ? (
                <p className="text-sm text-[var(--color-foreground-muted)]">
                  Nema dostupnih radnji za ovu rezervaciju.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[var(--color-foreground-muted)]">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
