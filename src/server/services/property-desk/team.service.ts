import "server-only";

import type {
  Prisma,
  PropertyDeskLeadScope,
  PropertyDeskTeamMember,
  PropertyDeskTeamRole,
} from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { DomainError } from "@/lib/errors";
import { recordAudit } from "@/server/audit/audit";
import { invalidatePropertyDeskTeamCache } from "@/server/permissions/property-desk";

/**
 * Domain service for the Property Desk internal team.
 *
 * All mutations record an audit entry. The in-process team cache used by
 * `requirePropertyDeskAccess` is invalidated after every write.
 */

export interface TeamMemberWithUser {
  id: string;
  userId: string;
  teamRole: PropertyDeskTeamRole;
  enabled: boolean;
  leadScope: PropertyDeskLeadScope;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdByUserId: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
}

export async function listTeamMembers(): Promise<TeamMemberWithUser[]> {
  const rows = await prisma.propertyDeskTeamMember.findMany({
    orderBy: [{ enabled: "desc" }, { teamRole: "asc" }, { createdAt: "asc" }],
    include: {
      user: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
  });
  return rows;
}

export interface AddTeamMemberInput {
  userId: string;
  teamRole: PropertyDeskTeamRole;
  leadScope?: PropertyDeskLeadScope;
  notes?: string | null;
}

export async function addTeamMember(
  input: AddTeamMemberInput,
  actorUserId: string,
): Promise<PropertyDeskTeamMember> {
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { id: true, email: true, name: true },
  });
  if (!user) {
    throw new DomainError("NOT_FOUND", "Korisnik ne postoji.");
  }

  const existing = await prisma.propertyDeskTeamMember.findUnique({
    where: { userId: input.userId },
  });
  if (existing) {
    throw new DomainError(
      "CONFLICT",
      "Korisnik je već član Property Desk tima.",
    );
  }

  const member = await prisma.propertyDeskTeamMember.create({
    data: {
      userId: input.userId,
      teamRole: input.teamRole,
      leadScope: input.leadScope ?? "OWN_AND_UNASSIGNED",
      notes: input.notes ?? null,
      enabled: true,
      createdByUserId: actorUserId,
    },
  });
  invalidatePropertyDeskTeamCache(input.userId);

  await recordAudit({
    action: "property_desk_team.member_added",
    entityType: "PropertyDeskTeamMember",
    entityId: member.id,
    actorUserId,
    newValues: {
      userId: member.userId,
      teamRole: member.teamRole,
      leadScope: member.leadScope,
      enabled: member.enabled,
    },
  });

  return member;
}

export interface UpdateTeamMemberInput {
  teamRole?: PropertyDeskTeamRole;
  leadScope?: PropertyDeskLeadScope;
  enabled?: boolean;
  notes?: string | null;
}

export async function updateTeamMember(
  id: string,
  input: UpdateTeamMemberInput,
  actorUserId: string,
): Promise<PropertyDeskTeamMember> {
  const existing = await prisma.propertyDeskTeamMember.findUnique({
    where: { id },
  });
  if (!existing) {
    throw new DomainError("NOT_FOUND", "Član tima ne postoji.");
  }

  const data: Prisma.PropertyDeskTeamMemberUpdateInput = {};
  if (input.teamRole !== undefined) data.teamRole = input.teamRole;
  if (input.leadScope !== undefined) data.leadScope = input.leadScope;
  if (input.enabled !== undefined) data.enabled = input.enabled;
  if (input.notes !== undefined) data.notes = input.notes;

  const member = await prisma.propertyDeskTeamMember.update({
    where: { id },
    data,
  });
  invalidatePropertyDeskTeamCache(member.userId);

  await recordAudit({
    action: "property_desk_team.member_updated",
    entityType: "PropertyDeskTeamMember",
    entityId: member.id,
    actorUserId,
    previousValues: {
      teamRole: existing.teamRole,
      leadScope: existing.leadScope,
      enabled: existing.enabled,
      notes: existing.notes,
    },
    newValues: {
      teamRole: member.teamRole,
      leadScope: member.leadScope,
      enabled: member.enabled,
      notes: member.notes,
    },
  });

  return member;
}

export async function removeTeamMember(
  id: string,
  actorUserId: string,
): Promise<void> {
  const existing = await prisma.propertyDeskTeamMember.findUnique({
    where: { id },
  });
  if (!existing) {
    throw new DomainError("NOT_FOUND", "Član tima ne postoji.");
  }

  await prisma.propertyDeskTeamMember.delete({ where: { id } });
  invalidatePropertyDeskTeamCache(existing.userId);

  await recordAudit({
    action: "property_desk_team.member_removed",
    entityType: "PropertyDeskTeamMember",
    entityId: id,
    actorUserId,
    previousValues: {
      userId: existing.userId,
      teamRole: existing.teamRole,
      leadScope: existing.leadScope,
      enabled: existing.enabled,
    },
  });
}

/**
 * Helper for team-management UIs: users who could be added to the team
 * (i.e. not yet a Property Desk member). Only returns the platform-visible
 * shape needed by a picker.
 */
export async function listAddablePlatformUsers(): Promise<
  Array<{ id: string; name: string; email: string }>
> {
  const rows = await prisma.user.findMany({
    where: {
      propertyDeskTeam: null,
      deactivatedAt: null,
    },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
    take: 200,
  });
  return rows;
}
