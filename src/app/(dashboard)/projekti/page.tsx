import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PermissionGuard } from "@/components/app/permission-guard";
import { NewProjectDrawer } from "@/features/projects/new-project-drawer";
import { ProjectsFilterBar } from "@/features/projects/projects-filter-bar";
import { loadUserContext, requireTenantPage } from "@/server/auth/context";
import { listProjects } from "@/server/services/projects.service";
import { formatDate } from "@/lib/formatters";
import { createT, projectStatusLabel, type TranslateFn } from "@/lib/i18n";
import type { ProjectStatus } from "@prisma/client";

const PROJECT_STATUS_TONE: Record<ProjectStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  PRE_SALES: "bg-sky-100 text-sky-700",
  ACTIVE_SALES: "bg-emerald-100 text-emerald-700",
  CONSTRUCTION: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-indigo-100 text-indigo-700",
  ARCHIVED: "bg-neutral-200 text-neutral-700",
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function readParam(
  raw: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(raw)) return raw[0];
  return raw;
}

export default async function ProjektiPage({ searchParams }: PageProps) {
  const ctx = await loadUserContext();
  requireTenantPage(ctx, { permission: "project.read", orgType: "INVESTOR" });

  const t = createT(ctx.user.locale);
  const sp = await searchParams;
  const search = readParam(sp.q);
  const status = readParam(sp.status) as ProjectStatus | undefined;
  const page = Number(readParam(sp.page) ?? "1") || 1;
  const pageSize = 20;
  const activeOnly = readParam(sp.activeOnly) !== "false";

  const { items, total } = await listProjects({
    organizationId: ctx.activeOrganization.id,
    page,
    pageSize,
    search,
    status,
    activeOnly,
  });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t("projects.title")}</h1>
          <p className="text-sm text-[var(--color-foreground-muted)]">
            {t("inventory.projects.subtitle")}
          </p>
        </div>
        <PermissionGuard permission="project.create">
          <NewProjectDrawer>
            <Button type="button">{t("projects.newProject")}</Button>
          </NewProjectDrawer>
        </PermissionGuard>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("common.filter")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ProjectsFilterBar
            values={{ q: search ?? "", status: status ?? "" }}
          />
        </CardContent>
      </Card>

      {items.length === 0 ? (
        <Card>
          <CardContent className="space-y-3 py-12 text-center text-sm text-[var(--color-foreground-muted)]">
            {search || status ? (
              <>{t("inventory.projects.noFilterResults")}</>
            ) : (
              <>
                <p>{t("inventory.projects.emptyOrg")}</p>
                <PermissionGuard permission="project.create">
                  <div className="flex justify-center pt-2">
                    <NewProjectDrawer>
                      <Button type="button">{t("inventory.projects.createFirst")}</Button>
                    </NewProjectDrawer>
                  </div>
                </PermissionGuard>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] md:block">
            <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
              <thead className="bg-[var(--color-surface-inset)] text-left text-xs uppercase tracking-wide text-[var(--color-foreground-muted)]">
                <tr>
                  <th className="px-4 py-3">{t("inventory.columns.code")}</th>
                  <th className="px-4 py-3">{t("projects.fields.name")}</th>
                  <th className="px-4 py-3">{t("projects.fields.city")}</th>
                  <th className="px-4 py-3">{t("common.statusLabel")}</th>
                  <th className="px-4 py-3 text-right">{t("units.title")}</th>
                  <th className="px-4 py-3 text-right">{t("inventory.columns.created")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {items.map((p) => (
                  <tr key={p.id} className="hover:bg-[var(--color-surface-inset)]">
                    <td className="px-4 py-3 font-mono text-xs">{p.code}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/projekti/${p.id}`}
                        className="font-medium text-[var(--color-brand-700)] hover:underline"
                      >
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{p.city ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${PROJECT_STATUS_TONE[p.projectStatus]}`}
                      >
                        {projectStatusLabel(p.projectStatus, t)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {p.unitCounts.total}{" "}
                      <span className="text-xs text-[var(--color-foreground-muted)]">
                        {t("inventory.projects.availableCount", {
                          count: p.unitCounts.available,
                        })}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-[var(--color-foreground-muted)]">
                      {formatDate(p.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="grid gap-3 md:hidden">
            {items.map((p) => (
              <Card key={p.id}>
                <CardContent className="space-y-2 py-3">
                  <div className="flex items-center justify-between">
                    <Link
                      href={`/projekti/${p.id}`}
                      className="font-semibold text-[var(--color-brand-700)]"
                    >
                      {p.name}
                    </Link>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${PROJECT_STATUS_TONE[p.projectStatus]}`}
                    >
                      {projectStatusLabel(p.projectStatus, t)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-[var(--color-foreground-muted)]">
                    <span className="font-mono">{p.code}</span>
                    <span>{p.city ?? "—"}</span>
                  </div>
                  <div className="text-xs text-[var(--color-foreground-muted)]">
                    {t("inventory.projects.unitSummary", {
                      total: p.unitCounts.total,
                      available: p.unitCounts.available,
                      sold: p.unitCounts.sold,
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            t={t}
            query={{
              ...(search ? { q: search } : {}),
              ...(status ? { status } : {}),
            }}
          />
        </>
      )}
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  t,
  query,
}: {
  page: number;
  totalPages: number;
  t: TranslateFn;
  query: Record<string, string>;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-[var(--color-foreground-muted)]">
        {t("inventory.pagination.pageOf", { page, total: totalPages })}
      </span>
      <div className="flex gap-2">
        {page > 1 ? (
          <Button asChild variant="outline" size="sm">
            <Link
              href={{
                pathname: "/projekti",
                query: { ...query, page: String(page - 1) },
              }}
            >
              {t("inventory.pagination.prev")}
            </Link>
          </Button>
        ) : null}
        {page < totalPages ? (
          <Button asChild variant="outline" size="sm">
            <Link
              href={{
                pathname: "/projekti",
                query: { ...query, page: String(page + 1) },
              }}
            >
              {t("inventory.pagination.next")}
            </Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
