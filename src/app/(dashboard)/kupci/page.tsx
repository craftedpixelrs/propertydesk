import Link from "next/link";
import { redirect } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PermissionGuard } from "@/components/app/permission-guard";
import { loadUserContext } from "@/server/auth/context";
import { listBuyers } from "@/server/services/buyers.service";
import { formatDate } from "@/lib/formatters";
import {
  createT,
  enumLabel,
  type TranslateFn,
  type TranslationKey,
} from "@/lib/i18n";
import type { BuyerEntityType, BuyerStatus } from "@prisma/client";

interface KycShape {
  idFrontOk: boolean;
  idBackOk: boolean;
  addressProofOk: boolean;
  taxCertOk: boolean;
}

function computeKycComplete(
  entityType: BuyerEntityType,
  kyc: KycShape | null | undefined,
): boolean {
  if (!kyc) return false;
  const required =
    entityType === "LEGAL"
      ? [kyc.idFrontOk, kyc.idBackOk, kyc.addressProofOk, kyc.taxCertOk]
      : [kyc.idFrontOk, kyc.idBackOk, kyc.addressProofOk];
  return required.every(Boolean);
}

const BUYER_STATUSES = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "VIEWING_SCHEDULED",
  "OFFER_SENT",
  "NEGOTIATION",
  "RESERVATION",
  "WON",
  "LOST",
  "ARCHIVED",
] as const satisfies readonly BuyerStatus[];

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

function buyerStatusLabel(status: BuyerStatus, t: TranslateFn): string {
  const fromEnum = enumLabel("buyer", status, t);
  if (fromEnum !== status) return fromEnum;
  return t(`crm.buyerStatus.${status}` as TranslationKey);
}

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function readParam(raw: string | string[] | undefined): string | undefined {
  if (Array.isArray(raw)) return raw[0];
  return raw;
}

export const dynamic = "force-dynamic";

export default async function KupciPage({ searchParams }: PageProps) {
  const ctx = await loadUserContext();
  if (!ctx) redirect("/sign-in");
  if (!ctx.activeOrganization) redirect("/podesavanja");
  const t = createT(ctx.user.locale);

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
          <h1 className="text-2xl font-semibold">{t("nav.customers")}</h1>
          <p className="text-sm text-[var(--color-foreground-muted)]">
            {t("crm.buyers.subtitle")}
          </p>
        </div>
        <PermissionGuard permission="lead.manage">
          <Button asChild>
            <Link href="/kupci/novi">{t("crm.buyers.newBuyer")}</Link>
          </Button>
        </PermissionGuard>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("common.filter")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form method="get" className="grid grid-cols-1 gap-3 sm:grid-cols-4" action="/kupci">
            <input
              type="text"
              name="q"
              placeholder={t("crm.buyers.searchPlaceholder")}
              defaultValue={search ?? ""}
              className="col-span-2 h-10 rounded-md border border-[var(--color-border)] bg-white px-3 text-sm"
            />
            <select
              name="status"
              defaultValue={status ?? ""}
              className="h-10 rounded-md border border-[var(--color-border)] bg-white px-3 text-sm"
            >
              <option value="">{t("common.allStatuses")}</option>
              {BUYER_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {buyerStatusLabel(value, t)}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <Button type="submit" size="md">
                {t("common.apply")}
              </Button>
              <Button asChild variant="outline">
                <Link href="/kupci">{t("common.reset")}</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-[var(--color-foreground-muted)]">
            {t("crm.buyers.emptyFiltered")}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] md:block">
            <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
              <thead className="bg-[var(--color-surface-inset)] text-left text-xs uppercase tracking-wide text-[var(--color-foreground-muted)]">
                <tr>
                  <th className="px-4 py-3">{t("auth.fullName")}</th>
                  <th className="px-4 py-3">{t("common.phone")}</th>
                  <th className="px-4 py-3">{t("common.statusLabel")}</th>
                  <th className="px-4 py-3">{t("crm.buyers.assigned")}</th>
                  <th className="px-4 py-3">{t("crm.buyers.kyc")}</th>
                  <th className="px-4 py-3 text-right">{t("crm.buyers.reservationCol")}</th>
                  <th className="px-4 py-3 text-right">{t("crm.buyers.created")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {items.map((b) => {
                  const kycComplete = computeKycComplete(b.entityType, b.kycChecklist);
                  return (
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
                          {buyerStatusLabel(b.status, t)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[var(--color-foreground-muted)]">
                        {b.assignedUser?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            kycComplete
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {kycComplete
                            ? t("crm.buyers.kycComplete")
                            : t("crm.buyers.kycIncomplete")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {b._count.reservations}
                      </td>
                      <td className="px-4 py-3 text-right text-[var(--color-foreground-muted)]">
                        {formatDate(b.createdAt)}
                      </td>
                    </tr>
                  );
                })}
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
                      {buyerStatusLabel(b.status, t)}
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

          <Pagination page={page} totalPages={totalPages} t={t} />
        </>
      )}
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  t,
}: {
  page: number;
  totalPages: number;
  t: TranslateFn;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-[var(--color-foreground-muted)]">
        {t("crm.pagination.pageOf", { page, total: totalPages })}
      </span>
      <div className="flex gap-2">
        {page > 1 ? (
          <Button asChild variant="outline" size="sm">
            <Link href={{ pathname: "/kupci", query: { page: String(page - 1) } }}>
              {t("crm.pagination.previous")}
            </Link>
          </Button>
        ) : null}
        {page < totalPages ? (
          <Button asChild variant="outline" size="sm">
            <Link href={{ pathname: "/kupci", query: { page: String(page + 1) } }}>
              {t("crm.pagination.next")}
            </Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
