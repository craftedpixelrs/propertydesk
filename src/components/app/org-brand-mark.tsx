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
    return <span className="truncate">{APP_NAME}</span>;
  }

  const src =
    theme === "dark" && branding!.logoLightUrl
      ? branding!.logoLightUrl
      : branding!.logoUrl!;

  return (
    <span className="flex min-w-0 items-center">
      <img
        key={src}
        src={src}
        alt={branding!.name || APP_NAME}
        className={
          compact
            ? "h-7 w-auto max-w-[140px] object-contain"
            : "h-8 w-auto max-w-[168px] object-contain"
        }
      />
    </span>
  );
}
