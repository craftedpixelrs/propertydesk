import { redirect } from "next/navigation";

import { loadUserContext } from "@/server/auth/context";
import { prisma } from "@/server/db/prisma";
import { listTemplates } from "@/server/services/sales/payment-plan-templates.service";
import { PaymentPlanTemplatesManager } from "@/features/payment-plan-templates/templates-manager";

export const dynamic = "force-dynamic";

/**
 * Investor-only CRUD page for reusable payment-plan blueprints.
 * Templates can be scoped org-wide (projectId=null) or per-project.
 * Access is gated by `payment.manage`.
 */
export default async function PaymentPlanTemplatesPage() {
  const ctx = await loadUserContext();
  if (!ctx) redirect("/sign-in");
  if (!ctx.activeOrganization) redirect("/podesavanja");
  if (!ctx.permissions.includes("payment.manage")) {
    redirect("/podesavanja");
  }

  const [templatesRaw, projects] = await Promise.all([
    listTemplates({ organizationId: ctx.activeOrganization.id }),
    prisma.project.findMany({
      where: { organizationId: ctx.activeOrganization.id, archivedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const templates = templatesRaw.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description ?? null,
    projectId: t.projectId ?? null,
    projectName: t.project?.name ?? null,
    isDefault: t.isDefault,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    items: t.items.map((it) => ({
      id: it.id,
      sequenceNumber: it.sequenceNumber,
      label: it.label,
      percentage: it.percentage.toString(),
      dueDateAnchor: it.dueDateAnchor,
      offsetDays: it.offsetDays,
    })),
  }));

  return (
    <PaymentPlanTemplatesManager templates={templates} projects={projects} />
  );
}
