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
import { createT, type TranslationKey } from "@/lib/i18n";
import { resolveRequestLocale } from "@/lib/i18n/resolve-locale";

export const dynamic = "force-dynamic";

export default async function SubscriptionPage() {
  try {
    const { org } = await requireSessionAndOrg();
    const t = createT(await resolveRequestLocale());
    const { organization, quota } = await loadOrganizationProfile(
      org.organizationId,
    );
    if (organization.profile?.type === "AGENCY") {
      return (
        <div className="space-y-6">
          <Link
            href="/dashboard"
            className="text-sm text-[var(--color-brand-700)] hover:underline"
          >
            {t("common.back")}
          </Link>
          <Card>
            <CardHeader>
              <CardTitle>{t("ops.org.agencyPartnerTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-[var(--color-foreground-muted)]">
                {t("ops.org.agencyPartnerHint")}
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }
    const subscription = organization.subscription;

    const recentInvoices = await prisma.invoice.findMany({
      where: {
        organizationId: org.organizationId,
        status: { in: ["ISSUED", "SENT", "PARTIALLY_PAID", "OVERDUE", "PAID"] },
      },
      orderBy: [{ issueDate: "desc" }, { createdAt: "desc" }],
      take: 5,
    });

    function subscriptionStatusLabel(status: string) {
      const key = `billing.subscriptionStatus.${status}` as TranslationKey;
      const out = t(key);
      return out === key ? status : out;
    }

    function invoiceStatusLabel(status: string) {
      const key = `billing.invoiceStatus.${status}` as TranslationKey;
      const out = t(key);
      return out === key ? status : out;
    }

    return (
      <div className="space-y-6">
        <Link
          href="/dashboard"
          className="text-sm text-[var(--color-brand-700)] hover:underline"
        >
          {t("common.back")}
        </Link>
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>{subscription?.plan.name ?? t("ops.subscription.noPlan")}</CardTitle>
              <p className="mt-1 text-sm text-[var(--color-foreground-muted)]">
                {subscription?.plan.description ?? t("ops.subscription.noDescription")}
              </p>
            </div>
            {subscription ? (
              <Badge
                tone={
                  subscription.status === "TRIAL"
                    ? "info"
                    : subscription.status === "EXPIRED" ||
                        subscription.status === "RESTRICTED" ||
                        subscription.status === "SUSPENDED" ||
                        subscription.status === "CANCELED"
                      ? "danger"
                      : "success"
                }
              >
                {subscriptionStatusLabel(subscription.status)}
              </Badge>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {subscription ? (
              <>
                <p>
                  {t("ops.subscription.monthlyPrice")}{" "}
                  <strong>
                    {formatMoney(
                      subscription.plan.monthlyPrice,
                      subscription.plan.currency as "EUR" | "RSD",
                    )}
                  </strong>
                </p>
                {subscription.trialEndsAt ? (
                  <p>
                    {t("ops.subscription.trialEnds")}{" "}
                    <strong>{formatDate(subscription.trialEndsAt)}</strong>
                  </p>
                ) : null}
                <p>
                  {t("ops.subscription.startsAt")}{" "}
                  <strong>{formatDate(subscription.startsAt)}</strong>
                </p>
                {subscription.endsAt ? (
                  <p>
                    {t("ops.subscription.endsAt")}{" "}
                    <strong>{formatDate(subscription.endsAt)}</strong>
                  </p>
                ) : null}
              </>
            ) : (
              <p>{t("ops.subscription.noActive")}</p>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label={t("ops.quota.activeProjects")}
            value={`${quota.usage.projects}${quota.limits.projects != null ? " / " + quota.limits.projects : ""}`}
            icon={<Building2 className="size-5" />}
          />
          <StatCard
            label={t("ops.quota.units")}
            value={`${quota.usage.units}${quota.limits.units != null ? " / " + quota.limits.units : ""}`}
            icon={<Package className="size-5" />}
          />
          <StatCard
            label={t("ops.quota.members")}
            value={`${quota.usage.members}${quota.limits.members != null ? " / " + quota.limits.members : ""}`}
            icon={<Users className="size-5" />}
          />
          <StatCard
            label={t("ops.quota.agencyConnections")}
            value={`${quota.usage.agencies}${quota.limits.agencies != null ? " / " + quota.limits.agencies : ""}`}
            icon={<Handshake className="size-5" />}
          />
        </div>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">{t("ops.subscription.recentInvoices")}</CardTitle>
            <Link
              href="/podesavanja/fakture"
              className="text-sm text-[var(--color-brand-700)] hover:underline"
            >
              {t("ops.subscription.allInvoices")}
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {recentInvoices.length === 0 ? (
              <p className="p-4 text-sm text-[var(--color-foreground-muted)]">
                {t("ops.subscription.noInvoices")}
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-[var(--color-foreground-subtle)]">
                  <tr>
                    <th className="border-b border-[var(--color-border)] px-3 py-2">
                      {t("billing.columns.invoiceNumber")}
                    </th>
                    <th className="border-b border-[var(--color-border)] px-3 py-2">
                      {t("common.date")}
                    </th>
                    <th className="border-b border-[var(--color-border)] px-3 py-2">
                      {t("billing.columns.status")}
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
                          {invoiceStatusLabel(inv.status)}
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
            {t("ops.subscription.contactAdmin")}
          </AlertDescription>
        </Alert>
      </div>
    );
  } catch {
    redirect("/dashboard");
  }
}
