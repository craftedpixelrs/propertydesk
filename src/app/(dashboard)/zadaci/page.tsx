import Link from "next/link";
import { redirect } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import { loadUserContext } from "@/server/auth/context";
import { getTaskViewCounts, listTasks, type TaskView } from "@/server/services/tasks.service";
import { formatDateTime } from "@/lib/formatters";
import { TaskCompleteButton } from "@/features/tasks/task-complete-button";
import type { TaskPriority, TaskStatus } from "@prisma/client";
import { cn } from "@/lib/utils";
import { createT, type TranslateFn, type TranslationKey } from "@/lib/i18n";

export const dynamic = "force-dynamic";

const VIEWS: { key: TaskView; labelKey: TranslationKey }[] = [
  { key: "mine", labelKey: "crm.tasks.mine" },
  { key: "today", labelKey: "common.today" },
  { key: "overdue", labelKey: "crm.tasks.overdue" },
  { key: "upcoming", labelKey: "crm.tasks.upcoming" },
];

const PRIORITY_TONE: Record<TaskPriority, string> = {
  LOW: "bg-slate-100 text-slate-700",
  NORMAL: "bg-sky-100 text-sky-700",
  HIGH: "bg-amber-100 text-amber-700",
  URGENT: "bg-rose-100 text-rose-700",
};

function taskStatusLabel(status: TaskStatus, t: TranslateFn): string {
  return t(`crm.tasks.status.${status}` as TranslationKey);
}

function taskPriorityLabel(priority: TaskPriority, t: TranslateFn): string {
  return t(`crm.tasks.priority.${priority}` as TranslationKey);
}

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function readParam(raw: string | string[] | undefined): string | undefined {
  return Array.isArray(raw) ? raw[0] : raw;
}

export default async function ZadaciPage({ searchParams }: PageProps) {
  const ctx = await loadUserContext();
  if (!ctx) redirect("/sign-in");
  if (!ctx.activeOrganization) redirect("/podesavanja");
  const t = createT(ctx.user.locale);

  const sp = await searchParams;
  const rawView = readParam(sp.view) as TaskView | undefined;
  const view: TaskView =
    rawView && VIEWS.some((v) => v.key === rawView) ? rawView : "mine";

  const [{ items }, counts] = await Promise.all([
    listTasks({
      organizationId: ctx.activeOrganization.id,
      currentUserId: ctx.user.id,
      view,
      page: 1,
      pageSize: 100,
    }),
    getTaskViewCounts({
      organizationId: ctx.activeOrganization.id,
      currentUserId: ctx.user.id,
    }),
  ]);

  const canManage = ctx.permissions.includes("lead.manage");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("nav.tasks")}</h1>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          {t("crm.tasks.subtitle")}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {VIEWS.map((v) => {
          const active = v.key === view;
          const count = counts[v.key as keyof typeof counts];
          return (
            <Link
              key={v.key}
              href={{ pathname: "/zadaci", query: { view: v.key } }}
              className={cn(
                "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm",
                active
                  ? "border-[var(--color-brand-500)] bg-[var(--color-brand-50)] text-[var(--color-brand-700)]"
                  : "border-[var(--color-border)] hover:bg-[var(--color-surface-inset)]",
              )}
            >
              {t(v.labelKey)}
              <span
                className={cn(
                  "rounded-full px-1.5 text-xs tabular-nums",
                  v.key === "overdue" && count > 0
                    ? "bg-rose-600 text-white"
                    : "bg-[var(--color-surface-inset)] text-[var(--color-foreground-muted)]",
                )}
              >
                {count}
              </span>
            </Link>
          );
        })}
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-[var(--color-foreground-muted)]">
            {t("crm.tasks.empty")}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((task) => {
            const overdue =
              task.status !== "COMPLETED" &&
              task.status !== "CANCELED" &&
              new Date(task.dueAt) < new Date();
            return (
              <Card key={task.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{task.title}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_TONE[task.priority]}`}
                      >
                        {taskPriorityLabel(task.priority, t)}
                      </span>
                    </div>
                    <div className="mt-0.5 text-xs text-[var(--color-foreground-muted)]">
                      {task.buyer ? (
                        <Link
                          href={`/kupci/${task.buyer.id}`}
                          className="text-[var(--color-brand-700)] hover:underline"
                        >
                          {task.buyer.firstName} {task.buyer.lastName}
                        </Link>
                      ) : null}
                      {task.buyer ? " · " : ""}
                      <span className={cn(overdue && "font-medium text-rose-600")}>
                        {t("crm.tasks.due", { date: formatDateTime(task.dueAt) })}
                      </span>
                      {" · "}
                      {taskStatusLabel(task.status, t)}
                    </div>
                  </div>
                  {canManage && task.status !== "COMPLETED" && task.status !== "CANCELED" ? (
                    <TaskCompleteButton taskId={task.id} />
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
