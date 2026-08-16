"use client";

import { Badge } from "@/components/ui/badge";
import { useT } from "@/components/app/i18n-provider";
import type { TranslationKey } from "@/lib/i18n";

export type EntityStatus =
  | "TRIAL"
  | "ACTIVE"
  | "SUSPENDED"
  | "CLOSED"
  | "PAST_DUE"
  | "CANCELED";

const statusMap: Record<
  EntityStatus,
  { tone: React.ComponentProps<typeof Badge>["tone"]; labelKey: TranslationKey }
> = {
  TRIAL: { tone: "info", labelKey: "status.trial" },
  ACTIVE: { tone: "success", labelKey: "status.active" },
  SUSPENDED: { tone: "warning", labelKey: "status.suspended" },
  CLOSED: { tone: "neutral", labelKey: "status.closed" },
  PAST_DUE: { tone: "danger", labelKey: "status.pastDue" },
  CANCELED: { tone: "neutral", labelKey: "status.canceled" },
};

export function StatusBadge({ status }: { status: EntityStatus }) {
  const t = useT();
  const cfg = statusMap[status];
  return <Badge tone={cfg.tone}>{t(cfg.labelKey)}</Badge>;
}
