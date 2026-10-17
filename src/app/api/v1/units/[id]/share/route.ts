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
  expiresInDays: z.number().int().min(1).max(365).nullable().optional(),
  forBuyerId: z.string().min(1).nullable().optional(),
  forBuyerName: z.string().trim().min(2).max(120),
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
      expiresInDays: body.expiresInDays,
      forBuyerId: body.forBuyerId,
      forBuyerName: body.forBuyerName,
    });
    return {
      data: {
        id: link.id,
        token: link.token,
        showPrice: link.showPrice,
        expiresAt: link.expiresAt?.toISOString() ?? null,
        revokedAt: link.revokedAt?.toISOString() ?? null,
        viewCount: link.viewCount,
        lastViewedAt: link.lastViewedAt?.toISOString() ?? null,
        createdAt: link.createdAt.toISOString(),
        forBuyerId: link.forBuyerId,
        forBuyerName: link.forBuyerName,
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
      expiresAt: l.expiresAt?.toISOString() ?? null,
      revokedAt: l.revokedAt?.toISOString() ?? null,
      viewCount: l.viewCount,
      lastViewedAt: l.lastViewedAt?.toISOString() ?? null,
      createdAt: l.createdAt.toISOString(),
      forBuyerId: l.forBuyerId,
      forBuyerName:
        l.forBuyerName ?? (l.forBuyer ? `${l.forBuyer.firstName} ${l.forBuyer.lastName}` : null),
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
 *     description: |
 *       **Auth:** `requirePermission("inventory.read")`
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       "200":
 *         description: |
 *           OK
 *       "401":
 *         $ref: "#/components/responses/Unauthenticated"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 *   post:
 *     tags:
 *       - units
 *     summary: Create units
 *     description: |
 *       **Auth:** `requirePermission("inventory.read")`
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
 *         description: |
 *           OK
 *       "401":
 *         $ref: "#/components/responses/Unauthenticated"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 */
