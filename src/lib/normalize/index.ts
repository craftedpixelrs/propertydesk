/**
 * Contact-detail normalization helpers.
 *
 * Buyers are de-duplicated per organization on their phone and email. Because
 * humans enter these in many shapes ("+381 60 123-45-67", "060/1234567",
 * "  John@Example.COM "), we store both the original value AND a normalized
 * form. Duplicate detection always compares the normalized forms so that
 * cosmetic differences never create a second buyer record for the same person.
 */

/**
 * Normalize a phone number to a comparable digit string.
 *
 * Rules:
 *   - strip everything except digits and a single leading `+`
 *   - convert a Serbian national trunk prefix `0…` to the `+381…` E.164 form
 *     so `060…` and `+38160…` collapse to the same value
 *   - return `null` for empty / unusable input
 */
export function normalizePhone(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  const hasPlus = trimmed.startsWith("+") || trimmed.startsWith("00");
  let digits = trimmed.replace(/[^\d]/g, "");
  if (trimmed.startsWith("00")) {
    // International access code → treat as explicit country code.
    digits = digits.replace(/^00/, "");
  }
  if (!digits) return null;

  if (!hasPlus && digits.startsWith("0")) {
    // National form, assume Serbia (+381) and drop the trunk `0`.
    digits = `381${digits.slice(1)}`;
  }

  return `+${digits}`;
}

/**
 * Normalize an email address for comparison: trim + lowercase. Returns `null`
 * for empty input. We intentionally keep the local part intact (no dot / plus
 * stripping) to avoid merging genuinely different addresses.
 */
export function normalizeEmail(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim().toLowerCase();
  return trimmed || null;
}
