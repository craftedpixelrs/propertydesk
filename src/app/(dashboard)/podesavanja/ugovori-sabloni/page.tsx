import { redirect } from "next/navigation";

import { loadUserContext } from "@/server/auth/context";
import { listContractTemplates } from "@/server/services/sales/contracts.service";
import { ContractTemplatesManager } from "@/features/sales/contract-templates-manager";
import { createT } from "@/lib/i18n";

export const dynamic = "force-dynamic";

/**
 * Faza 8.1 (A1). Admin CRUD for reusable sale-contract templates
 * (predugovor + ugovor). Gated by `sale.manage` — the same right
 * that governs contract generation on `/prodaje/[id]`.
 */
export default async function SaleContractTemplatesPage() {
  const ctx = await loadUserContext();
  if (!ctx) redirect("/sign-in");
  if (!ctx.activeOrganization) redirect("/podesavanja");
  if (!ctx.permissions.includes("sale.manage")) {
    redirect("/podesavanja");
  }
  const t = createT(ctx.user.locale);

  const rows = await listContractTemplates({
    organizationId: ctx.activeOrganization.id,
  });

  const templates = rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    name: row.name,
    description: row.description,
    contentHtml: row.contentHtml,
    isActive: row.isActive,
    updatedAt: row.updatedAt.toISOString(),
  }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">{t("ops.contracts.title")}</h1>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          {t("ops.contracts.description")}
        </p>
      </div>
      <ContractTemplatesManager templates={templates} />
    </div>
  );
}
