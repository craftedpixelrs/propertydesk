import { redirect } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireResidentSession } from "@/server/auth/resident-guard";
import { listResidentUnitsForSession } from "@/server/auth/resident-session";
import { createMaintenanceTicket } from "@/server/services/manager/maintenance.service";

interface Props {
  searchParams: Promise<{ unit?: string; ok?: string }>;
}

/**
 * Resident ticket submission. Server action resolves the resident's
 * ResidentAccess for the chosen unit and creates a MaintenanceTicket
 * with the resident's `BuildingPerson` id as `reportedByPersonId`. The
 * manager then sees the ticket in the normal kvarovi queue with a
 * "reported by resident" marker.
 */
export default async function NewTicketPage({ searchParams }: Props) {
  const session = await requireResidentSession();
  const accesses = await listResidentUnitsForSession(session);
  const sp = await searchParams;

  async function submitTicket(formData: FormData) {
    "use server";
    const session2 = await requireResidentSession();
    const unitId = String(formData.get("unitId") ?? "").trim();
    const title = String(formData.get("title") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    if (!unitId || !title) return;

    const accesses2 = await listResidentUnitsForSession(session2);
    const match = accesses2.find((a) => a.unitId === unitId);
    if (!match) return; // tampered unit id — ignore silently

    await createMaintenanceTicket({
      organizationId: match.organizationId,
      actorUserId: session2.personId, // residents don't have a User, use personId as actor stamp
      buildingId: match.unit.buildingId,
      unitId: match.unitId,
      title,
      description: description || null,
      reportedByPersonId: session2.personId,
      priority: "NORMAL",
    });
    redirect("/stanar/kvarovi/novi?ok=1");
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-2xl font-semibold">Prijavi kvar</h1>

      {sp.ok ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Prijava je uspešno poslata upravniku.
        </div>
      ) : null}

      <Card>
        <CardContent className="py-5">
          <form action={submitTicket} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="unitId">Posebni deo</Label>
              <select
                id="unitId"
                name="unitId"
                defaultValue={sp.unit ?? accesses[0]?.unitId ?? ""}
                required
                className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm"
              >
                {accesses.map((a) => (
                  <option key={a.id} value={a.unitId}>
                    {a.unit.building.name} · {a.unit.code}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="title">Kratak opis</Label>
              <Input id="title" name="title" required maxLength={200} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="description">Detaljnije</Label>
              <textarea
                id="description"
                name="description"
                rows={6}
                maxLength={5000}
                className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit">Pošalji prijavu</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
