import Link from "next/link";
import { redirect } from "next/navigation";
import type { AgencyBuyerRegistrationStatus } from "@prisma/client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { loadUserContext } from "@/server/auth/context";
import { listRegistrationsForInvestor } from "@/server/services/agencies/registrations.service";
import { formatDate } from "@/lib/formatters";
import { RegistrationReviewActions } from "@/features/agencies/registration-review-actions";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<AgencyBuyerRegistrationStatus, string> = {
  PENDING: "Čeka odobrenje",
  APPROVED: "Odobrena",
  REJECTED: "Odbijena",
  EXPIRED: "Istekla",
  CONVERTED: "Konvertovana",
  CANCELED: "Otkazana",
  CONFLICT_REVIEW: "Konflikt zaštite",
};

const STATUS_TONE: Record<AgencyBuyerRegistrationStatus, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-rose-100 text-rose-700",
  EXPIRED: "bg-neutral-200 text-neutral-700",
  CONVERTED: "bg-sky-100 text-sky-700",
  CANCELED: "bg-neutral-200 text-neutral-700",
  CONFLICT_REVIEW: "bg-orange-100 text-orange-700",
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function readParam(raw: string | string[] | undefined): string | undefined {
  if (Array.isArray(raw)) return raw[0];
  return raw;
}

export default async function RegistracijePage({ searchParams }: PageProps) {
  const ctx = await loadUserContext();
  if (!ctx) redirect("/sign-in");
  if (!ctx.activeOrganization) redirect("/podesavanja");
  if (ctx.activeOrganization.type !== "INVESTOR") redirect("/dashboard");

  const sp = await searchParams;
  const status = readParam(sp.status) as AgencyBuyerRegistrationStatus | undefined;
  const page = Number(readParam(sp.page) ?? "1") || 1;

  const { items, total } = await listRegistrationsForInvestor({
    investorOrganizationId: ctx.activeOrganization.id,
    status: status ? [status] : undefined,
    page,
    pageSize: 25,
  });

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <Link href="/agencije" className="text-sm text-[var(--color-brand-700)] hover:underline">
            ← Agencije
          </Link>
        </div>
        <h1 className="mt-2 text-2xl font-semibold">Prijave kupaca (agencije)</h1>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          Odobrite ili odbijte agencijske prijave. Odobrena prijava startuje zaštitu kupca za
          konfigurisani broj dana.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Filteri</CardTitle>
        </CardHeader>
        <CardContent>
          <form method="get" action="/agencije/registracije" className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="status">
                Status
              </label>
              <select
                id="status"
                name="status"
                defaultValue={status ?? ""}
                className="h-10 rounded-md border border-[var(--color-border)] bg-white px-3 text-sm"
              >
                <option value="">Svi statusi</option>
                {(Object.entries(STATUS_LABELS) as [AgencyBuyerRegistrationStatus, string][]).map(
                  ([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ),
                )}
              </select>
            </div>
            <Button type="submit">Primeni</Button>
            <Button asChild variant="outline">
              <Link href="/agencije/registracije">Poništi</Link>
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Ukupno: {total}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <div className="py-12 text-center text-sm text-[var(--color-foreground-muted)]">
              Nema prijava.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
                <thead className="bg-[var(--color-surface-inset)] text-left text-xs uppercase tracking-wide text-[var(--color-foreground-muted)]">
                  <tr>
                    <th className="px-4 py-3">Kupac</th>
                    <th className="px-4 py-3">Projekat</th>
                    <th className="px-4 py-3">Agencija</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Prijavljeno</th>
                    <th className="px-4 py-3 text-right">Akcije</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {items.map((r) => (
                    <tr key={r.id}>
                      <td className="px-4 py-3">
                        <div className="font-medium">
                          {r.buyer.firstName} {r.buyer.lastName}
                        </div>
                        <div className="text-xs text-[var(--color-foreground-muted)]">
                          {r.buyer.phone}
                        </div>
                      </td>
                      <td className="px-4 py-3">{r.project.name}</td>
                      <td className="px-4 py-3">{r.agency.name}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONE[r.status]}`}
                        >
                          {STATUS_LABELS[r.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[var(--color-foreground-muted)]">
                        {formatDate(r.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {r.status === "PENDING" || r.status === "CONFLICT_REVIEW" ? (
                          <RegistrationReviewActions registrationId={r.id} />
                        ) : (
                          <span className="text-xs text-[var(--color-foreground-muted)]">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
