import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/server/db/prisma";
import { getResidentSession } from "@/server/auth/resident-session";
import { renderDuesUplatnicaPdf } from "@/server/services/manager/dues-pdf.service";

/**
 * Resident-facing uplatnica PDF endpoint. Separate from the manager API
 * because it authenticates via the signed `pd_resident` cookie instead
 * of the Better-Auth session. We re-verify that the charge belongs to
 * one of the resident's active units before rendering, so a stolen
 * charge id can't be used to download someone else's uplatnica.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const session = await getResidentSession();
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // All units this resident's email is linked to (ACTIVE only).
  const accesses = await prisma.residentAccess.findMany({
    where: { email: session.email, status: "ACTIVE" },
    select: { unitId: true, organizationId: true },
  });
  if (accesses.length === 0) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const charge = await prisma.duesCharge.findUnique({
    where: { id },
    select: { unitId: true, organizationId: true },
  });
  if (!charge) return new NextResponse("Not found", { status: 404 });

  const ok = accesses.some(
    (a) => a.unitId === charge.unitId && a.organizationId === charge.organizationId,
  );
  if (!ok) return new NextResponse("Forbidden", { status: 403 });

  const buffer = await renderDuesUplatnicaPdf({
    organizationId: charge.organizationId,
    chargeId: id,
  });
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="uplatnica-${id}.pdf"`,
    },
  });
}
