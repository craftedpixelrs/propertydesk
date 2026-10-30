import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/server/db/prisma";
import { requireResidentSession } from "@/server/auth/resident-guard";
import { listResidentUnitsForSession } from "@/server/auth/resident-session";
import { formatDate, formatMoney } from "@/lib/formatters";

/**
 * Resident dashboard. Shows every unit linked to the resident's email
 * across every building managed by the manager, with their outstanding
 * dues and the latest building notices. Everything here is read-only.
 */
export default async function ResidentDashboard() {
  const session = await requireResidentSession();
  const accesses = await listResidentUnitsForSession(session);

  // Collect per-access the outstanding debt + most recent notice for the
  // building. Scoped by `organizationId` to never leak across tenants.
  const unitIds = accesses.map((a) => a.unitId);
  const buildingIds = Array.from(new Set(accesses.map((a) => a.unit.buildingId)));

  const [charges, notices] = await Promise.all([
    prisma.duesCharge.findMany({
      where: {
        unitId: { in: unitIds },
        status: { in: ["OPEN", "PARTIALLY_PAID"] },
      },
      select: {
        unitId: true,
        totalAmount: true,
        paidAmount: true,
        dueDate: true,
      },
    }),
    prisma.buildingNotice.findMany({
      where: {
        buildingId: { in: buildingIds },
        publishedAt: { not: null },
      },
      orderBy: { publishedAt: "desc" },
      take: 10,
      include: { building: { select: { id: true, name: true } } },
    }),
  ]);

  const debtByUnit = new Map<string, { outstanding: number; oldest: Date | null }>();
  for (const c of charges) {
    const unresolved = Number(c.totalAmount) - Number(c.paidAmount);
    if (unresolved <= 0) continue;
    const existing = debtByUnit.get(c.unitId) ?? { outstanding: 0, oldest: null };
    existing.outstanding += unresolved;
    if (!existing.oldest || c.dueDate < existing.oldest) existing.oldest = c.dueDate;
    debtByUnit.set(c.unitId, existing);
  }

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold">Dobrodošli</h1>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          Prijavljeni ste kao <strong>{session.email}</strong>.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Vaši posebni delovi</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {accesses.map((a) => {
            const debt = debtByUnit.get(a.unitId);
            return (
              <Card key={a.id}>
                <CardContent className="space-y-2 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold">{a.unit.building.name}</div>
                      <div className="text-xs text-[var(--color-foreground-muted)]">
                        {a.unit.building.address}, {a.unit.building.city}
                      </div>
                      <div className="mt-1 font-mono text-xs">{a.unit.code}</div>
                    </div>
                    <div className="shrink-0 text-right">
                      {debt && debt.outstanding > 0 ? (
                        <>
                          <div className="text-xs text-[var(--color-foreground-muted)]">Dug</div>
                          <div className="text-base font-semibold text-red-700">
                            {formatMoney(debt.outstanding.toFixed(2), "RSD")}
                          </div>
                          {debt.oldest ? (
                            <div className="text-xs text-[var(--color-foreground-muted)]">
                              od {formatDate(debt.oldest)}
                            </div>
                          ) : null}
                        </>
                      ) : (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">
                          Izmireno
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Link
                      href="/stanar/zaduzenja"
                      className="rounded-md border border-[var(--color-border)] px-2 py-1 text-xs hover:bg-[var(--color-surface-inset)]"
                    >
                      Zaduženja
                    </Link>
                    <Link
                      href={`/stanar/kvarovi/novi?unit=${a.unitId}`}
                      className="rounded-md border border-[var(--color-border)] px-2 py-1 text-xs hover:bg-[var(--color-surface-inset)]"
                    >
                      Prijavi kvar
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Najnovija obaveštenja</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {notices.length === 0 ? (
              <p className="text-sm text-[var(--color-foreground-muted)]">
                Nema objavljenih obaveštenja za vašu zgradu.
              </p>
            ) : (
              notices.map((n) => (
                <article
                  key={n.id}
                  className="border-b border-[var(--color-border)] pb-3 last:border-b-0"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold">{n.title}</h3>
                    <span className="text-xs text-[var(--color-foreground-muted)]">
                      {n.building.name} · {n.publishedAt ? formatDate(n.publishedAt) : ""}
                    </span>
                  </div>
                  <p className="mt-1 text-sm whitespace-pre-wrap">{n.body}</p>
                </article>
              ))
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
