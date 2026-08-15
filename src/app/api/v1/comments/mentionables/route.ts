import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { listMembers } from "@/server/services/organization-admin.service";

/**
 * Returns the list of users the current caller can mention in comments.
 *
 * Scoped to the caller's active organization and filtered to active
 * (non-deactivated) members. `buyer.read` is used as the gate because
 * every commenter must be able to view either a buyer or a sale, and
 * `buyer.read` is granted to every role that can see either.
 */
export const GET = apiHandler({}, async () => {
  const ctx = await requirePermission("buyer.read").catch(() =>
    requirePermission("sale.read"),
  );
  const members = await listMembers(ctx.organization.organizationId);
  const items = members
    .filter((m) => !m.deactivatedAt)
    .map((m) => ({
      id: m.userId,
      name: m.name,
      email: m.email,
    }));
  return { data: { items } };
});

/**
 * @swagger
 * /api/v1/comments/mentionables:
 *   get:
 *     tags:
 *       - comments
 *     summary: List / read comments
 *     description: |
 *       **Auth:** `requirePermission("buyer.read") + requirePermission("sale.read")`
 *     responses:
 *       "200":
 *         description: |
 *           OK
 *       "401":
 *         $ref: "#/components/responses/Unauthenticated"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 */
