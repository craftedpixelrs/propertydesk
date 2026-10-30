import { notFound, redirect } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { prisma } from "@/server/db/prisma";
import { requireResidentSession } from "@/server/auth/resident-guard";
import { listResidentUnitsForSession } from "@/server/auth/resident-session";
import { castVote } from "@/server/services/manager/assemblies.service";
import type { AssemblyVoteChoice } from "@prisma/client";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ unit?: string }>;
}

/**
 * One assembly's agenda, one voting form per agenda item, scoped to the
 * resident's selected unit. The vote weight is derived server-side from
 * the unit's `participationShare` — the client cannot forge it.
 */
export default async function ResidentAssemblyVotePage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const session = await requireResidentSession();
  const accesses = await listResidentUnitsForSession(session);
  const buildingIds = Array.from(new Set(accesses.map((a) => a.unit.buildingId)));

  const assembly = await prisma.assembly.findFirst({
    where: {
      id,
      status: "OPEN_FOR_VOTING",
      buildingId: { in: buildingIds },
    },
    include: {
      building: { select: { id: true, name: true } },
      items: {
        orderBy: { sortOrder: "asc" },
        include: {
          votes: true,
        },
      },
    },
  });
  if (!assembly) return notFound();

  const unitsInThisBuilding = accesses.filter((a) => a.unit.buildingId === assembly.buildingId);
  const firstUnit = unitsInThisBuilding[0];
  if (!firstUnit) return notFound();
  const activeUnitId = sp.unit ?? firstUnit.unitId;

  async function submitVote(formData: FormData) {
    "use server";
    const session2 = await requireResidentSession();
    const unitId = String(formData.get("unitId") ?? "").trim();
    const agendaItemId = String(formData.get("agendaItemId") ?? "").trim();
    const choiceRaw = String(formData.get("choice") ?? "").trim();
    if (!unitId || !agendaItemId) return;
    if (!["YES", "NO", "ABSTAIN"].includes(choiceRaw)) return;

    // Re-verify the unit belongs to the resident.
    const accesses2 = await listResidentUnitsForSession(session2);
    const match = accesses2.find((a) => a.unitId === unitId);
    if (!match) return;

    await castVote({
      organizationId: match.organizationId,
      actorUserId: null, // residents vote without a User
      agendaItemId,
      unitId,
      personId: session2.personId,
      choice: choiceRaw as AssemblyVoteChoice,
    });
    redirect(`/stanar/glasanje/${id}?unit=${unitId}`);
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">{assembly.title}</h1>
        <p className="text-sm text-[var(--color-foreground-muted)]">{assembly.building.name}</p>
      </header>

      {unitsInThisBuilding.length > 1 ? (
        <Card>
          <CardContent className="py-4">
            <form method="get" className="flex flex-wrap items-center gap-3 text-sm">
              <label>Glasate kao posebni deo:</label>
              <select
                name="unit"
                defaultValue={activeUnitId}
                className="h-9 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2"
              >
                {unitsInThisBuilding.map((a) => (
                  <option key={a.unitId} value={a.unitId}>
                    {a.unit.code}
                  </option>
                ))}
              </select>
              <Button type="submit" variant="outline" size="sm">
                Promeni
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <div className="space-y-4">
        {assembly.items.map((item) => {
          const existing = item.votes.find((v) => v.unitId === activeUnitId);
          return (
            <Card key={item.id}>
              <CardContent className="space-y-3 py-4">
                <div>
                  <div className="font-semibold">
                    {item.sortOrder + 1}. {item.title}
                  </div>
                  {item.description ? (
                    <p className="mt-1 text-sm whitespace-pre-wrap">{item.description}</p>
                  ) : null}
                </div>
                {existing ? (
                  <p className="text-xs text-[var(--color-foreground-muted)]">
                    Vaš trenutni glas:{" "}
                    <strong>
                      {existing.choice === "YES"
                        ? "ZA"
                        : existing.choice === "NO"
                          ? "PROTIV"
                          : "UZDRŽAN"}
                    </strong>
                    . Možete ga promeniti dok je glasanje otvoreno.
                  </p>
                ) : null}
                <form action={submitVote} className="flex flex-wrap gap-2">
                  <input type="hidden" name="agendaItemId" value={item.id} />
                  <input type="hidden" name="unitId" value={activeUnitId} />
                  <Button type="submit" name="choice" value="YES" variant="outline">
                    ZA
                  </Button>
                  <Button type="submit" name="choice" value="NO" variant="outline">
                    PROTIV
                  </Button>
                  <Button type="submit" name="choice" value="ABSTAIN" variant="outline">
                    UZDRŽAN
                  </Button>
                </form>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
