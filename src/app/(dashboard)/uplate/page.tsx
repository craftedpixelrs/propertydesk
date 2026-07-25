import Link from "next/link";
import { redirect } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { loadUserContext } from "@/server/auth/context";
import { listPayments } from "@/server/services/sales/payments.service";
import { formatDate, formatMoney } from "@/lib/formatters";
import type { SupportedCurrency } from "@/lib/constants/app";

export const dynamic = "force-dynamic";

const METHOD_LABEL: Record<string, string> = {
  BANK_TRANSFER: "Uplata na račun",
  CASH: "Gotovina",
  CARD: "Kartica",
  LOAN: "Kredit",
  COMPENSATION: "Kompenzacija",
  OTHER: "Ostalo",
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function readParam(raw: string | string[] | undefined): string | undefined {
  return Array.isArray(raw) ? raw[0] : raw;
}

export default async function UplatePage({ searchParams }: PageProps) {
  const ctx = await loadUserContext();
  if (!ctx) redirect("/sign-in");
  if (!ctx.activeOrganization) redirect("/podesavanja");

  const sp = await searchParams;
  const page = Number(readParam(sp.page) ?? "1") || 1;
  const pageSize = 20;

  const { items, total } = await listPayments({
    organizationId: ctx.activeOrganization.id,
    page,
    pageSize,
  });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Uplate</h1>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          Sve uplate evidentirane u sistemu.
        </p>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-[var(--color-foreground-muted)]">
            Još uvek nema evidentiranih uplata.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Poslednje uplate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-[var(--color-foreground-muted)]">
                  <tr>
                    <th className="py-2 pr-3">Datum</th>
                    <th className="py-2 pr-3">Jedinica</th>
                    <th className="py-2 pr-3">Kupac</th>
                    <th className="py-2 pr-3">Način</th>
                    <th className="py-2 pr-3 text-right">Iznos</th>
                    <th className="py-2 pr-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {items.map((p) => (
                    <tr key={p.id} className={p.reversedAt ? "opacity-60" : ""}>
                      <td className="py-2 pr-3">{formatDate(p.paymentDate)}</td>
                      <td className="py-2 pr-3">
                        <Link
                          href={`/prodaje/${p.saleId}`}
                          className="text-[var(--color-brand-700)] hover:underline"
                        >
                          {p.sale?.unit?.code ?? "—"}
                        </Link>
                      </td>
                      <td className="py-2 pr-3">
                        {p.sale?.buyer
                          ? `${p.sale.buyer.firstName} ${p.sale.buyer.lastName}`
                          : "—"}
                      </td>
                      <td className="py-2 pr-3">
                        {METHOD_LABEL[p.paymentMethod] ?? p.paymentMethod}
                      </td>
                      <td className="py-2 pr-3 text-right font-medium">
                        {formatMoney(p.amount.toString(), p.currency as SupportedCurrency)}
                      </td>
                      <td className="py-2 pr-3">
                        {p.reversedAt ? "Stornirano" : "Aktivno"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--color-foreground-muted)]">
            Strana {page} od {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Button asChild variant="outline" size="sm">
                <Link href={{ pathname: "/uplate", query: { page: String(page - 1) } }}>
                  Prethodna
                </Link>
              </Button>
            ) : null}
            {page < totalPages ? (
              <Button asChild variant="outline" size="sm">
                <Link href={{ pathname: "/uplate", query: { page: String(page + 1) } }}>
                  Sledeća
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
