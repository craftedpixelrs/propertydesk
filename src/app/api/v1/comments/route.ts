import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { ApiError } from "@/lib/api/errors";
import { requirePermission } from "@/server/permissions/require";
import {
  createComment,
  listComments,
} from "@/server/services/comments/comments.service";
import type { PermissionString } from "@/server/permissions/access-control";

const entityTypeSchema = z.enum(["Buyer", "Sale"]);

function permissionForEntity(entityType: "Buyer" | "Sale"): PermissionString {
  return entityType === "Buyer" ? "buyer.read" : "sale.read";
}

export const GET = apiHandler({}, async ({ req }) => {
  const entityType = req.nextUrl.searchParams.get("entityType");
  const entityId = req.nextUrl.searchParams.get("entityId");
  const parsedType = entityTypeSchema.safeParse(entityType);
  if (!parsedType.success || !entityId) {
    throw new ApiError("VALIDATION_ERROR", "Nedostaju parametri komentara.");
  }
  const ctx = await requirePermission(permissionForEntity(parsedType.data));
  const items = await listComments({
    organizationId: ctx.organization.organizationId,
    entityType: parsedType.data,
    entityId,
  });
  return { data: { items } };
});

const createSchema = z.object({
  entityType: entityTypeSchema,
  entityId: z.string().min(1).max(64),
  body: z.string().min(1).max(4000),
  parentId: z.string().min(1).max(64).optional().nullable(),
});

export const POST = apiHandler(
  { bodySchema: createSchema },
  async ({ body }) => {
    const ctx = await requirePermission(permissionForEntity(body.entityType));
    const created = await createComment({
      organizationId: ctx.organization.organizationId,
      actorUserId: ctx.session.user.id,
      entityType: body.entityType,
      entityId: body.entityId,
      body: body.body,
      parentId: body.parentId ?? null,
    });
    return { data: created, status: 201 };
  },
);
