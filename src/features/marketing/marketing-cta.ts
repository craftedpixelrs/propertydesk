import { cn } from "@/lib/utils";

type MarketingCtaTone = "ink" | "cream" | "outline" | "outlineDark" | "quiet" | "quietDark";
type MarketingCtaSize = "sm" | "md" | "lg";

/**
 * Shared marketing actions. Pills in ink or cream so they sit with the
 * landing art direction instead of the app's blue buttons.
 */
export function marketingCta(
  tone: MarketingCtaTone,
  size: MarketingCtaSize = "md",
  className?: string,
) {
  return cn(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold tracking-[-0.01em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d6b26a] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
    size === "sm" && "h-9 px-4 text-sm",
    size === "md" && "h-11 px-5 text-sm",
    size === "lg" && "h-12 px-6 text-base",
    tone === "ink" &&
      "bg-[#0b1020] text-[#f7f3ea] shadow-[0_12px_30px_-18px_rgba(11,16,32,0.85)] hover:bg-[#161c31] focus-visible:ring-offset-white",
    tone === "cream" &&
      "bg-[#f7f3ea] text-[#0b1020] shadow-[0_12px_30px_-18px_rgba(0,0,0,0.55)] hover:bg-white focus-visible:ring-offset-[#0b1020]",
    tone === "outline" &&
      "border border-[#0b1020]/15 bg-white text-[#0b1020] hover:border-[#0b1020]/40 hover:bg-[#f7f3ea] focus-visible:ring-offset-white",
    tone === "outlineDark" &&
      "border border-white/20 bg-white/[0.04] text-white hover:bg-white/10 focus-visible:ring-offset-[#0b1020]",
    tone === "quiet" &&
      "bg-transparent text-[#0b1020]/75 hover:bg-[#0b1020]/5 hover:text-[#0b1020] focus-visible:ring-offset-white",
    tone === "quietDark" &&
      "bg-transparent text-white/80 hover:bg-white/10 hover:text-white focus-visible:ring-offset-[#0b1020]",
    className,
  );
}
