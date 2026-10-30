import { z } from "zod";
import { NextResponse } from "next/server";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { renderAssemblyMinutesPdf } from "@/server/services/manager/assembly-pdf.service";

const paramsSchema = z.object({ id: z.string().min(1) });

export const GET = apiHandler({ paramsSchema }, async ({ params, searchParams }) => {
  const ctx = await requirePermission("assembly.minutes.generate");
  const persist = searchParams.get("persist") === "true";
  const { buffer, documentId } = await renderAssemblyMinutesPdf({
    organizationId: ctx.organization.organizationId,
    actorUserId: ctx.session.user.id,
    assemblyId: params.id,
    persist,
  });
  if (persist) {
    // JSON response with the newly-created document id when persisting.
    return { data: { documentId } };
  }
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="zapisnik-${params.id}.pdf"`,
    },
  });
});

/**
 * @swagger
 * /api/v1/manager/assemblies/{id}/minutes:
 *   get:
 *     tags: [manager]
 *     summary: Generate (and optionally persist) the minutes PDF
 *     description: |
 *       **Auth:** `requirePermission("assembly.minutes.generate")`
 */
