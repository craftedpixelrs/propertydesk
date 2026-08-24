import "server-only";

import { prisma } from "@/server/db/prisma";
import {
  formatPayeeName,
  type DepositPayeeKind,
  type DepositPaymentInstructions,
} from "@/lib/reservations/deposit-payee";

export interface DepositPayeeProfile {
  organizationId: string;
  kind: DepositPayeeKind;
  legalName: string | null;
  displayName: string | null;
  paymentAccountNumber: string | null;
  paymentBankName: string | null;
}

/**
 * Who receives the public-offer deposit.
 *
 * A referral code on an active agency connection → agency account.
 * If the agency has no account yet, fall back to the investor so the
 * buyer still has somewhere to pay. Direct investor links always pay
 * the investor.
 */
export async function resolveDepositPayee(input: {
  investorOrganizationId: string;
  referralCode?: string | null;
}): Promise<DepositPayeeProfile> {
  const investor = await prisma.organizationProfile.findUnique({
    where: { organizationId: input.investorOrganizationId },
    select: {
      organizationId: true,
      legalName: true,
      displayName: true,
      paymentAccountNumber: true,
      paymentBankName: true,
    },
  });

  const code = input.referralCode?.trim();
  if (code) {
    const conn = await prisma.agencyConnection.findFirst({
      where: {
        investorOrganizationId: input.investorOrganizationId,
        referralCode: code,
        status: "ACTIVE",
      },
      select: { agencyOrganizationId: true },
    });
    if (conn) {
      const agency = await prisma.organizationProfile.findUnique({
        where: { organizationId: conn.agencyOrganizationId },
        select: {
          organizationId: true,
          legalName: true,
          displayName: true,
          paymentAccountNumber: true,
          paymentBankName: true,
        },
      });
      if (agency?.paymentAccountNumber?.trim()) {
        return { kind: "agency", ...agency };
      }
    }
  }

  return {
    kind: "investor",
    organizationId: input.investorOrganizationId,
    legalName: investor?.legalName ?? null,
    displayName: investor?.displayName ?? null,
    paymentAccountNumber: investor?.paymentAccountNumber ?? null,
    paymentBankName: investor?.paymentBankName ?? null,
  };
}

export function toPaymentInstructions(
  payee: DepositPayeeProfile,
  extras: { reference: string; amount: string; currency: string },
): DepositPaymentInstructions {
  const account = payee.paymentAccountNumber?.replace(/\s/g, "").trim() || null;
  return {
    kind: payee.kind,
    recipientName: formatPayeeName(payee),
    accountNumber: account,
    bankName: payee.paymentBankName?.trim() || null,
    reference: extras.reference,
    amount: extras.amount,
    currency: extras.currency,
  };
}
