import Link from "next/link";
import { redirect } from "next/navigation";
import type { SaleStatus } from "@prisma/client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { loadUserContext } from "@/server/auth/context";
import { listSales } from "@/server/services/sales/sales.service";
import { formatDate, formatMoney } from "@/lib/formatters";
import type { SupportedCurrency } from "@/lib/constants/app";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<SaleStatus, string> = {
  DRAFT: "Nacrt",
  PRE_CONTRACT: "Predugovor",
  CONTRACTED: "Ugovorena",
  PAYMENT_IN_PROGRESS: "Plaćanje u toku",
  PAID: "Plaćena",
  HANDED_OVER: "Primopredato",
  CANCELED: "Otkazana",
};

const STATUS_TONE: Record<SaleStatus, string> = {
  DRAFT: "bg-neutral-200 text-neutral-700",
  PRE_CONTRACT: "bg-amber-100 text-amber-700",
  CONTRACTED: "bg-indigo-100 text-indigo-700",
  PAYMENT_IN_PROGRESS: "bg-sky-100 text-sky-700",
  PAID: "bg-emerald-100 text-emerald-700",
  HANDED_OVER: "bg-emerald-200 text-emerald-800",
  CANCELED: "bg-rose-100 text-rose-700",
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function readParam(raw: string | string[] | undefined): string | undefined {
  return Array.isArray(raw) ? raw[0] : raw;
}

export default async function ProdajePage({ searchParams }: PageProps) {
  const ctx = await loadUserContext();
  if (!ctx) redirect("/sign-in");
  if (!ctx.activeOrganization) redirect("/podesavanja");

  const sp = await searchParams;
  const status = readParam(sp.status) as SaleStatus | undefined;
  const page = Number(readParam(sp.page) ?? "1") || 1;
  const pageSize = 20;

  const { items, total } = await listSales({
    organizationId: ctx.activeOrganization.id,
    page,
    pageSize,
    status: status ? [status] : undefined,
  });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Prodaje</h1>
          <p className="text-sm text-[var(--color-foreground-muted)]">
            Ugovori, plaćanja i primopredaje.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Filteri</CardTitle>
        </CardHeader>
        <CardContent>
          <form method="get" action="/prodaje" className="flex flex-wrap gap-2">
            <select
              name="status"
              defaultValue={status ?? ""}
              className="h-10 rounded-md border border-[var(--color-border)] bg-white px-3 text-sm"
            >
              <option value="">Svi statusi</option>
              {(Object.entries(STATUS_LABELS) as [SaleStatus, string][]).map(
                ([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ),
              )}
            </select>
            <Button type="submit" size="md">
              Primeni
            </Button>
            <Button asChild variant="outline">
              <Link href="/prodaje">Poništi</Link>
            </Button>
          </form>
        </CardContent>
      </Card>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-[var(--color-foreground-muted)]">
            Nema prodaja. Kreirajte novu iz odobrene rezervacije ili ručno.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] md:block">
            <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
              <thead className="bg-[var(--color-surface-inset)] text-left text-xs uppercase tracking-wide text-[var(--color-foreground-muted)]">
                <tr>
                  <th className="px-4 py-3">Jedinica</th>
                  <th className="px-4 py-3">Projekat</th>
                  <th className="px-4 py-3">Kupac</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Iznos</th>
                  <th className="px-4 py-3 text-right">Kreirano</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {items.map((s) => (
                  <tr key={s.id} className="hover:bg-[var(--color-surface-inset)]">
                    <td className="px-4 py-3">
                      <Link
                        href={`/prodaje/${s.id}`}
                        className="font-medium text-[var(--color-brand-700)] hover:underline"
                      >
                        {s.unit.code}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{s.project.name}</td>
                    <td className="px-4 py-3">
                      {s.buyer.firstName} {s.buyer.lastName}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONE[s.status]}`}
                      >
                        {STATUS_LABELS[s.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatMoney(s.finalPrice.toString(), s.currency as SupportedCurrency)}
                    </td>
                    <td className="px-4 py-3 text-right text-[var(--color-foreground-muted)]">
                      {formatDate(s.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 md:hidden">
            {items.map((s) => (
              <Card key={s.id}>
                <CardContent className="space-y-2 py-3">
                  <div className="flex items-center justify-between">
                    <Link
                      href={`/prodaje/${s.id}`}
                      className="font-semibold text-[var(--color-brand-700)]"
                    >
                      {s.unit.code}
                    </Link>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONE[s.status]}`}
                    >
                      {STATUS_LABELS[s.status]}
                    </span>
                  </div>
                  <div className="text-xs text-[var(--color-foreground-muted)]">
                    {s.project.name} · {s.buyer.firstName} {s.buyer.lastName}
                  </div>
                  <div className="text-sm font-medium">
                    {formatMoney(s.finalPrice.toString(), s.currency as SupportedCurrency)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {totalPages > 1 ? (
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--color-foreground-muted)]">
                Strana {page} od {totalPages}
              </span>
              <div className="flex gap-2">
                {page > 1 ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href={{ pathname: "/prodaje", query: { page: String(page - 1) } }}>
                      Prethodna
                    </Link>
                  </Button>
                ) : null}
                {page < totalPages ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href={{ pathname: "/prodaje", query: { page: String(page + 1) } }}>
                      Sledeća
                    </Link>
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
