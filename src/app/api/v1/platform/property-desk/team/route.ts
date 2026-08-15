import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { AuthError } from "@/server/auth/session";
import {
  hasPdPermission,
  requirePdPermission,
  requirePropertyDeskAccess,
} from "@/server/permissions/property-desk";
import {
  addTeamMember,
  listAddablePlatformUsers,
  listTeamMembers,
} from "@/server/services/property-desk/team.service";

const createBody = z.object({
  userId: z.string().min(1),
  teamRole: z.enum(["SETTER", "CLOSER", "OPERATIONS", "MANAGER"]),
  leadScope: z
    .enum(["OWN", "OWN_AND_UNASSIGNED", "TEAM", "ALL"])
    .optional(),
  notes: z.string().max(1000).optional().nullable(),
});

/**
 * GET  — list all Property Desk team members. Requires MANAGER or SUPER_ADMIN.
 * POST — add a user to the team. Requires SUPER_ADMIN.
 *
 * Also supports `?addable=1` for the picker on the Add-member form; that
 * variant returns users who could be added (i.e. no team row yet).
 */

export const GET = apiHandler({}, async ({ searchParams }) => {
  const ctx = await requirePropertyDeskAccess();

  if (searchParams.get("addable") === "1") {
    // The picker for `Add member` is only useful for callers that hold
    // `pd_team.add_member`. By default that's SUPER_ADMIN only.
    if (!(await hasPdPermission(ctx, "pd_team.add_member"))) {
      throw new AuthError(
        "FORBIDDEN",
        "Nemate dozvolu za dodavanje članova tima.",
      );
    }
    const users = await listAddablePlatformUsers();
    return { data: users };
  }

  await requirePdPermission(ctx, "pd_team.view");
  const members = await listTeamMembers();
  return { data: members };
});

export const POST = apiHandler(
  { bodySchema: createBody },
  async ({ body }) => {
    const access = await requirePropertyDeskAccess();
    const ctx = await requirePdPermission(access, "pd_team.add_member");
    const member = await addTeamMember(body, ctx.session.user.id);
    return { data: member, status: 201 };
  },
);

/**
 * @swagger
 * /api/v1/platform/property-desk/team:
 *   get:
 *     tags:
 *       - platform-property-desk
 *     summary: Lista članova Property Desk internog tima
 *     description: |
 *       **Auth:** `requirePropertyDeskAccess() + pd_team.view`
 *
 *       Sa `?addable=1` vraća korisnike koji još nisu u timu — dostupno
 *       samo pozivaocu sa `pd_team.add_member` (default: SUPER_ADMIN).
 *     responses:
 *       "200":
 *         description: OK
 *       "401":
 *         $ref: "#/components/responses/Unauthenticated"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 *   post:
 *     tags:
 *       - platform-property-desk
 *     summary: Dodaj korisnika u Property Desk tim
 *     description: |
 *       **Auth:** `requirePropertyDeskAccess() + pd_team.add_member` (default: SUPER_ADMIN).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *     responses:
 *       "201":
 *         description: Kreirano
 *       "401":
 *         $ref: "#/components/responses/Unauthenticated"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 *       "409":
 *         description: Korisnik je već u timu
 */
