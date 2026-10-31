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
      status: { in: ["SCHEDULED", "OPEN_FOR_VOTING", "COMPLETED"] },
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
  const activeAccess = unitsInThisBuilding.find((access) => access.unitId === sp.unit) ?? firstUnit;
  const activeUnitId = activeAccess.unitId;
  const now = new Date();
  const windowOpen =
    assembly.status === "OPEN_FOR_VOTING" &&
    (!assembly.votingOpensAt || now >= assembly.votingOpensAt) &&
    (!assembly.votingClosesAt || now <= assembly.votingClosesAt);
  const ownerRow = await prisma.unitOwnership.findFirst({
    where: {
      unitId: activeUnitId,
      personId: activeAccess.personId,
      endedAt: null,
      role: "OWNER",
    },
    select: { id: true },
  });

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
      actorUserId: null,
      agendaItemId,
      unitId,
      personId: match.personId,
      choice: choiceRaw as AssemblyVoteChoice,
    });
    redirect(`/stanar/glasanje/${id}?unit=${unitId}`);
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">{assembly.title}</h1>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          {assembly.building.name}
          {assembly.location ? ` · ${assembly.location}` : ""}
        </p>
        <p className="mt-1 text-sm text-[var(--color-foreground-muted)]">
          {assembly.status === "SCHEDULED"
            ? "Skupština je zakazana. Glasanje još nije otvoreno."
            : assembly.status === "COMPLETED"
              ? "Glasanje je zatvoreno. Ispod je rezultat."
              : windowOpen
                ? "Glasanje je otvoreno. Jedan posebni deo daje jedan glas."
                : "Rok za glasanje je istekao. Upravnik još treba da zatvori skupštinu."}
        </p>
        <p className="mt-2 text-xs text-[var(--color-foreground-muted)]">
          Evidencija glasanja nije zamena za zakonski zapisnik.
        </p>
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
                {item.voteKind === "INFORMATION" ? (
                  <p className="text-sm text-[var(--color-foreground-muted)]">
                    Informacija — ova tačka se ne glasa.
                  </p>
                ) : null}
                {assembly.status === "COMPLETED" && item.voteKind !== "INFORMATION" ? (
                  <p className="text-sm">{resultLabel(item.resultSummary)}</p>
                ) : null}
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
                    {windowOpen ? ". Možete ga promeniti dok je glasanje otvoreno." : "."}
                  </p>
                ) : null}
                {windowOpen && item.voteKind !== "INFORMATION" && ownerRow ? (
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
                ) : null}
                {windowOpen && item.voteKind !== "INFORMATION" && !ownerRow ? (
                  <p className="text-xs text-[var(--color-foreground-muted)]">
                    Glas za ovaj deo može dati samo trenutni vlasnik.
                  </p>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function resultLabel(summary: unknown): string {
  if (!summary || typeof summary !== "object") return "Rezultat još nije izračunat.";
  const row = summary as { passed?: boolean | null; informational?: boolean; quorumMet?: boolean };
  if (row.informational || row.passed == null) return "Informacija, bez glasanja.";
  if (row.quorumMet === false) return "Nema kvoruma, odluka nije usvojena.";
  return row.passed ? "Usvojeno." : "Nije usvojeno.";
}
