import Decimal from "decimal.js";

/**
 * How a charge's collected cash is split across tariff kinds.
 *
 * `DuesCharge.breakdown` is keyed by `DuesTariffKind`. Expense books use
 * the coarser `BuildingExpenseFund`. Manager fee and insurance inflows
 * land in the OTHER fund when we compare them with payouts.
 */

export const TARIFF_KINDS = [
  "CURRENT_MAINTENANCE",
  "INVESTMENT_FUND",
  "MANAGER_FEE",
  "INSURANCE",
  "OTHER",
] as const;

export type TariffKind = (typeof TARIFF_KINDS)[number];

export const EXPENSE_FUNDS = ["CURRENT_MAINTENANCE", "INVESTMENT_FUND", "OTHER"] as const;

export type ExpenseFund = (typeof EXPENSE_FUNDS)[number];

const KIND_SET = new Set<string>(TARIFF_KINDS);

export function emptyKindTotals(): Record<TariffKind, Decimal> {
  return {
    CURRENT_MAINTENANCE: new Decimal(0),
    INVESTMENT_FUND: new Decimal(0),
    MANAGER_FEE: new Decimal(0),
    INSURANCE: new Decimal(0),
    OTHER: new Decimal(0),
  };
}

export function emptyFundTotals(): Record<ExpenseFund, Decimal> {
  return {
    CURRENT_MAINTENANCE: new Decimal(0),
    INVESTMENT_FUND: new Decimal(0),
    OTHER: new Decimal(0),
  };
}

function isKind(key: string): key is TariffKind {
  return KIND_SET.has(key);
}

/**
 * Split `cashPaid` across breakdown parts. The last positive part absorbs
 * the rounding remainder so the parts always sum back to `cashPaid`.
 * An empty breakdown books the whole amount as current maintenance.
 */
export function allocateCashToBreakdown(
  cashPaid: Decimal,
  breakdown: unknown,
): Record<TariffKind, Decimal> {
  const out = emptyKindTotals();
  if (cashPaid.lte(0)) return out;

  const parts: { key: TariffKind; amount: Decimal }[] = [];
  if (breakdown && typeof breakdown === "object" && !Array.isArray(breakdown)) {
    for (const [key, raw] of Object.entries(breakdown as Record<string, unknown>)) {
      if (!isKind(key) || raw == null) continue;
      let amount: Decimal;
      try {
        amount = new Decimal(String(raw));
      } catch {
        continue;
      }
      if (amount.gt(0)) parts.push({ key, amount });
    }
  }

  if (parts.length === 0) {
    out.CURRENT_MAINTENANCE = cashPaid;
    return out;
  }

  const sum = parts.reduce((acc, part) => acc.plus(part.amount), new Decimal(0));
  let allocated = new Decimal(0);
  parts.forEach((part, index) => {
    const value =
      index === parts.length - 1
        ? cashPaid.minus(allocated)
        : cashPaid.mul(part.amount).div(sum).toDecimalPlaces(2, Decimal.ROUND_DOWN);
    allocated = allocated.plus(value);
    out[part.key] = out[part.key].plus(value);
  });
  return out;
}

export function addKindTotals(
  target: Record<TariffKind, Decimal>,
  extra: Record<TariffKind, Decimal>,
): void {
  for (const kind of TARIFF_KINDS) {
    target[kind] = target[kind].plus(extra[kind]);
  }
}

/** Tariff kinds rolled up onto the three expense funds. */
export function kindsToFunds(kinds: Record<TariffKind, Decimal>): Record<ExpenseFund, Decimal> {
  return {
    CURRENT_MAINTENANCE: kinds.CURRENT_MAINTENANCE,
    INVESTMENT_FUND: kinds.INVESTMENT_FUND,
    OTHER: kinds.MANAGER_FEE.plus(kinds.INSURANCE).plus(kinds.OTHER),
  };
}
