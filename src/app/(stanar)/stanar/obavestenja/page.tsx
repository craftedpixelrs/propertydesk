import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/server/db/prisma";
import { requireResidentSession } from "@/server/auth/resident-guard";
import { listResidentUnitsForSession } from "@/server/auth/resident-session";
import {
  noticeVisibleOnPortal,
  resolveNoticeUnitIds,
} from "@/server/services/manager/notices.service";
import { formatDate } from "@/lib/formatters";

/**
 * Resident notices page — shows published `BuildingNotice` entries for
 * every building the signed-in resident has active access to, filtered
 * so a resident with only unit 3B does not see a notice addressed to
 * entrance B when they live in entrance A. Centralised in
 * `resolveNoticeUnitIds` so the email delivery and this page always
 * agree on who sees what.
 */
export default async function ResidentNoticesPage() {
  const session = await requireResidentSession();
  const accesses = await listResidentUnitsForSession(session);
  const buildingIds = Array.from(new Set(accesses.map((a) => a.unit.buildingId)));
  const residentUnitIds = new Set(accesses.map((a) => a.unitId));

  const candidates = buildingIds.length
    ? await prisma.buildingNotice.findMany({
        where: {
          buildingId: { in: buildingIds },
          publishedAt: { not: null },
        },
        include: {
          building: { select: { id: true, name: true, address: true, city: true } },
        },
        orderBy: { publishedAt: "desc" },
        take: 200,
      })
    : [];

  const residentIds = [...residentUnitIds];
  const notices: typeof candidates = [];
  for (const notice of candidates) {
    // eslint-disable-next-line no-await-in-loop
    const targeted =
      notice.audience === "ALL"
        ? []
        : await resolveNoticeUnitIds({
            organizationId: notice.organizationId,
            buildingId: notice.buildingId,
            audience: notice.audience,
            audienceParams: notice.audienceParams,
          });
    if (
      noticeVisibleOnPortal({
        channel: notice.channel,
        audience: notice.audience,
        targetedUnitIds: targeted,
        residentUnitIds: residentIds,
      })
    ) {
      notices.push(notice);
    }
    if (notices.length >= 100) break;
  }

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold">Obaveštenja</h1>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          Poruke upravnika za vaše stanove, uključujući skupštinu i kvarove u zajedničkim
          prostorima. Poruke koje idu samo na email ovde se ne prikazuju.
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
                {n.assemblyId ? (
                  <Link
                    href={`/stanar/glasanje/${n.assemblyId}`}
                    className="inline-block text-sm text-[var(--color-brand-700)] hover:underline"
                  >
                    Otvori skupštinu
                  </Link>
                ) : null}
                {n.ticketId ? (
                  <Link
                    href={`/stanar/kvarovi/${n.ticketId}`}
                    className="inline-block text-sm text-[var(--color-brand-700)] hover:underline"
                  >
                    Otvori prijavu
                  </Link>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
