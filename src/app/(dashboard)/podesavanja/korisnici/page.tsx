import { redirect } from "next/navigation";
import { loadUserContext } from "@/server/auth/context";
import { requireSessionAndOrg } from "@/server/auth/session";
import {
  listMembers,
  listPendingInvitations,
} from "@/server/services/organization-admin.service";
import { MembersManager } from "@/features/settings/members-manager";

export default async function MembersPage() {
  const ctx = await loadUserContext();
  if (!ctx) redirect("/sign-in");
  if (!ctx.activeOrganization) redirect("/dashboard");
  if (!ctx.permissions.includes("organization.members:manage")) {
    redirect("/podesavanja/organizacija");
  }
  try {
    const { org } = await requireSessionAndOrg();
    const [members, invitations] = await Promise.all([
      listMembers(org.organizationId),
      listPendingInvitations(org.organizationId),
    ]);
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
      />
    );
  } catch {
    redirect("/dashboard");
  }
}
