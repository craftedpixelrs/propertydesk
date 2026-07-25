import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { loadUserContext } from "@/server/auth/context";
import { getOfferProject } from "@/server/services/agencies/offer.service";
import { RegisterBuyerButton } from "@/features/agency-portal/register-buyer-button";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PonudaProjectPage({ params }: PageProps) {
  const { id } = await params;
  const ctx = await loadUserContext();
  if (!ctx) redirect("/sign-in");
  if (!ctx.activeOrganization) redirect("/podesavanja");
  if (ctx.activeOrganization.type !== "AGENCY") redirect("/dashboard");

  const detail = await getOfferProject({
    agencyOrganizationId: ctx.activeOrganization.id,
    projectId: id,
  });
  if (!detail) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/ponuda" className="text-sm text-[var(--color-brand-700)] hover:underline">
          ← Ponuda
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">{detail.project.name}</h1>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          {detail.project.code}
          {detail.project.city ? ` · ${detail.project.city}` : ""}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Osnovne informacije</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {detail.project.description ? (
            <p>{detail.project.description}</p>
          ) : (
            <p className="text-[var(--color-foreground-muted)]">Bez opisa.</p>
          )}
          <div className="text-xs text-[var(--color-foreground-muted)]">
            Cene: {detail.access.canViewPrices ? "vidljive" : "sakrivene"} · Rezervacije:{" "}
            {detail.access.canRequestReservations ? "dozvoljene" : "nedozvoljene"}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link href={`/ponuda/${id}/jedinice`}>Pogledaj jedinice</Link>
        </Button>
        <RegisterBuyerButton projectId={id} />
        {detail.access.canRequestReservations ? (
          <Button asChild variant="outline">
            <Link href="/moje-rezervacije">Moje rezervacije</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
