import { notFound, redirect } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadUserContext, requireTenantPage } from "@/server/auth/context";
import { getManagedBuilding } from "@/server/services/manager/buildings.service";
import { isDomainError } from "@/lib/errors";
import { createT } from "@/lib/i18n";

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
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("manager.building.overview.sectionGeneral")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label={t("manager.building.fields.name")} value={building.name} />
          <Row label={t("manager.building.fields.address")} value={building.address} />
          <Row label={t("manager.building.fields.city")} value={building.city} />
          <Row
            label={t("manager.building.fields.municipality")}
            value={building.municipality ?? "—"}
          />
          <Row label={t("manager.building.fields.postalCode")} value={building.postalCode ?? "—"} />
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
          <CardTitle className="text-sm">{t("manager.building.overview.sectionBanking")}</CardTitle>
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
          <CardTitle className="text-sm">{t("manager.building.overview.sectionContact")}</CardTitle>
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

      {building.notes ? (
        <Card className="lg:col-span-2">
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
