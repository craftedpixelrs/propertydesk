import { redirect } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadUserContext } from "@/server/auth/context";
import { listAgencyCommissions } from "@/server/services/commissions/commissions.service";
import { formatDate } from "@/lib/formatters";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  CALCULATED: "Obračunata",
  APPROVED: "Odobrena",
  INVOICED: "Fakturisana",
  DUE: "Dospela",
  PAID: "Plaćena",
  DISPUTED: "Sporna",
  CANCELED: "Otkazana",
};

export default async function MojeProvizijePage() {
  const ctx = await loadUserContext();
  if (!ctx) redirect("/sign-in");
  if (!ctx.activeOrganization) redirect("/podesavanja");
  if (ctx.activeOrganization.type !== "AGENCY") redirect("/dashboard");

  const { items, total } = await listAgencyCommissions({
    agencyOrganizationId: ctx.activeOrganization.id,
    page: 1,
    pageSize: 50,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Moje provizije</h1>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          Obračun provizija za realizovane prodaje. Detaljna razrada dolazi u sledećoj fazi.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Ukupno: {total}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <div className="py-12 text-center text-sm text-[var(--color-foreground-muted)]">
              Nema evidentiranih provizija.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
                <thead className="bg-[var(--color-surface-inset)] text-left text-xs uppercase tracking-wide text-[var(--color-foreground-muted)]">
                  <tr>
                    <th className="px-4 py-3">Prodaja</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Tip</th>
                    <th className="px-4 py-3 text-right">Osnovica</th>
                    <th className="px-4 py-3 text-right">Iznos</th>
                    <th className="px-4 py-3">Kreirano</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {items.map((c) => (
                    <tr key={c.id}>
                      <td className="px-4 py-3 font-mono text-xs">{c.saleId}</td>
                      <td className="px-4 py-3 text-xs">
                        {STATUS_LABELS[c.status] ?? c.status}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {c.calculationType === "PERCENTAGE"
                          ? `Procenat ${c.rate ?? "—"}%`
                          : "Fiksni iznos"}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {c.baseAmount} {c.currency}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium">
                        {c.amount} {c.currency}
                      </td>
                      <td className="px-4 py-3 text-[var(--color-foreground-muted)]">
                        {formatDate(c.createdAt)}
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
