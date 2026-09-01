import type { AgencyConnectionRequestStatus } from "@prisma/client";

import { apiHandler } from "@/lib/api/handler";
import { DomainErrors } from "@/lib/errors";
import { requirePermission } from "@/server/permissions/require";
import { listConnectionRequests } from "@/server/services/agencies/connection-request.service";

const STATUSES = ["PENDING", "ACCEPTED", "REJECTED", "CANCELED"] as const;

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
  if (ctx.organization.organizationType !== "INVESTOR") {
    throw DomainErrors.forbidden("Ovaj pregled je namenjen investitorima.");
  }
  const items = await listConnectionRequests({
    organizationId: ctx.organization.organizationId,
    role: "INVESTOR",
    status: parseStatuses(searchParams.get("status")),
  });
  return { data: items };
});

/**
 * @swagger
 * /api/v1/agencies/connection-requests:
 *   get:
 *     tags:
 *       - agencies
 *     summary: Dolazni zahtevi agencija
 *     description: |
 *       **Auth:** `requirePermission("agency.read")` + INVESTOR org
 *     responses:
 *       "200":
 *         description: OK
 */
