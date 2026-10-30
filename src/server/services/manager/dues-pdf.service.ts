import "server-only";
import type { DuesTariffKind } from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { DomainErrors } from "@/lib/errors";
import { renderPdf } from "@/server/pdf/render";
import { UplatnicaPdf, type UplatnicaPdfData } from "@/server/pdf/documents/uplatnica";
import { UplatnicaBulkPdf } from "@/server/pdf/documents/uplatnica-bulk";
import { serbianIpsQrProvider } from "@/server/services/billing/ips-qr";
import { formatModel97 } from "@/lib/payments/model97";
import { assertBuildingBelongsToOrg } from "@/server/services/manager/buildings.service";

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

type ChargeWithRelations = NonNullable<Awaited<ReturnType<typeof loadChargeForUplatnica>>>;

async function loadChargeForUplatnica(organizationId: string, chargeId: string) {
  return prisma.duesCharge.findFirst({
    where: { id: chargeId, organizationId },
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
}

async function buildUplatnicaPdfData(charge: ChargeWithRelations): Promise<UplatnicaPdfData> {
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

  return {
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
}

export async function renderDuesUplatnicaPdf(input: {
  organizationId: string;
  chargeId: string;
}): Promise<Buffer> {
  const charge = await loadChargeForUplatnica(input.organizationId, input.chargeId);
  if (!charge) throw DomainErrors.notFound("Zaduženje nije pronađeno.");
  const data = await buildUplatnicaPdfData(charge);
  return renderPdf(UplatnicaPdf(data));
}

/**
 * Faza 11 — one PDF with every outstanding uplatnica for a building and
 * a given month/year. Operators use this to print and distribute slips
 * in buildings without universal email, or to attach a single file to a
 * targeted email reminder.
 *
 * By default we only include unpaid charges — a paid charge produces a
 * misleading slip (outstanding = 0, QR embeds 0 RSD). Pass
 * `includePaid: true` to override.
 */
export async function renderBulkDuesUplatnicaPdf(input: {
  organizationId: string;
  buildingId: string;
  year: number;
  month: number;
  includePaid?: boolean;
}): Promise<{ buffer: Buffer; count: number }> {
  await assertBuildingBelongsToOrg(input.organizationId, input.buildingId);

  const charges = await prisma.duesCharge.findMany({
    where: {
      organizationId: input.organizationId,
      buildingId: input.buildingId,
      periodYear: input.year,
      periodMonth: input.month,
      currency: "RSD",
      ...(input.includePaid ? {} : { status: { in: ["OPEN", "PARTIALLY_PAID"] } }),
    },
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
    orderBy: [{ unit: { code: "asc" } }],
  });

  if (charges.length === 0) {
    throw DomainErrors.badRequest("Za izabrani period nema nerešenih zaduženja u ovoj zgradi.");
  }

  const slips: UplatnicaPdfData[] = [];
  for (const charge of charges) {
    // eslint-disable-next-line no-await-in-loop
    slips.push(await buildUplatnicaPdfData(charge));
  }

  const periodLabel = `${MONTH_LABELS[input.month - 1]} ${input.year}`;
  const buildingName = charges[0]!.building.name;
  const buffer = await renderPdf(
    UplatnicaBulkPdf({
      slips,
      title: `Uplatnice · ${buildingName}`,
      subtitle: periodLabel,
    }),
  );
  return { buffer, count: slips.length };
}
