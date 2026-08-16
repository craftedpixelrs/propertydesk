import { redirect } from "next/navigation";
import { LanguageSwitcher } from "@/components/app/language-switcher";
import { PageHeader } from "@/components/app/page-header";
import { MoreGrid } from "@/features/navigation/more-grid";
import { loadUserContext } from "@/server/auth/context";
import { t } from "@/lib/i18n";

export default async function MorePage() {
  const ctx = await loadUserContext();
  if (!ctx) redirect("/sign-in");
  const locale = ctx.user.locale;

  return (
    <div className="space-y-4">
      <PageHeader title={t("nav.more", undefined, locale)} />
      <MoreGrid
        organizationType={ctx.activeOrganization?.type ?? null}
        permissions={ctx.permissions}
        isSuperAdmin={ctx.isSuperAdmin}
        hasPropertyDeskAccess={
          ctx.isSuperAdmin || Boolean(ctx.propertyDeskTeam?.enabled)
        }
      />
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <LanguageSwitcher />
      </div>
    </div>
  );
}
