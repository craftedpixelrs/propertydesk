import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requirePropertyDeskAccess } from "@/server/permissions/property-desk";
import {
  listAddablePlatformUsers,
  listTeamMembers,
  type TeamMemberWithUser,
} from "@/server/services/property-desk/team.service";

import { PropertyDeskTeamManager } from "./manager";

export const dynamic = "force-dynamic";

/**
 * Property Desk team management page.
 *
 * SUPER_ADMIN and MANAGER can view the list. SUPER_ADMIN can add / remove /
 * change roles; MANAGER can toggle `enabled` and change `leadScope` on
 * existing members but cannot promote/demote roles.
 */
export default async function PropertyDeskTeamPage() {
  const ctx = await requirePropertyDeskAccess();
  const canManage =
    ctx.isSuperAdmin || ctx.teamMember.teamRole === "MANAGER";
  if (!canManage) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-[var(--color-foreground-muted)]">
          Nemate ovlašćenje da vidite listu Property Desk tima.
        </CardContent>
      </Card>
    );
  }

  const members = await listTeamMembers();
  const addable = ctx.isSuperAdmin ? await listAddablePlatformUsers() : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Property Desk tim</h2>
          <p className="text-sm text-[var(--color-foreground-muted)]">
            Interni tim za marketing i prodaju samog PropertyDesk SaaS
            proizvoda. Ovo NIJE lista korisnika nekog tenanta — ovi članovi
            rade na platformi. Novi nalog se pravi na{" "}
            <a
              href="/administracija/korisnici"
              className="underline decoration-dotted hover:no-underline"
            >
              Administracija → Korisnici
            </a>
            {" "}(Dodaj korisnika), pa se ovde doda u tim.
          </p>
        </div>
        <Badge tone="info">Sloj C — Property Desk (internal team)</Badge>
      </div>

      <PropertyDeskTeamManager
        isSuperAdmin={ctx.isSuperAdmin}
        currentUserId={ctx.session.user.id}
        initialMembers={serializeMembers(members)}
        addableUsers={addable}
      />
    </div>
  );
}

function serializeMembers(members: TeamMemberWithUser[]) {
  return members.map((m) => ({
    id: m.id,
    userId: m.userId,
    teamRole: m.teamRole,
    leadScope: m.leadScope,
    enabled: m.enabled,
    notes: m.notes,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
    user: m.user,
  }));
}
