import "server-only";
import { createId } from "@paralleldrive/cuid2";
import type { BillingBankAccount } from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { recordAudit } from "@/server/audit/audit";
import { DomainErrors } from "@/lib/errors";
import { SUPPORTED_CURRENCIES } from "@/lib/constants/app";

/**
 * Bank accounts owned by the SaaS operator. Each currency (RSD, EUR) has
 * exactly one default active account, enforced by a partial unique index on
 * `(currency) where isDefault = true AND isActive = true`.
 */

export interface BankAccountInput {
  bankName: string;
  accountNumber: string;
  iban?: string | null;
  swiftBic?: string | null;
  currency: string;
  holderName?: string | null;
  isDefault?: boolean;
  sortOrder?: number;
}

function assertCurrency(currency: string): void {
  if (!SUPPORTED_CURRENCIES.includes(currency as (typeof SUPPORTED_CURRENCIES)[number])) {
    throw DomainErrors.badRequest(
      `Nepodržana valuta: ${currency}. Dozvoljene: ${SUPPORTED_CURRENCIES.join(", ")}.`,
    );
  }
}

function normalizeAccountNumber(v: string): string {
  return v.replace(/\s+/g, "");
}

export async function listBankAccounts(activeOnly = true): Promise<BillingBankAccount[]> {
  return prisma.billingBankAccount.findMany({
    where: activeOnly ? { isActive: true } : undefined,
    orderBy: [
      { isDefault: "desc" },
      { currency: "asc" },
      { sortOrder: "asc" },
      { createdAt: "asc" },
    ],
  });
}

export async function getDefaultBankAccount(
  currency: string,
): Promise<BillingBankAccount | null> {
  return prisma.billingBankAccount.findFirst({
    where: { currency, isDefault: true, isActive: true },
  });
}

export async function createBankAccount(
  input: BankAccountInput,
  actorUserId: string | null,
): Promise<BillingBankAccount> {
  assertCurrency(input.currency);
  const shouldBeDefault = input.isDefault ?? false;

  const created = await prisma.$transaction(async (tx) => {
    if (shouldBeDefault) {
      await tx.billingBankAccount.updateMany({
        where: { currency: input.currency, isDefault: true, isActive: true },
        data: { isDefault: false },
      });
    }
    return tx.billingBankAccount.create({
      data: {
        id: createId(),
        bankName: input.bankName,
        accountNumber: normalizeAccountNumber(input.accountNumber),
        iban: input.iban ?? null,
        swiftBic: input.swiftBic ?? null,
        currency: input.currency,
        holderName: input.holderName ?? null,
        isDefault: shouldBeDefault,
        isActive: true,
        sortOrder: input.sortOrder ?? 0,
      },
    });
  });

  await recordAudit({
    action: "billing.bank_account_created",
    entityType: "BillingBankAccount",
    entityId: created.id,
    actorUserId,
    newValues: created,
  });

  return created;
}

export async function updateBankAccount(
  id: string,
  input: Partial<BankAccountInput>,
  actorUserId: string | null,
): Promise<BillingBankAccount> {
  const previous = await prisma.billingBankAccount.findUnique({ where: { id } });
  if (!previous) throw DomainErrors.notFound("Račun banke");

  if (input.currency !== undefined) assertCurrency(input.currency);

  const nextCurrency = input.currency ?? previous.currency;
  const nextDefault = input.isDefault ?? previous.isDefault;

  const updated = await prisma.$transaction(async (tx) => {
    if (nextDefault && (input.isDefault || input.currency)) {
      await tx.billingBankAccount.updateMany({
        where: {
          currency: nextCurrency,
          isDefault: true,
          isActive: true,
          id: { not: id },
        },
        data: { isDefault: false },
      });
    }
    return tx.billingBankAccount.update({
      where: { id },
      data: {
        bankName: input.bankName ?? undefined,
        accountNumber:
          input.accountNumber !== undefined
            ? normalizeAccountNumber(input.accountNumber)
            : undefined,
        iban: input.iban === undefined ? undefined : input.iban,
        swiftBic: input.swiftBic === undefined ? undefined : input.swiftBic,
        currency: input.currency ?? undefined,
        holderName: input.holderName === undefined ? undefined : input.holderName,
        isDefault: input.isDefault ?? undefined,
        sortOrder: input.sortOrder ?? undefined,
      },
    });
  });

  await recordAudit({
    action: "billing.bank_account_updated",
    entityType: "BillingBankAccount",
    entityId: id,
    actorUserId,
    previousValues: previous,
    newValues: updated,
  });

  return updated;
}

/**
 * Soft-delete: bank accounts referenced by issued invoices must never
 * disappear (audit / re-generation of PDFs). We mark them inactive instead.
 */
export async function deactivateBankAccount(
  id: string,
  actorUserId: string | null,
): Promise<BillingBankAccount> {
  const previous = await prisma.billingBankAccount.findUnique({ where: { id } });
  if (!previous) throw DomainErrors.notFound("Račun banke");
  if (!previous.isActive) return previous;

  const updated = await prisma.billingBankAccount.update({
    where: { id },
    data: { isActive: false, isDefault: false },
  });

  await recordAudit({
    action: "billing.bank_account_deactivated",
    entityType: "BillingBankAccount",
    entityId: id,
    actorUserId,
    previousValues: previous,
    newValues: updated,
  });

  return updated;
}
