import { redirect } from "next/navigation";
import { PageHeader } from "@/components/app/page-header";
import { MoreGrid } from "@/features/navigation/more-grid";
import { loadUserContext } from "@/server/auth/context";
import { t } from "@/lib/i18n";

export default async function MorePage() {
  const ctx = await loadUserContext();
  if (!ctx) redirect("/sign-in");

  return (
    <div className="space-y-4">
      <PageHeader title={t("nav.more")} />
      <MoreGrid
        organizationType={ctx.activeOrganization?.type ?? null}
        permissions={ctx.permissions}
        isSuperAdmin={ctx.isSuperAdmin}
      />
    </div>
  );
}
