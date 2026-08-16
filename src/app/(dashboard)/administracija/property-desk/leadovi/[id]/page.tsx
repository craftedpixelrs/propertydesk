import Link from "next/link";
import { notFound } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/formatters/date";
import {
  hasPdPermission,
  requirePropertyDeskAccess,
} from "@/server/permissions/property-desk";
import { prisma } from "@/server/db/prisma";
import { DomainError } from "@/lib/errors";
import { getMarketingLead, canCreateTenantFromLead } from "@/server/services/property-desk/marketing-leads.service";
import { listLeadActivities } from "@/server/services/property-desk/marketing-lead-activities.service";
import { listTasksForLead } from "@/server/services/property-desk/marketing-lead-tasks.service";
import { listTeamMembers } from "@/server/services/property-desk/team.service";
import { listSaaSPlans } from "@/server/services/platform.service";
import { nextAllowedStages, ROLE_LEVELS } from "@/server/services/property-desk/lead-lifecycle";
import { createT, type TranslateFn, type TranslationKey } from "@/lib/i18n";
import { resolveRequestLocale } from "@/lib/i18n/resolve-locale";

import { LeadDetailEditor } from "./editor";
import {
  LeadActivityPanel,
  type ActivityItem,
} from "./activity-panel";
import { LeadTaskPanel, type TaskItem } from "./task-panel";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PropertyDeskLeadDetailPage({
  params,
}: PageProps) {
  const { id } = await params;
  const ctx = await requirePropertyDeskAccess();
  const t = createT(await resolveRequestLocale());

  let lead;
  try {
    lead = await getMarketingLead(ctx, id);
  } catch (err) {
    if (err instanceof DomainError && err.code === "NOT_FOUND") {
      notFound();
    }
    if (err instanceof DomainError && err.code === "FORBIDDEN") {
      return <LeadLeftPipelineNotice t={t} />;
    }
    throw err;
  }

  const canCreateNewOrg = canCreateTenantFromLead(ctx);

  const [
    teamMembers,
    organizations,
    plans,
    activities,
    tasks,
    canReassign,
    canUpdateStage,
    canUpdateDetails,
    canUpdateClassification,
    canReopen,
    canConvert,
    canCreateActivity,
    canCreateTask,
    canAssignTask,
    canCompleteTask,
    canViewTeam,
  ] = await Promise.all([
    listTeamMembers(),
    hasPdPermission(ctx, "pd_lead.convert").then((allowed) =>
      allowed
        ? prisma.organization.findMany({
            select: {
              id: true,
              name: true,
              profile: { select: { type: true } },
            },
            orderBy: { name: "asc" },
            take: 500,
          })
        : Promise.resolve(
            [] as Array<{
              id: string;
              name: string;
              profile: { type: "INVESTOR" | "AGENCY" } | null;
            }>,
          ),
    ),
    canCreateNewOrg
      ? listSaaSPlans()
      : Promise.resolve([] as Awaited<ReturnType<typeof listSaaSPlans>>),
    listLeadActivities(ctx, id),
    listTasksForLead(ctx, id),
    hasPdPermission(ctx, "pd_lead.reassign"),
    hasPdPermission(ctx, "pd_lead.update_stage"),
    hasPdPermission(ctx, "pd_lead.update_details"),
    hasPdPermission(ctx, "pd_lead.update_classification"),
    hasPdPermission(ctx, "pd_lead.reopen"),
    hasPdPermission(ctx, "pd_lead.convert"),
    hasPdPermission(ctx, "pd_lead_activity.create"),
    hasPdPermission(ctx, "pd_lead_task.create"),
    hasPdPermission(ctx, "pd_lead_task.assign"),
    hasPdPermission(ctx, "pd_lead_task.complete"),
    hasPdPermission(ctx, "pd_lead.view_team"),
  ]);

  const fullName = [lead.firstName, lead.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  const allowedNext = nextAllowedStages(
    lead.stage,
    ctx.isSuperAdmin ? null : ctx.teamMember.teamRole,
  );

  const activityItems: ActivityItem[] = activities.map((a) => ({
    id: a.id,
    kind: a.kind,
    title: a.title,
    body: a.body,
    occurredAt: a.occurredAt.toISOString(),
    actor: a.actor
      ? { id: a.actor.id, name: a.actor.name, email: a.actor.email }
      : null,
  }));

  const taskItems: TaskItem[] = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    dueAt: t.dueAt ? t.dueAt.toISOString() : null,
    completedAt: t.completedAt ? t.completedAt.toISOString() : null,
    assignedTo: t.assignedTo
      ? { id: t.assignedTo.id, name: t.assignedTo.name }
      : null,
    createdBy: { id: t.createdBy.id, name: t.createdBy.name },
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/administracija/property-desk/leadovi"
              className="text-xs text-[var(--color-brand-700)] hover:underline"
            >
              ← {t("admin.pdDetail.backToList")}
            </Link>
          </div>
          <h2 className="text-lg font-semibold">
            {fullName || lead.email}
          </h2>
          <p className="text-sm text-[var(--color-foreground-muted)]">
            {lead.email}
            {lead.phone ? ` · ${lead.phone}` : ""}
            {lead.city ? ` · ${lead.city}` : ""}
            {lead.companyName ? ` · ${lead.companyName}` : ""}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge tone="neutral">
            {t(`admin.pd.audience.${lead.audience}` as TranslationKey)}
          </Badge>
          <span className="text-xs text-[var(--color-foreground-muted)]">
            {t("admin.pdDetail.received", { date: formatDateTime(lead.createdAt) })}
          </span>
        </div>
      </div>

      <LeadDetailEditor
        leadId={lead.id}
        initialStage={lead.stage}
        initialLevel={lead.level}
        allowedNextStages={allowedNext}
        initialAssignedToUserId={lead.assignedToUserId}
        initialNote={lead.note}
        initialLostReason={lead.lostReason}
        initialConvertedOrganizationId={lead.convertedOrganizationId}
        initialEmail={lead.email}
        initialFirstName={lead.firstName}
        initialLastName={lead.lastName}
        initialPhone={lead.phone}
        initialCity={lead.city}
        initialAudience={lead.audience}
        initialPriority={lead.priority}
        initialTemperature={lead.temperature}
        initialTimelineHorizon={lead.timelineHorizon}
        initialNextFollowUpAt={
          lead.nextFollowUpAt ? lead.nextFollowUpAt.toISOString() : null
        }
        initialLeadScore={lead.leadScore}
        initialCompanyName={lead.companyName}
        initialCompanyWebsite={lead.companyWebsite}
        initialCompanySize={lead.companySize}
        initialBudgetTier={lead.budgetTier}
        initialBudgetCurrency={lead.budgetCurrency}
        initialDecisionMakerName={lead.decisionMakerName}
        initialDecisionMakerTitle={lead.decisionMakerTitle}
        initialPreferredContact={lead.preferredContact}
        initialBestContactHour={lead.bestContactHour}
        initialPreferredLanguage={lead.preferredLanguage}
        initialCountry={lead.country}
        initialRegion={lead.region}
        initialCompetitor={lead.competitor}
        initialPainPoint={lead.painPoint}
        teamMembers={teamMembers.map((m) => ({
          userId: m.userId,
          name: m.user.name,
        }))}
        organizations={organizations.map((o) => ({
          id: o.id,
          name: o.name,
          type: o.profile?.type ?? null,
        }))}
        plans={plans
          .filter((p) => p.active)
          .map((p) => ({ code: p.code, name: p.name }))}
        canConvert={canConvert}
        canCreateNewOrg={canCreateNewOrg}
        canReassign={canReassign}
        canUpdateStage={canUpdateStage}
        canUpdateDetails={canUpdateDetails}
        canUpdateClassification={canUpdateClassification}
        canReopen={canReopen}
        currentUserId={ctx.session.user.id}
        visibleLevels={
          ctx.isSuperAdmin || canViewTeam
            ? ["SOURCING", "CLOSING", "OPERATIONS", "ARCHIVED"]
            : ROLE_LEVELS[ctx.teamMember.teamRole]
        }
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <LeadActivityPanel
          leadId={lead.id}
          items={activityItems}
          canCreate={canCreateActivity}
        />
        <LeadTaskPanel
          leadId={lead.id}
          items={taskItems}
          teamMembers={teamMembers.map((m) => ({
            userId: m.userId,
            name: m.user.name,
          }))}
          canCreate={canCreateTask}
          canAssign={canAssignTask}
          canComplete={canCompleteTask}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("admin.pdDetail.utm")}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-[var(--color-foreground-muted)]">{t("admin.pdDetail.source")}</dt>
            <dd>{lead.source ?? t("admin.dash")}</dd>
            <dt className="text-[var(--color-foreground-muted)]">utmSource</dt>
            <dd>{lead.utmSource ?? t("admin.dash")}</dd>
            <dt className="text-[var(--color-foreground-muted)]">utmMedium</dt>
            <dd>{lead.utmMedium ?? t("admin.dash")}</dd>
            <dt className="text-[var(--color-foreground-muted)]">utmCampaign</dt>
            <dd>{lead.utmCampaign ?? t("admin.dash")}</dd>
            <dt className="text-[var(--color-foreground-muted)]">
              {t("admin.pdDetail.projectCount")}
            </dt>
            <dd>{lead.projectCount ?? t("admin.dash")}</dd>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

function LeadLeftPipelineNotice({ t }: { t: TranslateFn }) {
  return (
    <div className="mx-auto max-w-lg space-y-4 py-10 text-center">
      <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-success)]">
        {t("admin.pdDetail.leftKicker")}
      </p>
      <h1 className="text-2xl font-semibold">{t("admin.pdDetail.leftTitle")}</h1>
      <p className="text-sm text-[var(--color-foreground-muted)]">
        {t("admin.pdDetail.leftBody")}
      </p>
      <div className="flex justify-center gap-2">
        <Link
          href="/administracija/property-desk/leadovi"
          className="rounded-md bg-[var(--color-brand-600)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-700)]"
        >
          {t("admin.pdDetail.backToList")}
        </Link>
        <Link
          href="/administracija/property-desk"
          className="rounded-md border border-[var(--color-border)] px-4 py-2 text-sm font-medium hover:bg-[var(--color-surface-inset)]"
        >
          {t("nav.dashboard")}
        </Link>
      </div>
    </div>
  );
}
