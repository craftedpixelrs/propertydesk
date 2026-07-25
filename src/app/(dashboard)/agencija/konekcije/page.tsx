import { redirect } from "next/navigation";
import type { AgencyConnectionStatus } from "@prisma/client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadUserContext } from "@/server/auth/context";
import { listMyConnections } from "@/server/services/agencies/connection.service";
import { formatDate } from "@/lib/formatters";
import { ConnectionInvitationActions } from "@/features/agency-portal/connection-invitation-actions";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<AgencyConnectionStatus, string> = {
  INVITED: "Poziv čeka",
  ACTIVE: "Aktivna",
  SUSPENDED: "Suspendovana",
  REJECTED: "Odbijena",
  TERMINATED: "Prekinuta",
};

const STATUS_TONE: Record<AgencyConnectionStatus, string> = {
  INVITED: "bg-amber-100 text-amber-700",
  ACTIVE: "bg-emerald-100 text-emerald-700",
  SUSPENDED: "bg-orange-100 text-orange-700",
  REJECTED: "bg-rose-100 text-rose-700",
  TERMINATED: "bg-neutral-200 text-neutral-700",
};

export default async function KonekcijePage() {
  const ctx = await loadUserContext();
  if (!ctx) redirect("/sign-in");
  if (!ctx.activeOrganization) redirect("/podesavanja");
  if (ctx.activeOrganization.type !== "AGENCY") redirect("/dashboard");

  const { items } = await listMyConnections({
    agencyOrganizationId: ctx.activeOrganization.id,
    page: 1,
    pageSize: 100,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Konekcije sa investitorima</h1>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          Investitori koji su Vas pozvali na saradnju.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Ukupno: {items.length}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <div className="py-12 text-center text-sm text-[var(--color-foreground-muted)]">
              Nemate uspostavljenih konekcija sa investitorima.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
                <thead className="bg-[var(--color-surface-inset)] text-left text-xs uppercase tracking-wide text-[var(--color-foreground-muted)]">
                  <tr>
                    <th className="px-4 py-3">Investitor</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Zaštita (dana)</th>
                    <th className="px-4 py-3">Pozvano</th>
                    <th className="px-4 py-3 text-right">Akcije</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {items.map((c) => (
                    <tr key={c.id}>
                      <td className="px-4 py-3">
                        {c.investor.profile?.displayName ?? c.investor.name}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONE[c.status]}`}
                        >
                          {STATUS_LABELS[c.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 tabular-nums">{c.defaultProtectionDays}</td>
                      <td className="px-4 py-3 text-[var(--color-foreground-muted)]">
                        {formatDate(c.invitedAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {c.status === "INVITED" ? (
                          <ConnectionInvitationActions connectionId={c.id} />
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
