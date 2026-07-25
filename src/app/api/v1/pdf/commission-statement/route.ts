import { NextResponse } from "next/server";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { renderCommissionStatementPdf } from "@/server/pdf/service";
import { pdfResponseHeaders } from "@/server/pdf/render";
import { ApiError } from "@/lib/api/errors";

/**
 * GET /api/v1/pdf/commission-statement?agencyOrganizationId=&from=&to=
 *
 * Streams an obračun provizije PDF for a single agency, optionally scoped
 * to a period. Investor-side only; agencies read their obračun from a
 * different endpoint (`agency.read`) if we add one later.
 */
export const GET = apiHandler({}, async ({ searchParams }): Promise<Response> => {
  const ctx = await requirePermission("commission.read");
  const agencyOrganizationId = searchParams.get("agencyOrganizationId");
  if (!agencyOrganizationId) {
    throw new ApiError("BAD_REQUEST", "Nedostaje agencyOrganizationId.");
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
    headers: pdfResponseHeaders(
      `obracun-provizije-${agencyOrganizationId.slice(0, 8)}`,
    ),
  });
});

function parseDate(v: string | null): Date | undefined {
  if (!v) return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d;
}
