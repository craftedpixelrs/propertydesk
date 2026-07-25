import Link from "next/link";
import { redirect } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadUserContext } from "@/server/auth/context";
import { listReservations } from "@/server/services/reservations.service";
import { ConvertReservationForm } from "@/features/sales/convert-reservation-form";
import { formatDate, formatMoney } from "@/lib/formatters";
import type { SupportedCurrency } from "@/lib/constants/app";
import { prisma } from "@/server/db/prisma";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function readParam(raw: string | string[] | undefined): string | undefined {
  return Array.isArray(raw) ? raw[0] : raw;
}

export default async function NovaProdajaPage({ searchParams }: PageProps) {
  const ctx = await loadUserContext();
  if (!ctx) redirect("/sign-in");
  if (!ctx.activeOrganization) redirect("/podesavanja");

  const sp = await searchParams;
  const reservationId = readParam(sp.reservation);

  if (reservationId) {
    const reservation = await prisma.reservation.findFirst({
      where: { id: reservationId, organizationId: ctx.activeOrganization.id },
      include: {
        unit: { select: { id: true, code: true, basePrice: true, finalPrice: true, currency: true } },
        buyer: { select: { firstName: true, lastName: true } },
        project: { select: { name: true } },
      },
    });
    if (!reservation) {
      return (
        <div className="space-y-4">
          <h1 className="text-2xl font-semibold">Nova prodaja</h1>
          <Card>
            <CardContent className="py-8 text-sm">Rezervacija nije pronađena.</CardContent>
          </Card>
        </div>
      );
    }
    if (reservation.status !== "APPROVED") {
      return (
        <div className="space-y-4">
          <h1 className="text-2xl font-semibold">Nova prodaja</h1>
          <Card>
            <CardContent className="py-8 text-sm">
              Prodaja se može kreirati samo iz odobrene rezervacije.
            </CardContent>
          </Card>
        </div>
      );
    }
    const currency = (reservation.unit.currency ?? "EUR") as SupportedCurrency;
    const listPrice = (
      reservation.unit.finalPrice ?? reservation.unit.basePrice
    ).toString();
    return (
      <div className="space-y-6">
        <div>
          <Link
            href="/prodaje"
            className="text-sm text-[var(--color-foreground-muted)] hover:underline"
          >
            ← Prodaje
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">
            Kreiraj prodaju iz rezervacije {reservation.unit.code}
          </h1>
          <p className="text-sm text-[var(--color-foreground-muted)]">
            {reservation.project.name} · Kupac: {reservation.buyer.firstName}{" "}
            {reservation.buyer.lastName}
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Uslovi prodaje</CardTitle>
          </CardHeader>
          <CardContent>
            <ConvertReservationForm
              reservationId={reservation.id}
              defaultListPrice={listPrice}
              defaultCurrency={currency}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  const { items: approved } = await listReservations({
    organizationId: ctx.activeOrganization.id,
    page: 1,
    pageSize: 50,
    status: ["APPROVED"],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Nova prodaja</h1>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          Izaberite odobrenu rezervaciju za konverziju u prodaju.
        </p>
      </div>

      {approved.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-sm">
            Nema odobrenih rezervacija spremnih za konverziju.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {approved.map((r) => (
            <Card key={r.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <div className="font-medium">
                    {r.unit?.code ?? "—"} · {r.project?.name ?? ""}
                  </div>
                  <div className="text-xs text-[var(--color-foreground-muted)]">
                    Kupac: {r.buyer?.firstName} {r.buyer?.lastName} · Odobrena:{" "}
                    {r.approvedAt ? formatDate(r.approvedAt) : "—"}
                    {r.reservationAmount ? (
                      <>
                        {" "}
                        · Depozit:{" "}
                        {formatMoney(
                          r.reservationAmount.toString(),
                          (r.currency ?? "EUR") as SupportedCurrency,
                        )}
                      </>
                    ) : null}
                  </div>
                </div>
                <Link
                  href={`/prodaje/nova?reservation=${r.id}`}
                  className="text-sm text-[var(--color-brand-700)] hover:underline"
                >
                  Kreiraj prodaju →
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
