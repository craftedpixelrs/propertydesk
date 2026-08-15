import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { t } from "@/lib/i18n";

export function OrganizationSetupWait() {
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
