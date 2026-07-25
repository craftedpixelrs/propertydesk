import Link from "next/link";
import { redirect } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadUserContext } from "@/server/auth/context";
import { listOfferProjects } from "@/server/services/agencies/offer.service";

export const dynamic = "force-dynamic";

export default async function PonudaPage() {
  const ctx = await loadUserContext();
  if (!ctx) redirect("/sign-in");
  if (!ctx.activeOrganization) redirect("/podesavanja");
  if (ctx.activeOrganization.type !== "AGENCY") redirect("/dashboard");

  const projects = await listOfferProjects({
    agencyOrganizationId: ctx.activeOrganization.id,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Ponuda</h1>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          Projekti za koje Vaša agencija ima aktivan pristup.
        </p>
      </div>

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
