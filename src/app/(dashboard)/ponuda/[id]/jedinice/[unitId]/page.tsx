import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadUserContext } from "@/server/auth/context";
import { getOfferUnit } from "@/server/services/agencies/offer.service";
import { AgencyReserveButton } from "@/features/agency-portal/agency-reserve-button";
import { formatMoney } from "@/lib/formatters/money";
import type { SupportedCurrency } from "@/lib/constants/app";
import { createT, unitStatusLabel, unitTypeLabel } from "@/lib/i18n";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string; unitId: string }>;
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

export default async function OfferUnitDetailPage({ params }: PageProps) {
  const { id, unitId } = await params;
  const ctx = await loadUserContext();
  if (!ctx) redirect("/sign-in");
  if (!ctx.activeOrganization) redirect("/podesavanja");
  if (ctx.activeOrganization.type !== "AGENCY") redirect("/dashboard");
  const t = createT(ctx.user.locale);

  const detail = await getOfferUnit({
    agencyOrganizationId: ctx.activeOrganization.id,
    projectId: id,
    unitId,
  });
  if (!detail) notFound();

  const { unit, access, photos } = detail;
  const price = unit.price?.final ?? unit.price?.base ?? null;
  const currency = (unit.price?.currency ?? "EUR") as SupportedCurrency;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href={`/ponuda/${id}/jedinice`}
            className="text-sm text-[var(--color-brand-700)] hover:underline"
          >
            ← {unit.project.name}
          </Link>
          <div className="mt-2 text-xs font-mono uppercase text-[var(--color-foreground-muted)]">
            {unit.project.code} · {unit.code}
          </div>
          <h1 className="text-2xl font-semibold">
            {unitTypeLabel(unit.type, t)} {unit.code}
          </h1>
          <p className="text-sm text-[var(--color-foreground-muted)]">
            {t("inventory.units.areaRooms", {
              area: unit.totalArea,
              bedrooms: unit.bedrooms ?? "—",
              bathrooms: unit.bathrooms ?? "—",
            })}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="text-right">
            <div className="text-xs uppercase tracking-wide text-[var(--color-foreground-muted)]">
              {t("units.detail.pricing")}
            </div>
            <div className="text-2xl font-semibold tabular-nums">
              {price ? formatMoney(price, currency) : "—"}
            </div>
            {unit.price?.perSquareMeter ? (
              <div className="text-xs text-[var(--color-foreground-muted)]">
                {formatMoney(unit.price.perSquareMeter, currency)}/m²
              </div>
            ) : null}
          </div>
          <div className="text-sm">
            {unitStatusLabel(unit.status, t)}
          </div>
          {unit.status === "AVAILABLE" && access.canRequestReservations ? (
            <AgencyReserveButton unitId={unit.id} />
          ) : null}
        </div>
      </div>

      {photos.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("inventory.offer.photos")}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 md:grid-cols-3">
            {photos.map((photo) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={photo.id}
                src={`/api/v1/documents/${photo.id}/download`}
                alt={photo.fileName}
                className="aspect-[4/3] w-full rounded-md border border-[var(--color-border)] object-cover"
              />
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("inventory.units.features")}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <InfoRow label={t("units.fields.type")} value={unitTypeLabel(unit.type, t)} />
            <InfoRow
              label={t("units.columns.structure")}
              value={unit.structure ?? "—"}
            />
            <InfoRow
              label={t("inventory.units.totalAreaShort")}
              value={`${unit.totalArea} m²`}
            />
            <InfoRow
              label={t("inventory.units.gross")}
              value={unit.internalArea ? `${unit.internalArea} m²` : "—"}
            />
            <InfoRow
              label={t("inventory.units.terrace")}
              value={
                unit.terraceArea
                  ? `${unit.terraceArea} m²`
                  : unit.hasTerrace
                    ? t("common.yes")
                    : "—"
              }
            />
            <InfoRow
              label={t("inventory.units.garden")}
              value={
                unit.gardenArea
                  ? `${unit.gardenArea} m²`
                  : unit.hasGarden
                    ? t("common.yes")
                    : "—"
              }
            />
            <InfoRow
              label={t("units.fields.orientation")}
              value={unit.orientation ?? "—"}
            />
            <InfoRow
              label={t("units.fields.bedrooms")}
              value={unit.bedrooms != null ? String(unit.bedrooms) : "—"}
            />
            <InfoRow
              label={t("units.fields.bathrooms")}
              value={unit.bathrooms != null ? String(unit.bathrooms) : "—"}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("units.detail.location")}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <InfoRow label={t("units.columns.project")} value={unit.project.name} />
            <InfoRow label={t("units.columns.building")} value={unit.building ?? "—"} />
            <InfoRow label={t("units.columns.entrance")} value={unit.entrance ?? "—"} />
            <InfoRow label={t("units.columns.floor")} value={unit.floor ?? "—"} />
            <InfoRow label={t("common.statusLabel")} value={unitStatusLabel(unit.status, t)} />
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

      {unit.floorPlanUrl ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("units.detail.floorPlan")}</CardTitle>
          </CardHeader>
          <CardContent>
            <a
              href={unit.floorPlanUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[var(--color-brand-700)] hover:underline"
            >
              {t("inventory.offer.openFloorPlan")}
            </a>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
