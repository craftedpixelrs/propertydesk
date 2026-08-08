/**
 * Mirror of the server-side transition matrix from
 * `src/server/services/units.service.ts`. Kept in a separate module so
 * client components can consume it without pulling `server-only` code.
 *
 * NOTE: server enforces this authoritatively; the client copy is only a
 * UX affordance to hide obviously-invalid options.
 */
export const ALLOWED_UNIT_STATUS_TRANSITIONS: Record<string, string[]> = {
  AVAILABLE: ["ON_HOLD", "RESERVED", "BLOCKED", "NOT_FOR_SALE"],
  ON_HOLD: ["AVAILABLE", "RESERVED", "BLOCKED", "NOT_FOR_SALE"],
  RESERVED: ["AVAILABLE", "DEPOSIT_PAID", "CONTRACTED", "BLOCKED"],
  DEPOSIT_PAID: ["CONTRACTED", "RESERVED", "AVAILABLE"],
  CONTRACTED: ["SOLD", "AVAILABLE"],
  SOLD: ["AVAILABLE"],
  BLOCKED: ["AVAILABLE", "NOT_FOR_SALE"],
  NOT_FOR_SALE: ["AVAILABLE"],
};
