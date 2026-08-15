import { z } from "zod";
import type { AgencyConnectionStatus } from "@prisma/client";

import { apiHandler } from "@/lib/api/handler";
import { paginate } from "@/lib/api/query";
import { requirePermission } from "@/server/permissions/require";
import {
  inviteAgency,
  listConnections,
} from "@/server/services/agencies/agencies.service";

const inviteSchema = z.object({
  agencyOrganizationId: z.string().min(1),
  defaultProtectionDays: z.number().int().min(0).max(365).optional(),
  notes: z.string().max(2000).optional(),
});

const STATUSES = ["INVITED", "ACTIVE", "SUSPENDED", "REJECTED", "TERMINATED"] as const;

function parseStatuses(raw: string | null): AgencyConnectionStatus[] | undefined {
  if (!raw) return undefined;
  const values = raw
    .split(",")
    .map((v) => v.trim().toUpperCase())
    .filter(Boolean);
  const filtered = values.filter((v): v is AgencyConnectionStatus =>
    (STATUSES as readonly string[]).includes(v),
  );
  return filtered.length > 0 ? filtered : undefined;
}

export const GET = apiHandler({}, async ({ query, searchParams }) => {
  const ctx = await requirePermission("agency.read");
  const { items, total } = await listConnections({
    organizationId: ctx.organization.organizationId,
    role: ctx.organization.organizationType === "AGENCY" ? "AGENCY" : "INVESTOR",
    status: parseStatuses(searchParams.get("status")),
    page: query.page,
    pageSize: query.pageSize,
  });
  const { items: pageItems, pagination } = paginate(items, query.page, query.pageSize, total);
  return { data: pageItems, meta: { pagination } };
});

export const POST = apiHandler({ bodySchema: inviteSchema }, async ({ body }) => {
  const ctx = await requirePermission("agency.manage");
  const connection = await inviteAgency({
    investorOrganizationId: ctx.organization.organizationId,
    actorUserId: ctx.session.user.id,
    agencyOrganizationId: body.agencyOrganizationId,
    defaultProtectionDays: body.defaultProtectionDays,
    notes: body.notes ?? null,
  });
  return { data: connection, status: 201 };
});

/**
 * @swagger
 * /api/v1/agencies:
 *   get:
 *     tags:
 *       - agencies
 *     summary: List / read agencies
 *     description: |
 *       **Auth:** `requirePermission("agency.read")`
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
 *       - agencies
 *     summary: Create agencies
 *     description: |
 *       **Auth:** `requirePermission("agency.manage") + requirePermission("agency.read")`
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
