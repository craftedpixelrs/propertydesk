import { redirect } from "next/navigation";

import { loadUserContext } from "@/server/auth/context";
import { requireSessionAndOrg } from "@/server/auth/session";
import {
  listMembers,
  listPendingInvitations,
} from "@/server/services/organization-admin.service";
import { MembersManager } from "@/features/settings/members-manager";
import { buildRoleCapabilityGuide } from "@/features/settings/role-capability-guide";
import {
  isPermittedWithOverrides,
  loadOverridesMap,
} from "@/server/services/permissions/role-overrides.service";

export const dynamic = "force-dynamic";

export default async function AgentiPage() {
  const ctx = await loadUserContext();
  if (!ctx) redirect("/sign-in");
  if (!ctx.activeOrganization) redirect("/podesavanja");
  if (ctx.activeOrganization.type !== "AGENCY") redirect("/dashboard");
  // Members management surface — enforce the same permission the sidebar
  // uses so that hand-typed URLs can't bypass the guard.
  if (!ctx.permissions.includes("organization.members:manage")) {
    redirect("/dashboard");
  }

  const { org } = await requireSessionAndOrg();
  const [members, invitations, overrides] = await Promise.all([
    listMembers(org.organizationId),
    listPendingInvitations(org.organizationId),
    loadOverridesMap(),
  ]);
  const roleGuide = org.organizationType
    ? buildRoleCapabilityGuide(org.organizationType, (role, permission) =>
        isPermittedWithOverrides(role, permission, overrides),
      )
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Agenti</h1>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          Članovi Vaše agencije. Dodajte i uklanjajte agente iz ove liste.
        </p>
      </div>
      <MembersManager
        organizationType={org.organizationType}
        members={members}
        invitations={invitations.map((inv) => ({
          id: inv.id,
          email: inv.email,
          role: inv.role ?? "",
          status: inv.status,
          expiresAt: inv.expiresAt,
        }))}
        roleGuide={roleGuide}
        currentUserId={ctx.user.id}
      />
    </div>
  );
}
