import Link from "next/link";
import { redirect } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PermissionGuard } from "@/components/app/permission-guard";
import { loadUserContext } from "@/server/auth/context";
import { listBuyers } from "@/server/services/buyers.service";
import { formatDate } from "@/lib/formatters";
import type { BuyerEntityType, BuyerStatus } from "@prisma/client";

interface KycShape {
  idFrontOk: boolean;
  idBackOk: boolean;
  addressProofOk: boolean;
  taxCertOk: boolean;
}

function computeKycStatus(
  entityType: BuyerEntityType,
  kyc: KycShape | null | undefined,
): { label: string; tone: string } {
  if (!kyc) return { label: "Nepotpuno", tone: "bg-amber-100 text-amber-700" };
  const required =
    entityType === "LEGAL"
      ? [kyc.idFrontOk, kyc.idBackOk, kyc.addressProofOk, kyc.taxCertOk]
      : [kyc.idFrontOk, kyc.idBackOk, kyc.addressProofOk];
  const allOk = required.every(Boolean);
  return allOk
    ? { label: "Potpuno", tone: "bg-emerald-100 text-emerald-700" }
    : { label: "Nepotpuno", tone: "bg-amber-100 text-amber-700" };
}

export const dynamic = "force-dynamic";

const BUYER_STATUS_LABELS: Record<BuyerStatus, string> = {
  NEW: "Novi",
  CONTACTED: "Kontaktiran",
  QUALIFIED: "Kvalifikovan",
  VIEWING_SCHEDULED: "Razgledanje zakazano",
  OFFER_SENT: "Ponuda poslata",
  NEGOTIATION: "Pregovori",
  RESERVATION: "Rezervacija",
  WON: "Kupio",
  LOST: "Izgubljen",
  ARCHIVED: "Arhiviran",
};

const BUYER_STATUS_TONE: Record<BuyerStatus, string> = {
  NEW: "bg-sky-100 text-sky-700",
  CONTACTED: "bg-indigo-100 text-indigo-700",
  QUALIFIED: "bg-violet-100 text-violet-700",
  VIEWING_SCHEDULED: "bg-amber-100 text-amber-700",
  OFFER_SENT: "bg-cyan-100 text-cyan-700",
  NEGOTIATION: "bg-orange-100 text-orange-700",
  RESERVATION: "bg-emerald-100 text-emerald-700",
  WON: "bg-green-100 text-green-700",
  LOST: "bg-rose-100 text-rose-700",
  ARCHIVED: "bg-neutral-200 text-neutral-700",
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function readParam(raw: string | string[] | undefined): string | undefined {
  if (Array.isArray(raw)) return raw[0];
  return raw;
}

export default async function KupciPage({ searchParams }: PageProps) {
  const ctx = await loadUserContext();
  if (!ctx) redirect("/sign-in");
  if (!ctx.activeOrganization) redirect("/podesavanja");

  const sp = await searchParams;
  const search = readParam(sp.q);
  const status = readParam(sp.status) as BuyerStatus | undefined;
  const page = Number(readParam(sp.page) ?? "1") || 1;
  const pageSize = 20;

  const { items, total } = await listBuyers({
    organizationId: ctx.activeOrganization.id,
    page,
    pageSize,
    search,
    status: status ? [status] : undefined,
    activeOnly: true,
  });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Kupci</h1>
          <p className="text-sm text-[var(--color-foreground-muted)]">
            Baza kupaca i zainteresovanih klijenata.
          </p>
        </div>
        <PermissionGuard permission="lead.manage">
          <Button asChild>
            <Link href="/kupci/novi">Novi kupac</Link>
          </Button>
        </PermissionGuard>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Filteri</CardTitle>
        </CardHeader>
        <CardContent>
          <form method="get" className="grid grid-cols-1 gap-3 sm:grid-cols-4" action="/kupci">
            <input
              type="text"
              name="q"
              placeholder="Pretraga po imenu, telefonu, email-u…"
              defaultValue={search ?? ""}
              className="col-span-2 h-10 rounded-md border border-[var(--color-border)] bg-white px-3 text-sm"
            />
            <select
              name="status"
              defaultValue={status ?? ""}
              className="h-10 rounded-md border border-[var(--color-border)] bg-white px-3 text-sm"
            >
              <option value="">Svi statusi</option>
              {(Object.entries(BUYER_STATUS_LABELS) as [BuyerStatus, string][]).map(
                ([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ),
              )}
            </select>
            <div className="flex gap-2">
              <Button type="submit" size="md">
                Primeni
              </Button>
              <Button asChild variant="outline">
                <Link href="/kupci">Poništi</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-[var(--color-foreground-muted)]">
            Nema kupaca koji odgovaraju izabranim filterima.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] md:block">
            <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
              <thead className="bg-[var(--color-surface-inset)] text-left text-xs uppercase tracking-wide text-[var(--color-foreground-muted)]">
                <tr>
                  <th className="px-4 py-3">Ime i prezime</th>
                  <th className="px-4 py-3">Telefon</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Zadužen</th>
                  <th className="px-4 py-3">KYC</th>
                  <th className="px-4 py-3 text-right">Rezervacija</th>
                  <th className="px-4 py-3 text-right">Kreiran</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {items.map((b) => (
                  <tr key={b.id} className="hover:bg-[var(--color-surface-inset)]">
                    <td className="px-4 py-3">
                      <Link
                        href={`/kupci/${b.id}`}
                        className="font-medium text-[var(--color-brand-700)] hover:underline"
                      >
                        {b.firstName} {b.lastName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{b.phone}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${BUYER_STATUS_TONE[b.status]}`}
                      >
                        {BUYER_STATUS_LABELS[b.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--color-foreground-muted)]">
                      {b.assignedUser?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const kyc = computeKycStatus(b.entityType, b.kycChecklist);
                        return (
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${kyc.tone}`}
                          >
                            {kyc.label}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {b._count.reservations}
                    </td>
                    <td className="px-4 py-3 text-right text-[var(--color-foreground-muted)]">
                      {formatDate(b.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 md:hidden">
            {items.map((b) => (
              <Card key={b.id}>
                <CardContent className="space-y-2 py-3">
                  <div className="flex items-center justify-between">
                    <Link
                      href={`/kupci/${b.id}`}
                      className="font-semibold text-[var(--color-brand-700)]"
                    >
                      {b.firstName} {b.lastName}
                    </Link>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${BUYER_STATUS_TONE[b.status]}`}
                    >
                      {BUYER_STATUS_LABELS[b.status]}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-[var(--color-foreground-muted)]">
                    <span className="font-mono">{b.phone}</span>
                    <span>{b.assignedUser?.name ?? "—"}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Pagination page={page} totalPages={totalPages} />
        </>
      )}
    </div>
  );
}

function Pagination({ page, totalPages }: { page: number; totalPages: number }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-[var(--color-foreground-muted)]">
        Strana {page} od {totalPages}
      </span>
      <div className="flex gap-2">
        {page > 1 ? (
          <Button asChild variant="outline" size="sm">
            <Link href={{ pathname: "/kupci", query: { page: String(page - 1) } }}>
              Prethodna
            </Link>
          </Button>
        ) : null}
        {page < totalPages ? (
          <Button asChild variant="outline" size="sm">
            <Link href={{ pathname: "/kupci", query: { page: String(page + 1) } }}>
              Sledeća
            </Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
