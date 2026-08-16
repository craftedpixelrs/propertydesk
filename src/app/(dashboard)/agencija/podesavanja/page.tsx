import Link from "next/link";
import { redirect } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { loadUserContext } from "@/server/auth/context";
import { requireSessionAndOrg } from "@/server/auth/session";
import { loadOrganizationProfile } from "@/server/services/organization-admin.service";
import { OrganizationProfileForm } from "@/features/settings/organization-profile-form";
import { createT } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function AgencijaPodesavanjaPage() {
  const ctx = await loadUserContext();
  if (!ctx) redirect("/sign-in");
  if (!ctx.activeOrganization) redirect("/podesavanja");
  if (ctx.activeOrganization.type !== "AGENCY") redirect("/dashboard");

  const t = createT(ctx.user.locale);

  const { org } = await requireSessionAndOrg();
  const { organization, quota } = await loadOrganizationProfile(org.organizationId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t("partners.settings.title")}</h1>
          <p className="text-sm text-[var(--color-foreground-muted)]">
            {t("partners.settings.subtitle")}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/agencija/agenti">{t("nav.agents")}</Link>
        </Button>
      </div>

      <OrganizationProfileForm
        organization={{
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
        }}
        profile={organization.profile}
        subscription={
          organization.subscription
            ? {
                plan: {
                  code: organization.subscription.plan.code,
                  name: organization.subscription.plan.name,
                },
                status: organization.subscription.status,
                trialEndsAt: organization.subscription.trialEndsAt,
              }
            : null
        }
        quota={quota}
        orgType="AGENCY"
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("partners.settings.connectionsTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <p className="text-[var(--color-foreground-muted)]">
            {t("partners.settings.connectionsHintPrefix")}{" "}
            <Link href="/agencija/konekcije" className="text-[var(--color-brand-700)] hover:underline">
              {t("nav.connections")}
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
