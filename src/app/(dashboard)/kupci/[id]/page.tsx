import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivityTimeline } from "@/components/app/activity-timeline";
import { loadUserContext } from "@/server/auth/context";
import { getBuyerById } from "@/server/services/buyers.service";
import { listDocuments } from "@/server/services/documents.service";
import { DomainError } from "@/lib/errors";
import { formatDate, formatDateTime } from "@/lib/formatters";
import { BuyerQuickActions } from "@/features/buyers/buyer-quick-actions";
import { CommentThread } from "@/features/comments/comment-thread";
import { KycPanel } from "@/features/buyers/kyc-panel";
import type { DocumentItem } from "@/features/documents/document-list";
import {
  createT,
  enumLabel,
  type TranslateFn,
  type TranslationKey,
} from "@/lib/i18n";
import type { ActivityType, BuyerStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

function buyerStatusLabel(status: BuyerStatus, t: TranslateFn): string {
  const fromEnum = enumLabel("buyer", status, t);
  if (fromEnum !== status) return fromEnum;
  return t(`crm.buyerStatus.${status}` as TranslationKey);
}

function activityTypeLabel(type: ActivityType, t: TranslateFn): string {
  return t(`crm.activityType.${type}` as TranslationKey);
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function KupacDetaljPage({ params }: PageProps) {
  const ctx = await loadUserContext();
  if (!ctx) redirect("/sign-in");
  if (!ctx.activeOrganization) redirect("/podesavanja");
  const t = createT(ctx.user.locale);

  const { id } = await params;
  let buyer;
  try {
    buyer = await getBuyerById(ctx.activeOrganization.id, id);
  } catch (err) {
    if (err instanceof DomainError && err.code === "NOT_FOUND") notFound();
    throw err;
  }

  const canManage = ctx.permissions.includes("lead.manage");
  const canReserve = ctx.permissions.includes("reservation.create");

  const kycDocsResult = await listDocuments({
    organizationId: ctx.activeOrganization.id,
    entityType: "Buyer",
    entityId: buyer.id,
    category: "KYC",
    page: 1,
    pageSize: 50,
  });
  const kycDocuments: DocumentItem[] = kycDocsResult.items.map((d) => ({
    id: d.id,
    originalFileName: d.originalFileName,
    mimeType: d.mimeType,
    size: d.size,
    category: d.category,
    visibility: d.visibility,
    createdAt: d.createdAt.toISOString(),
    uploadedByName: d.uploadedByUser?.name ?? null,
  }));

  const timelineItems = buyer.activities.map((a) => ({
    id: a.id,
    title: `${activityTypeLabel(a.type, t)}${a.actor ? ` · ${a.actor.name}` : ""}`,
    description: a.description,
    createdAt: a.occurredAt,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/kupci" className="text-sm text-[var(--color-foreground-muted)] hover:underline">
            ← {t("nav.customers")}
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">
            {buyer.firstName} {buyer.lastName}
          </h1>
          <p className="text-sm text-[var(--color-foreground-muted)]">
            {t("crm.buyers.statusAssigned", {
              status: buyerStatusLabel(buyer.status, t),
              name: buyer.assignedUser?.name ?? "—",
            })}
          </p>
        </div>
        {canManage ? (
          <Button asChild variant="outline">
            <Link href={`/kupci/${buyer.id}/izmena`}>{t("crm.buyers.editBuyer")}</Link>
          </Button>
        ) : null}
      </div>

      <BuyerQuickActions
        buyerId={buyer.id}
        phone={buyer.phone}
        email={buyer.email}
        canManage={canManage}
        canReserve={canReserve}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t("crm.buyers.activities")}</CardTitle>
            </CardHeader>
            <CardContent>
              {timelineItems.length === 0 ? (
                <p className="text-sm text-[var(--color-foreground-muted)]">
                  {t("crm.buyers.noActivities")}
                </p>
              ) : (
                <ActivityTimeline items={timelineItems} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t("crm.buyers.comments")}</CardTitle>
            </CardHeader>
            <CardContent>
              <CommentThread
                entityType="Buyer"
                entityId={buyer.id}
                currentUserId={ctx.user.id}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t("crm.buyers.kyc")}</CardTitle>
              <p className="text-xs text-[var(--color-foreground-muted)]">
                {t("crm.buyers.kycHint")}
              </p>
            </CardHeader>
            <CardContent>
              <KycPanel
                buyerId={buyer.id}
                entityType={buyer.entityType}
                initial={{
                  idFrontOk: buyer.kycChecklist?.idFrontOk ?? false,
                  idBackOk: buyer.kycChecklist?.idBackOk ?? false,
                  addressProofOk: buyer.kycChecklist?.addressProofOk ?? false,
                  taxCertOk: buyer.kycChecklist?.taxCertOk ?? false,
                  notes: buyer.kycChecklist?.notes ?? null,
                  reviewedAt: buyer.kycChecklist?.reviewedAt?.toISOString() ?? null,
                  reviewerName: null,
                }}
                kycDocuments={kycDocuments}
                canManage={canManage}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t("nav.reservations")}</CardTitle>
            </CardHeader>
            <CardContent>
              {buyer.reservations.length === 0 ? (
                <p className="text-sm text-[var(--color-foreground-muted)]">
                  {t("ui.dashboard.noReservations")}
                </p>
              ) : (
                <ul className="divide-y divide-[var(--color-border)] text-sm">
                  {buyer.reservations.map((r) => (
                    <li key={r.id} className="flex items-center justify-between py-2">
                      <Link
                        href={`/rezervacije/${r.id}`}
                        className="text-[var(--color-brand-700)] hover:underline"
                      >
                        {r.unit?.code ?? "—"} · {r.project?.name ?? ""}
                      </Link>
                      <span className="text-xs text-[var(--color-foreground-muted)]">
                        {enumLabel("reservation", r.status, t)} · {formatDate(r.createdAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t("crm.buyers.contact")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label={t("common.phone")} value={buyer.phone} />
              {buyer.secondaryPhone ? (
                <Row label={t("crm.buyers.secondaryPhone")} value={buyer.secondaryPhone} />
              ) : null}
              <Row label={t("common.email")} value={buyer.email ?? "—"} />
              <Row label={t("crm.buyers.source")} value={buyer.source ?? "—"} />
              <Row label={t("crm.buyers.created")} value={formatDate(buyer.createdAt)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                {t("crm.buyers.identity")} (
                {buyer.entityType === "LEGAL"
                  ? t("crm.buyers.legalPerson")
                  : t("crm.buyers.naturalPerson")}
                )
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {buyer.entityType === "LEGAL" ? (
                <>
                  <Row label={t("crm.buyers.legalName")} value={buyer.legalName ?? "—"} />
                  <Row label={t("crm.buyers.taxId")} value={buyer.taxId ?? "—"} />
                </>
              ) : (
                <>
                  <Row label={t("crm.buyers.jmbg")} value={buyer.jmbg ?? "—"} />
                  <Row label={t("crm.buyers.identityNumber")} value={buyer.identityNumber ?? "—"} />
                </>
              )}
              <Row label={t("crm.buyers.address")} value={buyer.addressLine1 ?? "—"} />
              <Row
                label={t("crm.buyers.city")}
                value={[buyer.postalCode, buyer.city].filter(Boolean).join(" ") || "—"}
              />
              <Row label={t("crm.buyers.country")} value={buyer.country ?? "—"} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t("nav.tasks")}</CardTitle>
            </CardHeader>
            <CardContent>
              {buyer.tasks.length === 0 ? (
                <p className="text-sm text-[var(--color-foreground-muted)]">
                  {t("crm.buyers.noTasks")}
                </p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {buyer.tasks.map((task) => (
                    <li key={task.id} className="rounded-md border border-[var(--color-border)] p-2">
                      <div className="font-medium">{task.title}</div>
                      <div className="text-xs text-[var(--color-foreground-muted)]">
                        {t(`crm.tasks.status.${task.status}` as TranslationKey)} ·{" "}
                        {t("crm.buyers.due", { date: formatDateTime(task.dueAt) })}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[var(--color-foreground-muted)]">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
