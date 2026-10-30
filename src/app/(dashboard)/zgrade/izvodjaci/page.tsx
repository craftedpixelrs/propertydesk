import { Card, CardContent } from "@/components/ui/card";
import { PermissionGuard } from "@/components/app/permission-guard";
import { loadUserContext, requireTenantPage } from "@/server/auth/context";
import { listSuppliers } from "@/server/services/manager/maintenance.service";
import { createT } from "@/lib/i18n";
import { EditSupplierDialog, NewSupplierDialog } from "@/features/manager/ticket-forms";

export default async function SuppliersPage() {
  const ctx = await loadUserContext();
  requireTenantPage(ctx, { permission: "ticket.read", orgType: "MANAGER" });
  const t = createT(ctx.user.locale);

  const rows = await listSuppliers({
    organizationId: ctx.activeOrganization.id,
    includeArchived: false,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t("manager.suppliers.title")}</h1>
          <p className="text-sm text-[var(--color-foreground-muted)]">
            {t("manager.suppliers.subtitle")}
          </p>
        </div>
        <PermissionGuard permission="ticket.manage">
          <NewSupplierDialog />
        </PermissionGuard>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-[var(--color-foreground-muted)]">
            {t("manager.suppliers.empty")}
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]">
          <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
            <thead className="bg-[var(--color-surface-inset)] text-left text-xs tracking-wide text-[var(--color-foreground-muted)] uppercase">
              <tr>
                <th className="px-4 py-3">{t("manager.suppliers.columns.name")}</th>
                <th className="px-4 py-3">{t("manager.suppliers.columns.category")}</th>
                <th className="px-4 py-3">{t("manager.suppliers.columns.contact")}</th>
                <th className="px-4 py-3">{t("manager.suppliers.columns.scope")}</th>
                <th className="px-4 py-3">{t("manager.suppliers.columns.taxNumber")}</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {rows.map((s) => (
                <tr key={s.id} className="hover:bg-[var(--color-surface-inset)]">
                  <td className="px-4 py-3 font-medium">{s.name}</td>
                  <td className="px-4 py-3 text-[var(--color-foreground-muted)]">
                    {s.category ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--color-foreground-muted)]">
                    {[s.contactPerson, s.phone, s.email].filter(Boolean).join(" · ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {s.buildingId
                      ? t("manager.suppliers.scope.building")
                      : t("manager.suppliers.scope.platform")}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{s.taxNumber ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <PermissionGuard permission="ticket.manage">
                      <EditSupplierDialog
                        supplier={{
                          id: s.id,
                          name: s.name,
                          category: s.category,
                          contactPerson: s.contactPerson,
                          phone: s.phone,
                          email: s.email,
                          taxNumber: s.taxNumber,
                        }}
                      />
                    </PermissionGuard>
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
