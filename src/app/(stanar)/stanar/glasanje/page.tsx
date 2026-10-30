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
      status: "OPEN_FOR_VOTING",
    },
    include: {
      building: { select: { id: true, name: true } },
      _count: { select: { items: true } },
    },
    orderBy: [{ votingClosesAt: "asc" }],
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Elektronsko glasanje</h1>

      {assemblies.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-[var(--color-foreground-muted)]">
            Trenutno nema otvorenih skupština za glasanje.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {assemblies.map((a) => (
            <Card key={a.id}>
              <CardContent className="space-y-2 py-4">
                <div className="font-semibold">{a.title}</div>
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
                    Glasaj
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
