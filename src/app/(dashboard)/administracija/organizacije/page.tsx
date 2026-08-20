import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listAllOrganizations } from "@/server/services/platform.service";
import { requireSuperAdmin } from "@/server/permissions/require";
import { formatDate } from "@/lib/formatters/date";
import { Plus } from "lucide-react";
import { createT, type TranslationKey } from "@/lib/i18n";
import { resolveRequestLocale } from "@/lib/i18n/resolve-locale";

interface PageProps {
  searchParams: Promise<{
    page?: string;
    q?: string;
    type?: string;
    status?: string;
  }>;
}

const STATUS_KEY: Record<string, TranslationKey> = {
  TRIAL: "status.trial",
  ACTIVE: "status.active",
  RESTRICTED: "status.restricted",
  SUSPENDED: "status.suspended",
  CLOSED: "status.closed",
};

const TYPE_KEY: Record<string, TranslationKey> = {
  INVESTOR: "organization.types.investor",
  AGENCY: "organization.types.agency",
};

export default async function PlatformOrganizationsPage({
  searchParams,
}: PageProps) {
  await requireSuperAdmin();
  const params = await searchParams;
  const page = Number.parseInt(params.page ?? "1", 10) || 1;
  const t = createT(await resolveRequestLocale());

  const { items, total } = await listAllOrganizations({
    page,
    pageSize: 25,
    search: params.q,
    type: (params.type as "INVESTOR" | "AGENCY" | undefined) ?? undefined,
    status:
      (params.status as
        | "TRIAL"
        | "ACTIVE"
        | "RESTRICTED"
        | "SUSPENDED"
        | "CLOSED"
        | undefined) ?? undefined,
  });

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">
          {t("admin.orgsPage.title", { total })}
        </h2>
        <Button asChild size="sm">
          <Link href="/administracija/organizacije/nova">
            <Plus className="size-4" /> {t("admin.orgsPage.newOrg")}
          </Link>
        </Button>
      </div>

      <form className="grid gap-3 sm:grid-cols-4" action="/administracija/organizacije">
        <input
          type="text"
          name="q"
          defaultValue={params.q ?? ""}
          placeholder={t("admin.orgsPage.searchPlaceholder")}
          className="h-10 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
        />
        <select
          name="type"
          defaultValue={params.type ?? ""}
          className="h-10 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
        >
          <option value="">{t("admin.allTypes")}</option>
          <option value="INVESTOR">{t("admin.investors")}</option>
          <option value="AGENCY">{t("admin.agencies")}</option>
        </select>
        <select
          name="status"
          defaultValue={params.status ?? ""}
          className="h-10 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
        >
          <option value="">{t("common.allStatuses")}</option>
          <option value="TRIAL">{t("status.trial")}</option>
          <option value="ACTIVE">{t("status.active")}</option>
          <option value="RESTRICTED">{t("status.restricted")}</option>
          <option value="SUSPENDED">{t("status.suspended")}</option>
          <option value="CLOSED">{t("status.closed")}</option>
        </select>
        <Button type="submit" variant="secondary" size="sm">
          {t("admin.applyFilters")}
        </Button>
      </form>

      <Card>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <p className="p-6 text-sm text-[var(--color-foreground-muted)]">
              {t("admin.orgsPage.empty")}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-[var(--color-foreground-subtle)]">
                  <tr>
                    <th className="border-b border-[var(--color-border)] px-4 py-2">
                      {t("admin.orgsPage.colName")}
                    </th>
                    <th className="border-b border-[var(--color-border)] px-4 py-2">
                      {t("common.type")}
                    </th>
                    <th className="border-b border-[var(--color-border)] px-4 py-2">
                      {t("common.statusLabel")}
                    </th>
                    <th className="border-b border-[var(--color-border)] px-4 py-2">
                      {t("admin.orgsPage.colPlan")}
                    </th>
                    <th className="border-b border-[var(--color-border)] px-4 py-2">
                      {t("admin.members")}
                    </th>
                    <th className="border-b border-[var(--color-border)] px-4 py-2">
                      {t("nav.projects")}
                    </th>
                    <th className="border-b border-[var(--color-border)] px-4 py-2">
                      {t("nav.inventory")}
                    </th>
                    <th className="border-b border-[var(--color-border)] px-4 py-2">
                      {t("admin.created")}
                    </th>
                    <th className="border-b border-[var(--color-border)] px-4 py-2">
                      {t("common.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-[var(--color-border)] last:border-b-0"
                    >
                      <td className="px-4 py-2">
                        <Link
                          href={`/administracija/organizacije/${row.id}`}
                          className="font-medium hover:underline"
                        >
                          {row.name}
                        </Link>
                        <div className="font-mono text-xs text-[var(--color-foreground-subtle)]">
                          {row.slug}
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        {row.type ? t(TYPE_KEY[row.type] ?? "admin.dash") : t("admin.dash")}
                      </td>
                      <td className="px-4 py-2">
                        {row.status ? (
                          <Badge
                            tone={
                              row.status === "ACTIVE"
                                ? "success"
                                : row.status === "SUSPENDED" || row.status === "CLOSED"
                                  ? "danger"
                                  : "info"
                            }
                          >
                            {t(STATUS_KEY[row.status] ?? "admin.dash")}
                          </Badge>
                        ) : (
                          t("admin.dash")
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {row.type === "AGENCY"
                          ? t("ops.org.agencyPartnerTitle")
                          : (row.planName ?? t("admin.dash"))}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {row.memberCount}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {row.projectCount}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {row.unitCount}
                      </td>
                      <td className="px-4 py-2 text-xs">
                        {formatDate(row.createdAt)}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/administracija/organizacije/${row.id}`}
                            className="text-sm font-medium text-[var(--color-primary)] hover:underline"
                          >
                            {t("admin.orgsPage.edit")}
                          </Link>
                          <Link
                            href={`/administracija/organizacije/${row.id}/naplata`}
                            className="text-sm text-[var(--color-foreground-muted)] hover:underline"
                          >
                            {t("admin.orgsPage.billing")}
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
