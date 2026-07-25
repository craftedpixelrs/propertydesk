import { NextResponse } from "next/server";
import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission, requireSuperAdmin } from "@/server/permissions/require";
import { prisma } from "@/server/db/prisma";
import { renderInvoicePdf } from "@/server/pdf/service";
import { ApiError } from "@/lib/api/errors";

const paramsSchema = z.object({ id: z.string().min(1) });

/**
 * Signed on-demand invoice PDF download. Access rules:
 *   - SUPER_ADMIN: always allowed.
 *   - INVESTOR_OWNER / AGENCY_OWNER of the invoice's organization: allowed
 *     via `billing.invoice.read` permission.
 * The stream is written with a filename derived from the invoice number.
 */
export const GET = apiHandler({ paramsSchema }, async ({ params }) => {
  const invoice = await prisma.invoice.findUnique({
    where: { id: params.id },
    select: { id: true, organizationId: true, invoiceNumber: true },
  });
  if (!invoice) {
    throw new ApiError("NOT_FOUND", "Faktura nije pronađena.");
  }

  try {
    await requireSuperAdmin();
  } catch {
    const ctx = await requirePermission("billing.invoice.read");
    if (ctx.organization.organizationId !== invoice.organizationId) {
      throw new ApiError("FORBIDDEN", "Fakturu nije moguće preuzeti iz druge organizacije.");
    }
  }

  const pdf = await renderInvoicePdf({ invoiceId: invoice.id });
  const filename = `${invoice.invoiceNumber?.replace(/[^\w\-]/g, "_") ?? invoice.id}.pdf`;
  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "private, no-store",
    },
  });
});
