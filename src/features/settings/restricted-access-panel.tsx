import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/formatters/date";
import { formatMoney } from "@/lib/formatters/money";
import { createT, type TranslationKey } from "@/lib/i18n";
import { resolveRequestLocale } from "@/lib/i18n/resolve-locale";
import { prisma } from "@/server/db/prisma";

const UNPAID_STATUSES = ["ISSUED", "SENT", "PARTIALLY_PAID", "OVERDUE"] as const;

export async function RestrictedAccessPanel({
  organizationId,
}: {
  organizationId: string;
}) {
  const t = createT(await resolveRequestLocale());
  const [sub, unpaidInvoice] = await Promise.all([
    prisma.organizationSubscription.findUnique({
      where: { organizationId },
      include: { plan: { select: { name: true, code: true } } },
    }),
    prisma.invoice.findFirst({
      where: {
        organizationId,
        status: { in: [...UNPAID_STATUSES] },
      },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    }),
  ]);

  function statusLabel(status: string) {
    const key = `billing.subscriptionStatus.${status}` as TranslationKey;
    const out = t(key);
    return out === key ? status : out;
  }

  const trialExpired =
    Boolean(sub?.trialEndsAt) && sub!.trialEndsAt!.getTime() <= Date.now();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("orgProfile.restrictedTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-[var(--color-foreground-muted)]">
          {t("orgProfile.restrictedBody")}
        </p>
        {sub ? (
          <div className="space-y-1">
            <p className="flex items-center gap-2">
              <span className="font-medium">{sub.plan.name}</span>
              <Badge
                tone={
                  sub.status === "EXPIRED" || sub.status === "RESTRICTED"
                    ? "danger"
                    : "warning"
                }
              >
                {statusLabel(sub.status)}
              </Badge>
            </p>
            {sub.trialEndsAt ? (
              <p>
                {trialExpired
                  ? t("ops.subscription.trialEnded")
                  : t("ops.subscription.trialEnds")}{" "}
                <strong>{formatDate(sub.trialEndsAt)}</strong>
              </p>
            ) : null}
            {sub.currentPeriodEnd ? (
              <p>
                {t("ops.subscription.endsAt")}{" "}
                <strong>{formatDate(sub.currentPeriodEnd)}</strong>
              </p>
            ) : null}
            {sub.endsAt ? (
              <p>
                {t("ops.subscription.endsAt")}{" "}
                <strong>{formatDate(sub.endsAt)}</strong>
              </p>
            ) : null}
          </div>
        ) : null}

        {unpaidInvoice ? (
          <div className="rounded-md border border-[var(--color-border)] p-3 space-y-2">
            <p>
              {t("orgProfile.unpaidInvoice", {
                number: unpaidInvoice.invoiceNumber ?? t("ops.invoices.draftNumber"),
                amount: formatMoney(
                  Number(unpaidInvoice.amountDue.toString()),
                  unpaidInvoice.currency as "EUR" | "RSD",
                ),
              })}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href={`/podesavanja/fakture/${unpaidInvoice.id}`}>
                  {t("orgProfile.openUnpaidInvoice")}
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={`/api/v1/billing/invoices/${unpaidInvoice.id}/pdf`}>
                  {t("billing.actions.downloadPdf")}
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-[var(--color-foreground-muted)]">
            {t("orgProfile.noUnpaidInvoice")}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/podesavanja/pretplata">{t("orgProfile.restrictedCta")}</Link>
          </Button>
        </div>
        <p className="text-[var(--color-foreground-muted)]">
          {t("ops.subscription.contactAdmin")}
        </p>
      </CardContent>
    </Card>
  );
}
