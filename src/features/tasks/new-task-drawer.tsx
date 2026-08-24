"use client";

import { type ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

import { useT } from "@/components/app/i18n-provider";
import { Button } from "@/components/ui/button";
import { DateTimeInput } from "@/components/ui/date-input";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { apiClient, ApiClientError } from "@/lib/api-client";
import type { TranslationKey } from "@/lib/i18n";

type Priority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

interface MemberOption {
  userId: string;
  name: string;
  deactivatedAt: string | Date | null;
}

interface BuyerOption {
  id: string;
  firstName: string;
  lastName: string;
}

export function NewTaskDrawer({
  children,
  canAssign,
  currentUserId,
}: {
  children: ReactNode;
  canAssign: boolean;
  currentUserId: string;
}) {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [assignee, setAssignee] = useState(currentUserId);
  const [buyerId, setBuyerId] = useState("");
  const [priority, setPriority] = useState<Priority>("NORMAL");
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [buyers, setBuyers] = useState<BuyerOption[]>([]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    apiClient
      .get<{ members: MemberOption[] }>("/organization/members")
      .then((data) => {
        if (!cancelled) {
          setMembers(data.members.filter((m) => !m.deactivatedAt));
        }
      })
      .catch(() => {
        if (!cancelled) setMembers([]);
      });
    apiClient
      .get<BuyerOption[]>("/buyers", { query: { pageSize: 100, activeOnly: true } })
      .then((rows) => {
        if (!cancelled) setBuyers(rows);
      })
      .catch(() => {
        if (!cancelled) setBuyers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  function reset() {
    setError(null);
    setTitle("");
    setDescription("");
    setDueAt("");
    setAssignee(currentUserId);
    setBuyerId("");
    setPriority("NORMAL");
  }

  async function submit() {
    if (!title.trim() || !dueAt) return;
    setBusy(true);
    setError(null);
    try {
      const assignedUserId = canAssign && assignee ? assignee : undefined;
      await apiClient.post("/tasks", {
        title: title.trim(),
        description: description.trim() || undefined,
        dueAt: new Date(dueAt).toISOString(),
        assignedUserId,
        buyerId: buyerId || undefined,
        priority,
      });
      reset();
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t("errors.generic"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Drawer
      direction="right"
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
      shouldScaleBackground={false}
    >
      <DrawerTrigger asChild>{children}</DrawerTrigger>
      <DrawerContent side="right">
        <DrawerHeader className="flex shrink-0 flex-row items-start justify-between gap-3 border-b border-[var(--color-border)] p-4 pr-3">
          <div className="min-w-0 space-y-1">
            <DrawerTitle>{t("crm.tasks.newTask")}</DrawerTitle>
            <DrawerDescription>{t("crm.tasks.newSubtitle")}</DrawerDescription>
          </div>
          <DrawerClose asChild>
            <Button variant="ghost" size="icon" aria-label={t("common.close")}>
              <X className="size-5" />
            </Button>
          </DrawerClose>
        </DrawerHeader>
        <form
          className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          {error ? (
            <p className="text-sm text-[var(--color-danger)]" role="alert">
              {error}
            </p>
          ) : null}
          <label className="space-y-1 text-sm">
            <span className="font-medium">{t("crm.tasks.titleLabel")}</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={200}
              className="h-10 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">{t("crm.tasks.descriptionLabel")}</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              rows={3}
              placeholder={t("crm.tasks.descriptionPlaceholder")}
              className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">{t("crm.tasks.dueLabel")}</span>
            <DateTimeInput value={dueAt} onChange={setDueAt} className="h-10" />
          </label>
          {canAssign ? (
            <label className="space-y-1 text-sm">
              <span className="font-medium">{t("crm.tasks.assigneeLabel")}</span>
              <select
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                className="h-10 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
              >
                <option value={currentUserId}>{t("crm.tasks.assignToMe")}</option>
                {members
                  .filter((m) => m.userId !== currentUserId)
                  .map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.name}
                    </option>
                  ))}
              </select>
            </label>
          ) : null}
          <label className="space-y-1 text-sm">
            <span className="font-medium">{t("crm.tasks.buyerOptional")}</span>
            <select
              value={buyerId}
              onChange={(e) => setBuyerId(e.target.value)}
              className="h-10 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
            >
              <option value="">{t("crm.tasks.buyerNone")}</option>
              {buyers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.firstName} {b.lastName}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">{t("crm.tasks.priorityLabel")}</span>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              className="h-10 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
            >
              {(["LOW", "NORMAL", "HIGH", "URGENT"] as const).map((p) => (
                <option key={p} value={p}>
                  {t(`crm.tasks.priority.${p}` as TranslationKey)}
                </option>
              ))}
            </select>
          </label>
          <div className="mt-auto flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={busy}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" loading={busy} disabled={!title.trim() || !dueAt}>
              {t("crm.tasks.save")}
            </Button>
          </div>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
