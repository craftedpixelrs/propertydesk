import { z } from "zod";
import type { AgencyBuyerRegistrationStatus, Prisma } from "@prisma/client";

import { apiHandler } from "@/lib/api/handler";
import { paginate } from "@/lib/api/query";
import { prisma } from "@/server/db/prisma";
import { requirePermission } from "@/server/permissions/require";
import { registerAgencyBuyer } from "@/server/services/agencies/registrations.service";
import { enforceRateLimit } from "@/server/rate-limit/enforce";
import { DomainErrors } from "@/lib/errors";

const bodySchema = z.object({
  projectId: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().min(3),
  email: z.string().email().optional(),
  secondaryPhone: z.string().min(3).optional(),
});

const STATUSES = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "EXPIRED",
  "CONVERTED",
  "CANCELED",
  "CONFLICT_REVIEW",
] as const;

function parseStatuses(raw: string | null): AgencyBuyerRegistrationStatus[] | undefined {
  if (!raw) return undefined;
  const values = raw
    .split(",")
    .map((v) => v.trim().toUpperCase())
    .filter(Boolean);
  const filtered = values.filter((v): v is AgencyBuyerRegistrationStatus =>
    (STATUSES as readonly string[]).includes(v),
  );
  return filtered.length > 0 ? filtered : undefined;
}

export const GET = apiHandler({}, async ({ query, searchParams }) => {
  const ctx = await requirePermission("agency.read");
  if (ctx.organization.organizationType !== "AGENCY") {
    throw DomainErrors.forbidden("Ovaj portal je namenjen agencijskim organizacijama.");
  }
  const status = parseStatuses(searchParams.get("status"));
  const where: Prisma.AgencyBuyerRegistrationWhereInput = {
    agencyOrganizationId: ctx.organization.organizationId,
    ...(status ? { status: { in: status } } : {}),
  };
  const [total, rows] = await Promise.all([
    prisma.agencyBuyerRegistration.count({ where }),
    prisma.agencyBuyerRegistration.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: {
        buyer: {
          select: { id: true, firstName: true, lastName: true, phone: true, email: true },
        },
        project: { select: { id: true, name: true } },
      },
    }),
  ]);
  const { items: pageItems, pagination } = paginate(rows, query.page, query.pageSize, total);
  return { data: pageItems, meta: { pagination } };
});

export const POST = apiHandler({ bodySchema }, async ({ req, body }) => {
  const ctx = await requirePermission("agency.customer:register");
  if (ctx.organization.organizationType !== "AGENCY") {
    throw DomainErrors.forbidden("Ovaj portal je namenjen agencijskim organizacijama.");
  }
  enforceRateLimit({
    req,
    scope: "agency.buyer.register",
    callerId: ctx.session.user.id,
    options: { max: 20, windowMs: 60_000 },
  });
  const result = await registerAgencyBuyer({
    agencyOrganizationId: ctx.organization.organizationId,
    actorUserId: ctx.session.user.id,
    projectId: body.projectId,
    buyer: {
      firstName: body.firstName,
      lastName: body.lastName,
      phone: body.phone,
      email: body.email ?? null,
      secondaryPhone: body.secondaryPhone ?? null,
    },
  });
  return { data: result, status: 201 };
});

/**
 * @swagger
 * /api/v1/agency/registrations:
 *   get:
 *     tags:
 *       - agency
 *     summary: List / read agency
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
 *       - agency
 *     summary: Create agency
 *     description: |
 *       **Auth:** `requirePermission("agency.customer:register") + requirePermission("agency.read")`
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
