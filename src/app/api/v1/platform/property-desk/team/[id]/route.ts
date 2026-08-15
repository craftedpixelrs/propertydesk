import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { AuthError } from "@/server/auth/session";
import {
  hasPdPermission,
  requirePdPermission,
  requirePropertyDeskAccess,
} from "@/server/permissions/property-desk";
import {
  removeTeamMember,
  updateTeamMember,
} from "@/server/services/property-desk/team.service";

const paramsSchema = z.object({ id: z.string().min(1) });

const patchBody = z.object({
  teamRole: z
    .enum(["SETTER", "CLOSER", "OPERATIONS", "MANAGER"])
    .optional(),
  leadScope: z
    .enum(["OWN", "OWN_AND_UNASSIGNED", "TEAM", "ALL"])
    .optional(),
  enabled: z.boolean().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

/**
 * PATCH /api/v1/platform/property-desk/team/{id}
 *
 * SUPER_ADMIN — any change.
 * MANAGER     — `enabled`, `leadScope`, `notes`. Changing `teamRole` is
 *               reserved for SUPER_ADMIN so a MANAGER cannot self-promote or
 *               promote another manager.
 */
export const PATCH = apiHandler(
  { paramsSchema, bodySchema: patchBody },
  async ({ params, body }) => {
    const ctx = await requirePropertyDeskAccess();

    // The three field groups map to three separate permissions so that
    // SUPER_ADMIN can rebind them independently through the admin console.
    if (body.teamRole !== undefined) {
      if (!(await hasPdPermission(ctx, "pd_team.manage_role"))) {
        throw new AuthError(
          "FORBIDDEN",
          "Nemate dozvolu za promenu uloge člana tima.",
        );
      }
    }
    if (body.leadScope !== undefined) {
      if (!(await hasPdPermission(ctx, "pd_team.manage_scope"))) {
        throw new AuthError(
          "FORBIDDEN",
          "Nemate dozvolu za promenu opsega lead-ova člana tima.",
        );
      }
    }
    if (body.enabled !== undefined) {
      if (!(await hasPdPermission(ctx, "pd_team.disable"))) {
        throw new AuthError(
          "FORBIDDEN",
          "Nemate dozvolu za deaktivaciju člana tima.",
        );
      }
    }
    if (
      body.notes !== undefined &&
      body.teamRole === undefined &&
      body.leadScope === undefined &&
      body.enabled === undefined
    ) {
      // Purely a notes edit — allow anyone that can view the team.
      await requirePdPermission(ctx, "pd_team.view");
    }

    const member = await updateTeamMember(
      params.id,
      body,
      ctx.session.user.id,
    );
    return { data: member };
  },
);

export const DELETE = apiHandler({ paramsSchema }, async ({ params }) => {
  const access = await requirePropertyDeskAccess();
  const ctx = await requirePdPermission(access, "pd_team.add_member");
  await removeTeamMember(params.id, ctx.session.user.id);
  return { data: { ok: true } };
});

/**
 * @swagger
 * /api/v1/platform/property-desk/team/{id}:
 *   patch:
 *     tags:
 *       - platform-property-desk
 *     summary: Ažuriraj člana Property Desk tima
 *     description: |
 *       **Auth:** `requirePropertyDeskAccess()` plus field-level:
 *       - `teamRole` polje traži `pd_team.manage_role`
 *       - `leadScope` polje traži `pd_team.manage_scope`
 *       - `enabled` polje traži `pd_team.disable`
 *       - `notes` (bez ostalih polja) traži `pd_team.view`
 *
 *       Po default-u sve gore su SUPER_ADMIN, ali se mogu delegirati kroz
 *       /administracija/role.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *     responses:
 *       "200":
 *         description: OK
 *       "401":
 *         $ref: "#/components/responses/Unauthenticated"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 *   delete:
 *     tags:
 *       - platform-property-desk
 *     summary: Ukloni člana Property Desk tima
 *     description: |
 *       **Auth:** `requirePropertyDeskAccess() + pd_team.add_member` (default: SUPER_ADMIN).
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       "200":
 *         description: OK
 *       "401":
 *         $ref: "#/components/responses/Unauthenticated"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 */
