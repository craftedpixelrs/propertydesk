import type { Metadata } from "next";
import { type ReactNode } from "react";

import { PublicShareFooter } from "@/features/public/public-share-footer";

/**
 * Public-share layout — no dashboard chrome, no sign-in redirect.
 * Pages under `/p/*` render for anonymous visitors. The PropertyDesk
 * footer is on every shared page.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex-1">{children}</div>
      <PublicShareFooter />
    </div>
  );
}
