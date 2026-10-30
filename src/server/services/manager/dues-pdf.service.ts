import "server-only";
import type { DuesTariffKind } from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { DomainErrors } from "@/lib/errors";
import { renderPdf } from "@/server/pdf/render";
import { UplatnicaPdf, type UplatnicaPdfData } from "@/server/pdf/documents/uplatnica";
import { serbianIpsQrProvider } from "@/server/services/billing/ips-qr";
import { formatModel97 } from "@/lib/payments/model97";

/**
 * Faza 11 — render the uplatnica (payment-slip) PDF for a single `DuesCharge`.
 *
 * The IPS QR is embedded as inline base64 PNG. If the building hasn't got a
 * payment account or currency is not RSD, the QR is omitted and the slip
 * falls back to text-only (bank account + reference).
 */

const DUES_KIND_LABELS: Record<DuesTariffKind, string> = {
  CURRENT_MAINTENANCE: "Tekuće održavanje",
  INVESTMENT_FUND: "Investiciono održavanje (fond)",
  MANAGER_FEE: "Naknada upravniku",
  INSURANCE: "Osiguranje",
  OTHER: "Ostalo",
};

const MONTH_LABELS = [
  "Januar",
  "Februar",
  "Mart",
  "April",
  "Maj",
  "Jun",
  "Jul",
  "Avgust",
  "Septembar",
  "Oktobar",
  "Novembar",
  "Decembar",
];

export async function renderDuesUplatnicaPdf(input: {
  organizationId: string;
  chargeId: string;
}): Promise<Buffer> {
  const charge = await prisma.duesCharge.findFirst({
    where: { id: input.chargeId, organizationId: input.organizationId },
    include: {
      building: true,
      organization: true,
      unit: {
        include: {
          ownerships: {
            where: { endedAt: null, isPrimary: true },
            include: {
              person: {
                select: {
                  firstName: true,
                  lastName: true,
                  legalName: true,
                  email: true,
                },
              },
            },
            take: 1,
          },
        },
      },
    },
  });
  if (!charge) throw DomainErrors.notFound("Zaduženje nije pronađeno.");
  if (charge.currency !== "RSD") {
    throw DomainErrors.badRequest("Uplatnica se izdaje samo u RSD.");
  }

  const outstanding = (Number(charge.totalAmount) - Number(charge.paidAmount)).toFixed(2);
  const reference = charge.reference ? formatModel97(charge.reference) : null;

  const breakdown: Array<{ label: string; amount: string }> = [];
  const raw =
    typeof charge.breakdown === "object" && charge.breakdown !== null
      ? (charge.breakdown as Record<string, string>)
      : {};
  for (const [kind, amount] of Object.entries(raw)) {
    const label = DUES_KIND_LABELS[kind as DuesTariffKind] ?? kind;
    breakdown.push({ label, amount: String(amount) });
  }
  if (breakdown.length === 0) {
    breakdown.push({
      label: "Zajednička taksa",
      amount: Number(charge.totalAmount).toFixed(2),
    });
  }

  // Try to produce an IPS QR. The slip remains valid without it.
  let qrBase64: string | null = null;
  const payeeAccount = charge.building.paymentAccountNumber?.replace(/\s/g, "") ?? "";
  const payerPerson = charge.unit.ownerships[0]?.person ?? null;
  const payerLabel = payerPerson
    ? (payerPerson.legalName ??
      ([payerPerson.firstName, payerPerson.lastName].filter(Boolean).join(" ") || "Vlasnik"))
    : "Vlasnik";
  if (payeeAccount && reference && serbianIpsQrProvider.isEnabled()) {
    try {
      const result = await serbianIpsQrProvider.generate({
        receiverName: charge.building.legalName ?? charge.building.name ?? charge.organization.name,
        receiverAccount: payeeAccount,
        amount: outstanding,
        payerName: payerLabel,
        paymentReference: reference,
        description: `Zaj. taksa ${charge.unit.code} ${
          MONTH_LABELS[charge.periodMonth - 1]
        } ${charge.periodYear}`.slice(0, 70),
        currency: "RSD",
      });
      qrBase64 = result.pngBuffer.toString("base64");
    } catch {
      qrBase64 = null;
    }
  }

  const pdfData: UplatnicaPdfData = {
    managerName: charge.organization.name,
    buildingName: charge.building.name,
    buildingAddress: `${charge.building.address}, ${charge.building.city}`,
    unitCode: charge.unit.code,
    periodLabel: `${MONTH_LABELS[charge.periodMonth - 1]} ${charge.periodYear}`,
    dueDate: charge.dueDate,
    totalAmount: Number(charge.totalAmount).toFixed(2),
    outstandingAmount: outstanding,
    currency: "RSD",
    reference,
    payeeAccount: payeeAccount || "—",
    payeeBankName: charge.building.paymentBankName ?? null,
    payeeLegalName: charge.building.legalName ?? charge.building.name ?? charge.organization.name,
    breakdown,
    ipsQrPngBase64: qrBase64,
    payerLabel,
    footerNote:
      "Ovaj dokument je generisan iz PropertyDesk-a. Hvala što redovno izmirujete obaveze.",
  };

  return renderPdf(UplatnicaPdf(pdfData));
}
