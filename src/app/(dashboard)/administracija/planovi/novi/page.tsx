import Link from "next/link";

import { requireSuperAdmin } from "@/server/permissions/require";
import { PlanForm } from "@/features/platform-admin/plan-form";

export default async function NewPlanPage() {
  await requireSuperAdmin();
  return (
    <section className="mx-auto max-w-3xl space-y-4">
      <div>
        <Link
          href="/administracija/planovi"
          className="text-sm text-[var(--color-foreground-muted)] hover:underline"
        >
          ← Planovi
        </Link>
        <h2 className="mt-2 text-lg font-semibold">Novi plan</h2>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          Kreirajte novi SaaS plan. Šifra plana će biti trajni identifikator
          — kasnije ne može se menjati.
        </p>
      </div>
      <PlanForm mode="create" />
    </section>
  );
}
