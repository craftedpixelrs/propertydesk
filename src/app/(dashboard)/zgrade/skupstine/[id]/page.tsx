import Link from "next/link";
import { notFound } from "next/navigation";
import Decimal from "decimal.js";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PermissionGuard } from "@/components/app/permission-guard";
import { loadUserContext, requireTenantPage } from "@/server/auth/context";
import { getAssembly } from "@/server/services/manager/assemblies.service";
import { prisma } from "@/server/db/prisma";
import { isDomainError } from "@/lib/errors";
import { formatDateTime } from "@/lib/formatters";
import { createT } from "@/lib/i18n";
import {
  AssemblyStateButton,
  CastVoteDialog,
  SendInvitationsButton,
} from "@/features/manager/assembly-forms";

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
    select: { id: true, code: true },
    orderBy: { code: "asc" },
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
            <SendInvitationsButton assemblyId={assembly.id} />
            {assembly.status === "SCHEDULED" ? (
              <AssemblyStateButton
                assemblyId={assembly.id}
                action="open-voting"
                label={t("manager.actions.openVoting")}
              />
            ) : null}
            {assembly.status === "OPEN_FOR_VOTING" ? (
              <AssemblyStateButton
                assemblyId={assembly.id}
                action="close-voting"
                label={t("manager.actions.closeVoting")}
                destructive
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

      {assembly.location || assembly.quorumNote || assembly.description ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("manager.assembly.detailTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {assembly.location ? (
              <Row label={t("manager.assembly.locationField")} value={assembly.location} />
            ) : null}
            {assembly.quorumNote ? (
              <Row label={t("manager.assembly.quorumField")} value={assembly.quorumNote} />
            ) : null}
            {assembly.description ? (
              <p className="whitespace-pre-wrap">{assembly.description}</p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

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
                  castTotal: string;
                  totalShares: string;
                  passed: boolean;
                } | null;
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
                      {assembly.status === "OPEN_FOR_VOTING" ? (
                        <PermissionGuard permission="assembly.vote.cast">
                          <CastVoteDialog agendaItemId={item.id} units={units} />
                        </PermissionGuard>
                      ) : null}
                    </div>
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
                    {results ? (
                      <div className="mt-2 text-xs">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 ${results.passed ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}
                        >
                          {results.passed
                            ? t("manager.assembly.passed")
                            : t("manager.assembly.failed")}
                        </span>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ol>
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
