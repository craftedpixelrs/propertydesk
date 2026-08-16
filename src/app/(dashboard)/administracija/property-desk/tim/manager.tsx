"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { useI18n } from "@/components/app/i18n-provider";
import { intlLocale, type TranslateFn, type TranslationKey } from "@/lib/i18n";

type TeamRole = "SETTER" | "CLOSER" | "OPERATIONS" | "MANAGER";
type LeadScope = "OWN" | "OWN_AND_UNASSIGNED" | "TEAM" | "ALL";

export interface TeamMemberDto {
  id: string;
  userId: string;
  teamRole: TeamRole;
  leadScope: LeadScope;
  enabled: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
}

export interface AddableUser {
  id: string;
  name: string;
  email: string;
}

interface Props {
  isSuperAdmin: boolean;
  currentUserId: string;
  initialMembers: TeamMemberDto[];
  addableUsers: AddableUser[];
}

const TEAM_ROLES: TeamRole[] = ["SETTER", "CLOSER", "OPERATIONS", "MANAGER"];
const LEAD_SCOPES: LeadScope[] = ["OWN", "OWN_AND_UNASSIGNED", "TEAM", "ALL"];

function roleLabel(t: TranslateFn, role: TeamRole) {
  return t(`admin.pd.teamRole.${role}` as TranslationKey);
}

function scopeLabel(t: TranslateFn, scope: LeadScope) {
  return t(`admin.pd.leadScope.${scope}` as TranslationKey);
}

const ROLE_TONE: Record<TeamRole, "info" | "success" | "warning" | "brand"> = {
  SETTER: "info",
  CLOSER: "success",
  OPERATIONS: "warning",
  MANAGER: "brand",
};

export function PropertyDeskTeamManager({
  isSuperAdmin,
  currentUserId,
  initialMembers,
  addableUsers,
}: Props) {
  const router = useRouter();
  const { t, locale } = useI18n();
  const [members, setMembers] = useState(initialMembers);
  const [addable, setAddable] = useState(addableUsers);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const [newUserId, setNewUserId] = useState("");
  const [newRole, setNewRole] = useState<TeamRole>("SETTER");
  const [newScope, setNewScope] = useState<LeadScope>("OWN_AND_UNASSIGNED");

  const sortedMembers = useMemo(
    () =>
      [...members].sort((a, b) => {
        if (a.enabled !== b.enabled) return a.enabled ? -1 : 1;
        return a.user.name.localeCompare(b.user.name, intlLocale(locale));
      }),
    [members, locale],
  );

  async function refresh() {
    startTransition(() => {
      router.refresh();
    });
  }

  async function addMember() {
    if (!newUserId) {
      setError(t("admin.pdTeam.pickUser"));
      return;
    }
    setError(null);
    setPendingId("__new__");
    try {
      const created = await apiClient.post<TeamMemberDto>(
        "/platform/property-desk/team",
        { userId: newUserId, teamRole: newRole, leadScope: newScope },
      );
      // Backend returns the raw member row without the user relation — pull
      // the user data from the picker list we already have.
      const pickedUser = addable.find((u) => u.id === newUserId);
      setMembers((prev) => [
        ...prev,
        {
          ...created,
          user: {
            id: pickedUser?.id ?? newUserId,
            name: pickedUser?.name ?? "",
            email: pickedUser?.email ?? "",
            image: null,
          },
        },
      ]);
      setAddable((prev) => prev.filter((u) => u.id !== newUserId));
      setNewUserId("");
      setNewRole("SETTER");
      setNewScope("OWN_AND_UNASSIGNED");
      await refresh();
    } catch (err) {
      setError(errorMessage(err, t));
    } finally {
      setPendingId(null);
    }
  }

  async function updateMember(
    id: string,
    patch: {
      teamRole?: TeamRole;
      leadScope?: LeadScope;
      enabled?: boolean;
      notes?: string | null;
    },
  ) {
    setError(null);
    setPendingId(id);
    try {
      await apiClient.patch(
        `/platform/property-desk/team/${id}`,
        patch,
      );
      setMembers((prev) =>
        prev.map((m) => (m.id === id ? { ...m, ...patch } : m)),
      );
      await refresh();
    } catch (err) {
      setError(errorMessage(err, t));
    } finally {
      setPendingId(null);
    }
  }

  async function removeMember(id: string) {
    if (!confirm(t("admin.pdTeam.removeConfirm"))) return;
    setError(null);
    setPendingId(id);
    try {
      await apiClient.delete(`/platform/property-desk/team/${id}`);
      const removed = members.find((m) => m.id === id);
      setMembers((prev) => prev.filter((m) => m.id !== id));
      if (removed) {
        setAddable((prev) =>
          [
            ...prev,
            {
              id: removed.user.id,
              name: removed.user.name,
              email: removed.user.email,
            },
          ].sort((a, b) => a.name.localeCompare(b.name, intlLocale(locale))),
        );
      }
      await refresh();
    } catch (err) {
      setError(errorMessage(err, t));
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div
          className="rounded-md border border-[var(--color-danger)] bg-[var(--color-danger-bg)] p-3 text-sm text-[var(--color-danger)]"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      {isSuperAdmin ? (
        <Card>
          <CardContent className="p-4">
            <h3 className="mb-3 text-sm font-semibold">{t("admin.pdTeam.addMember")}</h3>
            <div className="grid gap-3 md:grid-cols-[2fr_1fr_1fr_auto]">
              <select
                value={newUserId}
                onChange={(e) => setNewUserId(e.target.value)}
                className="h-10 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
                disabled={pendingId === "__new__"}
              >
                <option value="">{t("admin.pdTeam.pickUserOption")}</option>
                {addable.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} · {u.email}
                  </option>
                ))}
              </select>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as TeamRole)}
                className="h-10 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
                disabled={pendingId === "__new__"}
              >
                {TEAM_ROLES.map((v) => (
                  <option key={v} value={v}>
                    {roleLabel(t, v)}
                  </option>
                ))}
              </select>
              <select
                value={newScope}
                onChange={(e) => setNewScope(e.target.value as LeadScope)}
                className="h-10 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
                disabled={pendingId === "__new__"}
                title={t("admin.pdTeam.scopeTitle")}
              >
                {LEAD_SCOPES.map((v) => (
                  <option key={v} value={v}>
                    {scopeLabel(t, v)}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                onClick={addMember}
                disabled={!newUserId || pendingId === "__new__"}
              >
                {t("common.add")}
              </Button>
            </div>
            <p className="mt-2 text-xs text-[var(--color-foreground-muted)]">
              {t("admin.pdTeam.addHint")}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface-inset)] text-xs uppercase">
                <tr>
                  <th className="px-4 py-2 text-left">{t("admin.pdTeam.colMember")}</th>
                  <th className="px-4 py-2 text-left">{t("admin.pdTeam.colRole")}</th>
                  <th className="px-4 py-2 text-left">{t("admin.pdTeam.colScope")}</th>
                  <th className="px-4 py-2 text-left">{t("common.statusLabel")}</th>
                  <th className="px-4 py-2 text-right">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {sortedMembers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-6 text-center text-[var(--color-foreground-muted)]"
                    >
                      {t("admin.pdTeam.empty")}
                    </td>
                  </tr>
                ) : (
                  sortedMembers.map((m) => {
                    const busy = pendingId === m.id;
                    const isSelf = m.userId === currentUserId;
                    return (
                      <tr
                        key={m.id}
                        className="border-b border-[var(--color-border)] align-top"
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium">
                            {m.user.name}
                            {isSelf ? (
                              <span className="ml-2 text-xs text-[var(--color-foreground-muted)]">
                                {t("admin.you")}
                              </span>
                            ) : null}
                          </div>
                          <div className="text-xs text-[var(--color-foreground-muted)]">
                            {m.user.email}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {isSuperAdmin ? (
                            <select
                              value={m.teamRole}
                              onChange={(e) =>
                                updateMember(m.id, {
                                  teamRole: e.target.value as TeamRole,
                                })
                              }
                              disabled={busy}
                              className="h-9 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm"
                            >
                              {TEAM_ROLES.map((v) => (
                                <option key={v} value={v}>
                                  {roleLabel(t, v)}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <Badge tone={ROLE_TONE[m.teamRole]}>
                              {roleLabel(t, m.teamRole)}
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={m.leadScope}
                            onChange={(e) =>
                              updateMember(m.id, {
                                leadScope: e.target.value as LeadScope,
                              })
                            }
                            disabled={busy}
                            className="h-9 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm"
                          >
                            {LEAD_SCOPES.map((v) => (
                              <option key={v} value={v}>
                                {scopeLabel(t, v)}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <label className="inline-flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={m.enabled}
                              onChange={(e) =>
                                updateMember(m.id, {
                                  enabled: e.target.checked,
                                })
                              }
                              disabled={busy}
                            />
                            {m.enabled ? t("admin.activeInTeam") : t("admin.disabledInTeam")}
                          </label>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {isSuperAdmin ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeMember(m.id)}
                              disabled={busy}
                            >
                              {t("admin.pdTeam.remove")}
                            </Button>
                          ) : (
                            <span className="text-xs text-[var(--color-foreground-muted)]">
                              {t("admin.dash")}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function errorMessage(err: unknown, t: TranslateFn): string {
  if (err instanceof ApiClientError) return err.message;
  if (err instanceof Error) return err.message;
  return t("admin.genericError");
}
