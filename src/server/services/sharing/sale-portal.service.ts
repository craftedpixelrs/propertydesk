import "server-only";

import { randomBytes } from "node:crypto";

import { appOrigin } from "@/server/http/app-origin";
import { DomainErrors } from "@/lib/errors";
import { toDecimal } from "@/lib/formatters/money";
import { prisma } from "@/server/db/prisma";
import { serbianIpsQrProvider } from "@/server/services/billing/ips-qr/serbian-provider";
import { uploadDocument } from "@/server/services/documents.service";

function generateToken(): string {
  return randomBytes(24).toString("base64url");
}

export async function createSaleBuyerLink(input: {
  organizationId: string;
  actorUserId: string;
  saleId: string;
}) {
  const sale = await prisma.sale.findFirst({
    where: { id: input.saleId, organizationId: input.organizationId },
    select: { id: true, status: true },
  });
  if (!sale) throw DomainErrors.notFound("Prodaja");
  if (sale.status === "CANCELED" || sale.status === "DRAFT") {
    throw DomainErrors.invalidState("Link za kupca ide uz ugovorenu prodaju.");
  }
  const existing = await prisma.shareLink.findFirst({
    where: {
      organizationId: input.organizationId,
      entityType: "Sale",
      entityId: sale.id,
      revokedAt: null,
    },
    select: { token: true },
  });
  const token = existing?.token ?? generateToken();
  if (!existing) {
    await prisma.shareLink.create({
      data: {
        organizationId: input.organizationId,
        entityType: "Sale",
        entityId: sale.id,
        token,
        createdByUserId: input.actorUserId,
        showPrice: true,
      },
    });
  }
  return { url: `${appOrigin()}/p/kupac/${token}`, token };
}

export async function resolveSalePortal(token: string) {
  const link = await prisma.shareLink.findUnique({ where: { token } });
  if (!link || link.revokedAt || link.entityType !== "Sale") return null;
  if (link.expiresAt && link.expiresAt.getTime() < Date.now()) return null;

  const sale = await prisma.sale.findFirst({
    where: { id: link.entityId, organizationId: link.organizationId },
    include: {
      unit: { select: { code: true } },
      project: { select: { name: true } },
      buyer: { select: { firstName: true, lastName: true } },
      handover: { select: { completedAt: true, keysHanded: true } },
      paymentPlan: { include: { installments: { orderBy: { sequenceNumber: "asc" } } } },
      organization: {
        select: {
          name: true,
          profile: { select: { paymentAccountNumber: true, paymentBankName: true } },
        },
      },
    },
  });
  if (!sale || sale.status === "CANCELED") return null;

  const documents = await prisma.document.findMany({
    where: {
      organizationId: sale.organizationId,
      entityType: "Sale",
      entityId: sale.id,
      visibility: "BUYER_SHARED",
      deletedAt: null,
    },
    select: { id: true, originalFileName: true },
    orderBy: { createdAt: "asc" },
  });

  const paid = sale.paymentPlan
    ? sale.paymentPlan.installments.reduce(
        (sum, row) => sum.plus(toDecimal(row.paidAmount)),
        toDecimal(0),
      )
    : toDecimal(0);
  const contracted = toDecimal(sale.finalPrice);
  const outstanding = contracted.minus(paid);
  const accountNumber = sale.organization.profile?.paymentAccountNumber ?? null;
  let qrDataUrl: string | null = null;
  if (sale.currency === "RSD" && accountNumber && outstanding.gt(0)) {
    try {
      const qr = await serbianIpsQrProvider.generate({
        receiverName: sale.organization.name,
        receiverAccount: accountNumber,
        amount: outstanding.toString(),
        currency: "RSD",
        payerName: `${sale.buyer.firstName} ${sale.buyer.lastName}`,
        description: `Uplata ${sale.unit.code}`.slice(0, 35),
        paymentReference: sale.id.slice(0, 8).toUpperCase(),
      });
      qrDataUrl = `data:image/png;base64,${qr.pngBuffer.toString("base64")}`;
    } catch {
      qrDataUrl = null;
    }
  }

  return {
    token,
    organizationName: sale.organization.name,
    buyerName: `${sale.buyer.firstName} ${sale.buyer.lastName}`,
    unitCode: sale.unit.code,
    projectName: sale.project.name,
    currency: sale.currency,
    contractStatus: sale.contractStatus,
    plannedHandoverDate: sale.plannedHandoverDate,
    handoverDone: Boolean(sale.handover?.completedAt),
    accountNumber,
    bankName: sale.organization.profile?.paymentBankName ?? null,
    reference: sale.id.slice(0, 8).toUpperCase(),
    qrDataUrl,
    contracted: contracted.toString(),
    paid: paid.toString(),
    outstanding: outstanding.toString(),
    installments:
      sale.paymentPlan?.installments.map((row) => ({
        name: row.name,
        dueDate: row.dueDate,
        amount: toDecimal(row.amount).toString(),
        paid: toDecimal(row.paidAmount).toString(),
        status: row.status,
      })) ?? [],
    documents,
  };
}

export async function uploadSalePortalProof(input: {
  token: string;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
}) {
  const link = await prisma.shareLink.findUnique({ where: { token: input.token } });
  if (!link || link.revokedAt || link.entityType !== "Sale") {
    throw DomainErrors.notFound("Link");
  }
  return uploadDocument({
    organizationId: link.organizationId,
    actorUserId: link.createdByUserId,
    category: "PAYMENT",
    entityType: "Sale",
    entityId: link.entityId,
    visibility: "INTERNAL",
    fileName: input.fileName,
    mimeType: input.mimeType,
    buffer: input.buffer,
  });
}
