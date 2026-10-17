import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { formatDate, formatMoney } from "@/lib/formatters";
import type { SupportedCurrency } from "@/lib/constants/app";
import { createT } from "@/lib/i18n";
import { resolveRequestLocale } from "@/lib/i18n/resolve-locale";
import { recordShareView } from "@/server/services/sharing/share-links.service";
import { resolveSalePortal } from "@/server/services/sharing/sale-portal.service";
import { SalePortalProof } from "@/features/sales/sale-portal-proof";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params;
  const t = createT(await resolveRequestLocale());
  const portal = await resolveSalePortal(token);
  return {
    title: portal
      ? `${portal.unitCode} · ${portal.organizationName}`
      : t("deals.portal.unavailable"),
    robots: { index: false, follow: false },
  };
}

export default async function SalePortalPage({ params }: PageProps) {
  const { token } = await params;
  const t = createT(await resolveRequestLocale());
  const portal = await resolveSalePortal(token);
  if (!portal) notFound();
  await recordShareView(token);

  const currency = portal.currency as SupportedCurrency;

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-10">
      <header>
        <p className="text-sm text-[var(--color-foreground-muted)]">{portal.organizationName}</p>
        <h1 className="text-2xl font-semibold">{t("deals.portal.title")}</h1>
        <p className="text-sm">
          {portal.buyerName} · {portal.unitCode} · {portal.projectName}
        </p>
      </header>

      <section className="space-y-2 rounded-lg border border-[var(--color-border)] p-4 text-sm">
        <Row
          label={t("deals.portal.contracted")}
          value={formatMoney(portal.contracted, currency)}
        />
        <Row label={t("deals.portal.paid")} value={formatMoney(portal.paid, currency)} />
        <Row
          label={t("deals.portal.outstanding")}
          value={formatMoney(portal.outstanding, currency)}
        />
        {portal.plannedHandoverDate ? (
          <Row label={t("deals.portal.handover")} value={formatDate(portal.plannedHandoverDate)} />
        ) : null}
        {portal.handoverDone ? <p>{t("deals.portal.handoverDone")}</p> : null}
      </section>

      <section className="space-y-3 rounded-lg border border-[var(--color-border)] p-4">
        <h2 className="text-sm font-semibold">{t("deals.portal.payTitle")}</h2>
        {portal.accountNumber ? (
          <div className="space-y-1 text-sm">
            <Row label={t("deals.portal.account")} value={portal.accountNumber} />
            {portal.bankName ? (
              <Row label={t("deals.portal.bank")} value={portal.bankName} />
            ) : null}
            <Row label={t("deals.portal.reference")} value={portal.reference} />
          </div>
        ) : (
          <p className="text-sm text-[var(--color-foreground-muted)]">
            {t("deals.portal.noAccount")}
          </p>
        )}
        {portal.qrDataUrl ? (
          <img src={portal.qrDataUrl} alt={t("deals.portal.qrAlt")} className="h-40 w-40" />
        ) : null}
        <SalePortalProof token={token} />
      </section>

      <section className="space-y-2 rounded-lg border border-[var(--color-border)] p-4">
        <h2 className="text-sm font-semibold">{t("deals.portal.installments")}</h2>
        {portal.installments.length === 0 ? (
          <p className="text-sm text-[var(--color-foreground-muted)]">—</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {portal.installments.map((row) => (
              <li
                key={`${row.name}-${row.dueDate.toISOString()}`}
                className="flex justify-between gap-3"
              >
                <span>
                  {row.name}
                  <span className="block text-xs text-[var(--color-foreground-muted)]">
                    {formatDate(row.dueDate)} · {row.status}
                  </span>
                </span>
                <span>
                  {formatMoney(row.paid, currency)} / {formatMoney(row.amount, currency)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {portal.documents.length ? (
        <section className="space-y-2 rounded-lg border border-[var(--color-border)] p-4">
          <h2 className="text-sm font-semibold">{t("deals.portal.documents")}</h2>
          <ul className="space-y-1 text-sm">
            {portal.documents.map((doc) => (
              <li key={doc.id}>
                <a
                  className="text-[var(--color-brand-700)] hover:underline"
                  href={`/api/v1/public/sale-portal/${token}/documents/${doc.id}`}
                >
                  {doc.originalFileName}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}

function Row(props: { label: string; value: string }) {
  return (
    <p className="flex justify-between gap-3">
      <span className="text-[var(--color-foreground-muted)]">{props.label}</span>
      <span className="font-medium">{props.value}</span>
    </p>
  );
}
