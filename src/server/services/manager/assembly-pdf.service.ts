import "server-only";

import { prisma } from "@/server/db/prisma";
import { DomainErrors } from "@/lib/errors";
import { recordAudit } from "@/server/audit/audit";
import { renderPdf } from "@/server/pdf/render";
import {
  AssemblyMinutesPdf,
  type AssemblyMinutesPdfData,
} from "@/server/pdf/documents/assembly-minutes";
import { uploadDocument } from "@/server/services/documents.service";

/**
 * Faza 11 — generate and attach assembly minutes.
 *
 * Produces an A4 PDF of the final tally, uploads it as a `Document` with
 * category `ASSEMBLY`, and stamps the resulting document id on
 * `Assembly.minutesDocumentId`. The downloaded PDF is also returned to the
 * caller so the operator can preview before publishing.
 */
export async function renderAssemblyMinutesPdf(input: {
  organizationId: string;
  assemblyId: string;
  actorUserId: string;
  persist?: boolean;
}): Promise<{ buffer: Buffer; documentId: string | null }> {
  const assembly = await prisma.assembly.findFirst({
    where: { id: input.assemblyId, organizationId: input.organizationId },
    include: {
      building: true,
      organization: true,
      items: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });
  if (!assembly) throw DomainErrors.notFound("Skupština nije pronađena.");

  const totalShareAgg = await prisma.managedUnit.aggregate({
    where: {
      organizationId: input.organizationId,
      buildingId: assembly.buildingId,
      archivedAt: null,
    },
    _sum: { participationShare: true },
  });
  const totalShares = totalShareAgg._sum.participationShare?.toFixed(4) ?? "0.0000";

  const data: AssemblyMinutesPdfData = {
    managerName: assembly.organization.name,
    buildingName: assembly.building.name,
    buildingAddress: `${assembly.building.address}, ${assembly.building.city}`,
    assemblyCode: assembly.code,
    assemblyTitle: assembly.title,
    type: assembly.type,
    scheduledAt: assembly.scheduledAt,
    completedAt: assembly.completedAt,
    location: assembly.location,
    quorumNote: assembly.quorumNote,
    totalShares,
    presentShares: assembly.presentShare?.toFixed(4) ?? "0.0000",
    quorumMet: assembly.quorumMet,
    items: assembly.items.map((item) => ({
      sortOrder: item.sortOrder,
      title: item.title,
      description: item.description,
      majority: item.majority,
      voteKind: item.voteKind,
      result:
        item.resultSummary && typeof item.resultSummary === "object"
          ? (item.resultSummary as unknown as AssemblyMinutesPdfData["items"][number]["result"])
          : null,
    })),
    signatureLines: ["Predsednik skupštine", "Zapisničar", "Overavač zapisnika"],
  };

  const buffer = await renderPdf(AssemblyMinutesPdf(data));

  let documentId: string | null = assembly.minutesDocumentId;
  if (input.persist) {
    const doc = await uploadDocument({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      category: "ASSEMBLY",
      entityType: "Assembly",
      entityId: assembly.id,
      fileName: `zapisnik-${assembly.code}.pdf`,
      mimeType: "application/pdf",
      buffer,
      visibility: "RESIDENT_SHARED",
    });
    documentId = doc.id;
    await prisma.assembly.update({
      where: { id: assembly.id },
      data: { minutesDocumentId: documentId },
    });
    await recordAudit({
      action: "manager.minutes_generated",
      entityType: "Assembly",
      entityId: assembly.id,
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      newValues: { documentId },
    });
  }

  return { buffer, documentId };
}
