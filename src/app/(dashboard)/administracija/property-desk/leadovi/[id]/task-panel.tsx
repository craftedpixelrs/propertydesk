"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { formatDateTime } from "@/lib/formatters/date";
import { useT } from "@/components/app/i18n-provider";
import type { TranslateFn } from "@/lib/i18n";

export interface TaskItem {
  id: string;
  title: string;
  description: string | null;
  dueAt: string | null;
  completedAt: string | null;
  assignedTo: { id: string; name: string } | null;
  createdBy: { id: string; name: string };
}

interface Props {
  leadId: string;
  items: TaskItem[];
  teamMembers: Array<{ userId: string; name: string }>;
  canCreate: boolean;
  canAssign: boolean;
  canComplete: boolean;
}

export function LeadTaskPanel({
  leadId,
  items,
  teamMembers,
  canCreate,
  canAssign,
  canComplete,
}: Props) {
  const router = useRouter();
  const t = useT();
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState<string>("");
  const [assignee, setAssignee] = useState<string>("");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function submitNew() {
    if (!title.trim()) return;
    setBusy("create");
    setErr(null);
    try {
      await apiClient.post(
        `/platform/property-desk/leads/${leadId}/tasks`,
        {
          title: title.trim(),
          dueAt: dueAt ? new Date(dueAt).toISOString() : null,
          assignedToUserId: assignee || null,
        },
      );
      setTitle("");
      setDueAt("");
      setAssignee("");
      router.refresh();
    } catch (e) {
      setErr(errorMessage(e, t));
    } finally {
      setBusy(null);
    }
  }

  async function toggleComplete(taskId: string, next: boolean) {
    setBusy(taskId);
    setErr(null);
    try {
      await apiClient.post(
        `/platform/property-desk/lead-tasks/${taskId}/complete`,
        { completed: next },
      );
      router.refresh();
    } catch (e) {
      setErr(errorMessage(e, t));
    } finally {
      setBusy(null);
    }
  }

  const openItems = items.filter((it) => !it.completedAt);
  const doneItems = items.filter((it) => it.completedAt);
  const now = Date.now();

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">{t("admin.pdTasks.title")}</h3>
          <span className="text-xs text-[var(--color-foreground-muted)]">
            {t("admin.pdTasks.counts", { open: openItems.length, done: doneItems.length })}
          </span>
        </div>

        {err ? (
          <div className="text-xs text-[var(--color-danger)]" role="alert">
            {err}
          </div>
        ) : null}

        {canCreate ? (
          <div className="space-y-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-inset)] p-3">
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("admin.pdTasks.placeholder")}
                className="h-9 flex-1 min-w-64 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm"
                disabled={busy === "create"}
              />
              <input
                type="datetime-local"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                className="h-9 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm"
                disabled={busy === "create"}
              />
              {canAssign ? (
                <select
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value)}
                  className="h-9 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm"
                  disabled={busy === "create"}
                >
                  <option value="">{t("admin.pdTasks.assignToMe")}</option>
                  {teamMembers.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.name}
                    </option>
                  ))}
                </select>
              ) : null}
              <Button
                type="button"
                size="sm"
                onClick={submitNew}
                disabled={busy === "create" || !title.trim()}
                loading={busy === "create"}
              >
                {t("admin.pdTasks.newTask")}
              </Button>
            </div>
          </div>
        ) : null}

        {items.length === 0 ? (
          <p className="text-sm text-[var(--color-foreground-muted)]">
            {t("admin.pdTasks.empty")}
          </p>
        ) : (
          <ul className="divide-y divide-[var(--color-border)]">
            {items.map((task) => {
              const overdue =
                !task.completedAt &&
                task.dueAt &&
                new Date(task.dueAt).getTime() < now;
              return (
                <li key={task.id} className="flex items-start gap-3 py-3">
                  <input
                    type="checkbox"
                    checked={Boolean(task.completedAt)}
                    onChange={(e) =>
                      toggleComplete(task.id, e.target.checked)
                    }
                    disabled={!canComplete || busy === task.id}
                    className="mt-1"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-sm font-medium ${
                          task.completedAt
                            ? "line-through text-[var(--color-foreground-muted)]"
                            : ""
                        }`}
                      >
                        {task.title}
                      </span>
                      {overdue ? <Badge tone="danger">{t("admin.pdTasks.overdue")}</Badge> : null}
                      {task.completedAt ? (
                        <Badge tone="success">{t("admin.pdTasks.done")}</Badge>
                      ) : null}
                    </div>
                    {task.description ? (
                      <div className="mt-1 whitespace-pre-line text-xs text-[var(--color-foreground-muted)]">
                        {task.description}
                      </div>
                    ) : null}
                    <div className="mt-1 text-[11px] text-[var(--color-foreground-subtle)]">
                      {task.dueAt
                        ? t("admin.pdTasks.dueAt", { date: formatDateTime(new Date(task.dueAt)) })
                        : t("admin.pdTasks.noDue")}
                      {task.assignedTo
                        ? t("admin.pdTasks.assignedTo", { name: task.assignedTo.name })
                        : t("admin.pdTasks.unassigned")}
                      {task.completedAt
                        ? t("admin.pdTasks.completedAt", {
                            date: formatDateTime(new Date(task.completedAt)),
                          })
                        : ""}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function errorMessage(err: unknown, t: TranslateFn): string {
  if (err instanceof ApiClientError) return err.message;
  if (err instanceof Error) return err.message;
  return t("admin.genericError");
}
