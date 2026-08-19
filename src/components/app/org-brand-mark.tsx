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
    <span className="flex min-w-0 items-center gap-2">
      {/* Public org logo is a same-origin API stream; next/image is not needed. */}
      <img
        src={branding!.logoUrl!}
        alt={branding!.name || APP_NAME}
        className={
          compact
            ? "h-7 w-auto max-w-[88px] object-contain"
            : "h-8 w-auto max-w-[112px] object-contain"
        }
      />
      {branding!.name ? (
        <span className="truncate text-sm font-semibold">{branding!.name}</span>
      ) : null}
    </span>
  );
}
