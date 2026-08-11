import { redirect } from "next/navigation";

import { loadUserContext } from "@/server/auth/context";
import { listContractTemplates } from "@/server/services/sales/contracts.service";
import { ContractTemplatesManager } from "@/features/sales/contract-templates-manager";

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

  const rows = await listContractTemplates({
    organizationId: ctx.activeOrganization.id,
  });

  const templates = rows.map((t) => ({
    id: t.id,
    kind: t.kind,
    name: t.name,
    description: t.description,
    contentHtml: t.contentHtml,
    isActive: t.isActive,
    updatedAt: t.updatedAt.toISOString(),
  }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Šabloni ugovora</h1>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          Predugovori i ugovori sa <code>{`{{var}}`}</code> placeholder-ima —
          generišu se u PDF na strani prodaje.
        </p>
      </div>
      <ContractTemplatesManager templates={templates} />
    </div>
  );
}
