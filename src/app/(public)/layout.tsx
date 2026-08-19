import type { Metadata } from "next";
import { type ReactNode } from "react";

/**
 * Public-share layout — deliberately empty and framework-neutral.
 *
 * Pages under `/p/[token]` and `/api/public/*` MUST NOT depend on the
 * dashboard layout (which redirects to /sign-in for unauthenticated
 * callers). Anything inside this layout renders regardless of session
 * state.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default function PublicLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
