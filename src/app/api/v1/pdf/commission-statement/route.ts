import { NextResponse } from "next/server";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { renderCommissionStatementPdf } from "@/server/pdf/service";
import { pdfResponseHeaders } from "@/server/pdf/render";
import { ApiError } from "@/lib/api/errors";
import { prisma } from "@/server/db/prisma";

/**
 * GET /api/v1/pdf/commission-statement?agencyOrganizationId=&from=&to=
 *
 * Streams an obračun provizije PDF for a single agency, optionally scoped
 * to a period. Investor-side only; agencies read their obračun from a
 * different endpoint (`agency.read`) if we add one later.
 */
export const GET = apiHandler({}, async ({ searchParams }): Promise<Response> => {
  const ctx = await requirePermission("commission.statement");
  const agencyOrganizationId = searchParams.get("agencyOrganizationId");
  if (!agencyOrganizationId) {
    throw new ApiError("BAD_REQUEST", "Nedostaje agencyOrganizationId.");
  }
  // `agencyOrganizationId` je caller-controlled. Bez ove provere, bilo
  // koji investor sa `commission.statement` pravom mogao je da generiše
  // PDF sa legalnim podacima (ime, adresa, PIB) proizvoljne agencije
  // na platformi — čak i bez ijedne provizije i bez `AgencyConnection`.
  // Mirror-check u `agency-commission-statement/route.ts`.
  const linked = await prisma.agencyConnection.findFirst({
    where: {
      investorOrganizationId: ctx.organization.organizationId,
      agencyOrganizationId,
    },
    select: { id: true },
  });
  if (!linked) {
    throw new ApiError("FORBIDDEN", "Obračun nije dostupan za ovu agenciju.");
  }
  const from = parseDate(searchParams.get("from"));
  const to = parseDate(searchParams.get("to"));

  const buffer = await renderCommissionStatementPdf({
    organizationId: ctx.organization.organizationId,
    agencyOrganizationId,
    from,
    to,
  });
  return new NextResponse(new Uint8Array(buffer), {
    headers: pdfResponseHeaders(`obracun-provizije-${agencyOrganizationId.slice(0, 8)}`),
  });
});

function parseDate(v: string | null): Date | undefined {
  if (!v) return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/**
 * @swagger
 * /api/v1/pdf/commission-statement:
 *   get:
 *     tags:
 *       - pdf
 *     summary: List / read pdf
 *     description: |
 *       **Auth:** `requirePermission("commission.statement")`
 *     responses:
 *       "200":
 *         description: |
 *           OK
 *       "401":
 *         $ref: "#/components/responses/Unauthenticated"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 */
