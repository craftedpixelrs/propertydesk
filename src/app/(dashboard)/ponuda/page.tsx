import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadUserContext } from "@/server/auth/context";
import { listOfferProjects } from "@/server/services/agencies/offer.service";
import { listAgencyReferralCards } from "@/server/services/agencies/agencies.service";
import { ReferralCards } from "@/features/agencies/referral-cards";

export const dynamic = "force-dynamic";

export default async function PonudaPage() {
  const ctx = await loadUserContext();
  if (!ctx) redirect("/sign-in");
  if (!ctx.activeOrganization) redirect("/podesavanja");
  if (ctx.activeOrganization.type !== "AGENCY") redirect("/dashboard");

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
        c.investor.profile?.displayName ?? c.investor.name ?? "Investitor",
      investorLogoUrl: c.investor.profile?.logoUrl ?? null,
      referralCode: c.referralCode!,
    }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Ponuda</h1>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          Projekti za koje Vaša agencija ima aktivan pristup.
        </p>
      </div>

      {referralCards.length > 0 ? (
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold">Vaši referral kodovi</h2>
            <p className="text-sm text-[var(--color-foreground-muted)]">
              Delite link ili QR kod sa potencijalnim kupcima. Sve rezervacije
              preko referral linka automatski se atribuiraju Vašoj agenciji.
            </p>
          </div>
          <ReferralCards cards={referralCards} baseUrl={baseUrl} />
        </section>
      ) : null}

      {projects.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-[var(--color-foreground-muted)]">
            Za sada nemate aktivan pristup nijednom projektu. Kontaktirajte investitora.
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
                    Pogledaj jedinice →
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
