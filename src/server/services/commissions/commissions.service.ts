import "server-only";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/server/db/prisma";

/**
 * Agency-scoped read of Commission rows.
 *
 * Phase 4 does not create/mutate any `Commission` rows — that is Phase 5's
 * job (snapshot at sale, approve/invoice/paid lifecycle). This service only
 * exposes existing rows to the agency portal, and only with agency-safe
 * fields.
 */

export interface AgencyCommissionListInput {
  agencyOrganizationId: string;
  page: number;
  pageSize: number;
}

export interface AgencyCommissionDto {
  id: string;
  status: string;
  calculationType: string;
  rate: string | null;
  baseAmount: string;
  amount: string;
  currency: string;
  createdAt: Date;
  approvedAt: Date | null;
  invoicedAt: Date | null;
  paidAt: Date | null;
  saleId: string;
  agencyVisibleNote: string | null;
}

export async function listAgencyCommissions(
  input: AgencyCommissionListInput,
): Promise<{ items: AgencyCommissionDto[]; total: number }> {
  const where: Prisma.CommissionWhereInput = {
    agencyOrganizationId: input.agencyOrganizationId,
  };
  const [total, rows] = await Promise.all([
    prisma.commission.count({ where }),
    prisma.commission.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
    }),
  ]);
  const items: AgencyCommissionDto[] = rows.map((row) => ({
    id: row.id,
    status: row.status,
    calculationType: row.calculationType,
    rate: row.rate ? row.rate.toString() : null,
    baseAmount: row.baseAmount.toString(),
    amount: (row.adjustedAmount ?? row.calculatedAmount).toString(),
    currency: row.currency,
    createdAt: row.createdAt,
    approvedAt: row.approvedAt,
    invoicedAt: row.invoicedAt,
    paidAt: row.paidAt,
    saleId: row.saleId,
    agencyVisibleNote: row.notes,
  }));
  return { items, total };
}
