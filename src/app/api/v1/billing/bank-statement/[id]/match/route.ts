import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requireSuperAdmin } from "@/server/permissions/require";
import { manuallyMatchTransaction } from "@/server/services/billing/bank-statement/service";
import { prisma } from "@/server/db/prisma";
import { ApiError } from "@/lib/api/errors";

const paramsSchema = z.object({ id: z.string().min(1) });
const bodySchema = z.object({ invoiceRef: z.string().min(1) });

/**
 * Manually match a queued bank transaction to an invoice.
 *
 * `invoiceRef` is resolved to an invoice id via either
 *   - direct id match, or
 *   - invoiceNumber match.
 */
export const POST = apiHandler(
  { paramsSchema, bodySchema },
  async ({ params, body }) => {
    const ctx = await requireSuperAdmin();
    let invoice = await prisma.invoice.findUnique({
      where: { id: body.invoiceRef },
    });
    if (!invoice) {
      invoice = await prisma.invoice.findFirst({
        where: { invoiceNumber: body.invoiceRef },
      });
    }
    if (!invoice) {
      throw new ApiError("NOT_FOUND", "Faktura nije pronađena.");
    }
    await manuallyMatchTransaction({
      transactionId: params.id,
      invoiceId: invoice.id,
      actorUserId: ctx.session.user.id,
    });
    return { data: { ok: true, invoiceId: invoice.id } };
  },
);
