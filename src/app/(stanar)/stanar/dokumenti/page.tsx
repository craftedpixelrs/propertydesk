import { Card, CardContent } from "@/components/ui/card";
import { requireResidentSession } from "@/server/auth/resident-guard";
import { listResidentUnitsForSession } from "@/server/auth/resident-session";
import { listResidentDocuments } from "@/server/services/documents.service";
import { formatDate } from "@/lib/formatters";

/**
 * Resident-facing document inbox. Shows every document the signed-in
 * resident may see per `listResidentDocuments` — RESIDENT_SHARED on their
 * buildings/units plus documents on tickets they filed. Download goes
 * through `/api/v1/public/resident/documents/[id]/download`, which runs
 * the matching guard.
 */
export default async function ResidentDocumentsPage() {
  const session = await requireResidentSession();
  const accesses = await listResidentUnitsForSession(session);
  const buildingIds = Array.from(new Set(accesses.map((a) => a.unit.buildingId)));
  const unitIds = accesses.map((a) => a.unitId);

  const { items } = await listResidentDocuments({
    personId: session.personId,
    buildingIds,
    unitIds,
    page: 1,
    pageSize: 100,
  });

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold">Dokumenti</h1>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          Dokumenti vaše zgrade i vaših prijava koje je upravnik podelio sa stanarima.
        </p>
      </section>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-[var(--color-foreground-muted)]">
            Nema dostupnih dokumenata.
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]">
          <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
            <thead className="bg-[var(--color-surface-inset)] text-left text-xs tracking-wide text-[var(--color-foreground-muted)] uppercase">
              <tr>
                <th className="px-4 py-3">Naziv</th>
                <th className="px-4 py-3">Kategorija</th>
                <th className="px-4 py-3">Datum</th>
                <th className="px-4 py-3 text-right">Preuzmi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {items.map((d) => (
                <tr key={d.id}>
                  <td className="px-4 py-3 font-medium">{d.originalFileName}</td>
                  <td className="px-4 py-3 text-xs">{d.category}</td>
                  <td className="px-4 py-3 text-xs text-[var(--color-foreground-muted)]">
                    {formatDate(d.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <a
                      className="text-[var(--color-brand-700)] hover:underline"
                      href={`/api/v1/public/resident/documents/${d.id}/download`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Otvori
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
