import "server-only";

import { Prisma } from "@prisma/client";
import Decimal from "decimal.js";

import {
  isContractFullyPaid,
  isSettlementStatus,
  settlementPreset,
  settlementPresetLabel,
  summarizeSettlement,
  type SettlementLineKind,
} from "@/lib/sales/settlement";
import { toDecimal } from "@/lib/formatters/money";
import { DomainError, DomainErrors } from "@/lib/errors";
import { recordAudit } from "@/server/audit/audit";
import { prisma } from "@/server/db/prisma";

function money(value: { toString(): string } | string | number): Decimal {
  return toDecimal(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

function parseAmount(raw: string | number): Decimal {
  const text = String(raw).trim().replace(/\s/g, "");
  const normalized = text.includes(",") && !text.includes(".") ? text.replace(",", ".") : text;
  let value: Decimal;
  try {
    value = new Decimal(normalized);
  } catch {
    throw DomainErrors.badRequest("Iznos mora biti pozitivan broj.");
  }
  if (!value.isFinite() || value.lte(0)) {
    throw DomainErrors.badRequest("Iznos mora biti pozitivan broj.");
  }
  if ((value.decimalPlaces() ?? 0) > 2) {
    throw DomainErrors.badRequest("Iznos može imati najviše dve decimale.");
  }
  if (value.gte(new Decimal("100000000000"))) {
    throw DomainErrors.badRequest("Iznos je prevelik.");
  }
  return value.toDecimalPlaces(2);
}

async function loadSale(organizationId: string, saleId: string) {
  const sale = await prisma.sale.findFirst({
    where: { id: saleId, organizationId },
    select: {
      id: true,
      status: true,
      finalPrice: true,
      currency: true,
      payments: { select: { amount: true, reversedAt: true } },
      settlementLines: {
        orderBy: { createdAt: "asc" },
        select: { id: true, kind: true, amount: true },
      },
    },
  });
  if (!sale) throw DomainErrors.notFound("Prodaja");
  return sale;
}

function paidTotal(payments: Array<{ amount: { toString(): string }; reversedAt: Date | null }>) {
  return payments.reduce((sum, payment) => {
    if (payment.reversedAt) return sum;
    return sum.plus(money(payment.amount));
  }, new Decimal(0));
}

function assertEditable(sale: Awaited<ReturnType<typeof loadSale>>) {
  if (!isSettlementStatus(sale.status)) {
    throw DomainErrors.invalidState(
      "Konačan obračun je dostupan kad je prodaja plaćena ili primopredata.",
    );
  }
  const paid = paidTotal(sale.payments);
  if (!isContractFullyPaid(sale.finalPrice, paid)) {
    throw DomainErrors.invalidState(
      "Konačan obračun se otvara kad je ugovorena cena uplaćena u celosti.",
    );
  }
  return paid;
}

export async function addSettlementLine(input: {
  organizationId: string;
  actorUserId: string;
  saleId: string;
  kind: SettlementLineKind;
  presetCode: string;
  label?: string | null;
  amount: string | number;
  note?: string | null;
}) {
  const preset = settlementPreset(input.presetCode);
  if (!preset) throw DomainErrors.badRequest("Nepoznata stavka.");
  if (preset.kind && preset.kind !== input.kind) {
    throw DomainErrors.badRequest("Vrsta stavke ne odgovara izboru.");
  }

  const amount = parseAmount(input.amount);
  const note = input.note?.trim() ? input.note.trim().slice(0, 300) : null;
  let label: string;
  if (preset.code === "CUSTOM") {
    label = (input.label ?? "").trim();
    if (label.length < 2 || label.length > 80) {
      throw DomainErrors.badRequest("Unesite naziv stavke (2–80 znakova).");
    }
  } else {
    label = settlementPresetLabel(preset.code) ?? preset.code;
  }

  const sale = await loadSale(input.organizationId, input.saleId);
  const paid = assertEditable(sale);
  if (sale.settlementLines.length >= 40) {
    throw DomainErrors.invalidState("Obračun može imati najviše 40 stavki.");
  }

  const next = summarizeSettlement({
    contracted: sale.finalPrice,
    paid,
    lines: [
      ...sale.settlementLines.map((line) => ({
        kind: line.kind,
        amount: line.amount,
      })),
      { kind: input.kind, amount },
    ],
  });
  if (next.settled.isNegative()) {
    throw DomainErrors.invalidState("Odbitak ne može da spusti konačnu cenu ispod nule.");
  }

  const created = await prisma.saleSettlementLine.create({
    data: {
      organizationId: input.organizationId,
      saleId: sale.id,
      kind: input.kind,
      presetCode: preset.code,
      label,
      amount: new Prisma.Decimal(amount.toFixed(2)),
      note,
      createdByUserId: input.actorUserId,
    },
    select: {
      id: true,
      kind: true,
      presetCode: true,
      label: true,
      amount: true,
      note: true,
    },
  });

  await recordAudit({
    action: "sale.settlement_line_added",
    entityType: "Sale",
    entityId: sale.id,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    newValues: {
      lineId: created.id,
      kind: created.kind,
      presetCode: created.presetCode,
      label: created.label,
      amount: created.amount.toString(),
    },
  });

  return {
    id: created.id,
    kind: created.kind,
    presetCode: created.presetCode,
    label: created.label,
    amount: created.amount.toString(),
    note: created.note,
  };
}

export async function removeSettlementLine(input: {
  organizationId: string;
  actorUserId: string;
  saleId: string;
  lineId: string;
}) {
  const sale = await loadSale(input.organizationId, input.saleId);
  assertEditable(sale);
  const existing = await prisma.saleSettlementLine.findFirst({
    where: {
      id: input.lineId,
      saleId: sale.id,
      organizationId: input.organizationId,
    },
  });
  if (!existing) throw new DomainError("NOT_FOUND", "Stavka obračuna nije pronađena.");

  await prisma.saleSettlementLine.delete({ where: { id: existing.id } });
  await recordAudit({
    action: "sale.settlement_line_removed",
    entityType: "Sale",
    entityId: sale.id,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    previousValues: {
      lineId: existing.id,
      kind: existing.kind,
      label: existing.label,
      amount: existing.amount.toString(),
    },
  });
  return { id: existing.id };
}
