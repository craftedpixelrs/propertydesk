import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { DomainErrors } from "@/lib/errors";
import { requireSuperAdmin } from "@/server/permissions/require";
import {
  setRolePermission,
  ALL_ROLE_NAMES,
  ALL_PERMISSIONS,
} from "@/server/services/permissions/role-overrides.service";

const paramsSchema = z.object({ role: z.string().min(1) });

const changeSchema = z.object({
  permission: z.string().min(1),
  /**
   * `true` — force grant, `false` — force revoke, `"default"` — clear the
   * override so the compile-time default applies again.
   */
  granted: z.union([z.boolean(), z.literal("default")]),
  reason: z.string().max(500).optional().nullable(),
});

const patchSchema = z.object({
  changes: z.array(changeSchema).min(1).max(200),
});

/**
 * PATCH /api/v1/platform/roles/{role}
 *
 * Bulk-apply a set of `{permission, granted}` toggles to a single role.
 * Idempotent: passing `granted: "default"` clears an override; the same
 * boolean twice in a row leaves the DB unchanged. Audit rows are still
 * emitted so every button click is captured.
 */
export const PATCH = apiHandler(
  { paramsSchema, bodySchema: patchSchema },
  async ({ params, body }) => {
    const ctx = await requireSuperAdmin();

    if (!(ALL_ROLE_NAMES as string[]).includes(params.role)) {
      throw DomainErrors.badRequest(`Nepoznata rola: ${params.role}`);
    }

    const invalid = body.changes.find(
      (c) => !(ALL_PERMISSIONS as string[]).includes(c.permission),
    );
    if (invalid) {
      throw DomainErrors.badRequest(`Nepoznata dozvola: ${invalid.permission}`);
    }

    let applied = 0;
    for (const c of body.changes) {
      await setRolePermission({
        role: params.role,
        permission: c.permission,
        granted: c.granted,
        reason: c.reason ?? null,
        actorUserId: ctx.session.user.id,
      });
      applied += 1;
    }

    return { data: { applied } };
  },
);
