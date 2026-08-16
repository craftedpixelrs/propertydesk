import { t, type Locale } from "@/lib/i18n";

/**
 * Minimal Zod 4 issue shape we care about when turning machine errors
 * into operator-facing copy. Extra fields are ignored.
 */
export interface ZodIssueLike {
  path: readonly PropertyKey[];
  message: string;
  code?: string;
  expected?: unknown;
  origin?: string;
  minimum?: number;
  maximum?: number;
  format?: string;
  exact?: boolean;
}

function looksLikeZodEnglish(message: string): boolean {
  return /^(Invalid input:|Too small:|Too big:|Invalid email|Invalid URL|Invalid ISO|Invalid option:|Invalid )/.test(
    message,
  );
}

/**
 * Map a Zod issue to a localized, human sentence.
 *
 * Custom schema messages (Serbian refine strings, etc.) are kept as-is
 * unless they are the default English Zod wording.
 */
export function messageForZodIssue(issue: ZodIssueLike, locale: Locale): string {
  const code = issue.code ?? "";

  if (code === "invalid_type") {
    const expected = String(issue.expected ?? "");
    if (
      issue.message.includes("undefined") ||
      issue.message.includes("null") ||
      expected === "undefined"
    ) {
      return t("validation.required", undefined, locale);
    }
    if (expected === "number") return t("validation.invalidNumber", undefined, locale);
    if (expected === "date") return t("validation.invalidDate", undefined, locale);
    return t("validation.invalidValue", undefined, locale);
  }

  if (code === "too_small") {
    if (issue.origin === "string") {
      if (issue.minimum === 1 && !issue.exact) {
        return t("validation.required", undefined, locale);
      }
      if (issue.exact) {
        return t("validation.exactLength", { n: issue.minimum ?? 0 }, locale);
      }
      return t("validation.minLength", { min: issue.minimum ?? 0 }, locale);
    }
    if (issue.origin === "number") {
      return t("validation.minNumber", { min: issue.minimum ?? 0 }, locale);
    }
    if (issue.origin === "array") {
      return t("validation.minItems", { min: issue.minimum ?? 0 }, locale);
    }
    return t("validation.tooShort", undefined, locale);
  }

  if (code === "too_big") {
    if (issue.origin === "string") {
      if (issue.exact) {
        return t("validation.exactLength", { n: issue.maximum ?? 0 }, locale);
      }
      return t("validation.maxLength", { max: issue.maximum ?? 0 }, locale);
    }
    if (issue.origin === "number") {
      return t("validation.maxNumber", { max: issue.maximum ?? 0 }, locale);
    }
    return t("validation.tooLong", undefined, locale);
  }

  if (code === "invalid_format") {
    if (issue.format === "email") return t("validation.invalidEmail", undefined, locale);
    if (issue.format === "url") return t("validation.invalidUrl", undefined, locale);
    if (issue.format === "datetime" || issue.format === "date") {
      return t("validation.invalidDate", undefined, locale);
    }
    return t("validation.invalidValue", undefined, locale);
  }

  if (code === "invalid_value") {
    return t("validation.invalidOption", undefined, locale);
  }

  if (looksLikeZodEnglish(issue.message)) {
    return localizeZodMessage(issue.message, locale);
  }

  return issue.message;
}

/**
 * Fallback when we only have the English Zod string (e.g. an older
 * response still in the client). Already-localized copy is left alone.
 */
export function localizeZodMessage(message: string, locale: Locale): string {
  if (
    message.includes("received undefined") ||
    message.includes("received null")
  ) {
    return t("validation.required", undefined, locale);
  }
  if (message.startsWith("Too small: expected string to have >=1")) {
    return t("validation.required", undefined, locale);
  }
  if (message.startsWith("Invalid email")) {
    return t("validation.invalidEmail", undefined, locale);
  }
  if (message.startsWith("Invalid URL")) {
    return t("validation.invalidUrl", undefined, locale);
  }
  if (
    message.startsWith("Invalid ISO") ||
    (looksLikeZodEnglish(message) && /datetime/i.test(message))
  ) {
    return t("validation.invalidDate", undefined, locale);
  }
  if (message.startsWith("Too small: expected string")) {
    const m = />=(\d+)/.exec(message);
    if (m?.[1]) return t("validation.minLength", { min: m[1] }, locale);
    return t("validation.tooShort", undefined, locale);
  }
  if (message.startsWith("Too big: expected string")) {
    const m = /<=(\d+)/.exec(message);
    if (m?.[1]) return t("validation.maxLength", { max: m[1] }, locale);
    return t("validation.tooLong", undefined, locale);
  }
  if (message.startsWith("Too small: expected number")) {
    const m = />=(-?\d+(?:\.\d+)?)/.exec(message);
    if (m?.[1]) return t("validation.minNumber", { min: m[1] }, locale);
    return t("validation.invalidNumber", undefined, locale);
  }
  if (message.startsWith("Too big: expected number")) {
    const m = /<=(-?\d+(?:\.\d+)?)/.exec(message);
    if (m?.[1]) return t("validation.maxNumber", { max: m[1] }, locale);
    return t("validation.invalidNumber", undefined, locale);
  }
  if (message.includes("expected number")) {
    return t("validation.invalidNumber", undefined, locale);
  }
  if (message.startsWith("Invalid option:")) {
    return t("validation.invalidOption", undefined, locale);
  }
  if (looksLikeZodEnglish(message)) {
    return t("validation.invalidValue", undefined, locale);
  }
  return message;
}

export function localizeFieldErrors(
  fieldErrors: Record<string, string[]> | undefined,
  locale: Locale,
): Record<string, string[]> | undefined {
  if (!fieldErrors) return fieldErrors;
  const out: Record<string, string[]> = {};
  for (const [key, msgs] of Object.entries(fieldErrors)) {
    out[key] = msgs.map((msg) => localizeZodMessage(msg, locale));
  }
  return out;
}
