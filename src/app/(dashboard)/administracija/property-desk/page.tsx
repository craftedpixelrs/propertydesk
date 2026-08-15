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

export const dynamic = "force-dynamic";

/**
 * Property Desk operativni dashboard.
 *
 * Vidi ga SUPER_ADMIN i svaki aktivan `property_desk_team_member`. Sadržaj
 * je scoping-aware — SETTER vidi pipeline u okviru svog `leadScope`,
 * MANAGER i SUPER_ADMIN vide sve.
 */
const STAGE_LABEL: Record<string, string> = {
  NEW: "Novi",
  CONTACTED: "Kontaktirano",
  QUALIFIED: "Kvalifikovano",
  DEMO: "Demo",
  PROPOSAL: "Ponuda",
  WON: "Konvertovano",
  LOST: "Izgubljeno",
  NURTURING: "Nurturing",
};

const AUDIENCE_LABEL: Record<string, string> = {
  INVESTOR: "Investitor",
  AGENCY: "Agencija",
  OTHER: "Ostalo",
};

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

const LEVEL_LABEL: Record<string, string> = {
  SOURCING: "L1 Sourcing",
  CLOSING: "L2 Closing",
  OPERATIONS: "L3 Operations",
  ARCHIVED: "Arhivirano",
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
        label: `Property Desk · ${ctx.teamMember.teamRole}`,
        tone: "info" as const,
      };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Property Desk pipeline</h2>
          <p className="text-sm text-[var(--color-foreground-muted)]">
            Marketing lead-ovi za sam PropertyDesk SaaS. Ovo je platformski
            (interni) tim — potpuno odvojen od tenant Member.role i
            SUPER_ADMIN sekcija.
          </p>
        </div>
        <Badge tone={roleBadge.tone}>{roleBadge.label}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Otvoreni pipeline"
          value={stats.totalOpen}
          hint={`Novi: ${stats.byStage.NEW} · Kontaktirano: ${stats.byStage.CONTACTED}`}
          icon={<Inbox className="size-5" />}
        />
        <StatCard
          label="Konvertovano"
          value={stats.totalWon}
          icon={<Handshake className="size-5" />}
        />
        <StatCard
          label="Izgubljeno"
          value={stats.totalLost}
          icon={<Mail className="size-5" />}
        />
        <StatCard
          label="Nurturing"
          value={stats.byStage.NURTURING}
          icon={<Sparkles className="size-5" />}
        />
      </div>

      {canReadTasks ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <StatCard
            label="Moji taskovi (otvoreno)"
            value={taskCounts.mineOpen}
            hint="Nezavršeni koji su dodeljeni tebi"
            icon={<CheckSquare className="size-5" />}
          />
          <StatCard
            label="Moji taskovi (overdue)"
            value={taskCounts.mineOverdue}
            hint="Prošao rok, još nisi završio"
            icon={<Clock className="size-5" />}
          />
          <StatCard
            label="Tim overdue"
            value={taskCounts.teamOverdue}
            hint="Ukupno overdue u vidljivom pipeline-u"
            icon={<Clock className="size-5" />}
          />
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Po levelu</CardTitle>
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
                      {LEVEL_LABEL[level] ?? level}
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
            <CardTitle className="text-sm">Po fazi</CardTitle>
            <Link
              href="/administracija/property-desk/leadovi"
              className="inline-flex items-center gap-1 text-xs text-[var(--color-brand-700)] hover:underline"
            >
              Svi lead-ovi <ArrowRight className="size-3" />
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
                      {STAGE_LABEL[stage] ?? stage}
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
            <CardTitle className="text-sm">Po publici</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {Object.entries(stats.byAudience).map(([aud, count]) => (
                <li key={aud} className="flex items-center justify-between">
                  <span>{AUDIENCE_LABEL[aud] ?? aud}</span>
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
              Hot lead-ovi
            </CardTitle>
            <Link
              href="/administracija/property-desk/leadovi?temperature=HOT&sort=score"
              className="inline-flex items-center gap-1 text-xs text-[var(--color-brand-700)] hover:underline"
            >
              Svi <ArrowRight className="size-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {hot.length === 0 ? (
              <p className="text-sm text-[var(--color-foreground-muted)]">
                Nema „hot" lead-ova u vašem opsegu.
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
                          {STAGE_LABEL[lead.stage] ?? lead.stage}
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
              Follow-up narednih 7 dana
            </CardTitle>
            <Link
              href="/administracija/property-desk/leadovi?followUpWithinDays=7"
              className="inline-flex items-center gap-1 text-xs text-[var(--color-brand-700)] hover:underline"
            >
              Svi <ArrowRight className="size-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {followUps.length === 0 ? (
              <p className="text-sm text-[var(--color-foreground-muted)]">
                Nema zakazanih follow-up-ova u narednih 7 dana.
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
                          : "—"}
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
            Poslednji lead-ovi
          </CardTitle>
          <Link
            href="/administracija/property-desk/leadovi"
            className="inline-flex items-center gap-1 text-xs text-[var(--color-brand-700)] hover:underline"
          >
            Sve <ArrowRight className="size-3" />
          </Link>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-sm text-[var(--color-foreground-muted)]">
              Još nema lead-ova u pipeline-u.
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
                          ? ` · ${AUDIENCE_LABEL[lead.audience] ?? lead.audience}`
                          : ""}
                      </div>
                    </div>
                    <div>
                      <Badge tone={STAGE_TONE[lead.stage] ?? "neutral"}>
                        {STAGE_LABEL[lead.stage] ?? lead.stage}
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
              Moji otvoreni taskovi
            </CardTitle>
          </CardHeader>
          <CardContent>
            {mineOpenTasks.length === 0 ? (
              <p className="text-sm text-[var(--color-foreground-muted)]">
                Nemaš otvorenih taskova. Kreiraj nove sa detalja lead-a.
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
                          <Badge tone="danger">Overdue</Badge>
                        ) : task.dueAt ? (
                          <Badge tone="warning">Sa rokom</Badge>
                        ) : (
                          <Badge tone="neutral">Bez roka</Badge>
                        )}
                      </div>
                      <span className="text-xs text-[var(--color-foreground-muted)]">
                        {task.dueAt ? formatDateTime(task.dueAt) : "—"}
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
          Upravljanje timom →
        </Link>
        <Link
          href="/administracija/property-desk/leadovi"
          className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm hover:bg-[var(--color-surface-inset)]"
        >
          Otvori lead pipeline →
        </Link>
      </div>
    </div>
  );
}
