import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadUserContext } from "@/server/auth/context";
import { getOfferProject, listOfferUnits } from "@/server/services/agencies/offer.service";
import { AgencyReserveButton } from "@/features/agency-portal/agency-reserve-button";
import { createT, unitStatusLabel, unitTypeLabel } from "@/lib/i18n";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function readParam(raw: string | string[] | undefined): string | undefined {
  if (Array.isArray(raw)) return raw[0];
  return raw;
}

export default async function JedinicePage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const page = Number(readParam(sp.page) ?? "1") || 1;

  const ctx = await loadUserContext();
  if (!ctx) redirect("/sign-in");
  if (!ctx.activeOrganization) redirect("/podesavanja");
  if (ctx.activeOrganization.type !== "AGENCY") redirect("/dashboard");
  const t = createT(ctx.user.locale);

  const detail = await getOfferProject({
    agencyOrganizationId: ctx.activeOrganization.id,
    projectId: id,
  });
  if (!detail) notFound();

  const { items, total } = await listOfferUnits({
    agencyOrganizationId: ctx.activeOrganization.id,
    projectId: id,
    page,
    pageSize: 30,
  });

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/ponuda/${id}`}
          className="text-sm text-[var(--color-brand-700)] hover:underline"
        >
          ← {detail.project.name}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">{t("units.title")}</h1>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          {t("inventory.offer.unitCount", { total })}
        </p>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-[var(--color-foreground-muted)]">
            {t("inventory.offer.noUnits")}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("inventory.offer.unitList")}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
                <thead className="bg-[var(--color-surface-inset)] text-left text-xs uppercase tracking-wide text-[var(--color-foreground-muted)]">
                  <tr>
                    <th className="px-4 py-3">{t("units.columns.code")}</th>
                    <th className="px-4 py-3">{t("units.columns.type")}</th>
                    <th className="px-4 py-3 text-right">{t("units.columns.area")}</th>
                    <th className="px-4 py-3 text-right">{t("units.detail.pricing")}</th>
                    <th className="px-4 py-3">{t("common.statusLabel")}</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {items.map((u) => (
                    <tr key={u.id}>
                      <td className="px-4 py-3 font-mono text-xs">{u.code}</td>
                      <td className="px-4 py-3">
                        {unitTypeLabel(u.type, t)}
                        {u.structure ? ` (${u.structure})` : ""}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{u.totalArea} m²</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {u.price
                          ? `${u.price.final ?? u.price.base} ${u.price.currency}`
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs">{unitStatusLabel(u.status, t)}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {u.status === "AVAILABLE" && detail.access.canRequestReservations ? (
                          <AgencyReserveButton unitId={u.id} />
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
