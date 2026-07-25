import { requireSuperAdmin } from "@/server/permissions/require";
import { getRoleMatrix } from "@/server/services/permissions/role-overrides.service";
import { permissionStatement } from "@/server/permissions/access-control";
import { RoleMatrixEditor } from "@/features/platform-admin/role-matrix-editor";

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

  // Group permissions by resource for a compact, scannable table.
  const groups: { resource: string; permissions: string[] }[] = [];
  for (const [resource, actions] of Object.entries(permissionStatement)) {
    groups.push({
      resource,
      permissions: actions.map((a) => `${resource}.${a}`),
    });
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Uređivač rola i dozvola</h2>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          Podrazumevane dozvole dolaze iz koda (fajl <code>roles.ts</code>). Ovde
          možete da uključite/isključite pojedinačne dozvole po roli. Sve
          promene se pamte u bazi kao „override&quot; i mogu se u svakom
          trenutku vratiti na podrazumevano. Ako ne diraš ništa, ponašanje
          ostaje kao dosad.
        </p>
        <ul className="mt-3 space-y-1 text-xs text-[var(--color-foreground-muted)]">
          <li>
            <span className="mr-1 inline-block size-2 rounded-full bg-emerald-500 align-middle" />
            Dozvoljeno (podrazumevano)
          </li>
          <li>
            <span className="mr-1 inline-block size-2 rounded-full bg-neutral-300 align-middle" />
            Zabranjeno (podrazumevano)
          </li>
          <li>
            <span className="mr-1 inline-block size-2 rounded-full bg-emerald-500 align-middle" />
            <span className="ml-1 mr-1 inline-block size-1.5 rounded-full bg-amber-500 align-middle" />
            Ručno postavljeno (override) — možeš vratiti na podrazumevano.
          </li>
          <li>
            SUPER_ADMIN uvek zadržava <code>platform.*</code> dozvole (ne
            mogu se skinuti da bi konzola ostala dostupna).
          </li>
        </ul>
      </div>

      <RoleMatrixEditor matrix={matrix} groups={groups} />
    </section>
  );
}
