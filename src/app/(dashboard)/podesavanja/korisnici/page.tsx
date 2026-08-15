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

export default async function MembersPage() {
  const ctx = await loadUserContext();
  if (!ctx) redirect("/sign-in");
  if (!ctx.activeOrganization) redirect("/dashboard");
  if (!ctx.permissions.includes("organization.members:manage")) {
    redirect("/podesavanja/organizacija");
  }
  try {
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
    );
  } catch {
    redirect("/dashboard");
  }
}
