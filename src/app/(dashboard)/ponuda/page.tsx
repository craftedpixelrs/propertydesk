import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadUserContext } from "@/server/auth/context";
import { listOfferProjects } from "@/server/services/agencies/offer.service";
import { listAgencyReferralCards } from "@/server/services/agencies/agencies.service";
import { ReferralCards } from "@/features/agencies/referral-cards";
import { createT } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function PonudaPage() {
  const ctx = await loadUserContext();
  if (!ctx) redirect("/sign-in");
  if (!ctx.activeOrganization) redirect("/podesavanja");
  if (ctx.activeOrganization.type !== "AGENCY") redirect("/dashboard");
  const t = createT(ctx.user.locale);

  const [projects, referralConnections] = await Promise.all([
    listOfferProjects({
      agencyOrganizationId: ctx.activeOrganization.id,
    }),
    listAgencyReferralCards(ctx.activeOrganization.id),
  ]);

  const hdrs = await headers();
  const host = hdrs.get("host") ?? "propertydesk.app";
  const proto = hdrs.get("x-forwarded-proto") ?? "https";
  const baseUrl = `${proto}://${host}`;

  const referralCards = referralConnections
    .filter((c) => c.referralCode)
    .map((c) => ({
      connectionId: c.id,
      investorName:
        c.investor.profile?.displayName ?? c.investor.name ?? t("organization.types.investor"),
      investorLogoUrl: c.investor.profile?.logoUrl ?? null,
      referralCode: c.referralCode!,
    }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("nav.offer")}</h1>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          {t("inventory.offer.subtitle")}
        </p>
      </div>

      {referralCards.length > 0 ? (
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold">{t("inventory.offer.referralTitle")}</h2>
            <p className="text-sm text-[var(--color-foreground-muted)]">
              {t("inventory.offer.referralBody")}
            </p>
          </div>
          <ReferralCards cards={referralCards} baseUrl={baseUrl} />
        </section>
      ) : null}

      {projects.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-[var(--color-foreground-muted)]">
            {t("inventory.offer.empty")}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Card key={p.id}>
              <CardHeader>
                <CardTitle className="text-base">
                  <Link
                    href={`/ponuda/${p.id}`}
                    className="hover:text-[var(--color-brand-700)]"
                  >
                    {p.name}
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="text-xs text-[var(--color-foreground-muted)]">
                  {p.code}
                  {p.city ? ` · ${p.city}` : ""}
                </div>
                {p.description ? (
                  <p className="line-clamp-3 text-[var(--color-foreground-muted)]">
                    {p.description}
                  </p>
                ) : null}
                <div className="pt-2">
                  <Link
                    href={`/ponuda/${p.id}/jedinice`}
                    className="text-sm text-[var(--color-brand-700)] hover:underline"
                  >
                    {t("inventory.offer.viewUnits")}
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
