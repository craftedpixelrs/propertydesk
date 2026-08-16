import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  listAllUsers,
  listOrganizationsForPicker,
  type ListPlatformUsersInput,
} from "@/server/services/platform.service";
import { formatDate } from "@/lib/formatters/date";
import { requireSuperAdmin } from "@/server/permissions/require";
import { ImpersonateButton } from "@/features/platform-admin/impersonate-button";
import { EditUserDialog } from "@/features/platform-admin/edit-user-dialog";
import { AddUserDialog } from "@/features/platform-admin/add-user-dialog";
import { UsersFilterBar } from "@/features/platform-admin/users-filter-bar";
import {
  ALL_ORG_ROLE_NAMES,
  PROPERTY_DESK_ROLE_NAMES,
} from "@/server/permissions/roles";
import Link from "next/link";
import type { OrganizationType, PropertyDeskTeamRole } from "@prisma/client";
import { createT, type TranslationKey } from "@/lib/i18n";
import { resolveRequestLocale } from "@/lib/i18n/resolve-locale";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    page?: string;
    q?: string;
    organizationId?: string;
    orgType?: string;
    role?: string;
    /** @deprecated folded into `role` (PD_TEAM / SETTER / …) */
    pdTeam?: string;
    status?: string;
    platform?: string;
  }>;
}

const PD_ROLE_KEY: Record<string, TranslationKey> = {
  SETTER: "admin.pd.teamRole.SETTER",
  CLOSER: "admin.pd.teamRole.CLOSER",
  OPERATIONS: "admin.pd.teamRole.OPERATIONS",
  MANAGER: "admin.pd.teamRole.MANAGER",
};

const FILTER_QUERY_KEYS = [
  "q",
  "organizationId",
  "orgType",
  "role",
  "status",
  "platform",
] as const;

function parseRoleFilter(raw: string | undefined): {
  role?: string;
  propertyDeskTeam?: ListPlatformUsersInput["propertyDeskTeam"];
} {
  if (!raw) return {};
  if (raw === "PD_TEAM" || raw === "any" || raw === "1") {
    return { propertyDeskTeam: true };
  }
  if (PROPERTY_DESK_ROLE_NAMES.includes(raw as PropertyDeskTeamRole)) {
    return { propertyDeskTeam: raw as PropertyDeskTeamRole };
  }
  if (ALL_ORG_ROLE_NAMES.includes(raw as (typeof ALL_ORG_ROLE_NAMES)[number])) {
    return { role: raw };
  }
  return {};
}

/**
 * SUPER_ADMIN-only directory of every user on the platform. From here you can
 * edit the account (Sloj A + Sloj C Property Desk team) or impersonate for
 * support. Tenant application roles (Sloj B) stay inside the organization.
 */
export default async function PlatformUsersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Number.parseInt(params.page ?? "1", 10) || 1;
  const pageSize = 25;
  const organizationId = params.organizationId?.trim() || undefined;
  const orgType =
    params.orgType === "INVESTOR" || params.orgType === "AGENCY"
      ? (params.orgType as OrganizationType)
      : undefined;
  const roleFilter = parseRoleFilter(params.role || params.pdTeam);
  const status =
    params.status === "verified" ||
    params.status === "unverified" ||
    params.status === "banned"
      ? params.status
      : undefined;
  const platform =
    params.platform === "SUPER_ADMIN" || params.platform === "user"
      ? params.platform
      : undefined;

  const ctx = await requireSuperAdmin();
  const currentUserId = ctx.session.user.id;
  const t = createT(await resolveRequestLocale());

  const [{ items, total }, organizations] = await Promise.all([
    listAllUsers({
      page,
      pageSize,
      search: params.q,
      organizationId,
      orgType,
      role: roleFilter.role,
      propertyDeskTeam: roleFilter.propertyDeskTeam,
      status,
      platform,
    }),
    listOrganizationsForPicker(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const listQuery: Record<string, string> = {};
  for (const key of FILTER_QUERY_KEYS) {
    const value = params[key]?.trim();
    if (value) listQuery[key] = value;
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">
            {t("admin.usersPage.title", { total })}
          </h2>
          <p className="text-xs text-[var(--color-foreground-muted)]">
            {t("admin.usersPage.intro1")}
          </p>
          <p className="mt-1 text-xs text-[var(--color-foreground-muted)]">
            {t("admin.usersPage.intro2a")}
            {t("admin.usersPage.intro2b")}
            <Link
              href="/administracija/property-desk/tim"
              className="underline decoration-dotted hover:no-underline"
            >
              {t("admin.usersPage.intro2c")}
            </Link>
            {t("admin.usersPage.intro2d")}
          </p>
        </div>
        <AddUserDialog organizations={organizations} />
      </div>

      <UsersFilterBar
        values={{
          q: params.q ?? "",
          organizationId: params.organizationId ?? "",
          orgType: params.orgType ?? "",
          role:
            params.role ||
            (params.pdTeam === "1" || params.pdTeam === "any"
              ? "PD_TEAM"
              : params.pdTeam === "none"
                ? ""
                : (params.pdTeam ?? "")),
          status: params.status ?? "",
          platform: params.platform ?? "",
        }}
        organizations={organizations}
      />

      <Card>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <p className="p-6 text-sm text-[var(--color-foreground-muted)]">
              {t("admin.usersPage.empty")}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-[var(--color-foreground-subtle)]">
                  <tr>
                    <th className="border-b border-[var(--color-border)] px-4 py-2">
                      {t("admin.usersPage.colUser")}
                    </th>
                    <th
                      className="border-b border-[var(--color-border)] px-4 py-2"
                      title={t("admin.usersPage.colPlatformTitle")}
                    >
                      {t("admin.usersPage.colPlatform")}
                    </th>
                    <th
                      className="border-b border-[var(--color-border)] px-4 py-2"
                      title={t("admin.usersPage.colPdTitle")}
                    >
                      {t("admin.usersPage.colPd")}
                    </th>
                    <th
                      className="border-b border-[var(--color-border)] px-4 py-2"
                      title={t("admin.usersPage.colAppRolesTitle")}
                    >
                      {t("admin.usersPage.colAppRoles")}
                    </th>
                    <th className="border-b border-[var(--color-border)] px-4 py-2">
                      {t("common.statusLabel")}
                    </th>
                    <th className="border-b border-[var(--color-border)] px-4 py-2">
                      {t("admin.registered")}
                    </th>
                    <th className="border-b border-[var(--color-border)] px-4 py-2 text-right">
                      {t("common.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((u) => {
                    const isSelf = currentUserId === u.id;
                    const isSuperAdmin = u.role === "SUPER_ADMIN";
                    const disabled = isSelf || isSuperAdmin || u.banned;
                    const disabledReason = isSelf
                      ? t("admin.usersPage.cannotImpersonateSelf")
                      : isSuperAdmin
                        ? t("admin.usersPage.cannotImpersonateAdmin")
                        : u.banned
                          ? t("admin.usersPage.userBanned")
                          : undefined;

                    return (
                      <tr
                        key={u.id}
                        className="border-b border-[var(--color-border)] last:border-b-0"
                      >
                        <td className="px-4 py-2 align-top">
                          <div className="font-medium">{u.name}</div>
                          <div className="text-xs text-[var(--color-foreground-muted)]">
                            {u.email}
                          </div>
                        </td>
                        <td className="px-4 py-2 align-top">
                          {isSuperAdmin ? (
                            <Badge
                              tone="brand"
                              title={t("admin.usersPage.platformSuperAdminTitle")}
                            >
                              {t("admin.usersPage.platformSuperAdmin")}
                            </Badge>
                          ) : (
                            <span className="text-xs text-[var(--color-foreground-muted)]">
                              {t("admin.usersPage.regularUser")}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 align-top">
                          {u.propertyDeskTeam ? (
                            <div className="space-y-1">
                              <Badge
                                tone={
                                  u.propertyDeskTeam.enabled ? "info" : "warning"
                                }
                                title={t("admin.usersPage.pdBadgeTitle")}
                              >
                                {t(
                                  PD_ROLE_KEY[u.propertyDeskTeam.teamRole] ??
                                    "admin.pd.teamRole.SETTER",
                                )}
                              </Badge>
                              {!u.propertyDeskTeam.enabled ? (
                                <div className="text-xs text-[var(--color-foreground-muted)]">
                                  {t("admin.usersPage.pdInactive")}
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-4 py-2 align-top">
                          {u.memberships.length === 0 ? (
                            <span className="text-xs text-[var(--color-foreground-muted)]">
                              {t("admin.usersPage.noOrg")}
                            </span>
                          ) : (
                            <ul className="space-y-1">
                              {u.memberships.map((m) => (
                                <li
                                  key={`${u.id}-${m.organizationId}`}
                                  className="text-xs"
                                >
                                  <span className="font-medium">
                                    {m.organizationName}
                                  </span>
                                  {" · "}
                                  <span className="font-mono text-[var(--color-foreground-muted)]">
                                    {m.role}
                                  </span>
                                  {m.organizationType ? (
                                    <span className="text-[var(--color-foreground-subtle)]">
                                      {" ("}
                                      {m.organizationType === "INVESTOR"
                                        ? t("admin.investorLower")
                                        : t("admin.agencyLower")}
                                      {")"}
                                    </span>
                                  ) : null}
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                        <td className="px-4 py-2 align-top">
                          {u.banned ? (
                            <Badge tone="danger">{t("admin.usersPage.banned")}</Badge>
                          ) : u.emailVerified ? (
                            <Badge tone="success">{t("admin.usersPage.verified")}</Badge>
                          ) : (
                            <Badge tone="warning">{t("admin.usersPage.unverified")}</Badge>
                          )}
                        </td>
                        <td className="px-4 py-2 text-xs align-top">
                          {formatDate(u.createdAt)}
                        </td>
                        <td className="px-4 py-2 text-right align-top">
                          <div className="inline-flex flex-col items-end gap-1">
                            <EditUserDialog
                              user={{
                                id: u.id,
                                name: u.name,
                                email: u.email,
                                role: u.role,
                                emailVerified: u.emailVerified,
                                banned: u.banned,
                                banReason: u.banReason,
                                propertyDeskTeam: u.propertyDeskTeam,
                              }}
                            />
                            <ImpersonateButton
                              userId={u.id}
                              userName={u.name}
                              disabled={disabled}
                              disabledReason={disabledReason}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--color-foreground-muted)]">
            {t("admin.pageOf", { page, total: totalPages })}
          </span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Button asChild variant="outline" size="sm">
                <Link
                  href={{
                    pathname: "/administracija/korisnici",
                    query: { page: String(page - 1), ...listQuery },
                  }}
                >
                  {t("admin.previousPage")}
                </Link>
              </Button>
            ) : null}
            {page < totalPages ? (
              <Button asChild variant="outline" size="sm">
                <Link
                  href={{
                    pathname: "/administracija/korisnici",
                    query: { page: String(page + 1), ...listQuery },
                  }}
                >
                  {t("admin.nextPage")}
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
