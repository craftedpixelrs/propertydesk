import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/server/db/prisma";
import { requireResidentSession } from "@/server/auth/resident-guard";
import { listResidentUnitsForSession } from "@/server/auth/resident-session";
import { formatDate } from "@/lib/formatters";

/**
 * Resident notices page — shows every published `BuildingNotice` for
 * every building the signed-in resident has active access to.
 */
export default async function ResidentNoticesPage() {
  const session = await requireResidentSession();
  const accesses = await listResidentUnitsForSession(session);
  const buildingIds = Array.from(new Set(accesses.map((a) => a.unit.buildingId)));

  const notices = buildingIds.length
    ? await prisma.buildingNotice.findMany({
        where: {
          buildingId: { in: buildingIds },
          publishedAt: { not: null },
        },
        include: {
          building: { select: { id: true, name: true, address: true, city: true } },
        },
        orderBy: { publishedAt: "desc" },
        take: 100,
      })
    : [];

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold">Obaveštenja</h1>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          Sva objavljena obaveštenja za Vaše zgrade.
        </p>
      </section>

      {notices.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-[var(--color-foreground-muted)]">
            Nema objavljenih obaveštenja.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notices.map((n) => (
            <Card key={n.id}>
              <CardContent className="space-y-2 py-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="font-semibold">{n.title}</h3>
                  <span className="text-xs text-[var(--color-foreground-muted)]">
                    {n.building.name} · {n.publishedAt ? formatDate(n.publishedAt) : ""}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{n.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
