import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSessionAndOrg } from "@/server/auth/session";
import { loadOrganizationProfile } from "@/server/services/organization-admin.service";
import { prisma } from "@/server/db/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/app/stat-card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/formatters/date";
import { formatMoney } from "@/lib/formatters/money";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Building2, Users, Package, Handshake } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SubscriptionPage() {
  try {
    const { org } = await requireSessionAndOrg();
    const { organization, quota } = await loadOrganizationProfile(
      org.organizationId,
    );
    const subscription = organization.subscription;

    const recentInvoices = await prisma.invoice.findMany({
      where: {
        organizationId: org.organizationId,
        status: { in: ["ISSUED", "SENT", "PARTIALLY_PAID", "OVERDUE", "PAID"] },
      },
      orderBy: [{ issueDate: "desc" }, { createdAt: "desc" }],
      take: 5,
    });

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>{subscription?.plan.name ?? "Nema plana"}</CardTitle>
              <p className="mt-1 text-sm text-[var(--color-foreground-muted)]">
                {subscription?.plan.description ?? "Nema opisa."}
              </p>
            </div>
            {subscription ? (
              <Badge tone={subscription.status === "TRIAL" ? "info" : "success"}>
                {subscription.status}
              </Badge>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {subscription ? (
              <>
                <p>
                  Mesečna cena:{" "}
                  <strong>
                    {formatMoney(
                      subscription.plan.monthlyPrice,
                      subscription.plan.currency as "EUR" | "RSD",
                    )}
                  </strong>
                </p>
                {subscription.trialEndsAt ? (
                  <p>
                    Probni period ističe:{" "}
                    <strong>{formatDate(subscription.trialEndsAt)}</strong>
                  </p>
                ) : null}
                <p>
                  Početak pretplate: <strong>{formatDate(subscription.startsAt)}</strong>
                </p>
                {subscription.endsAt ? (
                  <p>
                    Završetak pretplate:{" "}
                    <strong>{formatDate(subscription.endsAt)}</strong>
                  </p>
                ) : null}
              </>
            ) : (
              <p>Ova organizacija trenutno nema aktivnu pretplatu.</p>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Aktivni projekti"
            value={`${quota.usage.projects}${quota.limits.projects != null ? " / " + quota.limits.projects : ""}`}
            icon={<Building2 className="size-5" />}
          />
          <StatCard
            label="Jedinice"
            value={`${quota.usage.units}${quota.limits.units != null ? " / " + quota.limits.units : ""}`}
            icon={<Package className="size-5" />}
          />
          <StatCard
            label="Korisnici"
            value={`${quota.usage.members}${quota.limits.members != null ? " / " + quota.limits.members : ""}`}
            icon={<Users className="size-5" />}
          />
          <StatCard
            label="Agencijske konekcije"
            value={`${quota.usage.agencies}${quota.limits.agencies != null ? " / " + quota.limits.agencies : ""}`}
            icon={<Handshake className="size-5" />}
          />
        </div>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Poslednje fakture</CardTitle>
            <Link
              href="/podesavanja/fakture"
              className="text-sm text-[var(--color-brand-700)] hover:underline"
            >
              Sve fakture
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {recentInvoices.length === 0 ? (
              <p className="p-4 text-sm text-[var(--color-foreground-muted)]">
                Nema faktura za ovu organizaciju.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-[var(--color-foreground-subtle)]">
                  <tr>
                    <th className="border-b border-[var(--color-border)] px-3 py-2">Broj</th>
                    <th className="border-b border-[var(--color-border)] px-3 py-2">Datum</th>
                    <th className="border-b border-[var(--color-border)] px-3 py-2">Status</th>
                    <th className="border-b border-[var(--color-border)] px-3 py-2 text-right">Ukupno</th>
                    <th className="border-b border-[var(--color-border)] px-3 py-2 text-right">Preostalo</th>
                  </tr>
                </thead>
                <tbody>
                  {recentInvoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-[var(--color-border)] last:border-b-0">
                      <td className="px-3 py-2 font-mono text-xs">
                        <Link
                          href={`/podesavanja/fakture/${inv.id}`}
                          className="text-[var(--color-brand-700)] hover:underline"
                        >
                          {inv.invoiceNumber ?? "—"}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {inv.issueDate ? formatDate(inv.issueDate) : "—"}
                      </td>
                      <td className="px-3 py-2">
                        <Badge tone={inv.status === "PAID" ? "success" : inv.status === "OVERDUE" ? "danger" : "info"}>
                          {inv.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatMoney(Number(inv.totalAmount.toString()), inv.currency as "EUR" | "RSD")}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatMoney(Number(inv.amountDue.toString()), inv.currency as "EUR" | "RSD")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <Alert tone="info">
          <AlertDescription>
            Za promenu plana ili pitanja u vezi sa naplatom kontaktirajte
            administratora platforme.
          </AlertDescription>
        </Alert>
      </div>
    );
  } catch {
    redirect("/dashboard");
  }
}
