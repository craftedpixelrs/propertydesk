import "server-only";

import { DomainErrors } from "@/lib/errors";
import { recordAudit } from "@/server/audit/audit";
import { prisma } from "@/server/db/prisma";

export async function getSaleHandover(organizationId: string, saleId: string) {
  return prisma.saleHandover.findFirst({
    where: { organizationId, saleId },
    include: { completedByUser: { select: { id: true, name: true } } },
  });
}

export async function saveSaleHandover(input: {
  organizationId: string;
  actorUserId: string;
  saleId: string;
  keysHanded: boolean;
  meterElectricity?: string | null;
  meterWater?: string | null;
  meterHeating?: string | null;
  defects?: string | null;
  attendees?: string | null;
  complete: boolean;
}) {
  const sale = await prisma.sale.findFirst({
    where: { id: input.saleId, organizationId: input.organizationId },
    select: { id: true, status: true },
  });
  if (!sale) throw DomainErrors.notFound("Prodaja");
  if (sale.status === "CANCELED" || sale.status === "DRAFT") {
    throw DomainErrors.invalidState("Primopredaja ide uz ugovorenu prodaju.");
  }

  const data = {
    keysHanded: input.keysHanded,
    meterElectricity: blankToNull(input.meterElectricity),
    meterWater: blankToNull(input.meterWater),
    meterHeating: blankToNull(input.meterHeating),
    defects: blankToNull(input.defects),
    attendees: blankToNull(input.attendees),
    completedAt: input.complete ? new Date() : null,
    completedByUserId: input.complete ? input.actorUserId : null,
  };

  const saved = await prisma.saleHandover.upsert({
    where: { saleId: input.saleId },
    create: {
      organizationId: input.organizationId,
      saleId: input.saleId,
      ...data,
    },
    update: data,
    include: { completedByUser: { select: { id: true, name: true } } },
  });

  await recordAudit({
    action: input.complete ? "sale.handover_completed" : "sale.handover_saved",
    entityType: "Sale",
    entityId: input.saleId,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    newValues: {
      keysHanded: saved.keysHanded,
      completedAt: saved.completedAt,
    },
  });
  return saved;
}

function blankToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
