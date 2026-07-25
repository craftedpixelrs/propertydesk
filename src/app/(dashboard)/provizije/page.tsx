import Link from "next/link";
import { redirect } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { loadUserContext } from "@/server/auth/context";
import { listCommissionRules } from "@/server/services/commissions/rules.service";
import { listInvestorCommissions } from "@/server/services/commissions/lifecycle.service";
import { prisma } from "@/server/db/prisma";
import { formatDate, formatMoney } from "@/lib/formatters";
import type { SupportedCurrency } from "@/lib/constants/app";
import { CommissionRowActions } from "@/features/commissions/commission-row-actions";

export const dynamic = "force-dynamic";

export default async function ProvizijePage() {
  const ctx = await loadUserContext();
  if (!ctx) redirect("/sign-in");
  if (!ctx.activeOrganization) redirect("/podesavanja");
  if (ctx.activeOrganization.type !== "INVESTOR") redirect("/dashboard");

  const rules = await listCommissionRules({
    investorOrganizationId: ctx.activeOrganization.id,
  });

  const { items: commissions } = await listInvestorCommissions({
    investorOrganizationId: ctx.activeOrganization.id,
    page: 1,
    pageSize: 50,
  });

  const canManage = ctx.permissions.includes("commission.manage");

  const connections = await prisma.agencyConnection.findMany({
    where: { investorOrganizationId: ctx.activeOrganization.id },
    select: {
      id: true,
      agency: { select: { name: true } },
    },
  });
  const connectionNames = new Map(
    connections.map((c) => [c.id, c.agency.name] as const),
  );

  const projects = await prisma.project.findMany({
    where: { organizationId: ctx.activeOrganization.id },
    select: { id: true, name: true },
  });
  const projectNames = new Map(projects.map((p) => [p.id, p.name] as const));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Pravila provizije</h1>
          <p className="text-sm text-[var(--color-foreground-muted)]">
            Detaljna pravila kreirajte iz kartice pojedinačne agencije. Ovde vidite kompletan
            pregled.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/agencije">Idi na agencije</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            Aktivne provizije ({commissions.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {commissions.length === 0 ? (
            <div className="py-12 text-center text-sm text-[var(--color-foreground-muted)]">
              Nema izračunatih provizija.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
                <thead className="bg-[var(--color-surface-inset)] text-left text-xs uppercase tracking-wide text-[var(--color-foreground-muted)]">
                  <tr>
                    <th className="px-4 py-3">Prodaja</th>
                    <th className="px-4 py-3">Agencija</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Iznos</th>
                    <th className="px-4 py-3 text-right">Kreirano</th>
                    <th className="px-4 py-3 text-right">Radnje</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {commissions.map((c) => (
                    <tr key={c.id}>
                      <td className="px-4 py-3">
                        <Link
                          href={`/prodaje/${c.saleId}`}
                          className="text-[var(--color-brand-700)] hover:underline"
                        >
                          {c.sale?.unit?.code ?? "—"}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{c.agency.name}</td>
                      <td className="px-4 py-3">{c.status}</td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatMoney(
                          (c.adjustedAmount ?? c.calculatedAmount).toString(),
                          c.currency as SupportedCurrency,
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-[var(--color-foreground-muted)]">
                        {formatDate(c.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {canManage ? (
                          <CommissionRowActions
                            commissionId={c.id}
                            status={c.status}
                          />
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Ukupno pravila: {rules.length}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {rules.length === 0 ? (
            <div className="py-12 text-center text-sm text-[var(--color-foreground-muted)]">
              Nema definisanih pravila provizije.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
                <thead className="bg-[var(--color-surface-inset)] text-left text-xs uppercase tracking-wide text-[var(--color-foreground-muted)]">
                  <tr>
                    <th className="px-4 py-3">Agencija</th>
                    <th className="px-4 py-3">Projekat</th>
                    <th className="px-4 py-3">Nivo</th>
                    <th className="px-4 py-3">Tip</th>
                    <th className="px-4 py-3 text-right">Vrednost</th>
                    <th className="px-4 py-3 text-right">Važi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {rules.map((r) => (
                    <tr key={r.id}>
                      <td className="px-4 py-3">
                        {r.agencyConnectionId
                          ? connectionNames.get(r.agencyConnectionId) ?? "—"
                          : "Sve"}
                      </td>
                      <td className="px-4 py-3">
                        {r.projectId ? projectNames.get(r.projectId) ?? "—" : "Svi"}
                      </td>
                      <td className="px-4 py-3">
                        {r.unitId
                          ? "Jedinica"
                          : r.projectId && r.agencyConnectionId
                            ? "Projekat + agencija"
                            : r.agencyConnectionId
                              ? "Konekcija"
                              : "Projekat (default)"}
                      </td>
                      <td className="px-4 py-3">
                        {r.calculationType === "PERCENTAGE" ? "Procenat" : "Fiksni iznos"}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {r.calculationType === "PERCENTAGE"
                          ? `${r.rate?.toString() ?? "0"} %`
                          : `${r.fixedAmount?.toString() ?? "0"} ${r.currency}`}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-[var(--color-foreground-muted)]">
                        {r.validFrom || r.validTo
                          ? `${r.validFrom ? formatDate(r.validFrom) : "—"} → ${r.validTo ? formatDate(r.validTo) : "—"}`
                          : "Bez ograničenja"}
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
