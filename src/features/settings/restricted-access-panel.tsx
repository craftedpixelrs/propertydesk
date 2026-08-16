import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/formatters/date";
import { createT, type TranslationKey } from "@/lib/i18n";
import { resolveRequestLocale } from "@/lib/i18n/resolve-locale";
import { prisma } from "@/server/db/prisma";

export async function RestrictedAccessPanel({
  organizationId,
}: {
  organizationId: string;
}) {
  const t = createT(await resolveRequestLocale());
  const sub = await prisma.organizationSubscription.findUnique({
    where: { organizationId },
    include: { plan: { select: { name: true, code: true } } },
  });

  function statusLabel(status: string) {
    const key = `billing.subscriptionStatus.${status}` as TranslationKey;
    const out = t(key);
    return out === key ? status : out;
  }

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
                {t("ops.subscription.trialEnds")}{" "}
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
        <p className="text-[var(--color-foreground-muted)]">
          {t("ops.subscription.contactAdmin")}
        </p>
      </CardContent>
    </Card>
  );
}
