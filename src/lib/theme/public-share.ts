/** Shared offer and project links. These pages are always light. */
export function isPublicSharePath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return pathname === "/p" || pathname.startsWith("/p/");
}
