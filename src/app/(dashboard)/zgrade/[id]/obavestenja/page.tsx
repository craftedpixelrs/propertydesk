import { Card, CardContent } from "@/components/ui/card";
import { loadUserContext, requireTenantPage } from "@/server/auth/context";
import { createT } from "@/lib/i18n";

export default async function BuildingNoticesTab() {
  const ctx = await loadUserContext();
  requireTenantPage(ctx, { permission: "building.read", orgType: "MANAGER" });
  const t = createT(ctx.user.locale);
  return (
    <Card>
      <CardContent className="py-10 text-center text-sm text-[var(--color-foreground-muted)]">
        {t("manager.building.tabs.notices")} — soon.
      </CardContent>
    </Card>
  );
}
