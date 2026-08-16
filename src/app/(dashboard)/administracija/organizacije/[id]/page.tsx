import Link from "next/link";
import { notFound } from "next/navigation";

import { NewOrganizationForm } from "@/features/platform-admin/new-organization-form";
import { requireSuperAdmin } from "@/server/permissions/require";
import {
  getOrganizationForPlatformAdmin,
  listSaaSPlans,
} from "@/server/services/platform.service";
import { DomainError } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { createT } from "@/lib/i18n";
import { resolveRequestLocale } from "@/lib/i18n/resolve-locale";

export const dynamic = "force-dynamic";

export default async function EditOrganizationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSuperAdmin();
  const t = createT(await resolveRequestLocale());
  const { id } = await params;

  let org;
  try {
    org = await getOrganizationForPlatformAdmin(id);
  } catch (err) {
    if (err instanceof DomainError && err.code === "NOT_FOUND") notFound();
    throw err;
  }

  const plans = await listSaaSPlans();
  const currentPlanCode = org.subscription?.plan.code;
  const planOptions = plans
    .filter((p) => p.active || p.code === currentPlanCode)
    .map((p) => ({ code: p.code, name: p.name }));

  const trialEndsAt = org.subscription?.trialEndsAt ?? null;
  const remainingTrialDays = trialEndsAt
    ? Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / 86_400_000))
    : 30;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">
          {t("admin.orgsPage.editTitle", { name: org.name })}
        </h2>
        <Button asChild size="sm" variant="outline">
          <Link href={`/administracija/organizacije/${org.id}/naplata`}>
            {t("admin.orgsPage.billing")}
          </Link>
        </Button>
      </div>
      <NewOrganizationForm
        mode="edit"
        organizationId={org.id}
        plans={planOptions}
        initialValues={{
          name: org.name,
          slug: org.slug ?? "",
          type: org.profile?.type ?? "INVESTOR",
          legalName: org.profile?.legalName ?? org.name,
          displayName: org.profile?.displayName ?? org.name,
          registrationNumber: org.profile?.registrationNumber ?? "",
          taxNumber: org.profile?.taxNumber ?? "",
          address: org.profile?.address ?? "",
          city: org.profile?.city ?? "",
          postalCode: org.profile?.postalCode ?? "",
          country: org.profile?.country ?? "RS",
          phone: org.profile?.phone ?? "",
          email: org.profile?.email ?? "",
          website: org.profile?.website ?? "",
          planCode: currentPlanCode ?? planOptions[0]?.code ?? "trial",
          status: org.profile?.status ?? "TRIAL",
          trialDays: remainingTrialDays,
        }}
      />
    </section>
  );
}
