"use client";

import { APP_NAME } from "@/lib/constants/app";
import { useTheme } from "@/components/app/theme-provider";

export type OrgBranding = {
  name: string;
  logoUrl: string | null;
  logoLightUrl?: string | null;
  whiteLabel: boolean;
};

export function OrgBrandMark({
  branding,
  compact = false,
}: {
  branding?: OrgBranding | null;
  compact?: boolean;
}) {
  const { theme } = useTheme();
  const showOrg = Boolean(branding?.whiteLabel && branding.logoUrl);
  if (!showOrg) {
    return (
      <span className="truncate font-display text-[1.05rem] font-semibold tracking-tight">
        {APP_NAME}
      </span>
    );
  }

  const onDark = theme === "dark" && Boolean(branding!.logoLightUrl);
  const src = onDark ? branding!.logoLightUrl! : branding!.logoUrl!;
  // A dark mark disappears on the dark sidebar. Until a light mark is
  // uploaded, keep the light-theme logo on a small light plate.
  const plate = theme === "dark" && !onDark;

  return (
    <span className="flex min-w-0 items-center">
      <img
        key={src}
        src={src}
        alt={branding!.name || APP_NAME}
        className={
          compact
            ? `h-7 w-auto max-w-[140px] object-contain ${plate ? "rounded-md bg-white px-1.5 py-0.5" : ""}`
            : `h-8 w-auto max-w-[168px] object-contain ${plate ? "rounded-md bg-white px-1.5 py-0.5" : ""}`
        }
      />
    </span>
  );
}
