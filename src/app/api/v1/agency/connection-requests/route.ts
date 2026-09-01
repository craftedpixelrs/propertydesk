import { z } from "zod";
import type { AgencyConnectionRequestStatus } from "@prisma/client";

import { apiHandler } from "@/lib/api/handler";
import { DomainErrors } from "@/lib/errors";
import { requirePermission } from "@/server/permissions/require";
import {
  createConnectionRequest,
  listConnectionRequests,
} from "@/server/services/agencies/connection-request.service";

const STATUSES = ["PENDING", "ACCEPTED", "REJECTED", "CANCELED"] as const;

const createSchema = z.object({
  investorOrganizationId: z.string().min(1),
  projectId: z.string().min(1).optional().nullable(),
  message: z.string().max(2000).optional().nullable(),
});

function parseStatuses(raw: string | null): AgencyConnectionRequestStatus[] | undefined {
  if (!raw) return undefined;
  const values = raw.split(",").map((v) => v.trim().toUpperCase());
  const filtered = values.filter((v): v is AgencyConnectionRequestStatus =>
    (STATUSES as readonly string[]).includes(v),
  );
  return filtered.length > 0 ? filtered : undefined;
}

export const GET = apiHandler({}, async ({ searchParams }) => {
  const ctx = await requirePermission("agency.read");
  if (ctx.organization.organizationType !== "AGENCY") {
    throw DomainErrors.forbidden("Ovaj pregled je namenjen agencijama.");
  }
  const items = await listConnectionRequests({
    organizationId: ctx.organization.organizationId,
    role: "AGENCY",
    status: parseStatuses(searchParams.get("status")),
  });
  return { data: items };
});

export const POST = apiHandler({ bodySchema: createSchema }, async ({ body }) => {
  const ctx = await requirePermission("organization.members:manage");
  if (ctx.organization.organizationType !== "AGENCY") {
    throw DomainErrors.forbidden("Samo agencija može slati zahtev.");
  }
  const created = await createConnectionRequest({
    agencyOrganizationId: ctx.organization.organizationId,
    actorUserId: ctx.session.user.id,
    investorOrganizationId: body.investorOrganizationId,
    projectId: body.projectId,
    message: body.message,
  });
  return { data: created, status: 201 };
});

/**
 * @swagger
 * /api/v1/agency/connection-requests:
 *   get:
 *     tags:
 *       - agency
 *     summary: Zahtevi agencije za saradnju
 *     description: |
 *       **Auth:** `requirePermission("agency.read")` + AGENCY org
 *     responses:
 *       "200":
 *         description: OK
 *   post:
 *     tags:
 *       - agency
 *     summary: Pošalji zahtev investitoru
 *     description: |
 *       **Auth:** `requirePermission("organization.members:manage")` + AGENCY org + VERIFIED
 *     responses:
 *       "201":
 *         description: Created
 */
