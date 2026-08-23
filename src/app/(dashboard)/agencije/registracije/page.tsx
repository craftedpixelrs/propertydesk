import Link from "next/link";
import { redirect } from "next/navigation";
import type { AgencyBuyerRegistrationStatus } from "@prisma/client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusFilterBar } from "@/components/forms/status-filter-bar";
import { loadUserContext } from "@/server/auth/context";
import { listRegistrationsForInvestor } from "@/server/services/agencies/registrations.service";
import { formatDate } from "@/lib/formatters";
import { RegistrationReviewActions } from "@/features/agencies/registration-review-actions";
import { createT, enumLabel } from "@/lib/i18n";

export const dynamic = "force-dynamic";

const REGISTRATION_STATUSES: AgencyBuyerRegistrationStatus[] = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "EXPIRED",
  "CONVERTED",
  "CANCELED",
  "CONFLICT_REVIEW",
];

const STATUS_TONE: Record<AgencyBuyerRegistrationStatus, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-rose-100 text-rose-700",
  EXPIRED: "bg-neutral-200 text-neutral-700",
  CONVERTED: "bg-sky-100 text-sky-700",
  CANCELED: "bg-neutral-200 text-neutral-700",
  CONFLICT_REVIEW: "bg-orange-100 text-orange-700",
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function readParam(raw: string | string[] | undefined): string | undefined {
  if (Array.isArray(raw)) return raw[0];
  return raw;
}

export default async function RegistracijePage({ searchParams }: PageProps) {
  const ctx = await loadUserContext();
  if (!ctx) redirect("/sign-in");
  if (!ctx.activeOrganization) redirect("/podesavanja");
  if (ctx.activeOrganization.type !== "INVESTOR") redirect("/dashboard");

  const t = createT(ctx.user.locale);

  const sp = await searchParams;
  const status = readParam(sp.status) as AgencyBuyerRegistrationStatus | undefined;
  const page = Number(readParam(sp.page) ?? "1") || 1;

  const { items, total } = await listRegistrationsForInvestor({
    investorOrganizationId: ctx.activeOrganization.id,
    status: status ? [status] : undefined,
    page,
    pageSize: 25,
  });

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <Link href="/agencije" className="text-sm text-[var(--color-brand-700)] hover:underline">
            ← {t("nav.agencies")}
          </Link>
        </div>
        <h1 className="mt-2 text-2xl font-semibold">{t("nav.agencyRegistrations")}</h1>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          {t("partners.registrations.subtitle")}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("common.filter")}</CardTitle>
        </CardHeader>
        <CardContent>
          <StatusFilterBar
            path="/agencije/registracije"
            status={status ?? ""}
            options={REGISTRATION_STATUSES.map((value) => ({
              value,
              label: enumLabel("registration", value, t),
            }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("partners.totalCount", { count: total })}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <div className="py-12 text-center text-sm text-[var(--color-foreground-muted)]">
              {t("partners.registrations.empty")}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
                <thead className="bg-[var(--color-surface-inset)] text-left text-xs uppercase tracking-wide text-[var(--color-foreground-muted)]">
                  <tr>
                    <th className="px-4 py-3">{t("partners.buyer")}</th>
                    <th className="px-4 py-3">{t("units.columns.project")}</th>
                    <th className="px-4 py-3">{t("organization.types.agency")}</th>
                    <th className="px-4 py-3">{t("common.statusLabel")}</th>
                    <th className="px-4 py-3">{t("partners.registeredAt")}</th>
                    <th className="px-4 py-3 text-right">{t("common.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {items.map((r) => (
                    <tr key={r.id}>
                      <td className="px-4 py-3">
                        <div className="font-medium">
                          {r.buyer.firstName} {r.buyer.lastName}
                        </div>
                        <div className="text-xs text-[var(--color-foreground-muted)]">
                          {r.buyer.phone}
                        </div>
                      </td>
                      <td className="px-4 py-3">{r.project.name}</td>
                      <td className="px-4 py-3">{r.agency.name}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONE[r.status]}`}
                        >
                          {enumLabel("registration", r.status, t)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[var(--color-foreground-muted)]">
                        {formatDate(r.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {r.status === "PENDING" || r.status === "CONFLICT_REVIEW" ? (
                          <RegistrationReviewActions registrationId={r.id} />
                        ) : (
                          <span className="text-xs text-[var(--color-foreground-muted)]">—</span>
                        )}
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
