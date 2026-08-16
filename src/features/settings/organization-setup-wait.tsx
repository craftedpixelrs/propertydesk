"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useT } from "@/components/app/i18n-provider";

export function OrganizationSetupWait() {
  const t = useT();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("orgProfile.setupWaitTitle")}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          {t("orgProfile.setupWaitBody")}
        </p>
      </CardContent>
    </Card>
  );
}
