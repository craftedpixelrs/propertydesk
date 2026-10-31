import Link from "next/link";
import { notFound } from "next/navigation";
import Decimal from "decimal.js";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PermissionGuard } from "@/components/app/permission-guard";
import { loadUserContext, requireTenantPage } from "@/server/auth/context";
import { getAssembly } from "@/server/services/manager/assemblies.service";
import { listDocuments } from "@/server/services/documents.service";
import { DocumentVisibilityButton, UploadDocumentDialog } from "@/features/manager/document-forms";
import { prisma } from "@/server/db/prisma";
import { isDomainError } from "@/lib/errors";
import { formatDateTime } from "@/lib/formatters";
import { createT } from "@/lib/i18n";
import {
  AddAgendaItemDialog,
  AssemblyStateButton,
  CastVoteDialog,
  MarkPresentDialog,
  OpenVotingDialog,
  RemoveAgendaItemButton,
  SendInvitationsButton,
} from "@/features/manager/assembly-forms";
import { sharesMeetQuorum } from "@/server/services/manager/assembly-tally";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AssemblyDetailPage({ params }: Props) {
  const { id } = await params;
  const ctx = await loadUserContext();
  requireTenantPage(ctx, { permission: "assembly.read", orgType: "MANAGER" });
  const t = createT(ctx.user.locale);

  let assembly: Awaited<ReturnType<typeof getAssembly>>;
  try {
    assembly = await getAssembly(ctx.activeOrganization.id, id);
  } catch (err) {
    if (isDomainError(err) && err.code === "NOT_FOUND") return notFound();
    throw err;
  }
  const units = await prisma.managedUnit.findMany({
    where: {
      organizationId: ctx.activeOrganization.id,
      buildingId: assembly.buildingId,
      archivedAt: null,
    },
    select: { id: true, code: true, participationShare: true },
    orderBy: { code: "asc" },
  });
  const totalShare = units.reduce(
    (sum, unit) => sum.plus(unit.participationShare.toString()),
    new Decimal(0),
  );
  const presentShare = assembly.presentShare
    ? new Decimal(assembly.presentShare.toString())
    : units.reduce((sum, unit) => {
        const present = assembly.attendance.some((row) => row.unitId === unit.id);
        return present ? sum.plus(unit.participationShare.toString()) : sum;
      }, new Decimal(0));
  const quorumMet = assembly.quorumMet ?? sharesMeetQuorum(presentShare, totalShare);
  const assemblyDocs = await listDocuments({
    organizationId: ctx.activeOrganization.id,
    entityType: "Assembly",
    entityId: assembly.id,
    page: 1,
    pageSize: 50,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs text-[var(--color-foreground-muted)] uppercase">
            {assembly.code}
          </div>
          <h1 className="text-2xl font-semibold">{assembly.title}</h1>
          <div className="text-sm text-[var(--color-foreground-muted)]">
            {assembly.building.name} · {formatDateTime(assembly.scheduledAt)} ·{" "}
            {t(`manager.assemblies.status.${assembly.status}` as const)} ·{" "}
            {t(`manager.assemblies.type.${assembly.type}` as const)}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <PermissionGuard permission="assembly.manage">
            {assembly.status === "SCHEDULED" || assembly.status === "OPEN_FOR_VOTING" ? (
              <>
                <SendInvitationsButton assemblyId={assembly.id} />
                <MarkPresentDialog assemblyId={assembly.id} units={units} />
              </>
            ) : null}
            {assembly.status === "SCHEDULED" ? (
              <>
                <AddAgendaItemDialog assemblyId={assembly.id} />
                <OpenVotingDialog assemblyId={assembly.id} />
              </>
            ) : null}
            {assembly.status === "OPEN_FOR_VOTING" ? (
              <>
                <AssemblyStateButton
                  assemblyId={assembly.id}
                  action="close-voting"
                  label={t("manager.actions.closeVoting")}
                  destructive
                  hint={t("manager.assembly.closeVotingHint")}
                />
              </>
            ) : null}
            {assembly.status === "SCHEDULED" || assembly.status === "OPEN_FOR_VOTING" ? (
              <AssemblyStateButton
                assemblyId={assembly.id}
                action="cancel"
                label={t("manager.actions.cancelAssembly")}
                destructive
                hint={t("manager.assembly.cancelHint")}
              />
            ) : null}
          </PermissionGuard>
          {assembly.status === "COMPLETED" ? (
            <a
              href={`/api/v1/manager/assemblies/${assembly.id}/minutes`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center rounded-lg border border-[var(--color-border-strong)] px-4 text-sm font-semibold hover:bg-[var(--color-surface-inset)]"
            >
              {t("manager.assemblies.minutesButton")}
            </a>
          ) : null}
        </div>
      </div>

      <p className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-inset)] px-3 py-2 text-sm text-[var(--color-foreground-muted)]">
        {t("manager.assembly.disclaimer")}
      </p>

      {assembly.notices.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("manager.notices.relatedTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {assembly.notices.map((notice) => (
              <Link
                key={notice.id}
                href={`/zgrade/obavestenja/${notice.id}`}
                className="block text-[var(--color-brand-700)] hover:underline"
              >
                {notice.title}
              </Link>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("manager.assembly.quorumTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <QuorumLine
            label={t("manager.assembly.presentShare")}
            present={presentShare.toFixed(4)}
            total={totalShare.toFixed(4)}
            met={quorumMet}
            metLabel={t("manager.assembly.quorumMet")}
            missedLabel={t("manager.assembly.quorumMissed")}
          />
          {assembly.votingOpensAt ? (
            <Row
              label={t("manager.assembly.votingOpen")}
              value={formatDateTime(assembly.votingOpensAt)}
            />
          ) : null}
          {assembly.votingClosesAt ? (
            <Row
              label={t("manager.assembly.votingUntil")}
              value={formatDateTime(assembly.votingClosesAt)}
            />
          ) : null}
          {assembly.quorumNote ? (
            <Row label={t("manager.assembly.quorumField")} value={assembly.quorumNote} />
          ) : null}
          <p className="text-xs text-[var(--color-foreground-muted)]">
            {t("manager.assembly.oneVoteHint")}
          </p>
        </CardContent>
      </Card>

      {assembly.location || assembly.description ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("manager.assembly.detailTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {assembly.location ? (
              <Row label={t("manager.assembly.locationField")} value={assembly.location} />
            ) : null}
            {assembly.description ? (
              <p className="whitespace-pre-wrap">{assembly.description}</p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("manager.assembly.attendanceTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {units.length === 0 ? (
            <p className="text-sm text-[var(--color-foreground-muted)]">
              {t("manager.assembly.attendanceEmpty")}
            </p>
          ) : (
            <ul className="space-y-1 text-sm">
              {units.map((unit) => {
                const presence = assembly.attendance.find((row) => row.unitId === unit.id);
                return (
                  <li key={unit.id} className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-xs">{unit.code}</span>
                    <span className="text-[var(--color-foreground-muted)]">
                      {presence
                        ? t(`manager.assembly.attendanceMode.${presence.mode}`)
                        : t("manager.assembly.absent")}
                      {" · "}
                      {new Decimal(unit.participationShare.toString()).toFixed(2)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("manager.assembly.invitedTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {assembly.invitations.length === 0 ? (
            <p className="text-sm text-[var(--color-foreground-muted)]">
              {t("manager.assembly.invitedEmpty")}
            </p>
          ) : (
            <ul className="space-y-1 text-sm">
              {assembly.invitations.slice(0, 20).map((invite) => (
                <li key={invite.id} className="flex flex-wrap justify-between gap-2">
                  <span>{invite.email}</span>
                  <span className="text-xs text-[var(--color-foreground-muted)]">
                    {formatDateTime(invite.sentAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("manager.assembly.agendaTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {assembly.items.length === 0 ? (
            <p className="text-sm text-[var(--color-foreground-muted)]">
              {t("manager.assembly.agendaEmpty")}
            </p>
          ) : (
            <ol className="space-y-4">
              {assembly.items.map((item, idx) => {
                const results = item.resultSummary as {
                  yes: string;
                  no: string;
                  abstain: string;
                  passed: boolean | null;
                  informational?: boolean;
                  quorumMet?: boolean;
                } | null;
                const informational = item.voteKind === "INFORMATION" || results?.informational;
                const partial = computeLiveTally(item.votes);
                return (
                  <li
                    key={item.id}
                    className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-inset)] p-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="text-xs text-[var(--color-foreground-muted)] uppercase">
                          {idx + 1}. {t(`manager.assembly.voteKind.${item.voteKind}` as const)} ·{" "}
                          {t(`manager.assembly.majority.${item.majority}` as const)}
                        </div>
                        <h3 className="font-semibold">{item.title}</h3>
                        {item.description ? (
                          <p className="mt-1 text-sm whitespace-pre-wrap">{item.description}</p>
                        ) : null}
                      </div>
                      <div className="flex gap-2">
                        {assembly.status === "SCHEDULED" ? (
                          <PermissionGuard permission="assembly.manage">
                            <RemoveAgendaItemButton assemblyId={assembly.id} itemId={item.id} />
                          </PermissionGuard>
                        ) : null}
                        {assembly.status === "OPEN_FOR_VOTING" && !informational ? (
                          <PermissionGuard permission="assembly.vote.cast">
                            <CastVoteDialog agendaItemId={item.id} units={units} />
                          </PermissionGuard>
                        ) : null}
                      </div>
                    </div>
                    {informational ? (
                      <p className="mt-2 text-xs text-[var(--color-foreground-muted)]">
                        {t("manager.assembly.informational")}
                      </p>
                    ) : (
                      <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                        <TallyBox
                          label={t("manager.assembly.choiceYes")}
                          value={results?.yes ?? partial.yes}
                        />
                        <TallyBox
                          label={t("manager.assembly.choiceNo")}
                          value={results?.no ?? partial.no}
                        />
                        <TallyBox
                          label={t("manager.assembly.choiceAbstain")}
                          value={results?.abstain ?? partial.abstain}
                        />
                      </div>
                    )}
                    {results && !informational ? (
                      <div className="mt-2 text-xs">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 ${results.passed ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}
                        >
                          {results.passed
                            ? t("manager.assembly.passed")
                            : results.quorumMet === false
                              ? t("manager.assembly.quorumMissed")
                              : t("manager.assembly.failed")}
                        </span>
                      </div>
                    ) : null}
                    {item.votes.length > 0 ? (
                      <ul className="mt-2 space-y-1 text-xs text-[var(--color-foreground-muted)]">
                        {item.votes.map((vote) => (
                          <li key={vote.id}>
                            {vote.unit.code} ·{" "}
                            {vote.choice === "YES"
                              ? t("manager.assembly.choiceYes")
                              : vote.choice === "NO"
                                ? t("manager.assembly.choiceNo")
                                : t("manager.assembly.choiceAbstain")}{" "}
                            · {new Decimal(vote.weight.toString()).toFixed(2)}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-sm">{t("manager.documents.title")}</CardTitle>
          <PermissionGuard permission="document.manage">
            <UploadDocumentDialog
              entityType="Assembly"
              entityId={assembly.id}
              categories={["ASSEMBLY", "OTHER"]}
              defaultCategory="ASSEMBLY"
            />
          </PermissionGuard>
        </CardHeader>
        <CardContent>
          {assemblyDocs.items.length === 0 ? (
            <p className="text-sm text-[var(--color-foreground-muted)]">
              {t("manager.documents.empty")}
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {assemblyDocs.items.map((file) => (
                <li key={file.id} className="flex flex-wrap items-center justify-between gap-2">
                  <a
                    href={`/api/v1/documents/${file.id}/download`}
                    className="text-[var(--color-brand-700)] hover:underline"
                  >
                    {file.originalFileName}
                  </a>
                  <PermissionGuard permission="document.manage">
                    <DocumentVisibilityButton documentId={file.id} visibility={file.visibility} />
                  </PermissionGuard>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Link
        href={`/zgrade/${assembly.buildingId}/skupstine`}
        className="inline-block text-sm text-[var(--color-brand-700)] hover:underline"
      >
        ← Nazad na skupštine zgrade
      </Link>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border)] py-1 last:border-b-0">
      <span className="text-xs text-[var(--color-foreground-muted)] uppercase">{label}</span>
      <span className="min-w-0 flex-1 text-right whitespace-pre-wrap">{value}</span>
    </div>
  );
}

function QuorumLine({
  label,
  present,
  total,
  met,
  metLabel,
  missedLabel,
}: {
  label: string;
  present: string;
  total: string;
  met: boolean;
  metLabel: string;
  missedLabel: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span>
        {label}: {Number(present).toFixed(2)} / {Number(total).toFixed(2)}
      </span>
      <span
        className={`inline-flex rounded-full px-2 py-0.5 text-xs ${met ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}`}
      >
        {met ? metLabel : missedLabel}
      </span>
    </div>
  );
}

function TallyBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-2 text-center">
      <div className="text-xs text-[var(--color-foreground-muted)]">{label}</div>
      <div className="text-sm font-semibold tabular-nums">{Number(value).toFixed(2)}</div>
    </div>
  );
}

function computeLiveTally(votes: Array<{ choice: "YES" | "NO" | "ABSTAIN"; weight: unknown }>): {
  yes: string;
  no: string;
  abstain: string;
} {
  let yes = new Decimal(0);
  let no = new Decimal(0);
  let abstain = new Decimal(0);
  for (const v of votes) {
    const w = new Decimal((v.weight as { toString(): string }).toString());
    if (v.choice === "YES") yes = yes.plus(w);
    else if (v.choice === "NO") no = no.plus(w);
    else abstain = abstain.plus(w);
  }
  return { yes: yes.toFixed(4), no: no.toFixed(4), abstain: abstain.toFixed(4) };
}
