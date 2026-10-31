import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/server/db/prisma";
import { requireResidentSession } from "@/server/auth/resident-guard";
import { listResidentUnitsForSession } from "@/server/auth/resident-session";
import { formatDate } from "@/lib/formatters";
import type { MaintenanceStatus } from "@prisma/client";

/**
 * Resident ticket inbox — tickets the signed-in resident filed, plus
 * tickets on units they can access. Status and the last manager note
 * are shown; the detail page carries the visible work log.
 */

const STATUS_LABEL: Record<MaintenanceStatus, string> = {
  OPEN: "Otvoreno",
  TRIAGED: "Prihvaćeno",
  IN_PROGRESS: "U radu",
  AWAITING_PARTS: "Čeka delove",
  COMPLETED: "Završeno",
  CANCELED: "Otkazano",
};

const STATUS_TONE: Record<MaintenanceStatus, string> = {
  OPEN: "bg-amber-100 text-amber-700",
  TRIAGED: "bg-sky-100 text-sky-700",
  IN_PROGRESS: "bg-indigo-100 text-indigo-700",
  AWAITING_PARTS: "bg-purple-100 text-purple-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  CANCELED: "bg-neutral-200 text-neutral-700",
};

export default async function ResidentTicketsPage() {
  const session = await requireResidentSession();
  const accesses = await listResidentUnitsForSession(session);
  const unitIds = accesses.map((access) => access.unitId);
  const tickets = await prisma.maintenanceTicket.findMany({
    where: {
      OR: [
        { reportedByPersonId: session.personId },
        ...(unitIds.length > 0 ? [{ unitId: { in: unitIds } }] : []),
      ],
    },
    include: {
      building: { select: { name: true } },
      unit: { select: { code: true } },
      history: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Prijavljeni kvarovi</h1>
          <p className="text-sm text-[var(--color-foreground-muted)]">
            Prijave za vaše stanove, status i evidencija rada upravnika.
          </p>
        </div>
        <Link
          href="/stanar/kvarovi/novi"
          className="rounded-md bg-[var(--color-brand-700)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-800)]"
        >
          Nova prijava
        </Link>
      </div>

      {tickets.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-[var(--color-foreground-muted)]">
            Niste prijavili nijedan kvar. Nova prijava se pravi iz dugmeta iznad.
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {tickets.map((t) => {
            const last = t.history[0] ?? null;
            return (
              <li
                key={t.id}
                className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="text-xs text-[var(--color-foreground-muted)]">
                      {t.code} · {t.building.name}
                      {t.unit ? ` · ${t.unit.code}` : ""}
                    </div>
                    <Link
                      href={`/stanar/kvarovi/${t.id}`}
                      className="font-semibold hover:underline"
                    >
                      {t.title}
                    </Link>
                    {t.description ? (
                      <p className="mt-1 text-sm whitespace-pre-wrap text-[var(--color-foreground-muted)]">
                        {t.description}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-col items-end gap-1 text-xs">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 font-medium ${STATUS_TONE[t.status]}`}
                    >
                      {STATUS_LABEL[t.status]}
                    </span>
                    <span className="text-[var(--color-foreground-muted)]">
                      {formatDate(t.createdAt)}
                    </span>
                  </div>
                </div>
                {last?.note ? (
                  <p className="mt-2 border-t border-[var(--color-border)] pt-2 text-xs text-[var(--color-foreground-muted)]">
                    <span className="font-medium">Poslednja napomena:</span> {last.note}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
