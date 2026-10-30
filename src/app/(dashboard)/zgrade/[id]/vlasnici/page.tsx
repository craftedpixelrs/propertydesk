import { notFound } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import { PermissionGuard } from "@/components/app/permission-guard";
import { loadUserContext, requireTenantPage } from "@/server/auth/context";
import {
  getManagedBuilding,
  listBuildingPersons,
  listManagedUnits,
} from "@/server/services/manager/buildings.service";
import { isDomainError } from "@/lib/errors";
import { createT } from "@/lib/i18n";
import {
  AssignOwnershipDialog,
  EndOwnershipButton,
  InviteResidentDialog,
  NewPersonDialog,
} from "@/features/manager/owner-forms";

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
  const [persons, units] = await Promise.all([
    listBuildingPersons(ctx.activeOrganization.id, id),
    listManagedUnits({
      organizationId: ctx.activeOrganization.id,
      buildingId: id,
      includeArchived: false,
    }),
  ]);

  const personOptions = persons.map((p) => ({
    id: p.id,
    label:
      p.legalName ??
      ([p.firstName, p.lastName].filter(Boolean).join(" ") || p.email || "— bez imena —"),
    email: p.email,
  }));
  const unitOptions = units.map((u) => ({ id: u.id, code: u.code }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <PermissionGuard permission="building.manage">
          <NewPersonDialog buildingId={id} />
          {personOptions.length > 0 && unitOptions.length > 0 ? (
            <AssignOwnershipDialog persons={personOptions} units={unitOptions} />
          ) : null}
        </PermissionGuard>
        <PermissionGuard permission="resident.manage">
          {personOptions.length > 0 && unitOptions.length > 0 ? (
            <InviteResidentDialog persons={personOptions} units={unitOptions} />
          ) : null}
        </PermissionGuard>
      </div>

      {persons.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-[var(--color-foreground-muted)]">
            {t("manager.owners.empty")}
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]">
          <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
            <thead className="bg-[var(--color-surface-inset)] text-left text-xs tracking-wide text-[var(--color-foreground-muted)] uppercase">
              <tr>
                <th className="px-4 py-3">{t("manager.owners.columns.name")}</th>
                <th className="px-4 py-3">{t("manager.owners.columns.role")}</th>
                <th className="px-4 py-3">{t("manager.owners.columns.units")}</th>
                <th className="px-4 py-3">{t("manager.owners.columns.contact")}</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {persons.map((p) => {
                const name =
                  p.legalName ?? ([p.firstName, p.lastName].filter(Boolean).join(" ") || "—");
                const contact = [p.email, p.phone].filter(Boolean).join(" · ");
                return (
                  <tr key={p.id} className="hover:bg-[var(--color-surface-inset)]">
                    <td className="px-4 py-3 font-medium">{name}</td>
                    <td className="px-4 py-3">{p.primaryRole}</td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {p.ownerships.length === 0 ? (
                        "—"
                      ) : (
                        <div className="space-y-1">
                          {p.ownerships.map((o) => (
                            <div key={o.id} className="flex items-center gap-2">
                              <span>{o.unit?.code}</span>
                              {o.unit ? (
                                <PermissionGuard permission="building.manage">
                                  <EndOwnershipButton
                                    unitId={o.unit.id}
                                    ownershipId={o.id}
                                    label={`${name} · ${o.unit.code}`}
                                  />
                                </PermissionGuard>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[var(--color-foreground-muted)]">
                      {contact || "—"}
                    </td>
                    <td className="px-4 py-3"></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
