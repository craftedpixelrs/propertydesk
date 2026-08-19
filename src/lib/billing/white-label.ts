export function planAllowsWhiteLabel(
  planCode: string | null | undefined,
  features?: unknown,
): boolean {
  const code = (planCode ?? "").trim().toLowerCase();
  // Product rule: Growth and Scale are always white-label. A stale
  // `features.whiteLabel: false` on those plans must not keep PropertyDesk chrome.
  if (code === "growth" || code === "scale") return true;
  if (features && typeof features === "object" && !Array.isArray(features)) {
    return (features as Record<string, unknown>).whiteLabel === true;
  }
  return false;
}

export function withLogoCacheBust(
  logoUrl: string | null | undefined,
  version?: Date | string | number | null,
): string | null {
  if (!logoUrl) return null;
  if (/^https?:\/\//i.test(logoUrl) && !logoUrl.includes("/organization-logo/")) {
    return logoUrl;
  }
  const stamp =
    version instanceof Date
      ? version.getTime()
      : typeof version === "number"
        ? version
        : typeof version === "string" && version
          ? Date.parse(version) || Date.now()
          : Date.now();
  return `${logoUrl}${logoUrl.includes("?") ? "&" : "?"}v=${stamp}`;
}
