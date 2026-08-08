import Link from "next/link";
import { notFound } from "next/navigation";

import { requireSuperAdmin } from "@/server/permissions/require";
import { prisma } from "@/server/db/prisma";
import { PlanForm } from "@/features/platform-admin/plan-form";
import { PlanDangerZone } from "@/features/platform-admin/plan-danger-zone";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditPlanPage({ params }: Props) {
  await requireSuperAdmin();
  const { id } = await params;

  const plan = await prisma.saaSPlan.findUnique({
    where: { id },
    include: {
      _count: { select: { subscriptions: true, invoices: true } },
    },
  });
  if (!plan) return notFound();

  const initialValues: Record<string, string> = {
    code: plan.code,
    name: plan.name,
    description: plan.description ?? "",
    monthlyPrice: plan.monthlyPrice.toString(),
    quarterlyPrice: plan.quarterlyPrice?.toString() ?? "",
    semiAnnualPrice: plan.semiAnnualPrice?.toString() ?? "",
    annualPrice: plan.annualPrice?.toString() ?? "",
    onboardingFee: plan.onboardingFee?.toString() ?? "",
    currency: plan.currency,
    maxActiveProjects: plan.maxActiveProjects?.toString() ?? "",
    maxUnits: plan.maxUnits?.toString() ?? "",
    maxMembers: plan.maxMembers?.toString() ?? "",
    maxAgencyConnections: plan.maxAgencyConnections?.toString() ?? "",
    defaultTrialDays: plan.defaultTrialDays?.toString() ?? "",
    sortOrder: plan.sortOrder.toString(),
    active: plan.active ? "true" : "false",
    publiclyAvailable: plan.publiclyAvailable ? "true" : "false",
    recommended: plan.recommended ? "true" : "false",
  };

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/administracija/planovi"
          className="text-sm text-[var(--color-foreground-muted)] hover:underline"
        >
          ← Planovi
        </Link>
        <h2 className="mt-2 text-lg font-semibold">Izmeni plan: {plan.name}</h2>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          Šifra plana je zaključana. Sve ostale izmene se audit-uju.
          Pretplata koje ga trenutno koriste: {plan._count.subscriptions}.
        </p>
      </div>

      <PlanForm mode="edit" planId={plan.id} initialValues={initialValues} />

      <PlanDangerZone
        planId={plan.id}
        planName={plan.name}
        active={plan.active}
        subscriptionCount={plan._count.subscriptions}
        invoiceCount={plan._count.invoices}
      />
    </section>
  );
}
