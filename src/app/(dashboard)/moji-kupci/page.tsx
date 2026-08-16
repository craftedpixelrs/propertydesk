import Link from "next/link";
import { redirect } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { loadUserContext } from "@/server/auth/context";
import { listBuyers } from "@/server/services/buyers.service";
import { formatDate } from "@/lib/formatters";
import { createT } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function MojiKupciPage() {
  const ctx = await loadUserContext();
  if (!ctx) redirect("/sign-in");
  if (!ctx.activeOrganization) redirect("/podesavanja");
  if (ctx.activeOrganization.type !== "AGENCY") redirect("/dashboard");
  const t = createT(ctx.user.locale);

  const { items, total } = await listBuyers({
    organizationId: ctx.activeOrganization.id,
    page: 1,
    pageSize: 50,
    activeOnly: true,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t("nav.myBuyers")}</h1>
          <p className="text-sm text-[var(--color-foreground-muted)]">
            {t("crm.buyers.mySubtitle")}
          </p>
        </div>
        <Button asChild>
          <Link href="/kupci/novi">{t("crm.buyers.newBuyer")}</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            {t("crm.buyers.total", { count: total })}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <div className="py-12 text-center text-sm text-[var(--color-foreground-muted)]">
              {t("crm.buyers.myEmpty")}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
                <thead className="bg-[var(--color-surface-inset)] text-left text-xs uppercase tracking-wide text-[var(--color-foreground-muted)]">
                  <tr>
                    <th className="px-4 py-3">{t("auth.fullName")}</th>
                    <th className="px-4 py-3">{t("common.phone")}</th>
                    <th className="px-4 py-3">{t("crm.buyers.created")}</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {items.map((b) => (
                    <tr key={b.id}>
                      <td className="px-4 py-3">
                        <Link
                          href={`/kupci/${b.id}`}
                          className="font-medium text-[var(--color-brand-700)] hover:underline"
                        >
                          {b.firstName} {b.lastName}
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{b.phone}</td>
                      <td className="px-4 py-3 text-[var(--color-foreground-muted)]">
                        {formatDate(b.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button asChild variant="outline" size="sm">
                          <Link href="/ponuda">{t("crm.buyers.registerOnProject")}</Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
