/**
 * Chart color palette derived from `src/app/globals.css` design tokens.
 *
 * Recharts consumes plain color strings and cannot resolve `var(--...)`
 * on the fly inside SVG `fill` attributes, so we duplicate the palette
 * as literal hex here. Anytime a color is changed in `globals.css` the
 * matching entry below should be updated to keep charts on-brand.
 */

export const chartBrandScale = [
  "#1d4ed8", // brand-700
  "#3b82f6", // brand-500
  "#60a5fa", // brand-400
  "#93c5fd", // brand-300
  "#2563eb", // brand-600
  "#1e40af", // brand-800
  "#bfdbfe", // brand-200
  "#1e3a8a", // brand-900
];

/**
 * Semantic tones used for status/state buckets. Kept intentionally
 * small — Recharts wraps around the array when the data has more
 * segments.
 */
export const chartStatusTones = {
  success: "#16a34a",
  warning: "#d97706",
  danger: "#dc2626",
  info: "#0369a1",
  neutral: "#64748b",
  muted: "#cbd5e1",
} as const;

/**
 * Preferred colour for each UnitStatus. Aligns with the existing badge
 * palette from `src/app/(dashboard)/jedinice/page.tsx` so that dashboard
 * charts, badges and tables all speak the same visual language.
 */
export const unitStatusColor: Record<string, string> = {
  AVAILABLE: chartStatusTones.success,
  ON_HOLD: chartStatusTones.warning,
  RESERVED: "#0284c7",
  DEPOSIT_PAID: "#4f46e5",
  CONTRACTED: "#7c3aed",
  SOLD: "#334155",
  BLOCKED: chartStatusTones.danger,
  NOT_FOR_SALE: chartStatusTones.neutral,
};

/**
 * Preferred colour for each SaleStatus.
 */
export const saleStatusColor: Record<string, string> = {
  DRAFT: chartStatusTones.neutral,
  PRE_CONTRACT: chartStatusTones.info,
  CONTRACTED: "#2563eb",
  PAYMENT_IN_PROGRESS: chartStatusTones.warning,
  PAID: chartStatusTones.success,
  HANDED_OVER: "#0f766e",
  CANCELED: chartStatusTones.danger,
};

/**
 * Preferred colour for each ReservationStatus.
 */
export const reservationStatusColor: Record<string, string> = {
  REQUESTED: chartStatusTones.warning,
  APPROVED: chartStatusTones.info,
  REJECTED: chartStatusTones.danger,
  EXPIRED: chartStatusTones.neutral,
  CANCELED: chartStatusTones.muted,
  CONVERTED: chartStatusTones.success,
};

export function pickColor(
  index: number,
  palette: readonly string[] = chartBrandScale,
): string {
  if (palette.length === 0) return chartBrandScale[0]!;
  return palette[index % palette.length]!;
}
