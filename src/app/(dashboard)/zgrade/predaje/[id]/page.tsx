import { notFound } from "next/navigation";
import type { BuildingHandoverStatus } from "@prisma/client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadUserContext, requireTenantPage } from "@/server/auth/context";
import { prisma } from "@/server/db/prisma";
import {
  getHandoverRequestForTarget,
  buildHandoverSummary,
} from "@/server/services/manager/handover.service";
import { isDomainError } from "@/lib/errors";
import { formatDate } from "@/lib/formatters";
import { createT } from "@/lib/i18n";
import { HandoverAcceptForm } from "@/features/manager/handover-accept-form";

const STATUS_TONE: Record<BuildingHandoverStatus, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  ACCEPTED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-rose-100 text-rose-700",
  CANCELED: "bg-neutral-200 text-neutral-700",
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function HandoverDetailPage({ params }: Props) {
  const { id } = await params;
  const ctx = await loadUserContext();
  requireTenantPage(ctx, { permission: "building.handover", orgType: "MANAGER" });
  const t = createT(ctx.user.locale);

  let request: Awaited<ReturnType<typeof getHandoverRequestForTarget>>;
  try {
    request = await getHandoverRequestForTarget({
      targetOrganizationId: ctx.activeOrganization.id,
      requestId: id,
    });
  } catch (err) {
    if (isDomainError(err) && err.code === "NOT_FOUND") return notFound();
    throw err;
  }

  // Fresh summary so operator sees the real counts, not the snapshot stored
  // in `request.summary`.
  const summary = await buildHandoverSummary(request.sourceOrganizationId, request.sourceProjectId);

  const existingBuildings = await prisma.managedBuilding.findMany({
    where: {
      organizationId: ctx.activeOrganization.id,
      archivedAt: null,
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true, city: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{request.sourceProject.name}</h1>
          <p className="text-sm text-[var(--color-foreground-muted)]">
            {request.sourceOrganization.name}
            {" · "}
            {t("manager.handover.summary.projectName")}:{" "}
            <span className="font-mono">{request.sourceProject.code}</span>
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${STATUS_TONE[request.status]}`}
        >
          {t(`manager.handover.status.${request.status}` as const)}
        </span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("manager.handover.summary.projectName")}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <InfoRow
            label={t("manager.handover.summary.eligibleUnits")}
            value={String(summary.eligibleUnitCount)}
          />
          <InfoRow
            label={t("manager.handover.summary.totalUnits")}
            value={String(summary.totalUnitCount)}
          />
          <InfoRow label="Pokrenuto" value={formatDate(request.initiatedAt)} />
          {request.acceptedAt ? (
            <InfoRow label="Prihvaćeno" value={formatDate(request.acceptedAt)} />
          ) : null}
          {request.rejectedAt ? (
            <InfoRow label="Odbijeno" value={formatDate(request.rejectedAt)} />
          ) : null}
        </CardContent>
      </Card>

      {summary.ownersPreview.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("manager.handover.summary.ownersPreview")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-[var(--color-border)] text-sm">
              {summary.ownersPreview.map((o) => (
                <li key={o.unitCode} className="flex items-center justify-between py-2">
                  <span className="font-mono text-xs">{o.unitCode}</span>
                  <span>{o.buyerName}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {request.status === "PENDING" ? (
        summary.eligibleUnitCount === 0 ? (
          <Card>
            <CardContent className="py-6 text-sm text-amber-700">
              {t("manager.handover.noEligibleUnits")}
            </CardContent>
          </Card>
        ) : (
          <HandoverAcceptForm
            requestId={request.id}
            projectName={request.sourceProject.name}
            projectCity={request.sourceProject.city ?? ""}
            projectAddress={request.sourceProject.address ?? ""}
            buildings={existingBuildings.map((b) => ({
              id: b.id,
              label: `${b.name} — ${b.city}`,
            }))}
          />
        )
      ) : null}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs tracking-wide text-[var(--color-foreground-muted)] uppercase">
        {label}
      </div>
      <div className="mt-0.5">{value}</div>
    </div>
  );
}
