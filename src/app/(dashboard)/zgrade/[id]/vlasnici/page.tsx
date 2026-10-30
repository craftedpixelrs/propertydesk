import { notFound } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import { loadUserContext, requireTenantPage } from "@/server/auth/context";
import {
  getManagedBuilding,
  listBuildingPersons,
} from "@/server/services/manager/buildings.service";
import { isDomainError } from "@/lib/errors";
import { createT } from "@/lib/i18n";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function BuildingOwnersTab({ params }: Props) {
  const { id } = await params;
  const ctx = await loadUserContext();
  requireTenantPage(ctx, { permission: "building.read", orgType: "MANAGER" });
  const t = createT(ctx.user.locale);

  try {
    await getManagedBuilding(ctx.activeOrganization.id, id);
  } catch (err) {
    if (isDomainError(err) && err.code === "NOT_FOUND") return notFound();
    throw err;
  }
  const persons = await listBuildingPersons(ctx.activeOrganization.id, id);

  if (persons.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-[var(--color-foreground-muted)]">
          {t("manager.owners.empty")}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]">
      <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
        <thead className="bg-[var(--color-surface-inset)] text-left text-xs tracking-wide text-[var(--color-foreground-muted)] uppercase">
          <tr>
            <th className="px-4 py-3">{t("manager.owners.columns.name")}</th>
            <th className="px-4 py-3">{t("manager.owners.columns.role")}</th>
            <th className="px-4 py-3">{t("manager.owners.columns.units")}</th>
            <th className="px-4 py-3">{t("manager.owners.columns.contact")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border)]">
          {persons.map((p) => {
            const name = p.legalName ?? [p.firstName, p.lastName].filter(Boolean).join(" ") ?? "—";
            const unitCodes = p.ownerships
              .map((o) => o.unit?.code)
              .filter(Boolean)
              .join(", ");
            const contact = [p.email, p.phone].filter(Boolean).join(" · ");
            return (
              <tr key={p.id} className="hover:bg-[var(--color-surface-inset)]">
                <td className="px-4 py-3 font-medium">{name}</td>
                <td className="px-4 py-3">{p.primaryRole}</td>
                <td className="px-4 py-3 font-mono text-xs">{unitCodes || "—"}</td>
                <td className="px-4 py-3 text-[var(--color-foreground-muted)]">{contact || "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
