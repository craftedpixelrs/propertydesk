import { requireSuperAdmin } from "@/server/permissions/require";
import { getOrCreateGlobalBillingSettings } from "@/server/services/billing/settings/global.service";
import { getCompanyBillingProfile } from "@/server/services/billing/company-profile.service";
import { prisma } from "@/server/db/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/formatters/date";
import Link from "next/link";
import { createT } from "@/lib/i18n";
import { resolveRequestLocale } from "@/lib/i18n/resolve-locale";

export const dynamic = "force-dynamic";

export default async function SefPage() {
  await requireSuperAdmin();
  const t = createT(await resolveRequestLocale());
  const [settings, profile, records] = await Promise.all([
    getOrCreateGlobalBillingSettings(),
    getCompanyBillingProfile(),
    prisma.electronicInvoiceRecord.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { invoice: { select: { invoiceNumber: true, organizationId: true } } },
    }),
  ]);

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-lg font-semibold">{t("admin.sef.title")}</h2>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          {t("admin.sef.subtitle", { provider: settings.electronicInvoiceProvider })}{" "}
          {settings.electronicInvoiceEnabled ? (
            <Badge tone="success">{t("admin.sef.enabled")}</Badge>
          ) : (
            <Badge tone="warning">{t("admin.sef.disabled")}</Badge>
          )}
          .
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("admin.sef.config")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 text-sm">
          <div>
            <div className="text-xs text-[var(--color-foreground-muted)]">
              {t("admin.sef.activeProvider")}
            </div>
            <div className="font-medium">{settings.electronicInvoiceProvider}</div>
          </div>
          <div>
            <div className="text-xs text-[var(--color-foreground-muted)]">
              {t("admin.sef.environment")}
            </div>
            <div className="font-medium">{profile?.sefEnvironment ?? "DISABLED"}</div>
          </div>
          <div>
            <div className="text-xs text-[var(--color-foreground-muted)]">
              {t("admin.sef.endpoint")}
            </div>
            <div className="font-mono text-xs">{profile?.sefEndpointUrl ?? t("admin.dash")}</div>
          </div>
          <div>
            <div className="text-xs text-[var(--color-foreground-muted)]">
              {t("admin.sef.apiKey")}
            </div>
            <div className="font-mono text-xs">
              {profile?.sefApiKeyMasked ?? (
                <span className="text-[var(--color-foreground-muted)]">
                  {t("admin.sef.apiKeyMissing")}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("admin.sef.recentSends")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-[var(--color-foreground-subtle)]">
              <tr>
                <th className="border-b border-[var(--color-border)] px-3 py-2">
                  {t("admin.sef.invoice")}
                </th>
                <th className="border-b border-[var(--color-border)] px-3 py-2">
                  {t("admin.sef.provider")}
                </th>
                <th className="border-b border-[var(--color-border)] px-3 py-2">
                  {t("common.statusLabel")}
                </th>
                <th className="border-b border-[var(--color-border)] px-3 py-2">
                  {t("admin.sef.sent")}
                </th>
                <th className="border-b border-[var(--color-border)] px-3 py-2 text-right">
                  {t("admin.sef.attempts")}
                </th>
                <th className="border-b border-[var(--color-border)] px-3 py-2">
                  {t("admin.sef.error")}
                </th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-[var(--color-foreground-muted)]">
                    {t("admin.sef.empty")}
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id} className="border-b border-[var(--color-border)] last:border-b-0">
                    <td className="px-3 py-2 font-mono text-xs">
                      <Link
                        href={`/administracija/naplata/fakture/${r.invoiceId}`}
                        className="text-[var(--color-brand-700)] hover:underline"
                      >
                        {r.invoice.invoiceNumber ?? r.invoiceId.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="px-3 py-2">{r.provider}</td>
                    <td className="px-3 py-2">
                      <Badge
                        tone={
                          r.status === "ACKNOWLEDGED" || r.status === "DELIVERED" || r.status === "SENT"
                            ? "success"
                            : r.status === "FAILED" || r.status === "REJECTED"
                              ? "danger"
                              : "info"
                        }
                      >
                        {r.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-xs">{r.sentAt ? formatDateTime(r.sentAt) : t("admin.dash")}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.attempts}</td>
                    <td className="px-3 py-2 text-xs text-[var(--color-foreground-muted)]">
                      {r.errorMessage ?? t("admin.dash")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </section>
  );
}
