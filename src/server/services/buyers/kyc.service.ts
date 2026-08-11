import "server-only";
import type { BuyerKycChecklist } from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { DomainErrors } from "@/lib/errors";
import { recordAudit } from "@/server/audit/audit";

/**
 * Buyer KYC service — Faza 8.2 (B1).
 *
 * The `BuyerKycChecklist` row is a UI-driven "we have looked at all
 * required documents" toggle set. It's intentionally kept separate
 * from the buyer's own PII columns (`jmbg`, `taxId`, ...) so the
 * checklist can be updated without touching the buyer's history.
 *
 * `isKycComplete` follows the buyer's `entityType`:
 *   NATURAL → idFrontOk + idBackOk + addressProofOk
 *   LEGAL   → idFrontOk (representative id) + taxCertOk + addressProofOk
 * The `enforceKyc` flag on the org can later block sale.CONTRACTED
 * transitions when this returns false — hook is exposed here but the
 * transition service wires it in.
 */

export interface KycUpdateInput {
  organizationId: string;
  actorUserId: string;
  buyerId: string;
  idFrontOk?: boolean;
  idBackOk?: boolean;
  addressProofOk?: boolean;
  taxCertOk?: boolean;
  notes?: string | null;
}

export interface KycStatus {
  checklist: BuyerKycChecklist | null;
  isComplete: boolean;
  entityType: "NATURAL" | "LEGAL";
  missing: string[];
}

async function loadBuyer(input: { organizationId: string; buyerId: string }) {
  const buyer = await prisma.buyer.findFirst({
    where: { id: input.buyerId, organizationId: input.organizationId },
    select: { id: true, entityType: true },
  });
  if (!buyer) throw DomainErrors.notFound("Kupac");
  return buyer;
}

export async function getKycStatus(input: {
  organizationId: string;
  buyerId: string;
}): Promise<KycStatus> {
  const buyer = await loadBuyer(input);
  const checklist = await prisma.buyerKycChecklist.findUnique({
    where: { buyerId: buyer.id },
  });
  return computeStatus(buyer.entityType, checklist);
}

export function computeStatus(
  entityType: "NATURAL" | "LEGAL",
  checklist: BuyerKycChecklist | null,
): KycStatus {
  const missing: string[] = [];
  const c = checklist ?? {
    idFrontOk: false,
    idBackOk: false,
    addressProofOk: false,
    taxCertOk: false,
  };
  if (entityType === "NATURAL") {
    if (!c.idFrontOk) missing.push("Lična karta (lice)");
    if (!c.idBackOk) missing.push("Lična karta (poleđina)");
    if (!c.addressProofOk) missing.push("Potvrda prebivališta");
  } else {
    if (!c.idFrontOk) missing.push("Lična karta ovlašćenog lica");
    if (!c.taxCertOk) missing.push("Poreska potvrda");
    if (!c.addressProofOk) missing.push("Potvrda sedišta");
  }
  return {
    checklist,
    isComplete: missing.length === 0,
    entityType,
    missing,
  };
}

/**
 * Idempotent upsert: create the row on the first save, or patch the
 * flags on subsequent updates. Every save re-stamps `reviewedAt` and
 * `reviewedByUserId`.
 */
export async function updateKycChecklist(input: KycUpdateInput) {
  const buyer = await loadBuyer(input);
  const existing = await prisma.buyerKycChecklist.findUnique({
    where: { buyerId: buyer.id },
  });

  const now = new Date();
  const patch = {
    idFrontOk: input.idFrontOk ?? existing?.idFrontOk ?? false,
    idBackOk: input.idBackOk ?? existing?.idBackOk ?? false,
    addressProofOk: input.addressProofOk ?? existing?.addressProofOk ?? false,
    taxCertOk: input.taxCertOk ?? existing?.taxCertOk ?? false,
    notes: input.notes === undefined ? existing?.notes ?? null : input.notes,
    reviewedAt: now,
    reviewedByUserId: input.actorUserId,
  };

  const saved = existing
    ? await prisma.buyerKycChecklist.update({
        where: { buyerId: buyer.id },
        data: patch,
      })
    : await prisma.buyerKycChecklist.create({
        data: { buyerId: buyer.id, ...patch },
      });

  await recordAudit({
    action: "buyer.kyc_updated",
    entityType: "Buyer",
    entityId: buyer.id,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    previousValues: existing
      ? {
          idFrontOk: existing.idFrontOk,
          idBackOk: existing.idBackOk,
          addressProofOk: existing.addressProofOk,
          taxCertOk: existing.taxCertOk,
        }
      : undefined,
    newValues: {
      idFrontOk: saved.idFrontOk,
      idBackOk: saved.idBackOk,
      addressProofOk: saved.addressProofOk,
      taxCertOk: saved.taxCertOk,
    },
  });

  return computeStatus(buyer.entityType, saved);
}
