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
import type { ActivityType, BuyerStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const BUYER_STATUS_LABELS: Record<BuyerStatus, string> = {
  NEW: "Novi",
  CONTACTED: "Kontaktiran",
  QUALIFIED: "Kvalifikovan",
  VIEWING_SCHEDULED: "Razgledanje zakazano",
  OFFER_SENT: "Ponuda poslata",
  NEGOTIATION: "Pregovori",
  RESERVATION: "Rezervacija",
  WON: "Kupio",
  LOST: "Izgubljen",
  ARCHIVED: "Arhiviran",
};

const ACTIVITY_LABELS: Record<ActivityType, string> = {
  NOTE: "Beleška",
  CALL: "Poziv",
  EMAIL: "Email",
  MEETING: "Sastanak",
  VIEWING: "Razgledanje",
  OFFER: "Ponuda",
  STATUS_CHANGE: "Promena statusa",
  SYSTEM: "Sistem",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function KupacDetaljPage({ params }: PageProps) {
  const ctx = await loadUserContext();
  if (!ctx) redirect("/sign-in");
  if (!ctx.activeOrganization) redirect("/podesavanja");

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
    title: `${ACTIVITY_LABELS[a.type]}${a.actor ? ` · ${a.actor.name}` : ""}`,
    description: a.description,
    createdAt: a.occurredAt,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/kupci" className="text-sm text-[var(--color-foreground-muted)] hover:underline">
            ← Kupci
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">
            {buyer.firstName} {buyer.lastName}
          </h1>
          <p className="text-sm text-[var(--color-foreground-muted)]">
            Status: {BUYER_STATUS_LABELS[buyer.status]} · Zadužen:{" "}
            {buyer.assignedUser?.name ?? "—"}
          </p>
        </div>
        {canManage ? (
          <Button asChild variant="outline">
            <Link href={`/kupci/${buyer.id}/izmena`}>Izmeni kupca</Link>
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
              <CardTitle className="text-sm">Aktivnosti</CardTitle>
            </CardHeader>
            <CardContent>
              {timelineItems.length === 0 ? (
                <p className="text-sm text-[var(--color-foreground-muted)]">
                  Nema zabeleženih aktivnosti.
                </p>
              ) : (
                <ActivityTimeline items={timelineItems} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Komentari</CardTitle>
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
              <CardTitle className="text-sm">KYC</CardTitle>
              <p className="text-xs text-[var(--color-foreground-muted)]">
                Provera identiteta i pratećih dokumenata pre prelaska prodaje u
                „Ugovorena".
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
              <CardTitle className="text-sm">Rezervacije</CardTitle>
            </CardHeader>
            <CardContent>
              {buyer.reservations.length === 0 ? (
                <p className="text-sm text-[var(--color-foreground-muted)]">
                  Nema rezervacija.
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
                        {r.status} · {formatDate(r.createdAt)}
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
              <CardTitle className="text-sm">Kontakt</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="Telefon" value={buyer.phone} />
              {buyer.secondaryPhone ? <Row label="Sekundarni" value={buyer.secondaryPhone} /> : null}
              <Row label="Email" value={buyer.email ?? "—"} />
              <Row label="Izvor" value={buyer.source ?? "—"} />
              <Row label="Kreiran" value={formatDate(buyer.createdAt)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                Identitet ({buyer.entityType === "LEGAL" ? "pravno lice" : "fizičko lice"})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {buyer.entityType === "LEGAL" ? (
                <>
                  <Row label="Naziv pravnog lica" value={buyer.legalName ?? "—"} />
                  <Row label="PIB" value={buyer.taxId ?? "—"} />
                </>
              ) : (
                <>
                  <Row label="JMBG" value={buyer.jmbg ?? "—"} />
                  <Row label="Br. lične karte" value={buyer.identityNumber ?? "—"} />
                </>
              )}
              <Row label="Adresa" value={buyer.addressLine1 ?? "—"} />
              <Row
                label="Grad"
                value={[buyer.postalCode, buyer.city].filter(Boolean).join(" ") || "—"}
              />
              <Row label="Država" value={buyer.country ?? "—"} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Zadaci</CardTitle>
            </CardHeader>
            <CardContent>
              {buyer.tasks.length === 0 ? (
                <p className="text-sm text-[var(--color-foreground-muted)]">Nema zadataka.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {buyer.tasks.map((task) => (
                    <li key={task.id} className="rounded-md border border-[var(--color-border)] p-2">
                      <div className="font-medium">{task.title}</div>
                      <div className="text-xs text-[var(--color-foreground-muted)]">
                        {task.status} · rok {formatDateTime(task.dueAt)}
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
