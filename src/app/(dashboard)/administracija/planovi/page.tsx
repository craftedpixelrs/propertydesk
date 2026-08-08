import Link from "next/link";

import { requireSuperAdmin } from "@/server/permissions/require";
import { listSaaSPlans } from "@/server/services/platform.service";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/formatters/money";

/**
 * SaaS plans management. Super-admin can create, edit, archive, restore,
 * and (when no history exists) delete plans from this surface.
 */
export default async function PlatformPlansPage() {
  await requireSuperAdmin();
  const plans = await listSaaSPlans();

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Planovi ({plans.length})</h2>
          <p className="text-sm text-[var(--color-foreground-muted)]">
            SaaS planovi koje organizacije mogu da izaberu pri aktivaciji.
            Ekonomski parametri se koriste u fakturisanju, kvote se koriste
            za ograničenje broja projekata, jedinica, članova, itd.
          </p>
        </div>
        <Button asChild>
          <Link href="/administracija/planovi/novi">+ Novi plan</Link>
        </Button>
      </div>

      {plans.length === 0 ? (
        <div className="rounded-md border border-dashed border-[var(--color-border)] p-6 text-center text-sm text-[var(--color-foreground-muted)]">
          Još uvek nema kreiranih planova. Kliknite „Novi plan" da napravite prvi.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <Card key={plan.id}>
              <CardContent className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold">{plan.name}</div>
                    <div className="font-mono text-xs text-[var(--color-foreground-subtle)]">
                      {plan.code}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-end justify-end gap-1">
                    <Badge tone={plan.active ? "success" : "neutral"}>
                      {plan.active ? "Aktivan" : "Arhiviran"}
                    </Badge>
                    {plan.recommended ? (
                      <Badge tone="warning">Preporučeno</Badge>
                    ) : null}
                    {!plan.publiclyAvailable ? (
                      <Badge tone="neutral">Privatan</Badge>
                    ) : null}
                  </div>
                </div>
                <div className="text-2xl font-bold">
                  {formatMoney(plan.monthlyPrice, plan.currency as "EUR" | "RSD")}
                  <span className="ml-1 text-sm font-normal text-[var(--color-foreground-muted)]">
                    /mesečno
                  </span>
                </div>
                {plan.description ? (
                  <p className="text-sm text-[var(--color-foreground-muted)]">
                    {plan.description}
                  </p>
                ) : null}
                <ul className="space-y-1 text-sm text-[var(--color-foreground)]">
                  <li>
                    Aktivnih projekata: <strong>{plan.maxActiveProjects ?? "∞"}</strong>
                  </li>
                  <li>
                    Jedinica: <strong>{plan.maxUnits ?? "∞"}</strong>
                  </li>
                  <li>
                    Korisnika: <strong>{plan.maxMembers ?? "∞"}</strong>
                  </li>
                  <li>
                    Agencija: <strong>{plan.maxAgencyConnections ?? "∞"}</strong>
                  </li>
                  {plan.defaultTrialDays != null ? (
                    <li>
                      Probni period: <strong>{plan.defaultTrialDays} dana</strong>
                    </li>
                  ) : null}
                </ul>
                <div className="flex gap-2 pt-2">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/administracija/planovi/${plan.id}`}>
                      Izmeni
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
