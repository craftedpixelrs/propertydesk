import "server-only";
import type { CommissionCalculationType, Prisma } from "@prisma/client";
import Decimal from "decimal.js";

import { prisma } from "@/server/db/prisma";
import { DomainErrors } from "@/lib/errors";
import { recordAudit } from "@/server/audit/audit";
import { resolveCommissionRule } from "./rules";
import { toDecimal } from "@/lib/formatters/money";

/**
 * Snapshot the applicable commission rule onto a `Commission` row when a
 * sale reaches CONTRACTED.
 *
 * This is deliberately idempotent — if a `Commission` already exists for the
 * sale the existing row is returned unchanged. The snapshot copies rate /
 * fixedAmount / baseAmount at contract-time so subsequent rule edits never
 * mutate historical commissions.
 *
 * Snapshotting is a no-op for internal sales (no `agencyOrganizationId`).
 */
export async function snapshotCommissionForSale(input: {
  organizationId: string;
  actorUserId: string;
  saleId: string;
}) {
  const sale = await prisma.sale.findFirst({
    where: { id: input.saleId, organizationId: input.organizationId },
    select: {
      id: true,
      organizationId: true,
      projectId: true,
      unitId: true,
      status: true,
      finalPrice: true,
      currency: true,
      agencyOrganizationId: true,
      agencyAgentUserId: true,
    },
  });
  if (!sale) throw DomainErrors.notFound("Prodaja");
  if (!sale.agencyOrganizationId) return null;

  const existing = await prisma.commission.findUnique({
    where: { saleId: sale.id },
  });
  if (existing) return existing;

  const connection = await prisma.agencyConnection.findFirst({
    where: {
      investorOrganizationId: sale.organizationId,
      agencyOrganizationId: sale.agencyOrganizationId,
    },
    select: { id: true },
  });
  if (!connection) {
    // No connection = nothing to snapshot. Leave a breadcrumb but don't fail
    // the CONTRACTED transition.
    return null;
  }

  const candidates = await prisma.agencyCommissionRule.findMany({
    where: {
      investorOrganizationId: sale.organizationId,
      OR: [
        { agencyConnectionId: connection.id },
        { agencyConnectionId: null, projectId: sale.projectId },
      ],
    },
  });
  const resolved = resolveCommissionRule(candidates, {
    agencyConnectionId: connection.id,
    projectId: sale.projectId,
    unitId: sale.unitId,
  });
  if (!resolved) return null;

  const base = toDecimal(sale.finalPrice);
  const calc: CommissionCalculationType = resolved.rule.calculationType;
  let calculated: Decimal;
  if (calc === "PERCENTAGE") {
    const rate = toDecimal(resolved.rule.rate ?? 0);
    calculated = base.times(rate).dividedBy(100).toDecimalPlaces(2);
  } else {
    calculated = toDecimal(resolved.rule.fixedAmount ?? 0).toDecimalPlaces(2);
  }

  const created = await prisma.commission.create({
    data: {
      investorOrganizationId: sale.organizationId,
      agencyOrganizationId: sale.agencyOrganizationId,
      agencyAgentUserId: sale.agencyAgentUserId,
      saleId: sale.id,
      commissionRuleId: resolved.rule.id,
      calculationType: calc,
      rate: resolved.rule.rate,
      fixedAmount: resolved.rule.fixedAmount,
      baseAmount: base.toString(),
      calculatedAmount: calculated.toString(),
      currency: sale.currency,
      status: "CALCULATED",
      notes: resolved.rule.agencyVisibleNote,
    },
  });

  await recordAudit({
    action: "commission.calculated",
    entityType: "Commission",
    entityId: created.id,
    organizationId: sale.organizationId,
    actorUserId: input.actorUserId,
    newValues: {
      saleId: sale.id,
      tier: resolved.tier,
      calculatedAmount: calculated.toString(),
    },
  });

  return created;
}

/**
 * Same as `snapshotCommissionForSale` but runs inside a caller-supplied
 * transaction. Used by SaleService.contractSale when the caller already has
 * an open TX. Prefer this variant to avoid audit-timing races.
 */
export async function snapshotCommissionForSaleTx(input: {
  tx: Prisma.TransactionClient;
  organizationId: string;
  actorUserId: string;
  saleId: string;
}) {
  const { tx } = input;
  const sale = await tx.sale.findFirst({
    where: { id: input.saleId, organizationId: input.organizationId },
    select: {
      id: true,
      organizationId: true,
      projectId: true,
      unitId: true,
      finalPrice: true,
      currency: true,
      agencyOrganizationId: true,
      agencyAgentUserId: true,
    },
  });
  if (!sale || !sale.agencyOrganizationId) return null;

  const existing = await tx.commission.findUnique({ where: { saleId: sale.id } });
  if (existing) return existing;

  const connection = await tx.agencyConnection.findFirst({
    where: {
      investorOrganizationId: sale.organizationId,
      agencyOrganizationId: sale.agencyOrganizationId,
    },
    select: { id: true },
  });
  if (!connection) return null;

  const candidates = await tx.agencyCommissionRule.findMany({
    where: {
      investorOrganizationId: sale.organizationId,
      OR: [
        { agencyConnectionId: connection.id },
        { agencyConnectionId: null, projectId: sale.projectId },
      ],
    },
  });
  const resolved = resolveCommissionRule(candidates, {
    agencyConnectionId: connection.id,
    projectId: sale.projectId,
    unitId: sale.unitId,
  });
  if (!resolved) return null;

  const base = toDecimal(sale.finalPrice);
  let calculated: Decimal;
  if (resolved.rule.calculationType === "PERCENTAGE") {
    const rate = toDecimal(resolved.rule.rate ?? 0);
    calculated = base.times(rate).dividedBy(100).toDecimalPlaces(2);
  } else {
    calculated = toDecimal(resolved.rule.fixedAmount ?? 0).toDecimalPlaces(2);
  }

  return tx.commission.create({
    data: {
      investorOrganizationId: sale.organizationId,
      agencyOrganizationId: sale.agencyOrganizationId,
      agencyAgentUserId: sale.agencyAgentUserId,
      saleId: sale.id,
      commissionRuleId: resolved.rule.id,
      calculationType: resolved.rule.calculationType,
      rate: resolved.rule.rate,
      fixedAmount: resolved.rule.fixedAmount,
      baseAmount: base.toString(),
      calculatedAmount: calculated.toString(),
      currency: sale.currency,
      status: "CALCULATED",
      notes: resolved.rule.agencyVisibleNote,
    },
  });
}
