import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/server/db/prisma";
import { requireResidentSession } from "@/server/auth/resident-guard";
import { listResidentUnitsForSession } from "@/server/auth/resident-session";
import { formatDateTime } from "@/lib/formatters";

/**
 * Lists every assembly for every building the resident owns units in,
 * filtered to those currently open for electronic voting.
 */
export default async function ResidentVotingPage() {
  const session = await requireResidentSession();
  const accesses = await listResidentUnitsForSession(session);
  const buildingIds = Array.from(new Set(accesses.map((a) => a.unit.buildingId)));

  const assemblies = await prisma.assembly.findMany({
    where: {
      buildingId: { in: buildingIds },
      status: { in: ["SCHEDULED", "OPEN_FOR_VOTING", "COMPLETED"] },
    },
    include: {
      building: { select: { id: true, name: true } },
      _count: { select: { items: true } },
    },
    orderBy: [{ votingClosesAt: "asc" }],
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Skupštine</h1>
      <p className="text-sm text-[var(--color-foreground-muted)]">
        Poziv, glasanje i rezultat za zgrade u kojima ste vlasnik. Jedan stan ima jedan glas.
        Evidencija nije zamena za zakonski zapisnik.
      </p>

      {assemblies.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-[var(--color-foreground-muted)]">
            Nema zakazanih, otvorenih ni završenih skupština za vaše zgrade.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {assemblies.map((a) => (
            <Card key={a.id}>
              <CardContent className="space-y-2 py-4">
                <div className="font-semibold">{a.title}</div>
                <div className="text-xs">
                  {a.status === "OPEN_FOR_VOTING"
                    ? "Glasanje otvoreno"
                    : a.status === "SCHEDULED"
                      ? `Zakazano: ${formatDateTime(a.scheduledAt)}`
                      : "Završeno"}
                </div>
                <div className="text-xs text-[var(--color-foreground-muted)]">
                  {a.building.name} · {a._count.items} tačaka dnevnog reda
                </div>
                {a.votingClosesAt ? (
                  <div className="text-xs text-[var(--color-foreground-muted)]">
                    Glasanje do: {formatDateTime(a.votingClosesAt)}
                  </div>
                ) : null}
                <div className="pt-2">
                  <Link
                    href={`/stanar/glasanje/${a.id}`}
                    className="rounded-md bg-[var(--color-brand-700)] px-3 py-1 text-xs font-medium text-white hover:bg-[var(--color-brand-800)]"
                  >
                    {a.status === "OPEN_FOR_VOTING" ? "Glasaj" : "Otvori"}
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
