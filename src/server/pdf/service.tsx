import "server-only";
import Decimal from "decimal.js";

import { prisma } from "@/server/db/prisma";
import { DomainErrors } from "@/lib/errors";
import { toDecimal, sumMoney } from "@/lib/formatters/money";
import type { SupportedCurrency } from "@/lib/constants/app";
import type { UnitOfferPdfData } from "./documents/unit-offer";
import { UnitOfferPdf } from "./documents/unit-offer";
import type { PriceListPdfData } from "./documents/price-list";
import { PriceListPdf } from "./documents/price-list";
import type { SaleSummaryPdfData } from "./documents/sale-summary";
import { SaleSummaryPdf } from "./documents/sale-summary";
import type { CommissionStatementPdfData } from "./documents/commission-statement";
import { CommissionStatementPdf } from "./documents/commission-statement";
import type { InvoicePdfData } from "./documents/invoice";
import { InvoicePdf } from "./documents/invoice";
import type { SaleContractPdfData } from "./documents/sale-contract";
import { SaleContractPdf } from "./documents/sale-contract";
import { renderPdf } from "./render";
import { renderSaleContractHtml } from "@/server/services/sales/contracts.service";
import { serbianIpsQrProvider } from "@/server/services/billing/ips-qr";
import {
  buildBankAccountSnapshot,
  buildCustomerSnapshot,
  buildIssuerSnapshot,
  type BankAccountSnapshot,
  type CustomerSnapshot,
  type IssuerSnapshot,
} from "@/server/services/billing/invoices/service";

/**
 * PDF service — the API routes call these functions with a raw entity id and
 * receive a rendered `Buffer`. Data assembly + rendering are colocated here so
 * a caller cannot accidentally leak an out-of-scope Prisma include into the
 * template. Each function scopes strictly by `organizationId`.
 */

// -----------------------------------------------------------------------------
// Unit offer
// -----------------------------------------------------------------------------

export async function renderUnitOfferPdf(input: {
  organizationId: string;
  unitId: string;
  buyerId?: string | null;
  agentUserId?: string | null;
  validUntil?: Date | null;
  notes?: string | null;
}): Promise<Buffer> {
  const [unit, org, buyer, agent] = await Promise.all([
    prisma.unit.findFirst({
      where: { id: input.unitId, organizationId: input.organizationId },
      include: {
        project: { select: { name: true } },
        building: { select: { name: true } },
        floor: { select: { number: true, label: true } },
      },
    }),
    prisma.organization.findUnique({
      where: { id: input.organizationId },
      select: { name: true },
    }),
    input.buyerId
      ? prisma.buyer.findFirst({
          where: { id: input.buyerId, organizationId: input.organizationId },
          select: { firstName: true, lastName: true, email: true, phone: true },
        })
      : Promise.resolve(null),
    input.agentUserId
      ? prisma.user.findUnique({
          where: { id: input.agentUserId },
          select: { name: true, email: true },
        })
      : Promise.resolve(null),
  ]);

  if (!unit) throw DomainErrors.notFound("Jedinica nije pronađena.");
  if (!org) throw DomainErrors.notFound("Organizacija nije pronađena.");

  const data: UnitOfferPdfData = {
    organizationName: org.name,
    documentNumber: `PON-${unit.code}`,
    unit: {
      code: unit.code,
      type: unit.type,
      area: toDecimal(unit.totalArea).toString(),
      rooms: unit.roomCount ? toDecimal(unit.roomCount).toString() : null,
      floor: unit.floor?.label ?? (unit.floor?.number != null ? String(unit.floor.number) : null),
      projectName: unit.project.name,
      buildingName: unit.building?.name ?? null,
      price: toDecimal(unit.finalPrice ?? unit.basePrice).toString(),
      currency: unit.currency as SupportedCurrency,
      description: unit.publicDescription ?? null,
    },
    buyer: buyer
      ? {
          fullName: `${buyer.firstName} ${buyer.lastName}`,
          email: buyer.email ?? null,
          phone: buyer.phone ?? null,
        }
      : undefined,
    agent: agent
      ? {
          fullName: agent.name ?? agent.email,
          email: agent.email ?? null,
        }
      : undefined,
    validUntil: input.validUntil ?? null,
    notes: input.notes ?? null,
  };

  return renderPdf(UnitOfferPdf(data));
}

// -----------------------------------------------------------------------------
// Price list (per project)
// -----------------------------------------------------------------------------

export async function renderPriceListPdf(input: {
  organizationId: string;
  projectId: string;
  includeSoldUnits?: boolean;
}): Promise<Buffer> {
  const [project, org, units] = await Promise.all([
    prisma.project.findFirst({
      where: { id: input.projectId, organizationId: input.organizationId },
      select: { name: true, code: true },
    }),
    prisma.organization.findUnique({
      where: { id: input.organizationId },
      select: { name: true },
    }),
    prisma.unit.findMany({
      where: {
        projectId: input.projectId,
        organizationId: input.organizationId,
        archivedAt: null,
        ...(input.includeSoldUnits
          ? {}
          : { status: { notIn: ["SOLD", "BLOCKED", "NOT_FOR_SALE"] } }),
      },
      orderBy: [{ code: "asc" }],
      include: {
        floor: { select: { number: true, label: true } },
      },
    }),
  ]);

  if (!project) throw DomainErrors.notFound("Projekat nije pronađen.");
  if (!org) throw DomainErrors.notFound("Organizacija nije pronađena.");

  const data: PriceListPdfData = {
    organizationName: org.name,
    projectName: project.name,
    documentNumber: `CEN-${project.code}`,
    units: units.map((u) => ({
      code: u.code,
      type: u.type,
      area: toDecimal(u.totalArea).toString(),
      rooms: u.roomCount ? toDecimal(u.roomCount).toString() : null,
      floor: u.floor?.label ?? (u.floor?.number != null ? String(u.floor.number) : null),
      status: u.status,
      price: toDecimal(u.finalPrice ?? u.basePrice).toString(),
      currency: u.currency as SupportedCurrency,
    })),
  };

  return renderPdf(PriceListPdf(data));
}

// -----------------------------------------------------------------------------
// Sale summary
// -----------------------------------------------------------------------------

export async function renderSaleSummaryPdf(input: {
  organizationId: string;
  saleId: string;
}): Promise<Buffer> {
  const [sale, org] = await Promise.all([
    prisma.sale.findFirst({
      where: { id: input.saleId, organizationId: input.organizationId },
      include: {
        unit: { select: { code: true } },
        project: { select: { name: true } },
        buyer: {
          select: { firstName: true, lastName: true, email: true, phone: true },
        },
        paymentPlan: {
          include: {
            installments: { orderBy: { sequenceNumber: "asc" } },
          },
        },
        payments: { orderBy: { paymentDate: "asc" } },
      },
    }),
    prisma.organization.findUnique({
      where: { id: input.organizationId },
      select: { name: true },
    }),
  ]);

  if (!sale) throw DomainErrors.notFound("Prodaja nije pronađena.");
  if (!org) throw DomainErrors.notFound("Organizacija nije pronađena.");

  const [agency, agentUser] = await Promise.all([
    sale.agencyOrganizationId
      ? prisma.organization.findUnique({
          where: { id: sale.agencyOrganizationId },
          select: { name: true },
        })
      : Promise.resolve(null),
    sale.agencyAgentUserId
      ? prisma.user.findUnique({
          where: { id: sale.agencyAgentUserId },
          select: { name: true, email: true },
        })
      : Promise.resolve(null),
  ]);

  const activePayments = sale.payments.filter((p) => p.reversedAt == null);
  const paid = sumMoney(activePayments.map((p) => p.amount));
  const contracted = toDecimal(sale.finalPrice);
  const outstanding = contracted.minus(paid);

  const data: SaleSummaryPdfData = {
    organizationName: org.name,
    documentNumber: `PRD-${sale.id.slice(0, 8).toUpperCase()}`,
    sale: {
      id: sale.id,
      unitCode: sale.unit.code,
      projectName: sale.project.name,
      contractDate: sale.contractDate,
      listPrice: toDecimal(sale.listPrice).toString(),
      finalPrice: contracted.toString(),
      depositAmount: sale.depositAmount ? toDecimal(sale.depositAmount).toString() : null,
      currency: sale.currency as SupportedCurrency,
      status: sale.status,
    },
    buyer: {
      fullName: `${sale.buyer.firstName} ${sale.buyer.lastName}`,
      email: sale.buyer.email ?? null,
      phone: sale.buyer.phone ?? null,
    },
    agency: agency
      ? {
          name: agency.name,
          agentName: agentUser?.name ?? agentUser?.email ?? null,
        }
      : null,
    installments:
      sale.paymentPlan?.installments.map((i) => ({
        name: i.name,
        dueDate: i.dueDate,
        amount: toDecimal(i.amount).toString(),
        paid: toDecimal(i.paidAmount).toString(),
        status: i.status,
      })) ?? [],
    payments: sale.payments.map((p) => ({
      paymentDate: p.paymentDate,
      amount: toDecimal(p.amount).toString(),
      method: p.paymentMethod,
      reversed: Boolean(p.reversedAt),
    })),
    totals: {
      contracted: contracted.toString(),
      paid: paid.toString(),
      outstanding: outstanding.lt(0) ? "0" : outstanding.toString(),
    },
  };

  return renderPdf(SaleSummaryPdf(data));
}

// -----------------------------------------------------------------------------
// Commission statement (per agency)
// -----------------------------------------------------------------------------

export async function renderCommissionStatementPdf(input: {
  organizationId: string;
  agencyOrganizationId: string;
  from?: Date | null;
  to?: Date | null;
}): Promise<Buffer> {
  const [org, agency, rows] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: input.organizationId },
      select: { name: true },
    }),
    prisma.organization.findUnique({
      where: { id: input.agencyOrganizationId },
      select: {
        name: true,
        profile: { select: { address: true, taxNumber: true } },
      },
    }),
    prisma.commission.findMany({
      where: {
        investorOrganizationId: input.organizationId,
        agencyOrganizationId: input.agencyOrganizationId,
        ...(input.from || input.to
          ? {
              createdAt: {
                ...(input.from ? { gte: input.from } : {}),
                ...(input.to ? { lte: input.to } : {}),
              },
            }
          : {}),
      },
      orderBy: { createdAt: "asc" },
      include: {
        sale: {
          include: {
            unit: { select: { code: true } },
            project: { select: { name: true } },
          },
        },
      },
    }),
  ]);

  if (!org) throw DomainErrors.notFound("Organizacija nije pronađena.");
  if (!agency) throw DomainErrors.notFound("Agencija nije pronađena.");

  const currency = (rows[0]?.currency ?? "EUR") as SupportedCurrency;

  let calculated = new Decimal(0);
  let approved = new Decimal(0);
  let paid = new Decimal(0);
  for (const c of rows) {
    const amount = toDecimal(c.adjustedAmount ?? c.calculatedAmount);
    if (c.status !== "CANCELED") calculated = calculated.plus(amount);
    if (c.status === "APPROVED" || c.status === "INVOICED" || c.status === "DUE" || c.status === "PAID") {
      approved = approved.plus(amount);
    }
    if (c.status === "PAID") paid = paid.plus(amount);
  }

  const data: CommissionStatementPdfData = {
    organizationName: org.name,
    documentNumber: `PRV-${agency.name.slice(0, 6).toUpperCase()}-${new Date().toISOString().slice(0, 7)}`,
    agency: {
      name: agency.name,
      address: agency.profile?.address ?? null,
      taxNumber: agency.profile?.taxNumber ?? null,
    },
    periodStart: input.from ?? null,
    periodEnd: input.to ?? null,
    currency,
    rows: rows.map((c) => ({
      id: c.id,
      saleUnitCode: c.sale.unit.code,
      projectName: c.sale.project.name,
      contractDate: c.sale.contractDate,
      salePrice: toDecimal(c.sale.finalPrice).toString(),
      ruleDescription:
        c.calculationType === "PERCENTAGE"
          ? `${c.rate ? new Decimal(c.rate.toString()).mul(100).toString() : "—"}%`
          : `Fiksno ${toDecimal(c.fixedAmount ?? 0).toString()}`,
      calculatedAmount: toDecimal(c.calculatedAmount).toString(),
      adjustedAmount: c.adjustedAmount ? toDecimal(c.adjustedAmount).toString() : null,
      status: c.status,
    })),
    totals: {
      calculated: calculated.toString(),
      approved: approved.toString(),
      paid: paid.toString(),
    },
  };

  return renderPdf(CommissionStatementPdf(data));
}

// -----------------------------------------------------------------------------
// Sale contract (Faza 8.1 A1)
// -----------------------------------------------------------------------------

export interface RenderSaleContractPdfResult {
  buffer: Buffer;
  filename: string;
  templateId: string;
  templateName: string;
  kind: "PRE_CONTRACT" | "CONTRACT";
}

export async function renderSaleContractPdf(input: {
  organizationId: string;
  saleId: string;
  templateId: string;
}): Promise<RenderSaleContractPdfResult> {
  const [rendered, sale, org] = await Promise.all([
    renderSaleContractHtml(input),
    prisma.sale.findFirst({
      where: { id: input.saleId, organizationId: input.organizationId },
      include: {
        unit: { select: { code: true } },
        project: { select: { name: true } },
        buyer: { select: { firstName: true, lastName: true, legalName: true, entityType: true } },
      },
    }),
    prisma.organization.findUnique({
      where: { id: input.organizationId },
      select: { name: true, profile: { select: { legalName: true } } },
    }),
  ]);
  if (!sale) throw DomainErrors.notFound("Prodaja nije pronađena.");
  if (!org) throw DomainErrors.notFound("Organizacija nije pronađena.");

  const buyerFullName =
    sale.buyer.entityType === "LEGAL"
      ? (sale.buyer.legalName || `${sale.buyer.firstName} ${sale.buyer.lastName}`)
      : `${sale.buyer.firstName} ${sale.buyer.lastName}`;

  const data: SaleContractPdfData = {
    organizationName: org.profile?.legalName || org.name,
    kind: rendered.kind,
    templateName: rendered.templateName,
    html: rendered.html,
    saleUnitCode: sale.unit.code,
    saleProjectName: sale.project.name,
    buyerFullName,
    issuedAt: new Date(),
  };

  const buffer = await renderPdf(SaleContractPdf(data));
  return {
    buffer,
    filename: rendered.filename,
    templateId: rendered.templateId,
    templateName: rendered.templateName,
    kind: rendered.kind,
  };
}

// -----------------------------------------------------------------------------
// Invoice (billing)
// -----------------------------------------------------------------------------

export async function renderInvoicePdf(input: { invoiceId: string }): Promise<Buffer> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: input.invoiceId },
    include: {
      items: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!invoice) throw DomainErrors.notFound("Faktura");

  // Prefer the snapshot columns — that guarantees regenerated PDFs match the
  // original issued document even if the CompanyBillingProfile has since
  // changed. Fall back to a fresh build for DRAFT invoices.
  let issuer: IssuerSnapshot = invoice.issuerSnapshot as unknown as IssuerSnapshot;
  let customer: CustomerSnapshot = invoice.customerSnapshot as unknown as CustomerSnapshot;
  let bankAccount: BankAccountSnapshot | null =
    (invoice.bankAccountSnapshot as unknown as BankAccountSnapshot | null) ?? null;

  if (!issuer) {
    const profile = await prisma.companyBillingProfile.findFirst({ where: { active: true } });
    if (!profile) throw DomainErrors.badRequest("Izdavalac fakture nije podešen.");
    issuer = buildIssuerSnapshot(profile);
  }
  if (!customer) {
    const org = await prisma.organization.findUniqueOrThrow({
      where: { id: invoice.organizationId },
      include: { profile: true },
    });
    customer = buildCustomerSnapshot(org);
  }
  if (!bankAccount && invoice.bankAccountId) {
    const bank = await prisma.billingBankAccount.findUnique({
      where: { id: invoice.bankAccountId },
    });
    if (bank) bankAccount = buildBankAccountSnapshot(bank);
  }

  // Generate IPS QR only for RSD invoices with a domestic account.
  let ipsQrPngBase64: string | null = null;
  if (
    invoice.currency === "RSD" &&
    bankAccount &&
    bankAccount.accountNumber &&
    /^\d{18}$/.test(bankAccount.accountNumber.replace(/[\s-]/g, ""))
  ) {
    try {
      const qr = await serbianIpsQrProvider.generate({
        receiverName: issuer.legalName,
        receiverAccount: bankAccount.accountNumber,
        amount: toDecimal(invoice.amountDue.toString()).toString(),
        payerName: customer.legalName,
        paymentReference: invoice.invoiceNumber,
        description: `Faktura ${invoice.invoiceNumber}`,
      });
      ipsQrPngBase64 = qr.pngBuffer.toString("base64");
    } catch {
      // Bad account format etc. — skip QR gracefully rather than fail the PDF.
      ipsQrPngBase64 = null;
    }
  }

  const data: InvoicePdfData = {
    organizationName: issuer.legalName,
    invoiceNumber: invoice.invoiceNumber,
    status: invoice.status,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    language: invoice.language,
    currency: invoice.currency as SupportedCurrency,
    subtotal: toDecimal(invoice.subtotal.toString()).toString(),
    taxAmount: toDecimal(invoice.taxAmount.toString()).toString(),
    totalAmount: toDecimal(invoice.totalAmount.toString()).toString(),
    amountPaid: toDecimal(invoice.amountPaid.toString()).toString(),
    amountDue: toDecimal(invoice.amountDue.toString()).toString(),
    note: invoice.note,
    servicePeriodStart: invoice.servicePeriodStart,
    servicePeriodEnd: invoice.servicePeriodEnd,
    billingCycle: invoice.billingCycle,
    issuer,
    customer,
    bankAccount,
    items: invoice.items.map((i) => ({
      description: i.description,
      quantity: toDecimal(i.quantity.toString()).toString(),
      unitPrice: toDecimal(i.unitPrice.toString()).toString(),
      taxRate: toDecimal(i.taxRate.toString()).toString(),
      amount: toDecimal(i.amount.toString()).toString(),
    })),
    ipsQrPngBase64,
    fx:
      invoice.fxRate != null &&
      invoice.baseCurrency != null &&
      invoice.baseSubtotal != null &&
      invoice.baseTaxAmount != null &&
      invoice.baseTotalAmount != null &&
      invoice.fxRateDate != null
        ? {
            baseCurrency: invoice.baseCurrency as SupportedCurrency,
            baseSubtotal: toDecimal(invoice.baseSubtotal.toString()).toString(),
            baseTaxAmount: toDecimal(invoice.baseTaxAmount.toString()).toString(),
            baseTotalAmount: toDecimal(invoice.baseTotalAmount.toString()).toString(),
            rate: toDecimal(invoice.fxRate.toString()).toString(),
            rateDate: invoice.fxRateDate,
          }
        : null,
  };

  return renderPdf(InvoicePdf(data));
}
