import { requireSuperAdmin } from "@/server/permissions/require";
import { getRoleMatrix } from "@/server/services/permissions/role-overrides.service";
import { permissionStatement } from "@/server/permissions/access-control";
import { RoleMatrixEditor } from "@/features/platform-admin/role-matrix-editor";
import { createT } from "@/lib/i18n";
import { resolveRequestLocale } from "@/lib/i18n/resolve-locale";

/**
 * Role & permission matrix. Every cell in the grid shows whether a given
 * role currently has a given permission. SUPER_ADMIN can flip any cell
 * away from its compile-time default; a dot marks any cell that carries
 * an override, and there is a "Vrati na podrazumevano" affordance both
 * per-cell and per-role.
 */
export default async function RolesAdminPage() {
  await requireSuperAdmin();
  const matrix = await getRoleMatrix();
  const t = createT(await resolveRequestLocale());

  // Group permissions by resource for a compact, scannable table.
  const groups: { resource: string; permissions: string[] }[] = [];
  for (const [resource, actions] of Object.entries(permissionStatement)) {
    groups.push({
      resource,
      permissions: actions.map((a) => `${resource}.${a}`),
    });
  }

  return (
    <section className="space-y-6">
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">{t("admin.rolesPage.title")}</h2>
          <p className="text-sm text-[var(--color-foreground-muted)]">
            {t("admin.rolesPage.intro1")}
          </p>
          <p className="text-sm text-[var(--color-foreground-muted)]">
            {t("admin.rolesPage.intro2")}
          </p>
          <ul className="mt-3 space-y-1 text-xs text-[var(--color-foreground-muted)]">
            <li>
              <span className="mr-1 inline-block size-2 rounded-full bg-emerald-500 align-middle" />
              {t("admin.rolesPage.legendAllowed")}
            </li>
            <li>
              <span className="mr-1 inline-block size-2 rounded-full bg-neutral-300 align-middle" />
              {t("admin.rolesPage.legendDenied")}
            </li>
            <li>
              <span className="mr-1 inline-block size-2 rounded-full bg-emerald-500 align-middle" />
              <span className="ml-1 mr-1 inline-block size-1.5 rounded-full bg-amber-500 align-middle" />
              {t("admin.rolesPage.legendOverride")}
            </li>
            <li>{t("admin.rolesPage.legendSuperAdmin")}</li>
            <li>
              {t("admin.rolesPage.legendPd")}{" "}
              <a
                href="/administracija/property-desk/tim"
                className="underline decoration-dotted hover:no-underline"
              >
                {t("admin.rolesPage.pdTeamLink")}
              </a>
            </li>
          </ul>
        </div>

        <RoleMatrixEditor matrix={matrix} groups={groups} />
      </div>
    </section>
  );
}
