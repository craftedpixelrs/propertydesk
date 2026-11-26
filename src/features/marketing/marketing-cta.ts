import { cn } from "@/lib/utils";

/**
 * `ink` and `outline` sit on light surfaces. `accent` and `outlineDark`
 * sit on the navy bands. `quiet` tones are text-weight actions.
 */
type MarketingCtaTone = "ink" | "accent" | "outline" | "outlineDark" | "quiet" | "quietDark";
type MarketingCtaSize = "sm" | "md" | "lg";

/**
 * Shared marketing actions. Squared navy and teal buttons from the logo,
 * so the site does not borrow the app's blue ones.
 */
export function marketingCta(
  tone: MarketingCtaTone,
  size: MarketingCtaSize = "md",
  className?: string,
) {
  return cn(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold tracking-[-0.01em] transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tide focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
    size === "sm" && "h-9 px-3.5 text-sm",
    size === "md" && "h-11 px-5 text-sm",
    size === "lg" && "h-12 px-6 text-[0.95rem]",
    tone === "ink" &&
      "bg-ink text-white shadow-[0_1px_0_rgba(255,255,255,0.12)_inset,0_10px_24px_-14px_rgba(10,27,61,0.9)] hover:bg-ink-800 focus-visible:ring-offset-white",
    tone === "accent" &&
      "bg-tide-300 text-ink-950 shadow-[0_10px_28px_-14px_rgba(95,210,216,0.9)] hover:bg-white focus-visible:ring-offset-ink-950",
    tone === "outline" &&
      "border border-line bg-white text-ink hover:border-ink/35 hover:bg-paper focus-visible:ring-offset-white",
    tone === "outlineDark" &&
      "border border-white/20 bg-white/[0.04] text-white hover:border-white/40 hover:bg-white/10 focus-visible:ring-offset-ink-950",
    tone === "quiet" &&
      "bg-transparent text-mute hover:bg-ink/5 hover:text-ink focus-visible:ring-offset-white",
    tone === "quietDark" &&
      "bg-transparent text-white/75 hover:bg-white/10 hover:text-white focus-visible:ring-offset-ink-950",
    className,
  );
}
