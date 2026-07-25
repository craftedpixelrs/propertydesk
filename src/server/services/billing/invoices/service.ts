import "server-only";
import { createId } from "@paralleldrive/cuid2";
import { Prisma } from "@prisma/client";
import type {
  BillingBankAccount,
  BillingCycle,
  CompanyBillingProfile,
  Invoice,
  InvoiceItem,
  InvoiceItemType,
  InvoiceSource,
  InvoiceStatus,
  Organization,
  OrganizationProfile,
  OrganizationSubscription,
  SaaSPlan,
} from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { recordAudit } from "@/server/audit/audit";
import { DomainErrors } from "@/lib/errors";
import { toDecimal, sumMoney } from "@/lib/formatters/money";
import { getDefaultBankAccount } from "../bank-accounts.service";
import { getRawCompanyBillingProfile } from "../company-profile.service";
import { resolveBillingSettings } from "../settings/resolved.service";
import {
  convertAmount,
  getRateForDate,
  DEFAULT_QUOTE_CURRENCY,
} from "../exchange-rates/service";
import { allocateInvoiceNumber } from "./numbering.service";

/**
 * Invoice service — draft creation, issuance, sending, cancellation.
 *
 * State machine:
 *
 *   DRAFT ──issue──▶ ISSUED ──send──▶ SENT
 *                       └──cancel──▶ CANCELED
 *                                     
 *   Any state (except CANCELED/PAID) → void via `voidInvoice` (SUPER_ADMIN)
 *
 * Financial columns (subtotal / total / amountDue) are immutable once the
 * invoice reaches `ISSUED`. Only `note`, `sentAt`, and payment-driven fields
 * (`amountPaid`, `paidAt`, `status → PARTIALLY_PAID | PAID`) may change after.
 */

export interface InvoiceItemInput {
  type?: InvoiceItemType;
  description: string;
  quantity?: number;
  unitPrice: number;
  taxRate?: number;
  sortOrder?: number;
  metadata?: Record<string, unknown> | null;
}

export interface CreateInvoiceInput {
  organizationId: string;
  subscriptionId?: string | null;
  planId?: string | null;
  billingCycle?: BillingCycle | null;
  currency?: string;
  source?: InvoiceSource;
  servicePeriodStart?: Date | null;
  servicePeriodEnd?: Date | null;
  dueDate?: Date | null;
  issueDate?: Date | null;
  note?: string | null;
  internalNote?: string | null;
  items: InvoiceItemInput[];
  bankAccountId?: string | null;
  language?: string;
}

export type IssuerSnapshot = {
  legalName: string;
  taxNumber: string;
  registrationNumber: string | null;
  vatId: string | null;
  vatRegistered: boolean;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  postalCode: string;
  country: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  invoiceNote: string | null;
};

export type CustomerSnapshot = {
  organizationId: string;
  legalName: string;
  displayName: string;
  taxNumber: string | null;
  registrationNumber: string | null;
  addressLine1: string | null;
  city: string | null;
  postalCode: string | null;
  country: string | null;
  email: string | null;
  phone: string | null;
};

export type BankAccountSnapshot = {
  bankName: string;
  accountNumber: string;
  iban: string | null;
  swiftBic: string | null;
  currency: string;
  holderName: string | null;
};

// -----------------------------------------------------------------------------
// Snapshot builders
// -----------------------------------------------------------------------------

export function buildIssuerSnapshot(profile: CompanyBillingProfile): IssuerSnapshot {
  return {
    legalName: profile.legalName,
    taxNumber: profile.taxNumber,
    registrationNumber: profile.registrationNumber,
    vatId: profile.vatId,
    vatRegistered: profile.vatRegistered,
    addressLine1: profile.addressLine1,
    addressLine2: profile.addressLine2,
    city: profile.city,
    postalCode: profile.postalCode,
    country: profile.country,
    email: profile.email,
    phone: profile.phone,
    website: profile.website,
    invoiceNote: profile.invoiceNote,
  };
}

export function buildCustomerSnapshot(
  org: Organization & { profile: OrganizationProfile | null },
): CustomerSnapshot {
  return {
    organizationId: org.id,
    legalName: org.profile?.legalName ?? org.name,
    displayName: org.profile?.displayName ?? org.name,
    taxNumber: org.profile?.taxNumber ?? null,
    registrationNumber: org.profile?.registrationNumber ?? null,
    addressLine1: org.profile?.address ?? null,
    city: org.profile?.city ?? null,
    postalCode: org.profile?.postalCode ?? null,
    country: org.profile?.country ?? null,
    email: org.profile?.email ?? null,
    phone: org.profile?.phone ?? null,
  };
}

export function buildBankAccountSnapshot(
  account: BillingBankAccount,
): BankAccountSnapshot {
  return {
    bankName: account.bankName,
    accountNumber: account.accountNumber,
    iban: account.iban,
    swiftBic: account.swiftBic,
    currency: account.currency,
    holderName: account.holderName,
  };
}

// -----------------------------------------------------------------------------
// Draft creation
// -----------------------------------------------------------------------------

async function loadOrgWithProfile(
  organizationId: string,
): Promise<Organization & { profile: OrganizationProfile | null }> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: { profile: true },
  });
  if (!org) throw DomainErrors.notFound("Organizacija");
  return org;
}

function computeItemAmount(item: InvoiceItemInput): {
  amount: Prisma.Decimal;
  taxAmount: Prisma.Decimal;
} {
  const qty = toDecimal(item.quantity ?? 1);
  const unit = toDecimal(item.unitPrice);
  const gross = qty.times(unit);
  const taxRate = toDecimal(item.taxRate ?? 0);
  const taxAmount = gross.times(taxRate).dividedBy(100);
  return {
    amount: new Prisma.Decimal(gross.toString()),
    taxAmount: new Prisma.Decimal(taxAmount.toString()),
  };
}

export async function createInvoiceDraft(
  input: CreateInvoiceInput,
  actorUserId: string | null,
): Promise<Invoice & { items: InvoiceItem[] }> {
  if (!input.items || input.items.length === 0) {
    throw DomainErrors.badRequest("Faktura mora imati bar jednu stavku.");
  }

  const [org, resolvedSettings, profile] = await Promise.all([
    loadOrgWithProfile(input.organizationId),
    resolveBillingSettings(input.organizationId),
    getRawCompanyBillingProfile(),
  ]);
  if (!profile) {
    throw DomainErrors.badRequest(
      "Nije podešen izdavalac fakture (Company Billing Profile).",
    );
  }
  if (!resolvedSettings.billingEnabled) {
    throw DomainErrors.forbidden(
      "Fakturisanje je isključeno za ovu organizaciju.",
    );
  }

  const currency = input.currency ?? resolvedSettings.currency;
  const bankAccount = input.bankAccountId
    ? await prisma.billingBankAccount.findUnique({
        where: { id: input.bankAccountId },
      })
    : await getDefaultBankAccount(currency);

  let subtotal = new Prisma.Decimal(0);
  let taxTotal = new Prisma.Decimal(0);
  const preparedItems = input.items.map((raw, idx) => {
    const { amount, taxAmount } = computeItemAmount(raw);
    subtotal = subtotal.plus(amount);
    taxTotal = taxTotal.plus(taxAmount);
    return {
      id: createId(),
      type: raw.type ?? ("SUBSCRIPTION" as InvoiceItemType),
      description: raw.description,
      quantity: new Prisma.Decimal(toDecimal(raw.quantity ?? 1).toString()),
      unitPrice: new Prisma.Decimal(toDecimal(raw.unitPrice).toString()),
      taxRate: new Prisma.Decimal(toDecimal(raw.taxRate ?? 0).toString()),
      amount,
      currency,
      sortOrder: raw.sortOrder ?? idx,
      metadata: (raw.metadata as Prisma.InputJsonValue | null) ?? undefined,
    };
  });

  const total = subtotal.plus(taxTotal);

  const created = await prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.create({
      data: {
        id: createId(),
        organizationId: input.organizationId,
        subscriptionId: input.subscriptionId ?? null,
        planId: input.planId ?? null,
        bankAccountId: bankAccount?.id ?? null,
        invoiceNumber: `DRAFT-${createId().slice(0, 8).toUpperCase()}`,
        status: "DRAFT",
        source: input.source ?? "MANUAL",
        currency,
        subtotal,
        taxAmount: taxTotal,
        totalAmount: total,
        amountPaid: new Prisma.Decimal(0),
        amountDue: total,
        issueDate: input.issueDate ?? null,
        dueDate: input.dueDate ?? null,
        servicePeriodStart: input.servicePeriodStart ?? null,
        servicePeriodEnd: input.servicePeriodEnd ?? null,
        billingCycle: input.billingCycle ?? null,
        language: input.language ?? resolvedSettings.numbering.locale,
        note: input.note ?? null,
        internalNote: input.internalNote ?? null,
        issuerSnapshot: buildIssuerSnapshot(profile) as unknown as Prisma.InputJsonValue,
        customerSnapshot: buildCustomerSnapshot(org) as unknown as Prisma.InputJsonValue,
        bankAccountSnapshot: bankAccount
          ? (buildBankAccountSnapshot(bankAccount) as unknown as Prisma.InputJsonValue)
          : undefined,
        createdByUserId: actorUserId ?? null,
        items: { create: preparedItems },
      },
      include: { items: true },
    });
    return invoice;
  });

  await recordAudit({
    action: "billing.invoice_created",
    entityType: "Invoice",
    entityId: created.id,
    organizationId: input.organizationId,
    actorUserId,
    newValues: {
      status: created.status,
      subtotal: created.subtotal,
      totalAmount: created.totalAmount,
      itemCount: created.items.length,
    },
  });

  return created;
}

// -----------------------------------------------------------------------------
// Issue — DRAFT → ISSUED
// -----------------------------------------------------------------------------

export interface IssueInvoiceOptions {
  /** Override the issue date (defaults to now). */
  issueDate?: Date;
  /** Override the due date. When not given, `settings.defaultDueInDays` is used. */
  dueInDays?: number;
  /**
   * When set, use this date to pick the exchange rate instead of the
   * issue date. Rare — only used when the tax authority requires the rate
   * from a specific business day.
   */
  fxRateDate?: Date;
}

export async function issueInvoice(
  invoiceId: string,
  actorUserId: string | null,
  options: IssueInvoiceOptions = {},
): Promise<Invoice> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { items: true },
  });
  if (!invoice) throw DomainErrors.notFound("Faktura");
  if (invoice.status !== "DRAFT") {
    throw DomainErrors.invalidState(
      `Fakturu nije moguće izdati iz stanja ${invoice.status}.`,
    );
  }

  const [profile, settings] = await Promise.all([
    getRawCompanyBillingProfile(),
    resolveBillingSettings(invoice.organizationId),
  ]);
  if (!profile) {
    throw DomainErrors.badRequest("Izdavalac fakture nije podešen.");
  }

  const issueDate = options.issueDate ?? new Date();
  const dueInDays = options.dueInDays ?? settings.defaultDueInDays;
  const dueDate =
    invoice.dueDate ?? new Date(issueDate.getTime() + dueInDays * 24 * 60 * 60 * 1000);

  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: invoice.organizationId },
    select: { profile: { select: { displayName: true } } },
  });
  const orgCode =
    org.profile?.displayName
      ?.replace(/[^A-Za-z0-9]/g, "")
      .toUpperCase()
      .slice(0, 8) ?? null;

  const { number } = await allocateInvoiceNumber({
    scope: settings.numbering.scope,
    format: settings.numbering.format,
    organizationId: invoice.organizationId,
    organizationCode: orgCode,
    now: issueDate,
  });

  // -----------------------------------------------------------------------
  // FX conversion — EUR → RSD for domestic clients.
  //
  // The draft is priced in the plan currency (EUR). If the org (or the
  // global default) is configured to invoice in RSD, we convert every
  // money field to RSD using the middle rate that applied on the issue
  // date, and snapshot the pre-conversion amounts + the rate so the PDF
  // can render both sides and auditors can reproduce the math. When no
  // conversion happens the FX fields stay `null`.
  // -----------------------------------------------------------------------
  const shouldConvert =
    settings.invoiceInRsd &&
    invoice.currency !== DEFAULT_QUOTE_CURRENCY;

  let fxData: {
    currency: string;
    subtotal: Prisma.Decimal;
    taxAmount: Prisma.Decimal;
    totalAmount: Prisma.Decimal;
    amountDue: Prisma.Decimal;
    baseCurrency: string;
    baseSubtotal: Prisma.Decimal;
    baseTaxAmount: Prisma.Decimal;
    baseTotalAmount: Prisma.Decimal;
    fxRate: Prisma.Decimal;
    fxRateDate: Date;
    itemUpdates: Array<{
      id: string;
      unitPrice: Prisma.Decimal;
      amount: Prisma.Decimal;
    }>;
    bankAccount: BillingBankAccount | null;
  } | null = null;

  if (shouldConvert) {
    const rateDate = options.fxRateDate ?? issueDate;
    const rateRow = await getRateForDate({
      baseCurrency: invoice.currency,
      quoteCurrency: DEFAULT_QUOTE_CURRENCY,
      date: rateDate,
    });
    const rate = rateRow.rate;

    const convertToInvoiceDecimal = (v: Prisma.Decimal): Prisma.Decimal =>
      new Prisma.Decimal(convertAmount(v, rate).toString());

    const paidInBase = toDecimal(invoice.amountPaid);
    // Draft amountPaid is 0 in normal flow, but guard anyway so we don't
    // silently drop money if a payment was pre-recorded.
    if (!paidInBase.isZero()) {
      throw DomainErrors.invalidState(
        "Fakturu nije moguće konvertovati u RSD kada već postoje uplate na draftu.",
      );
    }

    const newSubtotal = convertToInvoiceDecimal(invoice.subtotal);
    const newTax = convertToInvoiceDecimal(invoice.taxAmount);
    const newTotal = newSubtotal.plus(newTax);
    const newAmountDue = newTotal;

    const rsdBank = invoice.bankAccountId
      ? await prisma.billingBankAccount
          .findUnique({ where: { id: invoice.bankAccountId } })
          .then((b) =>
            b && b.currency === DEFAULT_QUOTE_CURRENCY
              ? b
              : getDefaultBankAccount(DEFAULT_QUOTE_CURRENCY),
          )
      : await getDefaultBankAccount(DEFAULT_QUOTE_CURRENCY);

    fxData = {
      currency: DEFAULT_QUOTE_CURRENCY,
      subtotal: newSubtotal,
      taxAmount: newTax,
      totalAmount: newTotal,
      amountDue: newAmountDue,
      baseCurrency: invoice.currency,
      baseSubtotal: new Prisma.Decimal(invoice.subtotal.toString()),
      baseTaxAmount: new Prisma.Decimal(invoice.taxAmount.toString()),
      baseTotalAmount: new Prisma.Decimal(invoice.totalAmount.toString()),
      fxRate: new Prisma.Decimal(rate.toString()),
      fxRateDate: rateRow.effectiveDate,
      itemUpdates: invoice.items.map((it) => ({
        id: it.id,
        unitPrice: convertToInvoiceDecimal(it.unitPrice),
        amount: convertToInvoiceDecimal(it.amount),
      })),
      bankAccount: rsdBank ?? null,
    };
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (fxData) {
      for (const item of fxData.itemUpdates) {
        await tx.invoiceItem.update({
          where: { id: item.id },
          data: {
            unitPrice: item.unitPrice,
            amount: item.amount,
            currency: fxData.currency,
          },
        });
      }
    }

    return tx.invoice.update({
      where: { id: invoiceId },
      data: {
        status: "ISSUED",
        issueDate,
        dueDate,
        invoiceNumber: number,
        // Snapshot the current issuer profile in case the caller updated
        // fields after draft was created.
        issuerSnapshot: buildIssuerSnapshot(profile) as unknown as Prisma.InputJsonValue,
        issuedByUserId: actorUserId ?? null,
        ...(fxData
          ? {
              currency: fxData.currency,
              subtotal: fxData.subtotal,
              taxAmount: fxData.taxAmount,
              totalAmount: fxData.totalAmount,
              amountDue: fxData.amountDue,
              baseCurrency: fxData.baseCurrency,
              baseSubtotal: fxData.baseSubtotal,
              baseTaxAmount: fxData.baseTaxAmount,
              baseTotalAmount: fxData.baseTotalAmount,
              fxRate: fxData.fxRate,
              fxRateDate: fxData.fxRateDate,
              bankAccountId: fxData.bankAccount?.id ?? null,
              bankAccountSnapshot: fxData.bankAccount
                ? (buildBankAccountSnapshot(
                    fxData.bankAccount,
                  ) as unknown as Prisma.InputJsonValue)
                : Prisma.JsonNull,
            }
          : {}),
      },
    });
  });

  await recordAudit({
    action: "billing.invoice_issued",
    entityType: "Invoice",
    entityId: invoiceId,
    organizationId: invoice.organizationId,
    actorUserId,
    previousValues: {
      status: invoice.status,
      invoiceNumber: invoice.invoiceNumber,
      currency: invoice.currency,
      totalAmount: invoice.totalAmount,
    },
    newValues: {
      status: updated.status,
      invoiceNumber: updated.invoiceNumber,
      issueDate: updated.issueDate,
      dueDate: updated.dueDate,
      currency: updated.currency,
      totalAmount: updated.totalAmount,
      fxRate: updated.fxRate,
      fxRateDate: updated.fxRateDate,
    },
  });

  return updated;
}

// -----------------------------------------------------------------------------
// Mark sent / cancel / void / marked-paid
// -----------------------------------------------------------------------------

export async function markInvoiceSent(
  invoiceId: string,
  actorUserId: string | null,
  at: Date = new Date(),
): Promise<Invoice> {
  const inv = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!inv) throw DomainErrors.notFound("Faktura");
  if (inv.status !== "ISSUED" && inv.status !== "SENT") {
    throw DomainErrors.invalidState(
      `Fakturu nije moguće označiti kao poslatu iz stanja ${inv.status}.`,
    );
  }
  const updated = await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: "SENT", sentAt: at },
  });
  await recordAudit({
    action: "billing.invoice_sent",
    entityType: "Invoice",
    entityId: invoiceId,
    organizationId: inv.organizationId,
    actorUserId,
    metadata: { sentAt: at.toISOString() },
  });
  return updated;
}

export async function cancelInvoice(
  invoiceId: string,
  reason: string,
  actorUserId: string | null,
): Promise<Invoice> {
  if (!reason || reason.trim().length === 0) {
    throw DomainErrors.badRequest("Molimo unesite razlog otkazivanja.");
  }
  const inv = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!inv) throw DomainErrors.notFound("Faktura");
  if (inv.status === "PAID") {
    throw DomainErrors.invalidState("Plaćenu fakturu nije moguće otkazati.");
  }
  if (inv.status === "CANCELED" || inv.status === "VOID") return inv;
  const updated = await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: "CANCELED", canceledAt: new Date() },
  });
  await recordAudit({
    action: "billing.invoice_canceled",
    entityType: "Invoice",
    entityId: invoiceId,
    organizationId: inv.organizationId,
    actorUserId,
    previousValues: { status: inv.status },
    newValues: { status: updated.status },
    metadata: { reason },
  });
  return updated;
}

/**
 * VOID an issued invoice. Used only in exceptional cases (wrong customer,
 * double issue, etc.). Preserves the number for continuity but marks the
 * document as accounting-invalid.
 */
export async function voidInvoice(
  invoiceId: string,
  reason: string,
  actorUserId: string | null,
): Promise<Invoice> {
  if (!reason || reason.trim().length === 0) {
    throw DomainErrors.badRequest("Molimo unesite razlog za VOID.");
  }
  const inv = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!inv) throw DomainErrors.notFound("Faktura");
  if (inv.status === "PAID") {
    throw DomainErrors.invalidState("Plaćenu fakturu nije moguće poništiti.");
  }
  const updated = await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: "VOID", canceledAt: new Date() },
  });
  await recordAudit({
    action: "billing.invoice_voided",
    entityType: "Invoice",
    entityId: invoiceId,
    organizationId: inv.organizationId,
    actorUserId,
    previousValues: { status: inv.status },
    newValues: { status: updated.status },
    metadata: { reason },
  });
  return updated;
}

export async function markInvoicePaid(
  invoiceId: string,
  reason: string,
  actorUserId: string | null,
): Promise<Invoice> {
  // This is a manual override used by SUPER_ADMIN when reconciling payments
  // that were made outside the normal flow. It DOES NOT create a
  // `SubscriptionPayment` — use `recordPayment` for that.
  if (!reason || reason.trim().length === 0) {
    throw DomainErrors.badRequest("Molimo unesite razlog.");
  }
  const inv = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!inv) throw DomainErrors.notFound("Faktura");
  const updated = await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      status: "PAID",
      amountPaid: inv.totalAmount,
      amountDue: new Prisma.Decimal(0),
      paidAt: new Date(),
    },
  });
  await recordAudit({
    action: "billing.invoice_marked_paid",
    entityType: "Invoice",
    entityId: invoiceId,
    organizationId: inv.organizationId,
    actorUserId,
    previousValues: { status: inv.status, amountPaid: inv.amountPaid },
    newValues: { status: updated.status, amountPaid: updated.amountPaid },
    metadata: { reason },
  });
  return updated;
}

// -----------------------------------------------------------------------------
// Reads
// -----------------------------------------------------------------------------

export async function getInvoiceWithItems(
  invoiceId: string,
): Promise<(Invoice & { items: InvoiceItem[] }) | null> {
  return prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
}

export interface ListInvoicesInput {
  organizationId?: string;
  status?: InvoiceStatus | InvoiceStatus[];
  from?: Date;
  to?: Date;
  page: number;
  pageSize: number;
}

export async function listInvoices(input: ListInvoicesInput): Promise<{
  items: Invoice[];
  total: number;
}> {
  const where: Prisma.InvoiceWhereInput = {};
  if (input.organizationId) where.organizationId = input.organizationId;
  if (input.status) {
    where.status = Array.isArray(input.status) ? { in: input.status } : input.status;
  }
  if (input.from || input.to) {
    where.issueDate = {
      ...(input.from ? { gte: input.from } : {}),
      ...(input.to ? { lte: input.to } : {}),
    };
  }

  const [total, items] = await Promise.all([
    prisma.invoice.count({ where }),
    prisma.invoice.findMany({
      where,
      orderBy: [{ issueDate: "desc" }, { createdAt: "desc" }],
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
    }),
  ]);
  return { items, total };
}

// -----------------------------------------------------------------------------
// Recompute amountDue helper (used after payment allocation)
// -----------------------------------------------------------------------------

/**
 * Sum a list of decimals safely and return a Prisma.Decimal. Wraps the shared
 * `sumMoney` helper so callers stay decimal-safe.
 */
export function sumInvoiceAmounts(values: Array<Prisma.Decimal | number | string>): Prisma.Decimal {
  return new Prisma.Decimal(sumMoney(values).toString());
}

export type LoadedSubscriptionForInvoice = OrganizationSubscription & {
  organization: Organization & { profile: OrganizationProfile | null };
  plan: SaaSPlan;
};
