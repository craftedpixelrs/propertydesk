"use client";

import dynamic from "next/dynamic";

import { useT } from "@/components/app/i18n-provider";

function MapLoading() {
  const t = useT();
  return (
    <div
      className="flex items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface-inset)] text-sm text-[var(--color-foreground-muted)]"
      style={{ height: 320 }}
    >
      {t("inventory.map.loading")}
    </div>
  );
}

/**
 * Leaflet touches `window` at import time; we lazy-load the actual
 * `<ProjectMap>` component with `ssr: false` so it never runs on the
 * server. Callers import from this file, never from `project-map.tsx`
 * directly.
 */
export const ProjectMap = dynamic(
  () => import("./project-map").then((mod) => mod.ProjectMap),
  {
    ssr: false,
    loading: () => <MapLoading />,
  },
);
