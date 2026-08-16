import Link from "next/link";
import {
  Users,
  Mail,
  Sparkles,
  Handshake,
  ArrowRight,
  Inbox,
  CheckSquare,
  Clock,
  Flame,
  CalendarClock,
} from "lucide-react";

import { StatCard } from "@/components/app/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/formatters/date";
import {
  hasPdPermission,
  requirePropertyDeskAccess,
} from "@/server/permissions/property-desk";
import {
  getHotLeads,
  getPipelineStats,
  getRecentLeads,
  getUpcomingFollowUps,
} from "@/server/services/property-desk/marketing-leads.service";
import {
  getLeadTaskCounts,
  listTasksForView,
} from "@/server/services/property-desk/marketing-lead-tasks.service";
import { createT, type TranslationKey } from "@/lib/i18n";
import { resolveRequestLocale } from "@/lib/i18n/resolve-locale";

export const dynamic = "force-dynamic";

/**
 * Property Desk operativni dashboard.
 *
 * Vidi ga SUPER_ADMIN i svaki aktivan `property_desk_team_member`. Sadržaj
 * je scoping-aware — SETTER vidi pipeline u okviru svog `leadScope`,
 * MANAGER i SUPER_ADMIN vide sve.
 */
const STAGE_TONE: Record<
  string,
  "neutral" | "brand" | "info" | "success" | "warning" | "danger" | "violet"
> = {
  NEW: "brand",
  CONTACTED: "info",
  QUALIFIED: "success",
  DEMO: "violet",
  PROPOSAL: "warning",
  WON: "success",
  LOST: "danger",
  NURTURING: "neutral",
};

const LEVEL_TONE: Record<
  string,
  "neutral" | "brand" | "info" | "success" | "warning" | "danger"
> = {
  SOURCING: "brand",
  CLOSING: "info",
  OPERATIONS: "success",
  ARCHIVED: "neutral",
};

export default async function PropertyDeskDashboardPage() {
  const ctx = await requirePropertyDeskAccess();
  const t = createT(await resolveRequestLocale());
  const [stats, recent, hot, followUps, taskCounts, canReadTasks] =
    await Promise.all([
      getPipelineStats(ctx),
      getRecentLeads(ctx, 8),
      getHotLeads(ctx, 5),
      getUpcomingFollowUps(ctx, 7, 8),
      getLeadTaskCounts(ctx),
      hasPdPermission(ctx, "pd_lead_task.read"),
    ]);
  const mineOpenTasks = canReadTasks
    ? await listTasksForView(ctx, "MINE_OPEN", 8)
    : [];

  const roleBadge = ctx.isSuperAdmin
    ? { label: "SUPER_ADMIN", tone: "brand" as const }
    : {
        label: `Property Desk · ${t(`admin.pd.teamRole.${ctx.teamMember.teamRole}` as TranslationKey)}`,
        tone: "info" as const,
      };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{t("admin.pdDash.title")}</h2>
          <p className="text-sm text-[var(--color-foreground-muted)]">
            {t("admin.pdDash.subtitle")}
          </p>
        </div>
        <Badge tone={roleBadge.tone}>{roleBadge.label}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label={t("admin.pdDash.openPipeline")}
          value={stats.totalOpen}
          hint={t("admin.pdDash.openHint", {
            new: stats.byStage.NEW,
            contacted: stats.byStage.CONTACTED,
          })}
          icon={<Inbox className="size-5" />}
        />
        <StatCard
          label={t("admin.pdDash.won")}
          value={stats.totalWon}
          icon={<Handshake className="size-5" />}
        />
        <StatCard
          label={t("admin.pdDash.lost")}
          value={stats.totalLost}
          icon={<Mail className="size-5" />}
        />
        <StatCard
          label={t("admin.pdDash.nurturing")}
          value={stats.byStage.NURTURING}
          icon={<Sparkles className="size-5" />}
        />
      </div>

      {canReadTasks ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <StatCard
            label={t("admin.pdDash.myOpenTasks")}
            value={taskCounts.mineOpen}
            hint={t("admin.pdDash.myOpenHint")}
            icon={<CheckSquare className="size-5" />}
          />
          <StatCard
            label={t("admin.pdDash.myOverdue")}
            value={taskCounts.mineOverdue}
            hint={t("admin.pdDash.myOverdueHint")}
            icon={<Clock className="size-5" />}
          />
          <StatCard
            label={t("admin.pdDash.teamOverdue")}
            value={taskCounts.teamOverdue}
            hint={t("admin.pdDash.teamOverdueHint")}
            icon={<Clock className="size-5" />}
          />
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("admin.pdDash.byLevel")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {Object.entries(stats.byLevel).map(([level, count]) => (
                <li key={level} className="flex items-center justify-between">
                  <Link
                    href={`/administracija/property-desk/leadovi?level=${level}`}
                    className="flex items-center gap-2 hover:underline"
                  >
                    <Badge tone={LEVEL_TONE[level] ?? "neutral"}>
                      {t(`admin.pd.level.${level}` as TranslationKey)}
                    </Badge>
                  </Link>
                  <span className="font-medium">{count}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between gap-3">
            <CardTitle className="text-sm">{t("admin.pdDash.byStage")}</CardTitle>
            <Link
              href="/administracija/property-desk/leadovi"
              className="inline-flex items-center gap-1 text-xs text-[var(--color-brand-700)] hover:underline"
            >
              {t("admin.pdDash.allLeads")} <ArrowRight className="size-3" />
            </Link>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {Object.entries(stats.byStage).map(([stage, count]) => (
                <li
                  key={stage}
                  className="flex items-center justify-between"
                >
                  <Link
                    href={`/administracija/property-desk/leadovi?stage=${stage}`}
                    className="flex items-center gap-2 hover:underline"
                  >
                    <Badge tone={STAGE_TONE[stage] ?? "neutral"}>
                      {t(`admin.pd.stage.${stage}` as TranslationKey)}
                    </Badge>
                  </Link>
                  <span className="font-medium">{count}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("admin.pdDash.byAudience")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {Object.entries(stats.byAudience).map(([aud, count]) => (
                <li key={aud} className="flex items-center justify-between">
                  <span>{t(`admin.pd.audience.${aud}` as TranslationKey)}</span>
                  <span className="font-medium">{count}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex items-center justify-between gap-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Flame className="size-4 text-[var(--color-danger)]" />
              {t("admin.pdDash.hotLeads")}
            </CardTitle>
            <Link
              href="/administracija/property-desk/leadovi?temperature=HOT&sort=score"
              className="inline-flex items-center gap-1 text-xs text-[var(--color-brand-700)] hover:underline"
            >
              {t("admin.pdDash.all")} <ArrowRight className="size-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {hot.length === 0 ? (
              <p className="text-sm text-[var(--color-foreground-muted)]">
                {t("admin.pdDash.noHot")}
              </p>
            ) : (
              <ul className="divide-y divide-[var(--color-border)]">
                {hot.map((lead) => {
                  const fullName =
                    [lead.firstName, lead.lastName]
                      .filter(Boolean)
                      .join(" ")
                      .trim() || lead.email;
                  return (
                    <li
                      key={lead.id}
                      className="flex items-center justify-between gap-3 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <Link
                          href={`/administracija/property-desk/leadovi/${lead.id}`}
                          className="font-medium text-[var(--color-brand-700)] hover:underline"
                        >
                          {fullName}
                        </Link>
                        <div className="truncate text-xs text-[var(--color-foreground-muted)]">
                          {lead.email}
                          {lead.companyName ? ` · ${lead.companyName}` : ""}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge tone={STAGE_TONE[lead.stage] ?? "neutral"}>
                          {t(`admin.pd.stage.${lead.stage}` as TranslationKey)}
                        </Badge>
                        <span className="text-xs font-medium">
                          {lead.leadScore}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between gap-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <CalendarClock className="size-4" />
              {t("admin.pdDash.followUp7")}
            </CardTitle>
            <Link
              href="/administracija/property-desk/leadovi?followUpWithinDays=7"
              className="inline-flex items-center gap-1 text-xs text-[var(--color-brand-700)] hover:underline"
            >
              {t("admin.pdDash.all")} <ArrowRight className="size-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {followUps.length === 0 ? (
              <p className="text-sm text-[var(--color-foreground-muted)]">
                {t("admin.pdDash.noFollowUp")}
              </p>
            ) : (
              <ul className="divide-y divide-[var(--color-border)]">
                {followUps.map((lead) => {
                  const fullName =
                    [lead.firstName, lead.lastName]
                      .filter(Boolean)
                      .join(" ")
                      .trim() || lead.email;
                  return (
                    <li
                      key={lead.id}
                      className="flex items-center justify-between gap-3 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <Link
                          href={`/administracija/property-desk/leadovi/${lead.id}`}
                          className="font-medium text-[var(--color-brand-700)] hover:underline"
                        >
                          {fullName}
                        </Link>
                        <div className="truncate text-xs text-[var(--color-foreground-muted)]">
                          {lead.email}
                        </div>
                      </div>
                      <span className="text-xs text-[var(--color-foreground-muted)]">
                        {lead.nextFollowUpAt
                          ? formatDateTime(lead.nextFollowUpAt)
                          : t("admin.dash")}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between gap-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="size-4" />
            {t("admin.pdDash.recentLeads")}
          </CardTitle>
          <Link
            href="/administracija/property-desk/leadovi"
            className="inline-flex items-center gap-1 text-xs text-[var(--color-brand-700)] hover:underline"
          >
            {t("admin.pdDash.allRecent")} <ArrowRight className="size-3" />
          </Link>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-sm text-[var(--color-foreground-muted)]">
              {t("admin.pdDash.noLeads")}
            </p>
          ) : (
            <ul className="divide-y divide-[var(--color-border)]">
              {recent.map((lead) => {
                const fullName = [lead.firstName, lead.lastName]
                  .filter(Boolean)
                  .join(" ")
                  .trim();
                return (
                  <li
                    key={lead.id}
                    className="grid gap-1 py-3 sm:grid-cols-[1fr_10rem_10rem]"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/administracija/property-desk/leadovi/${lead.id}`}
                        className="font-medium text-[var(--color-brand-700)] hover:underline"
                      >
                        {fullName || lead.email}
                      </Link>
                      <div className="text-xs text-[var(--color-foreground-muted)] truncate">
                        {lead.email}
                        {lead.city ? ` · ${lead.city}` : ""}
                        {lead.audience
                          ? ` · ${t(`admin.pd.audience.${lead.audience}` as TranslationKey)}`
                          : ""}
                      </div>
                    </div>
                    <div>
                      <Badge tone={STAGE_TONE[lead.stage] ?? "neutral"}>
                        {t(`admin.pd.stage.${lead.stage}` as TranslationKey)}
                      </Badge>
                    </div>
                    <span className="text-xs text-[var(--color-foreground-muted)]">
                      {formatDateTime(lead.createdAt)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {canReadTasks ? (
        <Card>
          <CardHeader className="flex items-center justify-between gap-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckSquare className="size-4" />
              {t("admin.pdDash.myOpenTasksCard")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {mineOpenTasks.length === 0 ? (
              <p className="text-sm text-[var(--color-foreground-muted)]">
                {t("admin.pdDash.noMyTasks")}
              </p>
            ) : (
              <ul className="divide-y divide-[var(--color-border)]">
                {mineOpenTasks.map((task) => {
                  const overdue =
                    task.dueAt && task.dueAt.getTime() < Date.now();
                  const leadName =
                    [task.lead.firstName, task.lead.lastName]
                      .filter(Boolean)
                      .join(" ")
                      .trim() || task.lead.email;
                  return (
                    <li
                      key={task.id}
                      className="grid gap-1 py-3 sm:grid-cols-[1fr_10rem_9rem]"
                    >
                      <div className="min-w-0">
                        <Link
                          href={`/administracija/property-desk/leadovi/${task.lead.id}`}
                          className="font-medium text-[var(--color-brand-700)] hover:underline"
                        >
                          {task.title}
                        </Link>
                        <div className="truncate text-xs text-[var(--color-foreground-muted)]">
                          {leadName} · {task.lead.email}
                        </div>
                      </div>
                      <div>
                        {overdue ? (
                          <Badge tone="danger">{t("admin.pdDash.overdue")}</Badge>
                        ) : task.dueAt ? (
                          <Badge tone="warning">{t("admin.pdDash.withDue")}</Badge>
                        ) : (
                          <Badge tone="neutral">{t("admin.pdDash.noDue")}</Badge>
                        )}
                      </div>
                      <span className="text-xs text-[var(--color-foreground-muted)]">
                        {task.dueAt ? formatDateTime(task.dueAt) : t("admin.dash")}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Link
          href="/administracija/property-desk/tim"
          className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm hover:bg-[var(--color-surface-inset)]"
        >
          {t("admin.pdDash.manageTeam")}
        </Link>
        <Link
          href="/administracija/property-desk/leadovi"
          className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm hover:bg-[var(--color-surface-inset)]"
        >
          {t("admin.pdDash.openPipelineLink")}
        </Link>
      </div>
    </div>
  );
}
