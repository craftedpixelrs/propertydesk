import { requireSuperAdmin } from "@/server/permissions/require";
import { getOrCreateGlobalBillingSettings } from "@/server/services/billing/settings/global.service";
import { getCompanyBillingProfile } from "@/server/services/billing/company-profile.service";
import { prisma } from "@/server/db/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/formatters/date";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SefPage() {
  await requireSuperAdmin();
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
        <h2 className="text-lg font-semibold">SEF integracija</h2>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          Sistem Elektronskih Faktura (SEF). Provider trenutno postavljen na{" "}
          <strong>{settings.electronicInvoiceProvider}</strong>. Slanje je{" "}
          {settings.electronicInvoiceEnabled ? (
            <Badge tone="success">omogućeno</Badge>
          ) : (
            <Badge tone="warning">isključeno</Badge>
          )}.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Konfiguracija</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 text-sm">
          <div>
            <div className="text-xs text-[var(--color-foreground-muted)]">Aktivan provider</div>
            <div className="font-medium">{settings.electronicInvoiceProvider}</div>
          </div>
          <div>
            <div className="text-xs text-[var(--color-foreground-muted)]">Okruženje</div>
            <div className="font-medium">{profile?.sefEnvironment ?? "DISABLED"}</div>
          </div>
          <div>
            <div className="text-xs text-[var(--color-foreground-muted)]">Endpoint URL</div>
            <div className="font-mono text-xs">{profile?.sefEndpointUrl ?? "—"}</div>
          </div>
          <div>
            <div className="text-xs text-[var(--color-foreground-muted)]">API ključ</div>
            <div className="font-mono text-xs">
              {profile?.sefApiKeyMasked ?? <span className="text-[var(--color-foreground-muted)]">nije postavljen</span>}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Poslednja slanja</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-[var(--color-foreground-subtle)]">
              <tr>
                <th className="border-b border-[var(--color-border)] px-3 py-2">Faktura</th>
                <th className="border-b border-[var(--color-border)] px-3 py-2">Provider</th>
                <th className="border-b border-[var(--color-border)] px-3 py-2">Status</th>
                <th className="border-b border-[var(--color-border)] px-3 py-2">Poslata</th>
                <th className="border-b border-[var(--color-border)] px-3 py-2 text-right">Pokušaji</th>
                <th className="border-b border-[var(--color-border)] px-3 py-2">Greška</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-[var(--color-foreground-muted)]">
                    Nema slanja.
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
                    <td className="px-3 py-2 text-xs">{r.sentAt ? formatDateTime(r.sentAt) : "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.attempts}</td>
                    <td className="px-3 py-2 text-xs text-[var(--color-foreground-muted)]">
                      {r.errorMessage ?? "—"}
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
