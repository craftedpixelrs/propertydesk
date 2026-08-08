import { listSaaSPlans } from "@/server/services/platform.service";
import { NewOrganizationForm } from "@/features/platform-admin/new-organization-form";

export default async function NewOrganizationPage() {
  const plans = await listSaaSPlans();
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Nova organizacija</h2>
      <NewOrganizationForm
        plans={plans
          .filter((p) => p.active)
          .map((p) => ({ code: p.code, name: p.name }))}
      />
    </section>
  );
}
