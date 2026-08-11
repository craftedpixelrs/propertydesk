import "server-only";
import type { DueDateAnchor, Prisma } from "@prisma/client";
import Decimal from "decimal.js";

import { prisma } from "@/server/db/prisma";
import { DomainErrors } from "@/lib/errors";
import { recordAudit } from "@/server/audit/audit";
import { toDecimal } from "@/lib/formatters/money";

/**
 * PaymentPlanTemplatesService — investor blueprints for installment
 * plans.
 *
 * Scope precedence:
 *   * `projectId = null` — organization-wide default template. Applies
 *     to every sale unless a project-level template overrides it.
 *   * `projectId = <project>` — project-specific override. Wins over
 *     the org-level default when both exist for the caller's project.
 *
 * Behaviour notes:
 *   * At most ONE template of each scope may be `isDefault=true`. When
 *     an operator toggles the flag, the previous default of that scope
 *     (same organization + same projectId) is demoted in the same tx.
 *   * Percentages of a template's items MUST sum to exactly 100 with a
 *     0.001% tolerance. Enforced on save.
 *   * `resolveDueDates` returns `null` for anchors that cannot be
 *     resolved (e.g. HANDOVER when `plannedHandoverDate` is missing).
 *     Callers surface these as "postavi ručno".
 *   * `applyTemplateToDraft` is pure — it does NOT create a plan. It
 *     only returns the rows a client-side PaymentPlanForm can then
 *     fine-tune before submitting the MANUAL create endpoint.
 */

const PCT_TOLERANCE = new Decimal("0.001");

export interface TemplateItemInput {
  label: string;
  percentage: number | string;
  dueDateAnchor: DueDateAnchor;
  offsetDays: number;
}

export interface CreateTemplateInput {
  organizationId: string;
  actorUserId: string;
  projectId?: string | null;
  name: string;
  description?: string | null;
  isDefault?: boolean;
  items: TemplateItemInput[];
}

export interface UpdateTemplateInput {
  organizationId: string;
  actorUserId: string;
  templateId: string;
  name?: string;
  description?: string | null;
  projectId?: string | null;
  isDefault?: boolean;
  items?: TemplateItemInput[];
}

function assertItems(items: TemplateItemInput[]): void {
  if (!Array.isArray(items) || items.length === 0) {
    throw DomainErrors.badRequest("Šablon mora imati bar jednu stavku.");
  }
  const total = items.reduce<Decimal>(
    (acc, it) => acc.plus(toDecimal(it.percentage)),
    new Decimal(0),
  );
  if (total.minus(100).abs().gt(PCT_TOLERANCE)) {
    throw DomainErrors.badRequest(
      `Zbir procenata mora biti tačno 100% (dobili smo ${total.toString()}%).`,
    );
  }
  for (const it of items) {
    if (!it.label?.trim()) {
      throw DomainErrors.badRequest("Naziv stavke ne sme biti prazan.");
    }
    const pct = toDecimal(it.percentage);
    if (pct.lte(0)) {
      throw DomainErrors.badRequest("Procenat stavke mora biti pozitivan.");
    }
    if (!Number.isInteger(it.offsetDays)) {
      throw DomainErrors.badRequest("Pomeraj u danima mora biti ceo broj.");
    }
  }
}

async function assertProjectBelongsToOrg(
  tx: Prisma.TransactionClient,
  organizationId: string,
  projectId: string,
): Promise<void> {
  const p = await tx.project.findFirst({
    where: { id: projectId, organizationId },
    select: { id: true },
  });
  if (!p) throw DomainErrors.notFound("Projekat");
}

/**
 * Returns every template owned by `organizationId`. When `projectId`
 * is provided, restricts to (a) that project's templates + (b) the
 * org-level defaults (projectId=NULL). Sorted so project templates
 * come first, then org defaults, then by name.
 */
export async function listTemplates(input: {
  organizationId: string;
  projectId?: string | null;
}) {
  const where: Prisma.PaymentPlanTemplateWhereInput = {
    organizationId: input.organizationId,
    ...(input.projectId
      ? { OR: [{ projectId: input.projectId }, { projectId: null }] }
      : {}),
  };
  return prisma.paymentPlanTemplate.findMany({
    where,
    include: {
      items: { orderBy: { sequenceNumber: "asc" } },
      project: { select: { id: true, name: true } },
    },
    orderBy: [{ projectId: "desc" }, { isDefault: "desc" }, { name: "asc" }],
  });
}

export async function getTemplate(input: {
  organizationId: string;
  templateId: string;
}) {
  const tmpl = await prisma.paymentPlanTemplate.findFirst({
    where: { id: input.templateId, organizationId: input.organizationId },
    include: {
      items: { orderBy: { sequenceNumber: "asc" } },
      project: { select: { id: true, name: true } },
    },
  });
  if (!tmpl) throw DomainErrors.notFound("Šablon");
  return tmpl;
}

export async function createTemplate(input: CreateTemplateInput) {
  assertItems(input.items);
  if (!input.name?.trim()) {
    throw DomainErrors.badRequest("Naziv šablona je obavezan.");
  }
  const projectId = input.projectId ?? null;

  const created = await prisma.$transaction(async (tx) => {
    if (projectId) {
      await assertProjectBelongsToOrg(tx, input.organizationId, projectId);
    }
    if (input.isDefault) {
      // Demote any previous default in the same scope.
      await tx.paymentPlanTemplate.updateMany({
        where: {
          organizationId: input.organizationId,
          projectId,
          isDefault: true,
        },
        data: { isDefault: false },
      });
    }
    return tx.paymentPlanTemplate.create({
      data: {
        organizationId: input.organizationId,
        projectId,
        name: input.name.trim(),
        description: input.description?.trim() || null,
        isDefault: Boolean(input.isDefault),
        items: {
          create: input.items.map((it, idx) => ({
            sequenceNumber: idx + 1,
            label: it.label.trim(),
            percentage: toDecimal(it.percentage).toDecimalPlaces(3).toString(),
            dueDateAnchor: it.dueDateAnchor,
            offsetDays: it.offsetDays,
          })),
        },
      },
      include: {
        items: { orderBy: { sequenceNumber: "asc" } },
      },
    });
  });

  await recordAudit({
    action: "payment_plan_template.created",
    entityType: "PaymentPlanTemplate",
    entityId: created.id,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    newValues: {
      name: created.name,
      projectId,
      isDefault: created.isDefault,
      items: created.items.length,
    },
  });
  return created;
}

export async function updateTemplate(input: UpdateTemplateInput) {
  const existing = await prisma.paymentPlanTemplate.findFirst({
    where: { id: input.templateId, organizationId: input.organizationId },
    select: { id: true, projectId: true },
  });
  if (!existing) throw DomainErrors.notFound("Šablon");

  const nextProjectId =
    input.projectId === undefined ? existing.projectId : input.projectId;
  if (input.items) assertItems(input.items);

  const updated = await prisma.$transaction(async (tx) => {
    if (nextProjectId && nextProjectId !== existing.projectId) {
      await assertProjectBelongsToOrg(tx, input.organizationId, nextProjectId);
    }
    if (input.isDefault) {
      await tx.paymentPlanTemplate.updateMany({
        where: {
          organizationId: input.organizationId,
          projectId: nextProjectId,
          isDefault: true,
          NOT: { id: existing.id },
        },
        data: { isDefault: false },
      });
    }
    if (input.items) {
      await tx.paymentPlanTemplateItem.deleteMany({
        where: { templateId: existing.id },
      });
      await tx.paymentPlanTemplateItem.createMany({
        data: input.items.map((it, idx) => ({
          templateId: existing.id,
          sequenceNumber: idx + 1,
          label: it.label.trim(),
          percentage: toDecimal(it.percentage).toDecimalPlaces(3).toString(),
          dueDateAnchor: it.dueDateAnchor,
          offsetDays: it.offsetDays,
        })),
      });
    }
    return tx.paymentPlanTemplate.update({
      where: { id: existing.id },
      data: {
        name: input.name?.trim() ?? undefined,
        description:
          input.description === undefined
            ? undefined
            : input.description?.trim() || null,
        projectId: input.projectId === undefined ? undefined : nextProjectId,
        isDefault: input.isDefault ?? undefined,
      },
      include: {
        items: { orderBy: { sequenceNumber: "asc" } },
      },
    });
  });

  await recordAudit({
    action: "payment_plan_template.updated",
    entityType: "PaymentPlanTemplate",
    entityId: updated.id,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    newValues: {
      name: updated.name,
      projectId: updated.projectId,
      isDefault: updated.isDefault,
      items: updated.items.length,
    },
  });
  return updated;
}

export async function deleteTemplate(input: {
  organizationId: string;
  actorUserId: string;
  templateId: string;
}) {
  const existing = await prisma.paymentPlanTemplate.findFirst({
    where: { id: input.templateId, organizationId: input.organizationId },
    select: { id: true, name: true },
  });
  if (!existing) throw DomainErrors.notFound("Šablon");
  await prisma.paymentPlanTemplate.delete({ where: { id: existing.id } });
  await recordAudit({
    action: "payment_plan_template.deleted",
    entityType: "PaymentPlanTemplate",
    entityId: existing.id,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    newValues: { name: existing.name },
  });
}

// ---------------------------------------------------------------------------
// Apply-template helpers
// ---------------------------------------------------------------------------

export interface ResolvedTemplateRow {
  sequenceNumber: number;
  label: string;
  percentage: string;
  amount: string;
  /**
   * `null` means the item's anchor could not be resolved (e.g.
   * HANDOVER but the sale has no plannedHandoverDate). The UI shows
   * this as "postavi ručno" and the operator must fill it before
   * submitting the plan.
   */
  dueDate: string | null;
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

/**
 * Given a template + anchor dates from a Sale, compute concrete due
 * dates for every item. Pure function; safe to unit-test.
 */
export function resolveDueDates(input: {
  items: {
    sequenceNumber: number;
    label: string;
    percentage: string | Decimal | number;
    dueDateAnchor: DueDateAnchor;
    offsetDays: number;
  }[];
  contractDate?: Date | null;
  plannedHandoverDate?: Date | null;
  today?: Date;
}): { sequenceNumber: number; dueDate: Date | null }[] {
  const today = input.today ?? new Date();
  return input.items.map((it) => {
    let base: Date | null = null;
    if (it.dueDateAnchor === "CONTRACT") {
      base = input.contractDate ?? null;
    } else if (it.dueDateAnchor === "HANDOVER") {
      base = input.plannedHandoverDate ?? null;
    } else if (it.dueDateAnchor === "CUSTOM_OFFSET") {
      // Offset from *today* — a "just in N days" schedule that doesn't
      // depend on any sale-level date. Useful for reservations that
      // become sales before the contract is signed.
      base = today;
    }
    if (!base) return { sequenceNumber: it.sequenceNumber, dueDate: null };
    return {
      sequenceNumber: it.sequenceNumber,
      dueDate: addDays(base, it.offsetDays),
    };
  });
}

/**
 * Resolve a template against a specific Sale and return draft rows
 * ready to be plugged into `PaymentPlanForm` (MANUAL mode). Does NOT
 * persist a plan — the client can still edit each row before hitting
 * "Sačuvaj plan".
 */
export async function applyTemplateToDraft(input: {
  organizationId: string;
  templateId: string;
  saleId: string;
}): Promise<{
  template: {
    id: string;
    name: string;
  };
  currency: string;
  finalPrice: string;
  rows: ResolvedTemplateRow[];
}> {
  const [template, sale] = await Promise.all([
    prisma.paymentPlanTemplate.findFirst({
      where: {
        id: input.templateId,
        organizationId: input.organizationId,
      },
      include: {
        items: { orderBy: { sequenceNumber: "asc" } },
      },
    }),
    prisma.sale.findFirst({
      where: { id: input.saleId, organizationId: input.organizationId },
      select: {
        id: true,
        finalPrice: true,
        currency: true,
        contractDate: true,
        plannedHandoverDate: true,
      },
    }),
  ]);
  if (!template) throw DomainErrors.notFound("Šablon");
  if (!sale) throw DomainErrors.notFound("Prodaja");

  const finalPrice = toDecimal(sale.finalPrice);
  const dates = resolveDueDates({
    items: template.items,
    contractDate: sale.contractDate,
    plannedHandoverDate: sale.plannedHandoverDate,
  });
  // Absorb rounding delta into the last row so the sum matches
  // `finalPrice` exactly to two decimals.
  const rawAmounts = template.items.map((it) =>
    finalPrice.times(toDecimal(it.percentage)).dividedBy(100).toDecimalPlaces(2),
  );
  const derived = rawAmounts.reduce<Decimal>(
    (acc, d) => acc.plus(d),
    new Decimal(0),
  );
  const delta = finalPrice.minus(derived);
  if (!delta.isZero() && rawAmounts.length > 0) {
    rawAmounts[rawAmounts.length - 1] = rawAmounts[rawAmounts.length - 1]!
      .plus(delta)
      .toDecimalPlaces(2);
  }

  const rows: ResolvedTemplateRow[] = template.items.map((it, idx) => {
    const resolved = dates.find((d) => d.sequenceNumber === it.sequenceNumber);
    return {
      sequenceNumber: it.sequenceNumber,
      label: it.label,
      percentage: toDecimal(it.percentage).toDecimalPlaces(3).toString(),
      amount: rawAmounts[idx]!.toString(),
      dueDate: resolved?.dueDate ? resolved.dueDate.toISOString() : null,
    };
  });

  return {
    template: { id: template.id, name: template.name },
    currency: sale.currency,
    finalPrice: finalPrice.toString(),
    rows,
  };
}

// ---------------------------------------------------------------------------
// Add-installment-to-existing-plan
// ---------------------------------------------------------------------------

export interface AddInstallmentInput {
  organizationId: string;
  actorUserId: string;
  saleId: string;
  label: string;
  amount: number | string;
  dueDate: string | Date;
  notes?: string | null;
}

/**
 * Append a single new installment to an existing PaymentPlan without
 * touching the invariant that "sum(amounts) == finalPrice". This is
 * intentional: operators explicitly want the ability to add extra
 * rows (late fees, penalty payments, agreed adjustments) that the
 * UI will flag as an overrun. Any COMPLETED plan is auto-flipped
 * back to ACTIVE so the new row is not orphaned.
 */
export async function addInstallmentToExistingPlan(input: AddInstallmentInput) {
  if (!input.label?.trim()) {
    throw DomainErrors.badRequest("Naziv rate je obavezan.");
  }
  const amt = toDecimal(input.amount).toDecimalPlaces(2);
  if (amt.lte(0)) {
    throw DomainErrors.badRequest("Iznos rate mora biti pozitivan.");
  }
  const dueDate =
    input.dueDate instanceof Date ? input.dueDate : new Date(input.dueDate);
  if (Number.isNaN(dueDate.getTime())) {
    throw DomainErrors.badRequest("Neispravan datum dospeća.");
  }

  const sale = await prisma.sale.findFirst({
    where: { id: input.saleId, organizationId: input.organizationId },
    select: {
      id: true,
      finalPrice: true,
      paymentPlan: { select: { id: true, status: true } },
    },
  });
  if (!sale) throw DomainErrors.notFound("Prodaja");
  if (!sale.paymentPlan) {
    throw DomainErrors.invalidState(
      "Prodaja nema aktivan plan plaćanja. Kreirajte plan pre nego što dodate ratu.",
    );
  }
  if (sale.paymentPlan.status === "CANCELED") {
    throw DomainErrors.invalidState("Ne možete dodati ratu u otkazan plan.");
  }

  const planId = sale.paymentPlan.id;
  const result = await prisma.$transaction(async (tx) => {
    const maxSeq = await tx.paymentInstallment.aggregate({
      where: { paymentPlanId: planId },
      _max: { sequenceNumber: true },
    });
    const nextSeq = (maxSeq._max.sequenceNumber ?? 0) + 1;
    const created = await tx.paymentInstallment.create({
      data: {
        paymentPlanId: planId,
        sequenceNumber: nextSeq,
        name: input.label.trim(),
        amount: amt.toString(),
        percentage: null,
        dueDate,
        status: "UPCOMING",
        notes: input.notes?.trim() || null,
      },
    });
    if (sale.paymentPlan!.status === "COMPLETED") {
      await tx.paymentPlan.update({
        where: { id: planId },
        data: { status: "ACTIVE" },
      });
    }
    return created;
  });

  await recordAudit({
    action: "payment_plan.installment_added",
    entityType: "PaymentPlan",
    entityId: planId,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    newValues: {
      installmentId: result.id,
      label: result.name,
      amount: result.amount.toString(),
      dueDate: result.dueDate.toISOString(),
    },
  });
  return result;
}
