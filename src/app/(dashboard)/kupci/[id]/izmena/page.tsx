import { notFound, redirect } from "next/navigation";

import { loadUserContext } from "@/server/auth/context";
import { getBuyerById } from "@/server/services/buyers.service";
import { DomainError } from "@/lib/errors";
import { NewBuyerForm } from "@/features/buyers/new-buyer-form";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditBuyerPage({ params }: Props) {
  const { id } = await params;
  const ctx = await loadUserContext();
  if (!ctx) redirect("/sign-in");
  if (!ctx.activeOrganization) redirect("/podesavanja");
  if (!ctx.permissions.includes("lead.manage")) {
    redirect(`/kupci/${id}`);
  }

  let buyer;
  try {
    buyer = await getBuyerById(ctx.activeOrganization.id, id);
  } catch (err) {
    if (err instanceof DomainError && err.code === "NOT_FOUND") notFound();
    throw err;
  }

  const initialValues: Record<string, string> = {
    firstName: buyer.firstName ?? "",
    lastName: buyer.lastName ?? "",
    phone: buyer.phone ?? "",
    secondaryPhone: buyer.secondaryPhone ?? "",
    email: buyer.email ?? "",
    preferredContactMethod: buyer.preferredContactMethod ?? "ANY",
    budgetMin: buyer.budgetMin?.toString() ?? "",
    budgetMax: buyer.budgetMax?.toString() ?? "",
    source: buyer.source ?? "",
    notes: buyer.notes ?? "",
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">
          Izmeni kupca — {buyer.firstName} {buyer.lastName}
        </h1>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          Sve izmene se beleže u audit trag. Telefon/email su normalizovani za
          detekciju duplikata.
        </p>
      </div>
      <NewBuyerForm mode="edit" buyerId={buyer.id} initialValues={initialValues} />
    </div>
  );
}
