import "server-only";
import type { CommissionCalculationType, Prisma } from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { DomainErrors } from "@/lib/errors";
import { recordAudit } from "@/server/audit/audit";
import { resolveCommissionRule, type ResolvedRule } from "./rules";

/**
 * CRUD for `AgencyCommissionRule` (investor-scoped) and read helpers for the
 * pure precedence resolver in `./rules.ts`.
 *
 * All mutations require an INVESTOR org context; the caller must already
 * have passed `commission.manage`. Every write is audited.
 *
 * Reads for the agency-facing "Moje provizije" screen live in
 * `commissions.service.ts` (list of `Commission` rows filtered by agency).
 */

export interface CreateCommissionRuleInput {
  investorOrganizationId: string;
  actorUserId: string;
  agencyConnectionId?: string | null;
  projectId?: string | null;
  unitId?: string | null;
  calculationType: CommissionCalculationType;
  rate?: number | null;
  fixedAmount?: number | null;
  currency?: string;
  validFrom?: Date | null;
  validTo?: Date | null;
  internalNote?: string | null;
  agencyVisibleNote?: string | null;
}

export interface UpdateCommissionRuleInput {
  investorOrganizationId: string;
  actorUserId: string;
  ruleId: string;
  patch: Partial<Omit<CreateCommissionRuleInput, "investorOrganizationId" | "actorUserId">>;
}

function validatePayload(
  calc: CommissionCalculationType,
  rate?: number | null,
  fixedAmount?: number | null,
): void {
  if (calc === "PERCENTAGE") {
    if (rate == null || rate < 0 || rate > 100) {
      throw DomainErrors.badRequest("Za procentualnu proviziju unesite stopu između 0 i 100.");
    }
  } else {
    if (fixedAmount == null || fixedAmount < 0) {
      throw DomainErrors.badRequest("Za fiksnu proviziju unesite pozitivan iznos.");
    }
  }
}

async function assertTenantOwnership(input: CreateCommissionRuleInput): Promise<void> {
  if (input.agencyConnectionId) {
    const conn = await prisma.agencyConnection.findFirst({
      where: {
        id: input.agencyConnectionId,
        investorOrganizationId: input.investorOrganizationId,
      },
      select: { id: true },
    });
    if (!conn) throw DomainErrors.notFound("Konekcija");
  }
  if (input.projectId) {
    const project = await prisma.project.findFirst({
      where: { id: input.projectId, organizationId: input.investorOrganizationId },
      select: { id: true },
    });
    if (!project) throw DomainErrors.notFound("Projekat");
  }
  if (input.unitId) {
    const unit = await prisma.unit.findFirst({
      where: { id: input.unitId, organizationId: input.investorOrganizationId },
      select: { id: true },
    });
    if (!unit) throw DomainErrors.notFound("Jedinica");
  }
  if (!input.agencyConnectionId && !input.projectId && !input.unitId) {
    throw DomainErrors.badRequest(
      "Pravilo mora referencirati konekciju, projekat ili jedinicu.",
    );
  }
}

export async function createCommissionRule(input: CreateCommissionRuleInput) {
  validatePayload(input.calculationType, input.rate, input.fixedAmount);
  await assertTenantOwnership(input);

  const created = await prisma.agencyCommissionRule.create({
    data: {
      investorOrganizationId: input.investorOrganizationId,
      agencyConnectionId: input.agencyConnectionId ?? null,
      projectId: input.projectId ?? null,
      unitId: input.unitId ?? null,
      calculationType: input.calculationType,
      rate: input.rate ?? null,
      fixedAmount: input.fixedAmount ?? null,
      currency: input.currency ?? "EUR",
      validFrom: input.validFrom ?? null,
      validTo: input.validTo ?? null,
      internalNote: input.internalNote ?? null,
      agencyVisibleNote: input.agencyVisibleNote ?? null,
    },
  });

  await recordAudit({
    action: "commission.calculated",
    entityType: "AgencyCommissionRule",
    entityId: created.id,
    organizationId: input.investorOrganizationId,
    actorUserId: input.actorUserId,
    newValues: {
      calculationType: created.calculationType,
      rate: created.rate?.toString() ?? null,
      fixedAmount: created.fixedAmount?.toString() ?? null,
      scope: {
        agencyConnectionId: created.agencyConnectionId,
        projectId: created.projectId,
        unitId: created.unitId,
      },
    },
  });

  return created;
}

export async function updateCommissionRule(input: UpdateCommissionRuleInput) {
  const existing = await prisma.agencyCommissionRule.findFirst({
    where: {
      id: input.ruleId,
      investorOrganizationId: input.investorOrganizationId,
    },
  });
  if (!existing) throw DomainErrors.notFound("Pravilo provizije");

  const nextCalc = input.patch.calculationType ?? existing.calculationType;
  const nextRate = input.patch.rate !== undefined ? input.patch.rate : existing.rate?.toNumber() ?? null;
  const nextFixed =
    input.patch.fixedAmount !== undefined
      ? input.patch.fixedAmount
      : existing.fixedAmount?.toNumber() ?? null;
  validatePayload(nextCalc, nextRate, nextFixed);

  const updated = await prisma.agencyCommissionRule.update({
    where: { id: existing.id },
    data: {
      calculationType: input.patch.calculationType ?? undefined,
      rate: input.patch.rate !== undefined ? input.patch.rate : undefined,
      fixedAmount:
        input.patch.fixedAmount !== undefined ? input.patch.fixedAmount : undefined,
      currency: input.patch.currency ?? undefined,
      validFrom: input.patch.validFrom !== undefined ? input.patch.validFrom : undefined,
      validTo: input.patch.validTo !== undefined ? input.patch.validTo : undefined,
      internalNote: input.patch.internalNote !== undefined ? input.patch.internalNote : undefined,
      agencyVisibleNote:
        input.patch.agencyVisibleNote !== undefined ? input.patch.agencyVisibleNote : undefined,
    },
  });

  await recordAudit({
    action: "commission.adjusted",
    entityType: "AgencyCommissionRule",
    entityId: existing.id,
    organizationId: input.investorOrganizationId,
    actorUserId: input.actorUserId,
    previousValues: {
      calculationType: existing.calculationType,
      rate: existing.rate?.toString() ?? null,
      fixedAmount: existing.fixedAmount?.toString() ?? null,
    },
    newValues: {
      calculationType: updated.calculationType,
      rate: updated.rate?.toString() ?? null,
      fixedAmount: updated.fixedAmount?.toString() ?? null,
    },
  });

  return updated;
}

export async function deleteCommissionRule(input: {
  investorOrganizationId: string;
  actorUserId: string;
  ruleId: string;
}) {
  const existing = await prisma.agencyCommissionRule.findFirst({
    where: { id: input.ruleId, investorOrganizationId: input.investorOrganizationId },
  });
  if (!existing) throw DomainErrors.notFound("Pravilo provizije");
  await prisma.agencyCommissionRule.delete({ where: { id: existing.id } });
  await recordAudit({
    action: "commission.adjusted",
    entityType: "AgencyCommissionRule",
    entityId: existing.id,
    organizationId: input.investorOrganizationId,
    actorUserId: input.actorUserId,
    newValues: { deleted: true },
  });
}

export async function listCommissionRules(input: {
  investorOrganizationId: string;
  agencyConnectionId?: string;
  projectId?: string;
}) {
  const where: Prisma.AgencyCommissionRuleWhereInput = {
    investorOrganizationId: input.investorOrganizationId,
    ...(input.agencyConnectionId ? { agencyConnectionId: input.agencyConnectionId } : {}),
    ...(input.projectId ? { projectId: input.projectId } : {}),
  };
  return prisma.agencyCommissionRule.findMany({
    where,
    orderBy: [{ createdAt: "desc" }],
  });
}

/**
 * DB-backed convenience wrapper around the pure resolver. Loads all
 * candidate rules for the (investor, project) pair and passes them through
 * `resolveCommissionRule` from `./rules.ts`.
 */
export async function resolveApplicableRule(input: {
  investorOrganizationId: string;
  agencyConnectionId: string;
  projectId: string;
  unitId?: string | null;
  at?: Date;
}): Promise<ResolvedRule | null> {
  const candidates = await prisma.agencyCommissionRule.findMany({
    where: {
      investorOrganizationId: input.investorOrganizationId,
      OR: [
        { agencyConnectionId: input.agencyConnectionId },
        { agencyConnectionId: null, projectId: input.projectId },
      ],
    },
  });
  return resolveCommissionRule(candidates, {
    agencyConnectionId: input.agencyConnectionId,
    projectId: input.projectId,
    unitId: input.unitId ?? null,
    at: input.at,
  });
}
