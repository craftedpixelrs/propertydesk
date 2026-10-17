import Decimal from "decimal.js";

import { toDecimal, type MoneyInput } from "@/lib/formatters/money";

export const SETTLEMENT_OPEN_STATUSES = ["PAID", "HANDED_OVER"] as const;

export const SETTLEMENT_PRESETS = [
  { code: "CERAMICS", kind: "DEDUCTION" },
  { code: "SANITARY", kind: "DEDUCTION" },
  { code: "KITCHEN", kind: "DEDUCTION" },
  { code: "FLOORING", kind: "DEDUCTION" },
  { code: "DOORS", kind: "DEDUCTION" },
  { code: "PARKING", kind: "SURCHARGE" },
  { code: "STORAGE", kind: "SURCHARGE" },
  { code: "EQUIPMENT", kind: "SURCHARGE" },
  { code: "CUSTOM", kind: null },
] as const;

export type SettlementPresetCode = (typeof SETTLEMENT_PRESETS)[number]["code"];
export type SettlementLineKind = "DEDUCTION" | "SURCHARGE";

const PRESET_LABEL_SR: Record<Exclude<SettlementPresetCode, "CUSTOM">, string> = {
  CERAMICS: "Keramika",
  SANITARY: "Sanitarija",
  KITCHEN: "Kuhinja",
  FLOORING: "Podovi",
  DOORS: "Unutrašnja vrata",
  PARKING: "Parking mesto",
  STORAGE: "Garaža ili ostava",
  EQUIPMENT: "Dodatna oprema",
};

export function settlementPreset(code: string) {
  return SETTLEMENT_PRESETS.find((item) => item.code === code) ?? null;
}

export function settlementPresetLabel(code: string): string | null {
  if (code === "CUSTOM") return null;
  return PRESET_LABEL_SR[code as Exclude<SettlementPresetCode, "CUSTOM">] ?? null;
}

export function isSettlementStatus(status: string): boolean {
  return status === "PAID" || status === "HANDED_OVER";
}

/** Contracted price is covered when recorded payments reach it. */
export function isContractFullyPaid(contracted: MoneyInput, paid: MoneyInput): boolean {
  return toDecimal(paid).gte(toDecimal(contracted));
}

export interface SettlementSummary {
  deductions: Decimal;
  surcharges: Decimal;
  settled: Decimal;
  difference: Decimal;
}

/**
 * Settled price = contracted − deductions + surcharges.
 * Difference = settled − already paid.
 * Positive difference is still owed by the buyer. Negative is a refund.
 */
export function summarizeSettlement(input: {
  contracted: MoneyInput;
  paid: MoneyInput;
  lines: Array<{ kind: SettlementLineKind; amount: MoneyInput }>;
}): SettlementSummary {
  let deductions = new Decimal(0);
  let surcharges = new Decimal(0);
  for (const line of input.lines) {
    const amount = toDecimal(line.amount);
    if (line.kind === "DEDUCTION") deductions = deductions.plus(amount);
    else surcharges = surcharges.plus(amount);
  }
  const settled = toDecimal(input.contracted).minus(deductions).plus(surcharges);
  const difference = settled.minus(toDecimal(input.paid));
  return { deductions, surcharges, settled, difference };
}
