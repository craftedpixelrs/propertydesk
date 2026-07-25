import Link from "next/link";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";

import { requireSuperAdmin } from "@/server/permissions/require";
import { prisma } from "@/server/db/prisma";
import { getSubscriptionSummary } from "@/server/services/billing/subscriptions.service";
import { resolveBillingSettings } from "@/server/services/billing/settings/resolved.service";
import {
  getOrCreateOrganizationBillingSettings,
  updateOrganizationBillingSettings,
} from "@/server/services/billing/settings/organization.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/formatters/date";
import { formatMoney } from "@/lib/formatters/money";
import { SubscriptionActionsPanel } from "./actions-panel";

export const dynamic = "force-dynamic";

/**
 * Per-organization billing surface. All manual super-admin actions live here:
 *   - activate / change plan / change cycle / change price
 *   - extend trial, restrict, suspend, cancel, reactivate
 *   - list invoices + record manual payment
 */
export default async function OrgBillingTabPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSuperAdmin();
  const { id } = await params;

  const org = await prisma.organization.findUnique({
    where: { id },
    include: {
      profile: true,
      subscription: { include: { plan: true } },
    },
  });
  if (!org) notFound();

  const sub = org.subscription ?? null;
  const summary = sub ? await getSubscriptionSummary(id) : null;
  const settings = await resolveBillingSettings(id);
  const orgSettings = await getOrCreateOrganizationBillingSettings(id);

  async function saveInvoiceInRsd(formData: FormData): Promise<void> {
    "use server";
    const ctx = await requireSuperAdmin();
    const raw = formData.get("invoiceInRsd");
    const value: boolean | null =
      raw === "on" ? true : raw === "off" ? false : null;
    await updateOrganizationBillingSettings(
      id,
      { mode: "CUSTOM_SETTINGS", invoiceInRsd: value },
      ctx.session.user.id,
    );
    revalidatePath(`/administracija/organizacije/${id}/naplata`);
  }

  const [invoices, payments, plans] = await Promise.all([
    prisma.invoice.findMany({
      where: { organizationId: id },
      orderBy: [{ issueDate: "desc" }, { createdAt: "desc" }],
      take: 20,
    }),
    prisma.subscriptionPayment.findMany({
      where: { organizationId: id },
      orderBy: { paidAt: "desc" },
      take: 20,
    }),
    prisma.saaSPlan.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
  ]);

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-lg font-semibold">Naplata: {org.name}</h2>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          Status organizacije:{" "}
          <Badge tone={org.profile?.status === "ACTIVE" ? "success" : "warning"}>
            {org.profile?.status ?? "—"}
          </Badge>{" "}
          · Master naplata:{" "}
          {settings.billingEnabled ? (
            <Badge tone="success">aktivna</Badge>
          ) : (
            <Badge tone="warning">isključena</Badge>
          )}
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pretplata</CardTitle>
        </CardHeader>
        <CardContent>
          {!sub || !summary ? (
            <p className="text-sm text-[var(--color-foreground-muted)]">
              Ova organizacija još uvek nema pretplatu. Kreirajte je iz sekcije "Organizacije → Nova".
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-3 text-sm">
              <Row label="Plan" value={sub.plan.name} />
              <Row label="Ciklus" value={sub.billingCycle} />
              <Row label="Status" value={sub.status} />
              <Row
                label="Cena"
                value={formatMoney(
                  Number(sub.price.toString()),
                  sub.currency as "EUR" | "RSD",
                )}
              />
              <Row
                label="Trenutni period"
                value={
                  sub.currentPeriodStart && sub.currentPeriodEnd
                    ? `${formatDate(sub.currentPeriodStart)} — ${formatDate(sub.currentPeriodEnd)}`
                    : "—"
                }
              />
              <Row
                label="Sledeća naplata"
                value={sub.nextBillingDate ? formatDate(sub.nextBillingDate) : "—"}
              />
              <Row
                label="Probni period"
                value={sub.trialEndsAt ? `Do ${formatDate(sub.trialEndsAt)}` : "Nije aktivan"}
              />
              <Row
                label="Grace period"
                value={sub.gracePeriodEndsAt ? formatDate(sub.gracePeriodEndsAt) : "—"}
              />
              <Row
                label="Auto-renew"
                value={sub.autoRenew ? "Da" : "Ne"}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {sub ? (
        <SubscriptionActionsPanel
          subscriptionId={sub.id}
          currentStatus={sub.status}
          currentPlanCode={sub.plan.code}
          currentCycle={sub.billingCycle}
          plans={plans.map((p) => ({ id: p.id, code: p.code, name: p.name }))}
        />
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Valuta fakture</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-[var(--color-foreground-muted)]">
            Kada je uključeno, faktura ovoj organizaciji se prilikom
            izdavanja konvertuje iz EUR u RSD po srednjem kursu na dan
            izdavanja. Kurs se održava u{" "}
            <Link
              href="/administracija/naplata/kursna-lista"
              className="text-[var(--color-brand-700)] hover:underline"
            >
              kursnoj listi
            </Link>
            .
          </p>
          <div className="text-xs text-[var(--color-foreground-subtle)]">
            Trenutno efektivno:{" "}
            <strong>
              {settings.invoiceInRsd
                ? "Fakturisanje u RSD (uključeno)"
                : "Fakturisanje u EUR (isključeno)"}
            </strong>
            {orgSettings.invoiceInRsd == null
              ? " · nasleđeno iz globalnih podešavanja"
              : " · override na nivou organizacije"}
          </div>
          <form action={saveInvoiceInRsd} className="flex flex-wrap gap-2">
            <Button
              type="submit"
              name="invoiceInRsd"
              value="on"
              variant={orgSettings.invoiceInRsd === true ? "primary" : "outline"}
              size="sm"
            >
              Fakturiši u RSD
            </Button>
            <Button
              type="submit"
              name="invoiceInRsd"
              value="off"
              variant={orgSettings.invoiceInRsd === false ? "primary" : "outline"}
              size="sm"
            >
              Fakturiši u EUR
            </Button>
            <Button
              type="submit"
              name="invoiceInRsd"
              value="default"
              variant={orgSettings.invoiceInRsd == null ? "primary" : "outline"}
              size="sm"
            >
              Nasledi iz globalnog
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Poslednje fakture ({invoices.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {invoices.length === 0 ? (
            <p className="p-4 text-sm text-[var(--color-foreground-muted)]">Nema faktura.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-[var(--color-foreground-subtle)]">
                <tr>
                  <th className="border-b border-[var(--color-border)] px-3 py-2">Broj</th>
                  <th className="border-b border-[var(--color-border)] px-3 py-2">Status</th>
                  <th className="border-b border-[var(--color-border)] px-3 py-2">Rok</th>
                  <th className="border-b border-[var(--color-border)] px-3 py-2 text-right">Ukupno</th>
                  <th className="border-b border-[var(--color-border)] px-3 py-2 text-right">Preostalo</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-[var(--color-border)] last:border-b-0">
                    <td className="px-3 py-2 font-mono text-xs">
                      <Link
                        href={`/administracija/naplata/fakture/${inv.id}`}
                        className="text-[var(--color-brand-700)] hover:underline"
                      >
                        {inv.invoiceNumber ?? "(nacrt)"}
                      </Link>
                    </td>
                    <td className="px-3 py-2">
                      <Badge tone="info">{inv.status}</Badge>
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {inv.dueDate ? formatDate(inv.dueDate) : "—"}
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Poslednje uplate ({payments.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {payments.length === 0 ? (
            <p className="p-4 text-sm text-[var(--color-foreground-muted)]">Nema uplata.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-[var(--color-foreground-subtle)]">
                <tr>
                  <th className="border-b border-[var(--color-border)] px-3 py-2">Datum</th>
                  <th className="border-b border-[var(--color-border)] px-3 py-2">Metod</th>
                  <th className="border-b border-[var(--color-border)] px-3 py-2 text-right">Iznos</th>
                  <th className="border-b border-[var(--color-border)] px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b border-[var(--color-border)] last:border-b-0">
                    <td className="px-3 py-2 text-xs">{formatDate(p.paidAt)}</td>
                    <td className="px-3 py-2 text-xs">{p.provider}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatMoney(Number(p.amount.toString()), p.currency as "EUR" | "RSD")}
                    </td>
                    <td className="px-3 py-2">
                      <Badge tone={p.status === "COMPLETED" ? "success" : "warning"}>
                        {p.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[var(--color-border)] p-3">
      <div className="text-xs text-[var(--color-foreground-muted)]">{label}</div>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  );
}
