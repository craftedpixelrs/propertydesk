"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useT } from "@/components/app/i18n-provider";
import { formatDate } from "@/lib/formatters/date";

export function NotYetActivePanel({ activatesAt }: { activatesAt: string }) {
  const t = useT();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("orgProfile.notYetActiveTitle")}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          {t("orgProfile.notYetActiveBody", { date: formatDate(activatesAt) })}
        </p>
      </CardContent>
    </Card>
  );
}
