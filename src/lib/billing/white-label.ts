export function planAllowsWhiteLabel(
  planCode: string | null | undefined,
  features?: unknown,
): boolean {
  if (features && typeof features === "object" && !Array.isArray(features)) {
    const flag = (features as Record<string, unknown>).whiteLabel;
    if (flag === true) return true;
    if (flag === false) return false;
  }
  const code = (planCode ?? "").trim().toLowerCase();
  return code === "growth" || code === "scale";
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
