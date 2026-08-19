import { APP_NAME } from "@/lib/constants/app";

export type OrgBranding = {
  name: string;
  logoUrl: string | null;
  whiteLabel: boolean;
};

export function OrgBrandMark({
  branding,
  compact = false,
}: {
  branding?: OrgBranding | null;
  compact?: boolean;
}) {
  const showOrg = Boolean(branding?.whiteLabel && branding.logoUrl);
  if (!showOrg) {
    return <span className="truncate">{APP_NAME}</span>;
  }

  return (
    <span className="flex min-w-0 items-center">
      <img
        key={branding!.logoUrl!}
        src={branding!.logoUrl!}
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
