import Decimal from "decimal.js";
import { APP_LOCALE, type SupportedCurrency, SUPPORTED_CURRENCIES } from "@/lib/constants/app";

/**
 * Decimal-safe monetary formatting.
 *
 * The Prisma column type is `Decimal @db.Decimal(14,2)`, which the driver
 * serialises either as a `Prisma.Decimal` instance or a string. We accept
 * both, plus plain `number` for local computations, and always route
 * through `decimal.js` to avoid IEEE-754 rounding.
 *
 * Never use `parseFloat`, `Number()`, or `toFixed` on money values.
 */

export type MoneyInput = number | string | Decimal | { toString(): string };

export function toDecimal(value: MoneyInput): Decimal {
  if (value instanceof Decimal) return value;
  if (typeof value === "number") return new Decimal(value);
  return new Decimal(value.toString());
}

function assertSupported(currency: string): asserts currency is SupportedCurrency {
  if (!SUPPORTED_CURRENCIES.includes(currency as SupportedCurrency)) {
    throw new Error(`Unsupported currency: ${currency}`);
  }
}

/**
 * Format a money value in Serbian style, e.g.:
 *   formatMoney("1234567.5", "EUR") -> "1.234.567,50 EUR"
 */
export function formatMoney(
  value: MoneyInput,
  currency: SupportedCurrency,
  options: { withSymbol?: boolean; decimals?: number } = {},
): string {
  assertSupported(currency);
  const decimals = options.decimals ?? 2;
  const decimalValue = toDecimal(value).toDecimalPlaces(decimals);

  const formatter = new Intl.NumberFormat(APP_LOCALE, {
    style: options.withSymbol === false ? "decimal" : "currency",
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    currencyDisplay: "code",
  });

  return formatter.format(Number(decimalValue.toString()));
}

/**
 * Sum a list of money values. All values must share the same currency;
 * the caller is responsible for that invariant.
 */
export function sumMoney(values: MoneyInput[]): Decimal {
  return values.reduce<Decimal>((acc, v) => acc.plus(toDecimal(v)), new Decimal(0));
}
