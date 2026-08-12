import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import {
  createShareLink,
  listShareLinksForEntity,
} from "@/server/services/sharing/share-links.service";

const paramsSchema = z.object({ id: z.string().min(1) });

const createBody = z.object({
  showPrice: z.boolean().optional(),
  expiresAt: z.coerce.date().nullable().optional(),
});

/**
 * Create a public-share link for a single unit. Investor callers can
 * share their own units; agency callers can share only units that
 * they can already see via `offer.service`. The service enforces the
 * visibility check — the API layer only does permission gating.
 */
export const POST = apiHandler(
  { paramsSchema, bodySchema: createBody },
  async ({ params, body }) => {
    const ctx = await requirePermission("inventory.read");
    const orgType = ctx.organization.organizationType ?? "INVESTOR";
    const link = await createShareLink({
      organizationId: ctx.organization.organizationId,
      organizationType: orgType,
      actorUserId: ctx.session.user.id,
      entityType: "Unit",
      entityId: params.id,
      showPrice: body.showPrice,
      expiresAt: body.expiresAt,
    });
    return {
      data: {
        id: link.id,
        token: link.token,
        showPrice: link.showPrice,
        expiresAt: link.expiresAt,
        createdAt: link.createdAt,
        publicUrl: `/p/${link.token}`,
      },
      status: 201,
    };
  },
);

/**
 * List active + past share-links for a unit. Used to render the
 * "Aktivni linkovi" panel on the unit detail page.
 */
export const GET = apiHandler({ paramsSchema }, async ({ params }) => {
  const ctx = await requirePermission("inventory.read");
  const links = await listShareLinksForEntity({
    organizationId: ctx.organization.organizationId,
    entityType: "Unit",
    entityId: params.id,
  });
  return {
    data: links.map((l) => ({
      id: l.id,
      token: l.token,
      showPrice: l.showPrice,
      expiresAt: l.expiresAt,
      revokedAt: l.revokedAt,
      viewCount: l.viewCount,
      lastViewedAt: l.lastViewedAt,
      createdAt: l.createdAt,
      publicUrl: `/p/${l.token}`,
    })),
  };
});

/**
 * @swagger
 * /api/v1/units/{id}/share:
 *   get:
 *     tags:
 *       - units
 *     summary: List / read units
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
 *   post:
 *     tags:
 *       - units
 *     summary: Create units
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
 */
