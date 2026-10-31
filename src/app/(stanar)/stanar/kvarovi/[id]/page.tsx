import Link from "next/link";
import { notFound } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/server/db/prisma";
import { requireResidentSession } from "@/server/auth/resident-guard";
import { listResidentUnitsForSession } from "@/server/auth/resident-session";
import { formatDateTime } from "@/lib/formatters";
import type { MaintenanceCategory, MaintenanceStatus } from "@prisma/client";

const STATUS_LABEL: Record<MaintenanceStatus, string> = {
  OPEN: "Otvoreno",
  TRIAGED: "Prihvaćeno",
  IN_PROGRESS: "U radu",
  AWAITING_PARTS: "Čeka delove",
  COMPLETED: "Završeno",
  CANCELED: "Otkazano",
};

const CATEGORY_LABEL: Record<MaintenanceCategory, string> = {
  PLUMBING: "Vodovod",
  ELECTRICAL: "Struja",
  HEATING: "Grejanje",
  ELEVATOR: "Lift",
  COMMON_AREAS: "Zajednički prostori",
  ROOF: "Krov",
  FACADE: "Fasada",
  SECURITY: "Obezbeđenje",
  CLEANING: "Čišćenje",
  OTHER: "Ostalo",
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ResidentTicketDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await requireResidentSession();
  const accesses = await listResidentUnitsForSession(session);
  const unitIds = accesses.map((access) => access.unitId);

  const ticket = await prisma.maintenanceTicket.findFirst({
    where: {
      id,
      OR: [
        { reportedByPersonId: session.personId },
        ...(unitIds.length > 0 ? [{ unitId: { in: unitIds } }] : []),
      ],
    },
    include: {
      building: { select: { name: true } },
      unit: { select: { code: true, floor: true } },
      workEntries: {
        where: { visibleToResident: true },
        orderBy: { createdAt: "desc" },
      },
      history: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!ticket) notFound();

  const photos = await prisma.document.findMany({
    where: {
      entityType: "MaintenanceTicket",
      entityId: ticket.id,
      deletedAt: null,
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <div className="space-y-4">
      <div>
        <Link
          href="/stanar/kvarovi"
          className="text-sm text-[var(--color-brand-700)] hover:underline"
        >
          ← Sve prijave
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">{ticket.title}</h1>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          {ticket.code} · {ticket.building.name}
          {ticket.unit ? ` · ${ticket.unit.code}` : " · zajednički prostor"}
          {ticket.unit?.floor != null ? ` · sprat ${ticket.unit.floor}` : ""}
          {" · "}
          {CATEGORY_LABEL[ticket.category]}
        </p>
        <p className="mt-1 text-sm font-medium">{STATUS_LABEL[ticket.status]}</p>
      </div>

      {ticket.description ? (
        <Card>
          <CardContent className="py-4 text-sm whitespace-pre-wrap">
            {ticket.description}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="space-y-3 py-4">
          <h2 className="text-sm font-semibold">Evidencija rada</h2>
          {ticket.workEntries.length === 0 ? (
            <p className="text-sm text-[var(--color-foreground-muted)]">
              Upravnik još nije uneo šta je urađeno na ovoj prijavi.
            </p>
          ) : (
            <ul className="space-y-3 text-sm">
              {ticket.workEntries.map((entry) => (
                <li
                  key={entry.id}
                  className="border-b border-[var(--color-border)] pb-3 last:border-b-0"
                >
                  <div className="text-xs text-[var(--color-foreground-muted)]">
                    {formatDateTime(entry.createdAt)}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap">{entry.body}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {ticket.history.some((row) => row.note) ? (
        <Card>
          <CardContent className="space-y-2 py-4">
            <h2 className="text-sm font-semibold">Napomene uz status</h2>
            <ul className="space-y-2 text-sm">
              {ticket.history
                .filter((row) => row.note)
                .map((row) => (
                  <li key={row.id}>
                    <span className="text-xs text-[var(--color-foreground-muted)]">
                      {formatDateTime(row.createdAt)} · {STATUS_LABEL[row.toStatus]}
                    </span>
                    <p className="whitespace-pre-wrap">{row.note}</p>
                  </li>
                ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {photos.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((photo) => (
            <a
              key={photo.id}
              href={`/api/v1/public/resident/documents/${photo.id}/download`}
              className="overflow-hidden rounded-md border border-[var(--color-border)]"
            >
              {photo.mimeType.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/v1/public/resident/documents/${photo.id}/download`}
                  alt={photo.originalFileName}
                  className="h-32 w-full object-cover"
                />
              ) : (
                <div className="flex h-32 items-center justify-center px-2 text-center text-xs">
                  {photo.originalFileName}
                </div>
              )}
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}
