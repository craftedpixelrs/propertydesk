import { Card, CardContent } from "@/components/ui/card";
import { requireResidentSession } from "@/server/auth/resident-guard";
import { listResidentUnitsForSession } from "@/server/auth/resident-session";
import { NewTicketForm } from "@/features/resident/new-ticket-form";

interface Props {
  searchParams: Promise<{ unit?: string }>;
}

/**
 * Resident ticket submission.
 *
 * The form submits multipart to `/api/v1/public/resident/tickets` which
 * creates the `MaintenanceTicket` and attaches any uploaded photos as
 * `Document`s with category `TICKET`. The manager sees both in their
 * kvarovi queue.
 */
export default async function NewTicketPage({ searchParams }: Props) {
  await requireResidentSession();
  const session = await requireResidentSession();
  const accesses = await listResidentUnitsForSession(session);
  const sp = await searchParams;

  const options = accesses.map((a) => ({
    unitId: a.unitId,
    label: `${a.unit.building.name} · ${a.unit.code}`,
  }));
  const defaultUnitId = sp.unit ?? options[0]?.unitId ?? "";

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-2xl font-semibold">Prijavi kvar</h1>
      <Card>
        <CardContent className="py-5">
          <NewTicketForm accesses={options} defaultUnitId={defaultUnitId} />
        </CardContent>
      </Card>
    </div>
  );
}
