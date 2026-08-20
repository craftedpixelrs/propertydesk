export const PROJECT_COVER_PUBLIC_PREFIX = "/api/v1/public/project-cover/";

export function projectCoverPublicPath(documentId: string): string {
  return `${PROJECT_COVER_PUBLIC_PREFIX}${documentId}`;
}

export function isProjectCoverPath(value: string): boolean {
  return value.startsWith(PROJECT_COVER_PUBLIC_PREFIX);
}

export function isStoredCoverImageUrl(value: string): boolean {
  return /^https?:\/\//i.test(value) || isProjectCoverPath(value);
}

export function absoluteCoverImageUrl(value: string, origin: string): string {
  if (/^https?:\/\//i.test(value)) return value;
  const base = origin.replace(/\/$/, "");
  return `${base}${value.startsWith("/") ? value : `/${value}`}`;
}
