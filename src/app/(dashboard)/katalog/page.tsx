import { redirect } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadUserContext } from "@/server/auth/context";
import { listNetworkCatalog } from "@/server/services/agencies/network-catalog.service";
import { prisma } from "@/server/db/prisma";
import { formatDate } from "@/lib/formatters";
import { formatMoney } from "@/lib/formatters/money";
import { NetworkCatalogRequestForm } from "@/features/agency-portal/network-catalog-request-form";
import { createT } from "@/lib/i18n";
import type { SupportedCurrency } from "@/lib/constants/app";

export const dynamic = "force-dynamic";

function money(value: string | null, currency: string) {
  if (!value) return null;
  try {
    return formatMoney(value, currency as SupportedCurrency);
  } catch {
    return `${value} ${currency}`;
  }
}

export default async function KatalogPage() {
  const ctx = await loadUserContext();
  if (!ctx) redirect("/sign-in");
  if (!ctx.activeOrganization) redirect("/podesavanja");
  if (ctx.activeOrganization.type !== "AGENCY") redirect("/dashboard");

  const t = createT(ctx.user.locale);
  const [items, profile] = await Promise.all([
    listNetworkCatalog({ agencyOrganizationId: ctx.activeOrganization.id }),
    prisma.organizationProfile.findUnique({
      where: { organizationId: ctx.activeOrganization.id },
      select: { verificationStatus: true },
    }),
  ]);
  const verified = profile?.verificationStatus === "VERIFIED";
  const canRequest =
    verified && ctx.permissions.includes("organization.members:manage");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("partners.catalog.title")}</h1>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          {t("partners.catalog.subtitle")}
        </p>
      </div>

      {profile?.verificationStatus === "PENDING" ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {t("partners.catalog.pendingBanner")}
        </div>
      ) : null}
      {profile?.verificationStatus === "REJECTED" ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          {t("partners.catalog.rejectedBanner")}
        </div>
      ) : null}

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-[var(--color-foreground-muted)]">
            {t("partners.catalog.empty")}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((item) => {
            const min = money(item.priceMin, item.currency);
            const max = money(item.priceMax, item.currency);
            const range =
              min && max && min !== max ? `${min} – ${max}` : (min ?? max ?? "—");
            return (
              <Card key={item.projectId}>
                <CardHeader>
                  <CardTitle className="text-base">{item.name}</CardTitle>
                  <p className="text-sm text-[var(--color-foreground-muted)]">
                    {item.investor.displayName}
                    {item.city ? ` · ${item.city}` : ""}
                    {item.municipality ? `, ${item.municipality}` : ""}
                  </p>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-xs text-[var(--color-foreground-muted)]">
                        {t("partners.catalog.available")}
                      </div>
                      <div className="tabular-nums">{item.availableCount}</div>
                    </div>
                    <div>
                      <div className="text-xs text-[var(--color-foreground-muted)]">
                        {t("partners.catalog.priceRange")}
                      </div>
                      <div>{range}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-xs text-[var(--color-foreground-muted)]">
                        {t("partners.catalog.completion")}
                      </div>
                      <div>
                        {item.expectedCompletionDate
                          ? formatDate(item.expectedCompletionDate)
                          : "—"}
                      </div>
                    </div>
                  </div>
                  {item.alreadyConnected ? (
                    <p className="text-xs text-emerald-700">{t("partners.catalog.connected")}</p>
                  ) : item.pendingRequest ? (
                    <p className="text-xs text-amber-700">{t("partners.catalog.pending")}</p>
                  ) : (
                    <NetworkCatalogRequestForm
                      investorOrganizationId={item.investor.organizationId}
                      projectId={item.projectId}
                      canRequest={canRequest}
                      lockedHint={!verified}
                    />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
