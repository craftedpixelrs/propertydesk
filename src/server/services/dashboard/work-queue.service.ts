import "server-only";

import { prisma } from "@/server/db/prisma";

export interface WorkQueueItem {
  id: string;
  kind: "installment" | "kyc" | "contract" | "reservation";
  href: string;
  title: string;
  detail: string;
}

const OPEN_SALE = ["PRE_CONTRACT", "CONTRACTED", "PAYMENT_IN_PROGRESS"] as const;

/**
 * The short list a salesperson should clear today: dues, missing KYC,
 * contracts still unsigned, and reservations about to lapse.
 */
export async function loadWorkQueue(organizationId: string): Promise<WorkQueueItem[]> {
  const now = new Date();
  const inSeven = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const inTwo = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

  const [installments, sales, reservations] = await Promise.all([
    prisma.paymentInstallment.findMany({
      where: {
        paymentPlan: { organizationId },
        status: { in: ["UPCOMING", "DUE", "PARTIALLY_PAID", "OVERDUE"] },
        dueDate: { lte: inSeven },
      },
      orderBy: { dueDate: "asc" },
      take: 8,
      include: {
        paymentPlan: {
          include: {
            sale: {
              select: {
                id: true,
                unit: { select: { code: true } },
                buyer: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
      },
    }),
    prisma.sale.findMany({
      where: {
        organizationId,
        status: { in: [...OPEN_SALE] },
      },
      orderBy: { updatedAt: "desc" },
      take: 40,
      select: {
        id: true,
        contractStatus: true,
        unit: { select: { code: true } },
        buyer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            kycChecklist: {
              select: {
                idFrontOk: true,
                idBackOk: true,
                addressProofOk: true,
                taxCertOk: true,
              },
            },
          },
        },
      },
    }),
    prisma.reservation.findMany({
      where: {
        organizationId,
        status: "APPROVED",
        expiresAt: { gte: now, lte: inTwo },
      },
      orderBy: { expiresAt: "asc" },
      take: 8,
      select: {
        id: true,
        expiresAt: true,
        unit: { select: { code: true } },
        buyer: { select: { firstName: true, lastName: true } },
      },
    }),
  ]);

  const items: WorkQueueItem[] = [];

  for (const inst of installments) {
    const sale = inst.paymentPlan.sale;
    const buyer = sale.buyer ? `${sale.buyer.firstName} ${sale.buyer.lastName}` : "";
    items.push({
      id: `inst:${inst.id}`,
      kind: "installment",
      href: `/prodaje/${sale.id}`,
      title: `${sale.unit.code} · ${inst.name}`,
      detail: buyer,
    });
  }

  for (const sale of sales) {
    const kyc = sale.buyer.kycChecklist;
    const complete = Boolean(kyc?.idFrontOk && kyc.idBackOk && kyc.addressProofOk && kyc.taxCertOk);
    if (!complete) {
      items.push({
        id: `kyc:${sale.id}`,
        kind: "kyc",
        href: `/kupci/${sale.buyer.id}`,
        title: `${sale.unit.code} · ${sale.buyer.firstName} ${sale.buyer.lastName}`,
        detail: "kyc",
      });
    }
    if (sale.contractStatus !== "SIGNED") {
      items.push({
        id: `contract:${sale.id}`,
        kind: "contract",
        href: `/prodaje/${sale.id}`,
        title: `${sale.unit.code} · ${sale.buyer.firstName} ${sale.buyer.lastName}`,
        detail: sale.contractStatus,
      });
    }
  }

  for (const reservation of reservations) {
    items.push({
      id: `res:${reservation.id}`,
      kind: "reservation",
      href: `/rezervacije/${reservation.id}`,
      title: reservation.unit.code,
      detail: `${reservation.buyer.firstName} ${reservation.buyer.lastName}`,
    });
  }

  return items.slice(0, 12);
}
