/**
 * Faza 8.2 — B2. Serbian real-estate tax mode on Sale.
 *
 * The Serbian real-estate market has two distinct tax regimes:
 *
 *   - `NEW_BUILD_10`         — 10% VAT (PDV) on new-build sales. In practice
 *                              the price is quoted *net* and the buyer pays
 *                              price + 10% VAT.
 *   - `SECONDARY_MARKET_2_5` — 2.5% property transfer tax (Porez na prenos
 *                              apsolutnih prava — PPAP). Paid on top of the
 *                              contract price.
 *   - `NONE`                 — no tax applies (rare, e.g. some agency-only
 *                              transactions or foreign jurisdictions).
 *
 * `computeSaleTax(finalPrice, vatMode)` returns the tax amount in the same
 * currency and precision as the input `finalPrice`. It rounds half-up to two
 * decimals, matching how invoices and IPS QR references treat money.
 *
 * The service is intentionally pure (no Prisma / no I/O) so it can be reused
 * from:
 *   - `sales.service.ts` when materializing `Sale.taxAmount`
 *   - `contracts.service.ts` `{{tax.amount}}` placeholder (see A1)
 *   - report aggregations (future: PPAP due report)
 */

import { Prisma } from "@prisma/client";
import type { SaleVatMode } from "@prisma/client";

const TWO_PLACES = new Prisma.Decimal("0.01");

const RATES: Record<SaleVatMode, Prisma.Decimal> = {
  NEW_BUILD_10: new Prisma.Decimal("0.10"),
  SECONDARY_MARKET_2_5: new Prisma.Decimal("0.025"),
  NONE: new Prisma.Decimal(0),
};

export interface ComputeSaleTaxInput {
  finalPrice: Prisma.Decimal | number | string | null | undefined;
  vatMode: SaleVatMode | null | undefined;
}

export interface ComputeSaleTaxResult {
  /**
   * Rounded tax amount (2 decimal places). `null` when either input is
   * missing so callers can distinguish "no tax" (mode = NONE, amount = 0)
   * from "not configured yet" (amount = null).
   */
  taxAmount: Prisma.Decimal | null;
  /**
   * Effective rate applied. Always defined when `taxAmount` is defined.
   * `null` when mode is missing.
   */
  rate: Prisma.Decimal | null;
}

/**
 * Pure calculation. Never touches DB.
 *
 * Rounding: `HALF_UP` to 2 decimal places (matches invoice-line rounding in
 * `numbering.service.ts` + how banks handle IPS QR amounts).
 */
export function computeSaleTax(input: ComputeSaleTaxInput): ComputeSaleTaxResult {
  if (input.vatMode == null) return { taxAmount: null, rate: null };
  if (input.finalPrice == null) return { taxAmount: null, rate: RATES[input.vatMode] };
  let price: Prisma.Decimal;
  try {
    price = new Prisma.Decimal(input.finalPrice as Prisma.Decimal.Value);
  } catch {
    return { taxAmount: null, rate: RATES[input.vatMode] };
  }
  if (!price.isFinite()) return { taxAmount: null, rate: RATES[input.vatMode] };
  const rate = RATES[input.vatMode];
  const raw = price.mul(rate);
  const rounded = raw.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  const normalized = rounded.gt(0) ? rounded : new Prisma.Decimal(0);
  return { taxAmount: normalized.toDecimalPlaces(2), rate };
}

/**
 * Human-readable label for the tax mode. Used by PDF placeholders + UI
 * badges. Serbian by default (rest of the app is Serbian-first).
 */
export function saleVatModeLabel(mode: SaleVatMode | null | undefined): string {
  switch (mode) {
    case "NEW_BUILD_10":
      return "PDV 10% (novogradnja)";
    case "SECONDARY_MARKET_2_5":
      return "PPAP 2.5% (prenos apsolutnih prava)";
    case "NONE":
      return "Bez poreza";
    default:
      return "Nije određeno";
  }
}

export function saleTaxPayerLabel(payer: "BUYER" | "SELLER" | null | undefined): string {
  switch (payer) {
    case "BUYER":
      return "Kupac";
    case "SELLER":
      return "Prodavac";
    default:
      return "—";
  }
}

// Applied via `Number(TWO_PLACES)` to satisfy tsc "no unused" when consumers
// only import the label helpers.
void TWO_PLACES;
