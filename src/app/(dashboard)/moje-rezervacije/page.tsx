import Link from "next/link";
import { redirect } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadUserContext } from "@/server/auth/context";
import { prisma } from "@/server/db/prisma";
import { formatDate } from "@/lib/formatters";
import type { ReservationStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<ReservationStatus, string> = {
  REQUESTED: "Traženo",
  APPROVED: "Odobreno",
  REJECTED: "Odbijeno",
  EXPIRED: "Isteklo",
  CANCELED: "Otkazano",
  CONVERTED: "Prodato",
};

const STATUS_TONE: Record<ReservationStatus, string> = {
  REQUESTED: "bg-amber-100 text-amber-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-rose-100 text-rose-700",
  EXPIRED: "bg-neutral-200 text-neutral-700",
  CANCELED: "bg-neutral-200 text-neutral-700",
  CONVERTED: "bg-sky-100 text-sky-700",
};

export default async function MojeRezervacijePage() {
  const ctx = await loadUserContext();
  if (!ctx) redirect("/sign-in");
  if (!ctx.activeOrganization) redirect("/podesavanja");
  if (ctx.activeOrganization.type !== "AGENCY") redirect("/dashboard");

  const reservations = await prisma.reservation.findMany({
    where: {
      agencyOrganizationId: ctx.activeOrganization.id,
    },
    orderBy: { createdAt: "desc" },
    include: {
      unit: { select: { id: true, code: true } },
      project: { select: { id: true, name: true } },
    },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Moje rezervacije</h1>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          Sve rezervacije koje je Vaša agencija kreirala kroz portal.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Ukupno: {reservations.length}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {reservations.length === 0 ? (
            <div className="py-12 text-center text-sm text-[var(--color-foreground-muted)]">
              Nema rezervacija.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
                <thead className="bg-[var(--color-surface-inset)] text-left text-xs uppercase tracking-wide text-[var(--color-foreground-muted)]">
                  <tr>
                    <th className="px-4 py-3">Jedinica</th>
                    <th className="px-4 py-3">Projekat</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Važi do</th>
                    <th className="px-4 py-3">Kreirano</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {reservations.map((r) => (
                    <tr key={r.id}>
                      <td className="px-4 py-3 font-mono text-xs">
                        <Link
                          href={`/rezervacije/${r.id}`}
                          className="text-[var(--color-brand-700)] hover:underline"
                        >
                          {r.unit.code}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{r.project.name}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONE[r.status]}`}
                        >
                          {STATUS_LABELS[r.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[var(--color-foreground-muted)]">
                        {r.expiresAt ? formatDate(r.expiresAt) : "—"}
                      </td>
                      <td className="px-4 py-3 text-[var(--color-foreground-muted)]">
                        {formatDate(r.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
