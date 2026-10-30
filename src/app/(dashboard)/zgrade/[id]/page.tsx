import { notFound } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PermissionGuard } from "@/components/app/permission-guard";
import { loadUserContext, requireTenantPage } from "@/server/auth/context";
import { getManagedBuilding } from "@/server/services/manager/buildings.service";
import { isDomainError } from "@/lib/errors";
import { createT } from "@/lib/i18n";
import { EditBuildingDialog, ArchiveBuildingButton } from "@/features/manager/edit-building-dialog";
import { EditEntranceDialog, NewEntranceDialog } from "@/features/manager/entrance-forms";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function BuildingOverviewTab({ params }: Props) {
  const { id } = await params;
  const ctx = await loadUserContext();
  requireTenantPage(ctx, { permission: "building.read", orgType: "MANAGER" });
  const t = createT(ctx.user.locale);

  let building: Awaited<ReturnType<typeof getManagedBuilding>>;
  try {
    building = await getManagedBuilding(ctx.activeOrganization.id, id);
  } catch (err) {
    if (isDomainError(err) && err.code === "NOT_FOUND") return notFound();
    throw err;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-end gap-2">
        <PermissionGuard permission="building.manage">
          <EditBuildingDialog
            building={{
              id: building.id,
              name: building.name,
              address: building.address,
              city: building.city,
              municipality: building.municipality,
              postalCode: building.postalCode,
              legalName: building.legalName,
              registrationNumber: building.registrationNumber,
              taxNumber: building.taxNumber,
              paymentAccountNumber: building.paymentAccountNumber,
              paymentBankName: building.paymentBankName,
              cadastralLot: building.cadastralLot,
              cadastralMunicipality: building.cadastralMunicipality,
              contactEmail: building.contactEmail,
              contactPhone: building.contactPhone,
              storeyCount: building.storeyCount,
              notes: building.notes,
            }}
          />
          <ArchiveBuildingButton buildingId={building.id} archived={!!building.archivedAt} />
        </PermissionGuard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              {t("manager.building.overview.sectionGeneral")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label={t("manager.building.fields.name")} value={building.name} />
            <Row label={t("manager.building.fields.address")} value={building.address} />
            <Row label={t("manager.building.fields.city")} value={building.city} />
            <Row
              label={t("manager.building.fields.municipality")}
              value={building.municipality ?? "—"}
            />
            <Row
              label={t("manager.building.fields.postalCode")}
              value={building.postalCode ?? "—"}
            />
            <Row
              label={t("manager.building.fields.entranceCount")}
              value={String(building.entranceCount)}
            />
            <Row
              label={t("manager.building.fields.storeyCount")}
              value={building.storeyCount != null ? String(building.storeyCount) : "—"}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("manager.building.overview.sectionLegal")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label={t("manager.building.fields.legalName")} value={building.legalName ?? "—"} />
            <Row
              label={t("manager.building.fields.registrationNumber")}
              value={building.registrationNumber ?? "—"}
            />
            <Row label={t("manager.building.fields.taxNumber")} value={building.taxNumber ?? "—"} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              {t("manager.building.overview.sectionBanking")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row
              label={t("manager.building.fields.paymentAccountNumber")}
              value={building.paymentAccountNumber ?? "—"}
            />
            <Row
              label={t("manager.building.fields.paymentBankName")}
              value={building.paymentBankName ?? "—"}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              {t("manager.building.overview.sectionCadastre")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row
              label={t("manager.building.fields.cadastralLot")}
              value={building.cadastralLot ?? "—"}
            />
            <Row
              label={t("manager.building.fields.cadastralMunicipality")}
              value={building.cadastralMunicipality ?? "—"}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              {t("manager.building.overview.sectionContact")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row
              label={t("manager.building.fields.contactEmail")}
              value={building.contactEmail ?? "—"}
            />
            <Row
              label={t("manager.building.fields.contactPhone")}
              value={building.contactPhone ?? "—"}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-sm">{t("manager.entrances.title")}</CardTitle>
          <PermissionGuard permission="building.manage">
            <NewEntranceDialog buildingId={building.id} />
          </PermissionGuard>
        </CardHeader>
        <CardContent>
          {building.entrances.length === 0 ? (
            <p className="text-sm text-[var(--color-foreground-muted)]">
              {t("manager.entrances.empty")}
            </p>
          ) : (
            <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
              <thead className="text-left text-xs tracking-wide text-[var(--color-foreground-muted)] uppercase">
                <tr>
                  <th className="py-2">{t("manager.entrances.columns.code")}</th>
                  <th className="py-2">{t("manager.entrances.columns.label")}</th>
                  <th className="py-2 text-right">{t("manager.entrances.columns.order")}</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {building.entrances.map((e) => (
                  <tr key={e.id}>
                    <td className="py-2 font-mono text-xs">{e.code}</td>
                    <td className="py-2">{e.label ?? "—"}</td>
                    <td className="py-2 text-right tabular-nums">{e.sortOrder}</td>
                    <td className="py-2 text-right">
                      <PermissionGuard permission="building.manage">
                        <EditEntranceDialog
                          buildingId={building.id}
                          entrance={{
                            id: e.id,
                            code: e.code,
                            label: e.label,
                            sortOrder: e.sortOrder,
                          }}
                        />
                      </PermissionGuard>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {building.notes ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("manager.building.overview.sectionNotes")}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm whitespace-pre-wrap">{building.notes}</CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border)] py-1 last:border-b-0">
      <span className="text-xs text-[var(--color-foreground-muted)] uppercase">{label}</span>
      <span className="min-w-0 flex-1 text-right">{value}</span>
    </div>
  );
}
