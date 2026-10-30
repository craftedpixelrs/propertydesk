import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import {
  createBuildingNotice,
  listBuildingNotices,
} from "@/server/services/manager/notices.service";

const CHANNEL = z.enum(["PORTAL_ONLY", "PORTAL_AND_EMAIL", "EMAIL_ONLY"]);
const AUDIENCE = z.enum(["ALL", "BY_ENTRANCE", "BY_UNIT_TYPE", "SPECIFIC_UNITS"]);
const UNIT_TYPE = z.enum([
  "APARTMENT",
  "COMMERCIAL",
  "GARAGE",
  "PARKING_SPACE",
  "STORAGE",
  "OFFICE",
  "OTHER",
]);

const createSchema = z.object({
  buildingId: z.string().min(1),
  title: z.string().trim().min(2).max(200),
  body: z.string().trim().min(2).max(10000),
  channel: CHANNEL.optional(),
  audience: AUDIENCE.optional(),
  audienceParams: z
    .object({
      entranceIds: z.array(z.string()).optional(),
      unitTypes: z.array(UNIT_TYPE).optional(),
      unitIds: z.array(z.string()).optional(),
    })
    .optional(),
  publishNow: z.boolean().optional(),
});

export const GET = apiHandler({}, async ({ searchParams }) => {
  const ctx = await requirePermission("notice.read");
  const buildingId = searchParams.get("buildingId") ?? undefined;
  const publishedOnly = searchParams.get("published") === "true";
  const rows = await listBuildingNotices({
    organizationId: ctx.organization.organizationId,
    buildingId,
    publishedOnly,
  });
  return { data: rows };
});

export const POST = apiHandler({ bodySchema: createSchema }, async ({ body }) => {
  const ctx = await requirePermission("notice.manage");
  const notice = await createBuildingNotice({
    organizationId: ctx.organization.organizationId,
    actorUserId: ctx.session.user.id,
    ...body,
  });
  return { data: notice, status: 201 };
});

/**
 * @swagger
 * /api/v1/manager/notices:
 *   get:
 *     tags: [manager]
 *     summary: List building notices
 *     description: |
 *       **Auth:** `requirePermission("notice.read")`
 *   post:
 *     tags: [manager]
 *     summary: Create (optionally publish) a building notice
 *     description: |
 *       **Auth:** `requirePermission("notice.manage")`
 */
