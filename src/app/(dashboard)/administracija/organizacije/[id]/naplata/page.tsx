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
import { createT, type TranslateFn, type TranslationKey } from "@/lib/i18n";
import { resolveRequestLocale } from "@/lib/i18n/resolve-locale";
import { SubscriptionActionsPanel } from "./actions-panel";

export const dynamic = "force-dynamic";

function labeled(
  prefix: "billing.subscriptionStatus" | "billing.invoiceStatus" | "billing.paymentStatus" | "billing.cycle" | "billing.provider",
  value: string,
  t: TranslateFn,
): string {
  const key = `${prefix}.${value}` as TranslationKey;
  const out = t(key);
  return out === key ? value : out;
}

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
  const t = createT(await resolveRequestLocale());
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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">{t("admin.orgBilling.title", { name: org.name })}</h2>
          <Button asChild size="sm" variant="outline">
            <Link href={`/administracija/organizacije/${id}`}>
              {t("admin.orgsPage.edit")}
            </Link>
          </Button>
        </div>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          {t("admin.orgBilling.orgStatus")}{" "}
          <Badge tone={org.profile?.status === "ACTIVE" ? "success" : "warning"}>
            {org.profile?.status
              ? labeled("billing.subscriptionStatus", org.profile.status, t)
              : "—"}
          </Badge>{" "}
          · {t("admin.orgBilling.masterBilling")}{" "}
          {settings.billingEnabled ? (
            <Badge tone="success">{t("admin.orgBilling.enabled")}</Badge>
          ) : (
            <Badge tone="warning">{t("admin.orgBilling.disabled")}</Badge>
          )}
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("admin.orgBilling.subscription")}</CardTitle>
        </CardHeader>
        <CardContent>
          {!sub || !summary ? (
            <p className="text-sm text-[var(--color-foreground-muted)]">
              {t("admin.orgBilling.noSubscription")}
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-3 text-sm">
              <Row label={t("admin.orgBilling.plan")} value={sub.plan.name} />
              <Row label={t("admin.orgBilling.cycle")} value={labeled("billing.cycle", sub.billingCycle, t)} />
              <Row label={t("common.statusLabel")} value={labeled("billing.subscriptionStatus", sub.status, t)} />
              <Row
                label={t("admin.orgBilling.price")}
                value={formatMoney(
                  Number(sub.price.toString()),
                  sub.currency as "EUR" | "RSD",
                )}
              />
              <Row
                label={t("admin.orgBilling.currentPeriod")}
                value={
                  sub.currentPeriodStart && sub.currentPeriodEnd
                    ? `${formatDate(sub.currentPeriodStart)} — ${formatDate(sub.currentPeriodEnd)}`
                    : "—"
                }
              />
              <Row
                label={t("admin.orgBilling.nextBilling")}
                value={sub.nextBillingDate ? formatDate(sub.nextBillingDate) : "—"}
              />
              <Row
                label={t("admin.orgBilling.trial")}
                value={
                  sub.trialEndsAt
                    ? t("admin.orgBilling.trialUntil", { date: formatDate(sub.trialEndsAt) })
                    : t("admin.orgBilling.trialInactive")
                }
              />
              <Row
                label={t("admin.orgBilling.gracePeriod")}
                value={sub.gracePeriodEndsAt ? formatDate(sub.gracePeriodEndsAt) : "—"}
              />
              <Row
                label={t("admin.orgBilling.autoRenew")}
                value={sub.autoRenew ? t("common.yes") : t("common.no")}
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
          <CardTitle className="text-base">{t("admin.orgBilling.invoiceCurrency")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-[var(--color-foreground-muted)]">
            {t("admin.orgBilling.invoiceCurrencyHint")}{" "}
            <Link
              href="/administracija/naplata/kursna-lista"
              className="text-[var(--color-brand-700)] hover:underline"
            >
              {t("admin.orgBilling.rateList")}
            </Link>
            .
          </p>
          <div className="text-xs text-[var(--color-foreground-subtle)]">
            {t("admin.orgBilling.currently")}{" "}
            <strong>
              {settings.invoiceInRsd
                ? t("admin.orgBilling.invoicingRsd")
                : t("admin.orgBilling.invoicingEur")}
            </strong>
            {orgSettings.invoiceInRsd == null
              ? t("admin.orgBilling.inherited")
              : t("admin.orgBilling.override")}
          </div>
          <form action={saveInvoiceInRsd} className="flex flex-wrap gap-2">
            <Button
              type="submit"
              name="invoiceInRsd"
              value="on"
              variant={orgSettings.invoiceInRsd === true ? "primary" : "outline"}
              size="sm"
            >
              {t("admin.orgBilling.invoiceRsd")}
            </Button>
            <Button
              type="submit"
              name="invoiceInRsd"
              value="off"
              variant={orgSettings.invoiceInRsd === false ? "primary" : "outline"}
              size="sm"
            >
              {t("admin.orgBilling.invoiceEur")}
            </Button>
            <Button
              type="submit"
              name="invoiceInRsd"
              value="default"
              variant={orgSettings.invoiceInRsd == null ? "primary" : "outline"}
              size="sm"
            >
              {t("admin.orgBilling.inheritGlobal")}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t("admin.orgBilling.recentInvoices", { count: invoices.length })}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {invoices.length === 0 ? (
            <p className="p-4 text-sm text-[var(--color-foreground-muted)]">
              {t("admin.orgBilling.noInvoices")}
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-[var(--color-foreground-subtle)]">
                <tr>
                  <th className="border-b border-[var(--color-border)] px-3 py-2">
                    {t("billing.columns.invoiceNumber")}
                  </th>
                  <th className="border-b border-[var(--color-border)] px-3 py-2">
                    {t("billing.columns.status")}
                  </th>
                  <th className="border-b border-[var(--color-border)] px-3 py-2">
                    {t("billing.columns.dueDate")}
                  </th>
                  <th className="border-b border-[var(--color-border)] px-3 py-2 text-right">
                    {t("billing.columns.total")}
                  </th>
                  <th className="border-b border-[var(--color-border)] px-3 py-2 text-right">
                    {t("billing.columns.remaining")}
                  </th>
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
                        {inv.invoiceNumber ?? t("admin.orgBilling.draft")}
                      </Link>
                    </td>
                    <td className="px-3 py-2">
                      <Badge tone="info">{labeled("billing.invoiceStatus", inv.status, t)}</Badge>
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
          <CardTitle className="text-base">
            {t("admin.orgBilling.recentPayments", { count: payments.length })}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {payments.length === 0 ? (
            <p className="p-4 text-sm text-[var(--color-foreground-muted)]">
              {t("admin.orgBilling.noPayments")}
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-[var(--color-foreground-subtle)]">
                <tr>
                  <th className="border-b border-[var(--color-border)] px-3 py-2">
                    {t("common.date")}
                  </th>
                  <th className="border-b border-[var(--color-border)] px-3 py-2">
                    {t("admin.orgBilling.method")}
                  </th>
                  <th className="border-b border-[var(--color-border)] px-3 py-2 text-right">
                    {t("common.amount")}
                  </th>
                  <th className="border-b border-[var(--color-border)] px-3 py-2">
                    {t("common.statusLabel")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b border-[var(--color-border)] last:border-b-0">
                    <td className="px-3 py-2 text-xs">{formatDate(p.paidAt)}</td>
                    <td className="px-3 py-2 text-xs">
                      {labeled("billing.provider", p.provider, t)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatMoney(Number(p.amount.toString()), p.currency as "EUR" | "RSD")}
                    </td>
                    <td className="px-3 py-2">
                      <Badge tone={p.status === "COMPLETED" ? "success" : "warning"}>
                        {labeled("billing.paymentStatus", p.status, t)}
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
