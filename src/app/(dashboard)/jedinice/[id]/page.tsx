import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { loadUserContext } from "@/server/auth/context";
import { getUnitById } from "@/server/services/units.service";
import { listDocuments } from "@/server/services/documents.service";
import { listShareLinksForEntity } from "@/server/services/sharing/share-links.service";
import { isDomainError } from "@/lib/errors";
import { formatMoney, formatDateTime } from "@/lib/formatters";
import { createT, unitStatusLabel, unitTypeLabel } from "@/lib/i18n";
import { UnitStatusChanger } from "@/features/units/unit-status-changer";
import { PhotoGallery, type PhotoItem } from "@/features/documents/photo-gallery";
import { UnitSharePanel } from "@/features/sharing/unit-share-panel";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function UnitDetail({ params }: Props) {
  const { id } = await params;
  const ctx = await loadUserContext();
  if (!ctx) redirect("/sign-in");
  if (!ctx.activeOrganization) redirect("/podesavanja");
  const t = createT(ctx.user.locale);

  let unit: Awaited<ReturnType<typeof getUnitById>>;
  try {
    unit = await getUnitById(ctx.activeOrganization.id, id);
  } catch (err) {
    if (isDomainError(err) && err.code === "NOT_FOUND") return notFound();
    throw err;
  }

  const canManageStatus = ctx.permissions.includes("inventory.status");
  const canEdit = ctx.permissions.includes("inventory.manage");
  const canManageDocs = ctx.permissions.includes("document.manage");

  const [photosResult, shareLinks] = await Promise.all([
    listDocuments({
      organizationId: ctx.activeOrganization.id,
      entityType: "Unit",
      entityId: unit.id,
      imagesOnly: true,
      page: 1,
      pageSize: 60,
    }),
    listShareLinksForEntity({
      organizationId: ctx.activeOrganization.id,
      entityType: "Unit",
      entityId: unit.id,
    }),
  ]);
  const photos: PhotoItem[] = photosResult.items.map((d) => ({
    id: d.id,
    fileName: d.fileName,
    originalFileName: d.originalFileName,
    mimeType: d.mimeType,
    size: d.size,
    isCover: d.isCover,
    sortOrder: d.sortOrder,
    createdAt: d.createdAt.toISOString(),
  }));
  const shareLinksSerialized = shareLinks.map((l) => ({
    id: l.id,
    token: l.token,
    showPrice: l.showPrice,
    expiresAt: l.expiresAt?.toISOString() ?? null,
    revokedAt: l.revokedAt?.toISOString() ?? null,
    viewCount: l.viewCount,
    lastViewedAt: l.lastViewedAt?.toISOString() ?? null,
    createdAt: l.createdAt.toISOString(),
    publicUrl: `/p/${l.token}`,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-mono uppercase text-[var(--color-foreground-muted)]">
            <Link
              href={`/projekti/${unit.project.id}`}
              className="hover:underline"
            >
              {unit.project.name}
            </Link>{" "}
            · {unit.code}
          </div>
          <h1 className="text-2xl font-semibold">
            {unitTypeLabel(unit.type, t)} {unit.code}
          </h1>
          <div className="text-sm text-[var(--color-foreground-muted)]">
            {t("inventory.units.areaRooms", {
              area: unit.totalArea.toString(),
              bedrooms: unit.bedrooms ?? "—",
              bathrooms: unit.bathrooms ?? "—",
            })}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="text-right">
            <div className="text-xs uppercase tracking-wide text-[var(--color-foreground-muted)]">
              {t("units.detail.pricing")}
            </div>
            <div className="text-2xl font-semibold tabular-nums">
              {formatMoney(
                unit.finalPrice ?? unit.basePrice,
                unit.currency as "EUR" | "RSD",
              )}
            </div>
            {unit.pricePerSquareMeter ? (
              <div className="text-xs text-[var(--color-foreground-muted)]">
                {formatMoney(
                  unit.pricePerSquareMeter,
                  unit.currency as "EUR" | "RSD",
                )}
                /m²
              </div>
            ) : null}
          </div>
          {canEdit ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/jedinice/${unit.id}/izmena`}>{t("inventory.units.edit")}</Link>
            </Button>
          ) : null}
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>{t("units.detail.status")}</CardTitle>
            <div className="text-sm">
              {t("inventory.units.currentStatus")}{" "}
              <span className="font-medium">
                {unitStatusLabel(unit.status, t)}
              </span>
            </div>
          </div>
        </CardHeader>
        {canManageStatus ? (
          <CardContent>
            <UnitStatusChanger
              unitId={unit.id}
              currentStatus={unit.status}
            />
          </CardContent>
        ) : null}
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("inventory.units.features")}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <InfoRow label={t("units.fields.type")} value={unitTypeLabel(unit.type, t)} />
            <InfoRow label={t("units.columns.structure")} value={unit.structure ?? "—"} />
            <InfoRow label={t("inventory.units.totalAreaShort")} value={`${unit.totalArea.toString()} m²`} />
            <InfoRow
              label={t("inventory.units.gross")}
              value={unit.internalArea ? `${unit.internalArea.toString()} m²` : "—"}
            />
            <InfoRow
              label={t("inventory.units.terrace")}
              value={unit.terraceArea ? `${unit.terraceArea.toString()} m²` : "—"}
            />
            <InfoRow
              label={t("inventory.units.garden")}
              value={unit.gardenArea ? `${unit.gardenArea.toString()} m²` : "—"}
            />
            <InfoRow label={t("units.fields.orientation")} value={unit.orientation ?? "—"} />
            <InfoRow
              label={t("inventory.units.vat")}
              value={
                unit.vatRate
                  ? `${unit.vatRate.toString()}% ${unit.vatIncluded ? t("inventory.units.vatIncluded") : t("inventory.units.vatAdded")}`
                  : "—"
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("units.detail.location")}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <InfoRow label={t("units.columns.project")} value={unit.project.name} />
            <InfoRow label={t("units.columns.building")} value={unit.building?.name ?? "—"} />
            <InfoRow label={t("units.columns.entrance")} value={unit.entrance?.name ?? "—"} />
            <InfoRow label={t("units.columns.floor")} value={unit.floor?.label ?? "—"} />
            <InfoRow
              label={t("inventory.units.agencyVisibility")}
              value={unit.isVisibleToAgencies ? t("common.yes") : t("common.no")}
            />
          </CardContent>
        </Card>
      </div>

      {unit.publicDescription ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("units.fields.publicDescription")}</CardTitle>
          </CardHeader>
          <CardContent className="whitespace-pre-wrap text-sm">
            {unit.publicDescription}
          </CardContent>
        </Card>
      ) : null}

      <PhotoGallery
        entityType="Unit"
        entityId={unit.id}
        photos={photos}
        canManage={canManageDocs}
        uploadCategory="UNIT"
      />

      <UnitSharePanel
        unitId={unit.id}
        initialLinks={shareLinksSerialized}
        canManage={ctx.permissions.includes("inventory.read")}
      />

      <Card>
        <CardHeader>
          <CardTitle>{t("units.actions.showPriceHistory")}</CardTitle>
        </CardHeader>
        <CardContent>
          {unit.priceHistory.length === 0 ? (
            <div className="text-sm text-[var(--color-foreground-muted)]">
              {t("inventory.units.noPriceHistory")}
            </div>
          ) : (
            <ul className="divide-y divide-[var(--color-border)] text-sm">
              {unit.priceHistory.map((h) => (
                <li key={h.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <div>
                    <div className="font-medium">
                      {formatMoney(h.previousBasePrice, h.currency as "EUR" | "RSD")} →{" "}
                      {formatMoney(h.newBasePrice, h.currency as "EUR" | "RSD")}
                    </div>
                    {h.reason ? (
                      <div className="text-xs text-[var(--color-foreground-muted)]">
                        {h.reason}
                      </div>
                    ) : null}
                  </div>
                  <div className="text-xs text-[var(--color-foreground-muted)]">
                    {formatDateTime(h.changedAt)} · {h.changedByUser.name}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("units.actions.showStatusHistory")}</CardTitle>
        </CardHeader>
        <CardContent>
          {unit.statusHistory.length === 0 ? (
            <div className="text-sm text-[var(--color-foreground-muted)]">
              {t("inventory.units.noStatusHistory")}
            </div>
          ) : (
            <ul className="divide-y divide-[var(--color-border)] text-sm">
              {unit.statusHistory.map((h) => (
                <li
                  key={h.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-2"
                >
                  <div>
                    <div className="font-medium">
                      {unitStatusLabel(h.previousStatus, t)} →{" "}
                      {unitStatusLabel(h.newStatus, t)}
                    </div>
                    {h.reason ? (
                      <div className="text-xs text-[var(--color-foreground-muted)]">
                        {h.reason}
                      </div>
                    ) : null}
                  </div>
                  <div className="text-xs text-[var(--color-foreground-muted)]">
                    {formatDateTime(h.changedAt)} · {h.changedByUser.name}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-[var(--color-foreground-muted)]">
        {label}
      </div>
      <div className="mt-0.5">{value}</div>
    </div>
  );
}
