import Decimal from "decimal.js";

/** Total list price is area × the entered price per square meter. */
export function totalFromPricePerSquareMeter(pricePerM2: Decimal, area: Decimal): Decimal {
  return pricePerM2.mul(area).toDecimalPlaces(2);
}
