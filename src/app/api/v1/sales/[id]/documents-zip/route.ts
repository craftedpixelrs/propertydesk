import { z } from "zod";
import { NextResponse } from "next/server";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { DomainErrors } from "@/lib/errors";
import { prisma } from "@/server/db/prisma";
import { storage } from "@/server/storage";
import { zipStore } from "@/lib/zip-store";

const paramsSchema = z.object({ id: z.string().min(1) });

export const GET = apiHandler({ paramsSchema }, async ({ params }) => {
  const ctx = await requirePermission("sale.dossier");
  const sale = await prisma.sale.findFirst({
    where: { id: params.id, organizationId: ctx.organization.organizationId },
    select: { id: true, unit: { select: { code: true } } },
  });
  if (!sale) throw DomainErrors.notFound("Prodaja");

  const docs = await prisma.document.findMany({
    where: {
      organizationId: ctx.organization.organizationId,
      entityType: "Sale",
      entityId: sale.id,
      deletedAt: null,
    },
    select: { originalFileName: true, storageKey: true },
    orderBy: { createdAt: "asc" },
  });

  const used = new Map<string, number>();
  const entries = [];
  for (const doc of docs) {
    const data = await storage().read(doc.storageKey);
    entries.push({ name: uniqueName(doc.originalFileName, used), data });
  }

  const buffer = zipStore(entries);
  const filename = `dokumenti-${sale.unit.code}.zip`;
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      "cache-control": "private, no-store",
    },
  });
});

function uniqueName(raw: string, used: Map<string, number>): string {
  const safe = raw.replace(/[\\/:*?"<>|]+/g, "_").slice(0, 120) || "dokument";
  const count = used.get(safe) ?? 0;
  used.set(safe, count + 1);
  if (count === 0) return safe;
  const dot = safe.lastIndexOf(".");
  if (dot <= 0) return `${safe}-${count + 1}`;
  return `${safe.slice(0, dot)}-${count + 1}${safe.slice(dot)}`;
}
