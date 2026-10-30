/**
 * ISO 11649 / Model-97 reference helpers used across billing modules.
 *
 * The Serbian banking standard for `poziv-na-broj` on an IPS/NBS QR
 * recommends the "97" model: a 2-digit control number computed as
 * `98 - (ref mod 97)` prefixed to a 12-digit reference. Writing it out
 * for the invoice renders as `97 CC-XXXXXXXXXXXX` on the PDF and in the
 * QR payload.
 *
 * Shared by:
 *   - reservation deposit flow ([src/server/services/reservations])
 *   - MANAGER dues flow (monthly building invoices)
 *   - any future PDF that needs a bank-friendly reference
 */

export interface Model97Reference {
  /** Raw 12-digit numeric reference without any control digits. */
  compact: string;
  /** Human-friendly `97 CC-XXXXXXXXXXXX` form (also valid IPS QR RF field). */
  model97: string;
}

/**
 * Compute the model-97 check digits for a numeric reference. Returns the two
 * check digits as a zero-padded string.
 */
export function model97Check(numeric: string): string {
  if (!/^\d+$/.test(numeric)) {
    throw new Error("model97Check requires a numeric-only input");
  }
  const remainder = BigInt(numeric) % 97n;
  const check = Number(98n - remainder);
  return check.toString().padStart(2, "0");
}

/**
 * Format a 12-digit compact reference as `97 CC-XXXXXXXXXXXX`.
 * Returns the input untouched if it isn't exactly 12 digits.
 */
export function formatModel97(compact: string): string {
  if (!/^\d{12}$/.test(compact)) return compact;
  const check = model97Check(compact);
  return `97 ${check}-${compact}`;
}

/**
 * Generate a brand-new 12-digit reference. The caller usually persists
 * the compact form on the invoice/payment so collisions can be checked
 * against existing records. The compact form combines a 10-digit epoch
 * suffix with a 2-digit random salt — collisions at 12 digits are
 * astronomically unlikely but the caller should still assume uniqueness.
 */
export function generateModel97Reference(): Model97Reference {
  const now = Date.now();
  const base = String(now).slice(-10);
  const salt = Math.floor(Math.random() * 100)
    .toString()
    .padStart(2, "0");
  const twelve = `${base}${salt}`;
  return { compact: twelve, model97: formatModel97(twelve) };
}

/**
 * Deterministic reference from a numeric key (e.g. a DuesCharge auto-id
 * sequence) — useful when regenerating a lost invoice should produce
 * the exact same reference. Returns compact + formatted model-97 form.
 */
export function deterministicModel97(numericKey: string | number | bigint): Model97Reference {
  const digits = String(numericKey).replace(/\D/g, "").slice(-12);
  if (!digits) {
    throw new Error("deterministicModel97 requires at least one digit");
  }
  const padded = digits.padStart(12, "0");
  return { compact: padded, model97: formatModel97(padded) };
}
