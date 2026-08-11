import "server-only";
import type { SaleContractTemplate } from "@prisma/client";
import { createId } from "@paralleldrive/cuid2";

import { prisma } from "@/server/db/prisma";
import { DomainErrors } from "@/lib/errors";
import { recordAudit } from "@/server/audit/audit";
import { safeSubstitute } from "@/server/services/billing/emails/templates";
import { toDecimal } from "@/lib/formatters/money";

/**
 * SaleContractsService — Faza 8.1 (A1).
 *
 * Two moving parts:
 *   1. `SaleContractTemplate` — investor-owned HTML blueprint with
 *      `{{var}}` placeholders. Two kinds: `PRE_CONTRACT` (predugovor)
 *      and `CONTRACT` (ugovor). Multiple templates per kind are
 *      allowed so the operator can swap wording per project /
 *      buyer profile.
 *   2. Per-sale contract lifecycle stored on `sale.contractStatus`
 *      (NONE → GENERATED → SENT → SIGNED). Cancelling resets the
 *      status back to NONE and clears sent/signed timestamps.
 *
 * Placeholder substitution reuses `safeSubstitute` from the billing
 * email pipeline: whitelisted variable names, HTML-escaped values,
 * unknown names silently replaced with an empty string. There is NO
 * arbitrary evaluation, so operator wording changes cannot introduce
 * XSS or code-execution.
 */

const REQUIRED_VARIABLES: readonly string[] = [
  "buyer.fullName",
  "buyer.identity",
  "unit.code",
  "unit.projectName",
  "sale.finalPrice",
  "sale.currency",
  "investor.legalName",
  "today",
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreateSaleContractTemplateInput {
  organizationId: string;
  actorUserId: string;
  kind: "PRE_CONTRACT" | "CONTRACT";
  name: string;
  description?: string | null;
  contentHtml: string;
  variables?: string[] | null;
  isActive?: boolean;
}

export interface UpdateSaleContractTemplateInput {
  organizationId: string;
  actorUserId: string;
  templateId: string;
  name?: string;
  description?: string | null;
  contentHtml?: string;
  variables?: string[] | null;
  isActive?: boolean;
  kind?: "PRE_CONTRACT" | "CONTRACT";
}

export interface RenderSaleContractInput {
  organizationId: string;
  saleId: string;
  templateId: string;
}

export interface RenderedSaleContract {
  templateId: string;
  templateName: string;
  kind: "PRE_CONTRACT" | "CONTRACT";
  html: string;
  filename: string;
  variables: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Template CRUD
// ---------------------------------------------------------------------------

function assertTemplateContent(html: string): void {
  const trimmed = (html ?? "").trim();
  if (!trimmed) {
    throw DomainErrors.badRequest("Sadržaj ugovora ne sme biti prazan.");
  }
  if (trimmed.length > 200_000) {
    throw DomainErrors.badRequest(
      "Sadržaj ugovora je prevelik (max 200 000 karaktera).",
    );
  }
}

export async function listContractTemplates(input: {
  organizationId: string;
  kind?: "PRE_CONTRACT" | "CONTRACT";
  activeOnly?: boolean;
}): Promise<SaleContractTemplate[]> {
  return prisma.saleContractTemplate.findMany({
    where: {
      organizationId: input.organizationId,
      ...(input.kind ? { kind: input.kind } : {}),
      ...(input.activeOnly ? { isActive: true } : {}),
    },
    orderBy: [{ kind: "asc" }, { isActive: "desc" }, { name: "asc" }],
  });
}

export async function getContractTemplate(input: {
  organizationId: string;
  templateId: string;
}): Promise<SaleContractTemplate> {
  const row = await prisma.saleContractTemplate.findFirst({
    where: { id: input.templateId, organizationId: input.organizationId },
  });
  if (!row) throw DomainErrors.notFound("Šablon ugovora");
  return row;
}

export async function createContractTemplate(
  input: CreateSaleContractTemplateInput,
): Promise<SaleContractTemplate> {
  if (!input.name?.trim()) {
    throw DomainErrors.badRequest("Naziv šablona je obavezan.");
  }
  assertTemplateContent(input.contentHtml);

  const created = await prisma.saleContractTemplate.create({
    data: {
      id: createId(),
      organizationId: input.organizationId,
      kind: input.kind,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      contentHtml: input.contentHtml,
      variables: (input.variables ?? REQUIRED_VARIABLES) as unknown as object,
      isActive: input.isActive ?? true,
    },
  });

  await recordAudit({
    action: "sale_contract_template.created",
    entityType: "SaleContractTemplate",
    entityId: created.id,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    newValues: {
      kind: created.kind,
      name: created.name,
      isActive: created.isActive,
    },
  });
  return created;
}

export async function updateContractTemplate(
  input: UpdateSaleContractTemplateInput,
): Promise<SaleContractTemplate> {
  const existing = await getContractTemplate({
    organizationId: input.organizationId,
    templateId: input.templateId,
  });
  if (input.contentHtml !== undefined) assertTemplateContent(input.contentHtml);

  const updated = await prisma.saleContractTemplate.update({
    where: { id: existing.id },
    data: {
      kind: input.kind ?? undefined,
      name: input.name?.trim() ?? undefined,
      description:
        input.description === undefined
          ? undefined
          : input.description?.trim() || null,
      contentHtml: input.contentHtml ?? undefined,
      variables:
        input.variables === undefined
          ? undefined
          : ((input.variables ?? []) as unknown as object),
      isActive: input.isActive ?? undefined,
    },
  });

  await recordAudit({
    action: "sale_contract_template.updated",
    entityType: "SaleContractTemplate",
    entityId: updated.id,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    previousValues: {
      name: existing.name,
      kind: existing.kind,
      isActive: existing.isActive,
    },
    newValues: {
      name: updated.name,
      kind: updated.kind,
      isActive: updated.isActive,
    },
  });
  return updated;
}

export async function deleteContractTemplate(input: {
  organizationId: string;
  actorUserId: string;
  templateId: string;
}): Promise<void> {
  const existing = await getContractTemplate({
    organizationId: input.organizationId,
    templateId: input.templateId,
  });
  await prisma.saleContractTemplate.delete({ where: { id: existing.id } });
  await recordAudit({
    action: "sale_contract_template.deleted",
    entityType: "SaleContractTemplate",
    entityId: existing.id,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    newValues: { name: existing.name, kind: existing.kind },
  });
}

// ---------------------------------------------------------------------------
// Placeholder resolution + rendering
// ---------------------------------------------------------------------------

const dateFmt = new Intl.DateTimeFormat("sr-Latn-RS", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
const moneyFmt = new Intl.NumberFormat("sr-Latn-RS", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function fmtMoney(amount: string | null | undefined): string {
  if (amount == null) return "";
  try {
    return moneyFmt.format(Number(toDecimal(amount).toString()));
  } catch {
    return String(amount);
  }
}

function fmtDate(d: Date | null | undefined): string {
  if (!d) return "";
  return dateFmt.format(d);
}

const VAT_MODE_LABELS: Record<string, string> = {
  NEW_BUILD_10: "PDV 10% (novogradnja)",
  SECONDARY_MARKET_2_5: "PPAP 2,5% (sekundarno tržište)",
  NONE: "Bez poreza",
};

async function buildPlaceholders(input: {
  organizationId: string;
  saleId: string;
}): Promise<Record<string, string>> {
  const [sale, org, orgProfile] = await Promise.all([
    prisma.sale.findFirst({
      where: { id: input.saleId, organizationId: input.organizationId },
      include: {
        unit: {
          select: {
            id: true,
            code: true,
            totalArea: true,
            internalArea: true,
            floorPlanUrl: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            postalCode: true,
          },
        },
        buyer: true,
        paymentPlan: {
          include: {
            installments: { orderBy: { sequenceNumber: "asc" } },
          },
        },
      },
    }),
    prisma.organization.findUnique({
      where: { id: input.organizationId },
      select: { id: true, name: true },
    }),
    prisma.organizationProfile.findUnique({
      where: { organizationId: input.organizationId },
    }),
  ]);
  if (!sale) throw DomainErrors.notFound("Prodaja");
  if (!org) throw DomainErrors.notFound("Organizacija");

  const buyerFullName =
    sale.buyer.entityType === "LEGAL"
      ? (sale.buyer.legalName || `${sale.buyer.firstName} ${sale.buyer.lastName}`)
      : `${sale.buyer.firstName} ${sale.buyer.lastName}`;
  const buyerIdentity =
    sale.buyer.entityType === "LEGAL"
      ? (sale.buyer.taxId ? `PIB ${sale.buyer.taxId}` : "")
      : (sale.buyer.jmbg ? `JMBG ${sale.buyer.jmbg}` : "");
  const buyerAddress = [
    sale.buyer.addressLine1,
    sale.buyer.postalCode ? `${sale.buyer.postalCode} ${sale.buyer.city ?? ""}` : sale.buyer.city ?? "",
    sale.buyer.country,
  ]
    .filter(Boolean)
    .join(", ");

  const installmentsHtml = sale.paymentPlan
    ? buildInstallmentsHtml(sale.paymentPlan.installments, sale.currency)
    : "";

  return {
    "buyer.fullName": buyerFullName,
    "buyer.firstName": sale.buyer.firstName,
    "buyer.lastName": sale.buyer.lastName,
    "buyer.jmbg": sale.buyer.jmbg ?? "",
    "buyer.identityNumber": sale.buyer.identityNumber ?? "",
    "buyer.taxId": sale.buyer.taxId ?? "",
    "buyer.legalName": sale.buyer.legalName ?? "",
    "buyer.identity": buyerIdentity,
    "buyer.email": sale.buyer.email ?? "",
    "buyer.phone": sale.buyer.phone ?? "",
    "buyer.address": buyerAddress,

    "unit.code": sale.unit.code,
    "unit.address": [
      sale.project.address,
      sale.project.postalCode ? `${sale.project.postalCode} ${sale.project.city ?? ""}` : sale.project.city ?? "",
    ]
      .filter(Boolean)
      .join(", "),
    "unit.totalArea": sale.unit.totalArea.toString(),
    "unit.internalArea": sale.unit.internalArea?.toString() ?? "",
    "unit.projectName": sale.project.name,

    "sale.listPrice": fmtMoney(sale.listPrice.toString()),
    "sale.finalPrice": fmtMoney(sale.finalPrice.toString()),
    "sale.depositAmount": fmtMoney(sale.depositAmount?.toString() ?? null),
    "sale.currency": sale.currency,
    "sale.contractDate": fmtDate(sale.contractDate),
    "sale.preContractDate": fmtDate(sale.preContractDate),
    "sale.plannedHandoverDate": fmtDate(sale.plannedHandoverDate),

    "tax.mode": sale.vatMode ? VAT_MODE_LABELS[sale.vatMode] ?? sale.vatMode : "",
    "tax.amount": fmtMoney(sale.taxAmount?.toString() ?? null),
    "tax.payer": sale.taxPayer === "SELLER" ? "prodavac" : "kupac",

    "plan.installments": installmentsHtml,

    "investor.legalName":
      orgProfile?.legalName || org.name,
    "investor.pib": orgProfile?.taxNumber ?? "",
    "investor.registrationNumber": orgProfile?.registrationNumber ?? "",
    "investor.address": [
      orgProfile?.address,
      orgProfile?.postalCode ? `${orgProfile.postalCode} ${orgProfile.city ?? ""}` : orgProfile?.city ?? "",
    ]
      .filter(Boolean)
      .join(", "),

    today: fmtDate(new Date()),
  };
}

function buildInstallmentsHtml(
  installments: Array<{
    sequenceNumber: number;
    name: string;
    amount: unknown;
    dueDate: Date;
  }>,
  currency: string,
): string {
  if (installments.length === 0) return "<p>Bez rata.</p>";
  const rows = installments
    .map((it, idx) => {
      const amt = fmtMoney((it.amount as { toString(): string }).toString());
      return `<tr><td>${idx + 1}. ${escapeHtml(it.name)}</td><td>${fmtDate(it.dueDate)}</td><td style="text-align:right">${amt} ${escapeHtml(currency)}</td></tr>`;
    })
    .join("");
  return `<table style="width:100%;border-collapse:collapse;margin:12px 0"><thead><tr><th style="text-align:left;border-bottom:1px solid #999">Rata</th><th style="text-align:left;border-bottom:1px solid #999">Rok</th><th style="text-align:right;border-bottom:1px solid #999">Iznos</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function escapeHtml(v: string): string {
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Substitute the template's `{{var}}` placeholders against a live
 * Sale. Pure — never mutates the sale.
 */
export async function renderSaleContractHtml(
  input: RenderSaleContractInput,
): Promise<RenderedSaleContract> {
  const [template, variables] = await Promise.all([
    getContractTemplate({
      organizationId: input.organizationId,
      templateId: input.templateId,
    }),
    buildPlaceholders({
      organizationId: input.organizationId,
      saleId: input.saleId,
    }),
  ]);
  if (!template.isActive) {
    throw DomainErrors.invalidState("Šablon je deaktiviran.");
  }
  const html = safeSubstitute(template.contentHtml, variables);
  const filename = [
    template.kind === "PRE_CONTRACT" ? "predugovor" : "ugovor",
    (variables["unit.code"] || "prodaja").replace(/[^\w\-]/g, "_"),
    new Date().toISOString().slice(0, 10),
  ].join("_");

  return {
    templateId: template.id,
    templateName: template.name,
    kind: template.kind,
    html,
    filename,
    variables,
  };
}

// ---------------------------------------------------------------------------
// Lifecycle transitions
// ---------------------------------------------------------------------------

export async function markContractGenerated(input: {
  organizationId: string;
  actorUserId: string;
  saleId: string;
  templateId: string;
}) {
  const updated = await prisma.sale.update({
    where: { id: input.saleId },
    data: {
      contractStatus: "GENERATED",
      contractTemplateId: input.templateId,
    },
    select: { id: true, contractStatus: true, contractTemplateId: true },
  });
  await recordAudit({
    action: "sale.contract_generated",
    entityType: "Sale",
    entityId: updated.id,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    newValues: {
      contractStatus: updated.contractStatus,
      templateId: updated.contractTemplateId,
    },
  });
  return updated;
}

export async function markContractSent(input: {
  organizationId: string;
  actorUserId: string;
  saleId: string;
}) {
  const sale = await prisma.sale.findFirst({
    where: { id: input.saleId, organizationId: input.organizationId },
    select: { id: true, contractStatus: true },
  });
  if (!sale) throw DomainErrors.notFound("Prodaja");
  if (sale.contractStatus === "NONE") {
    throw DomainErrors.invalidState("Prvo generišite ugovor.");
  }
  const updated = await prisma.sale.update({
    where: { id: sale.id },
    data: {
      contractStatus: "SENT",
      contractSentAt: new Date(),
    },
    select: { id: true, contractStatus: true },
  });
  await recordAudit({
    action: "sale.contract_sent",
    entityType: "Sale",
    entityId: updated.id,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    newValues: { contractStatus: updated.contractStatus },
  });
  return updated;
}

export async function markContractSigned(input: {
  organizationId: string;
  actorUserId: string;
  saleId: string;
}) {
  const sale = await prisma.sale.findFirst({
    where: { id: input.saleId, organizationId: input.organizationId },
    select: { id: true, contractStatus: true },
  });
  if (!sale) throw DomainErrors.notFound("Prodaja");
  if (sale.contractStatus === "NONE") {
    throw DomainErrors.invalidState("Prvo generišite ugovor.");
  }
  const updated = await prisma.sale.update({
    where: { id: sale.id },
    data: {
      contractStatus: "SIGNED",
      contractSignedAt: new Date(),
    },
    select: { id: true, contractStatus: true, contractSignedAt: true },
  });
  await recordAudit({
    action: "sale.contract_signed",
    entityType: "Sale",
    entityId: updated.id,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    newValues: {
      contractStatus: updated.contractStatus,
      contractSignedAt: updated.contractSignedAt,
    },
  });
  return updated;
}

export async function markContractCanceled(input: {
  organizationId: string;
  actorUserId: string;
  saleId: string;
}) {
  const updated = await prisma.sale.update({
    where: { id: input.saleId },
    data: {
      contractStatus: "CANCELED",
    },
    select: { id: true, contractStatus: true },
  });
  await recordAudit({
    action: "sale.contract_canceled",
    entityType: "Sale",
    entityId: updated.id,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    newValues: { contractStatus: updated.contractStatus },
  });
  return updated;
}
