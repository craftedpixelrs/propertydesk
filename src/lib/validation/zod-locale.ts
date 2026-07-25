import { z } from "zod";
import { t } from "@/lib/i18n";

/**
 * Configure Zod to emit Serbian error messages by default.
 *
 * This is a lightweight override — we only translate the error codes
 * that show up commonly in form validation. Anything unmapped falls
 * through to Zod's built-in message.
 *
 * Call `installZodLocale()` once at server bootstrap.
 */

let installed = false;

export function installZodLocale(): void {
  if (installed) return;
  installed = true;

  z.config({
    customError: (issue) => {
      switch (issue.code) {
        case "invalid_type":
          if (issue.input === undefined || issue.input === null) {
            return t("validation.required");
          }
          return t("validation.required");
        case "too_small":
          if (issue.origin === "string") {
            return t("validation.tooShort");
          }
          if (issue.origin === "number") {
            return t("validation.invalidNumber");
          }
          return t("validation.tooShort");
        case "too_big":
          return t("validation.tooLong");
        case "invalid_format":
          if (issue.format === "email") return t("validation.invalidEmail");
          if (issue.format === "url") return t("validation.invalidUrl");
          return undefined;
        default:
          return undefined;
      }
    },
  });
}
