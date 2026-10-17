import { NextResponse } from "next/server";

import { ApiError } from "@/lib/api/errors";
import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { pdfResponseHeaders } from "@/server/pdf/render";
import { renderCommissionStatementPdf } from "@/server/pdf/service";
import { prisma } from "@/server/db/prisma";

/**
 * GET /api/v1/pdf/agency-commission-statement?investorOrganizationId=&from=&to=
 *
 * The agency downloads its own commission statement. The investor id must
 * already have at least one commission row for this agency.
 */
export const GET = apiHandler({}, async ({ searchParams }): Promise<Response> => {
  const ctx = await requirePermission("commission.statement");
  const investorOrganizationId = searchParams.get("investorOrganizationId");
  if (!investorOrganizationId) {
    throw new ApiError("BAD_REQUEST", "Nedostaje investorOrganizationId.");
  }
  const owned = await prisma.commission.findFirst({
    where: {
      agencyOrganizationId: ctx.organization.organizationId,
      investorOrganizationId,
    },
    select: { id: true },
  });
  if (!owned) {
    throw new ApiError("FORBIDDEN", "Obračun nije dostupan ovoj agenciji.");
  }

  const buffer = await renderCommissionStatementPdf({
    organizationId: investorOrganizationId,
    agencyOrganizationId: ctx.organization.organizationId,
    from: parseDate(searchParams.get("from")),
    to: parseDate(searchParams.get("to")),
  });
  return new NextResponse(new Uint8Array(buffer), {
    headers: pdfResponseHeaders(`obracun-provizije-${investorOrganizationId.slice(0, 8)}`),
  });
});

function parseDate(value: string | null): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}
