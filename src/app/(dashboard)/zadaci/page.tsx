import Link from "next/link";
import { redirect } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import { loadUserContext } from "@/server/auth/context";
import { getTaskViewCounts, listTasks, type TaskView } from "@/server/services/tasks.service";
import { formatDateTime } from "@/lib/formatters";
import { TaskCompleteButton } from "@/features/tasks/task-complete-button";
import type { TaskPriority, TaskStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const VIEWS: { key: TaskView; label: string }[] = [
  { key: "mine", label: "Moji zadaci" },
  { key: "today", label: "Danas" },
  { key: "overdue", label: "Prekoračeni" },
  { key: "upcoming", label: "Nadolazeći" },
];

const PRIORITY_TONE: Record<TaskPriority, string> = {
  LOW: "bg-slate-100 text-slate-700",
  NORMAL: "bg-sky-100 text-sky-700",
  HIGH: "bg-amber-100 text-amber-700",
  URGENT: "bg-rose-100 text-rose-700",
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  OPEN: "Otvoren",
  IN_PROGRESS: "U toku",
  COMPLETED: "Završen",
  CANCELED: "Otkazan",
};

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
        <h1 className="text-2xl font-semibold">Zadaci</h1>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          Vaše obaveze i podsetnici.
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
              {v.label}
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
            Nema zadataka u ovom prikazu.
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
                        {task.priority}
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
                        rok {formatDateTime(task.dueAt)}
                      </span>
                      {" · "}
                      {STATUS_LABELS[task.status]}
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
