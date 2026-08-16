"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { PermissionGuard } from "@/components/app/permission-guard";
import { useT } from "@/components/app/i18n-provider";
import { formatDate } from "@/lib/formatters/date";
import {
  ALL_ORG_ROLE_NAMES,
  rolesForOrgType,
} from "@/server/permissions/roles";
import { toast } from "sonner";
import type { RoleCapabilityGuide, CapabilityLevel } from "./role-capability-guide";
import type { TranslationKey, TranslateFn } from "@/lib/i18n";

interface Member {
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  emailVerified: boolean;
  deactivatedAt: Date | null;
  createdAt: Date;
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: Date;
}

interface MembersManagerProps {
  organizationType: "INVESTOR" | "AGENCY" | null;
  members: Member[];
  invitations: Invitation[];
  roleGuide: RoleCapabilityGuide | null;
  currentUserId: string;
}

function roleLabel(role: string, t: TranslateFn) {
  const key = `ops.roles.${role}` as TranslationKey;
  const out = t(key);
  return out === key ? role : out;
}

const INVITE_STATUS_KEY: Record<string, TranslationKey> = {
  pending: "ops.members.invitePending",
  PENDING: "ops.members.invitePending",
  accepted: "ops.members.inviteAccepted",
  ACCEPTED: "ops.members.inviteAccepted",
  canceled: "ops.members.inviteCanceled",
  CANCELED: "ops.members.inviteCanceled",
  cancelled: "ops.members.inviteCanceled",
  rejected: "ops.members.inviteRejected",
  REJECTED: "ops.members.inviteRejected",
  expired: "ops.members.inviteExpired",
  EXPIRED: "ops.members.inviteExpired",
};

function inviteStatusLabel(status: string, t: TranslateFn) {
  const key = INVITE_STATUS_KEY[status];
  return key ? t(key) : status;
}

export function MembersManager({
  organizationType,
  members,
  invitations,
  roleGuide,
  currentUserId,
}: MembersManagerProps) {
  const t = useT();
  const router = useRouter();
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const availableRoles = organizationType
    ? rolesForOrgType(organizationType)
    : ALL_ORG_ROLE_NAMES;

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string>(availableRoles[0] ?? "");

  async function sendInvite() {
    const email = inviteEmail.trim();
    if (!email) {
      setInviteError(t("ops.members.emailRequired"));
      return;
    }
    setSubmitting(true);
    setInviteError(null);
    try {
      await apiClient.post("/organization/members", {
        email,
        role: inviteRole || availableRoles[0],
      });
      toast.success(t("ops.members.inviteCreated"));
      setInviteEmail("");
      setInviteRole(availableRoles[0] ?? "");
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setInviteError(err.message);
      } else {
        setInviteError(t("ops.members.inviteFailed"));
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function updateRole(membershipId: string, role: string) {
    try {
      await apiClient.patch(`/organization/members/${membershipId}`, { role });
      toast.success(t("ops.members.roleUpdated"));
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError) toast.error(err.message);
      else toast.error(t("common.unexpectedError"));
    }
  }

  async function toggleActive(membershipId: string, active: boolean) {
    const member = members.find((m) => m.membershipId === membershipId);
    if (!active && member?.userId === currentUserId) {
      toast.error(t("ops.members.cannotDeactivateSelf"));
      return;
    }
    try {
      await apiClient.patch(`/organization/members/${membershipId}`, { active });
      toast.success(active ? t("ops.members.activated") : t("ops.members.deactivated"));
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError) toast.error(err.message);
      else toast.error(t("common.unexpectedError"));
    }
  }

  async function removeMember(membershipId: string) {
    if (!confirm(t("ops.members.removeConfirm"))) {
      return;
    }
    try {
      await apiClient.delete(`/organization/members/${membershipId}`);
      toast.success(t("ops.members.removed"));
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError) toast.error(err.message);
      else toast.error(t("common.unexpectedError"));
    }
  }

  return (
    <div className="space-y-6">
      <PermissionGuard permission="organization.members:manage">
        <Card>
          <CardHeader>
            <CardTitle>{t("ops.members.inviteTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            {inviteError ? (
              <Alert tone="danger" className="mb-3">
                <AlertTitle>{t("ops.error")}</AlertTitle>
                <AlertDescription>{inviteError}</AlertDescription>
              </Alert>
            ) : null}
            <form
              method="post"
              onSubmit={(e) => {
                e.preventDefault();
                void sendInvite();
              }}
              className="flex flex-col gap-3 sm:flex-row sm:items-end"
            >
              <div className="min-w-0 flex-1">
                <Label htmlFor="invite-email">{t("common.email")}</Label>
                <Input
                  id="invite-email"
                  name="email"
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div className="min-w-0 flex-1">
                <Label htmlFor="invite-role">{t("ops.members.role")}</Label>
                <select
                  id="invite-role"
                  name="role"
                  required
                  value={inviteRole || availableRoles[0]}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="mt-1 h-11 w-full rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 text-sm"
                >
                  {availableRoles.map((r) => (
                    <option key={r} value={r}>
                      {roleLabel(r, t)}
                    </option>
                  ))}
                </select>
              </div>
              <Button type="submit" loading={submitting}>
                {t("ops.members.sendInvite")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </PermissionGuard>

      <Card>
        <CardHeader>
          <CardTitle>{t("ops.members.activeMembers", { count: members.length })}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-[var(--color-foreground-subtle)]">
                <tr>
                  <th className="border-b border-[var(--color-border)] px-4 py-2">
                    {t("common.name")}
                  </th>
                  <th className="border-b border-[var(--color-border)] px-4 py-2">
                    {t("common.email")}
                  </th>
                  <th className="border-b border-[var(--color-border)] px-4 py-2">
                    {t("ops.members.role")}
                  </th>
                  <th className="border-b border-[var(--color-border)] px-4 py-2">
                    {t("common.statusLabel")}
                  </th>
                  <th className="border-b border-[var(--color-border)] px-4 py-2 text-right">
                    {t("billing.columns.actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr
                    key={m.membershipId}
                    className="border-b border-[var(--color-border)] last:border-b-0"
                  >
                    <td className="px-4 py-2 font-medium">{m.name}</td>
                    <td className="px-4 py-2 text-[var(--color-foreground-muted)]">
                      {m.email}
                    </td>
                    <td className="px-4 py-2">
                      <PermissionGuard
                        permission="organization.members:manage"
                        fallback={<span>{roleLabel(m.role, t)}</span>}
                      >
                        <select
                          defaultValue={m.role}
                          onChange={(e) => updateRole(m.membershipId, e.target.value)}
                          className="h-8 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-xs"
                        >
                          {availableRoles.map((r) => (
                            <option key={r} value={r}>
                              {roleLabel(r, t)}
                            </option>
                          ))}
                        </select>
                      </PermissionGuard>
                    </td>
                    <td className="px-4 py-2">
                      {m.deactivatedAt ? (
                        <Badge tone="danger">{t("ops.members.deactivatedBadge")}</Badge>
                      ) : m.emailVerified ? (
                        <Badge tone="success">{t("ops.members.activeBadge")}</Badge>
                      ) : (
                        <Badge tone="warning">{t("ops.members.unverifiedBadge")}</Badge>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <PermissionGuard permission="organization.members:manage">
                        <div className="inline-flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={
                              m.userId === currentUserId && !m.deactivatedAt
                            }
                            title={
                              m.userId === currentUserId && !m.deactivatedAt
                                ? t("ops.members.cannotDeactivateSelf")
                                : undefined
                            }
                            onClick={() =>
                              toggleActive(m.membershipId, m.deactivatedAt !== null)
                            }
                          >
                            {m.deactivatedAt
                              ? t("ops.members.activate")
                              : t("ops.members.deactivate")}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => removeMember(m.membershipId)}
                          >
                            {t("common.remove")}
                          </Button>
                        </div>
                      </PermissionGuard>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {invitations.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {t("ops.members.pendingInvites", { count: invitations.length })}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <p className="border-b border-[var(--color-border)] px-4 py-3 text-sm text-[var(--color-foreground-muted)]">
              {t("ops.members.pendingHint")}
            </p>
            <ul className="divide-y divide-[var(--color-border)]">
              {invitations.map((inv) => (
                <li
                  key={inv.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
                >
                  <div>
                    <div className="font-medium">{inv.email}</div>
                    <div className="text-xs text-[var(--color-foreground-muted)]">
                      {t("ops.members.roleExpires", {
                        role: roleLabel(inv.role, t),
                        date: formatDate(inv.expiresAt),
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      tone={
                        inv.status === "pending" || inv.status === "PENDING"
                          ? "warning"
                          : "neutral"
                      }
                    >
                      {inviteStatusLabel(inv.status, t)}
                    </Badge>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const url = `${window.location.origin}/accept-invitation/${inv.id}`;
                        void navigator.clipboard.writeText(url).then(
                          () => toast.success(t("ops.members.linkCopied")),
                          () => toast.error(t("ops.members.copyFailed")),
                        );
                      }}
                    >
                      {t("ops.members.copyLink")}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {roleGuide ? <RolePermissionsTable guide={roleGuide} /> : null}
    </div>
  );
}

const CAPABILITY_SECTION_KEY: Record<string, TranslationKey> = {
  Organizacija: "ops.capability.section.organization",
  "Projekti i jedinice": "ops.capability.section.projects",
  Prodaja: "ops.capability.section.sales",
  Saradnja: "ops.capability.section.collaboration",
  Ostalo: "ops.capability.section.other",
  Ponuda: "ops.capability.section.offer",
};

function RolePermissionsTable({ guide }: { guide: RoleCapabilityGuide }) {
  const t = useT();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("ops.members.capabilityTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <p className="border-b border-[var(--color-border)] px-4 py-3 text-sm text-[var(--color-foreground-muted)]">
          {t("ops.members.capabilityHint")}
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-[var(--color-foreground-subtle)]">
              <tr>
                <th className="border-b border-[var(--color-border)] px-4 py-2 font-medium">
                  {t("ops.members.permission")}
                </th>
                {guide.roles.map((role) => (
                  <th
                    key={role.key}
                    className="border-b border-[var(--color-border)] px-3 py-2 text-center font-medium"
                  >
                    {roleLabel(role.key, t)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {guide.sections.map((section) => (
                <SectionRows
                  key={section.title}
                  section={section}
                  colSpan={guide.roles.length + 1}
                  roleKeys={guide.roles.map((r) => r.key)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function SectionRows({
  section,
  colSpan,
  roleKeys,
}: {
  section: RoleCapabilityGuide["sections"][number];
  colSpan: number;
  roleKeys: string[];
}) {
  const t = useT();
  const sectionKey = CAPABILITY_SECTION_KEY[section.title];
  return (
    <>
      <tr className="bg-[var(--color-surface-inset)]">
        <td
          colSpan={colSpan}
          className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--color-foreground-muted)]"
        >
          {sectionKey ? t(sectionKey) : section.title}
        </td>
      </tr>
      {section.rows.map((row) => {
        const rowKey = `ops.capability.row.${row.id}` as TranslationKey;
        const rowLabel = t(rowKey);
        return (
          <tr
            key={row.id}
            className="border-b border-[var(--color-border)] last:border-b-0"
          >
            <td className="px-4 py-2">{rowLabel === rowKey ? row.label : rowLabel}</td>
            {roleKeys.map((key) => (
              <td key={key} className="px-3 py-2 text-center">
                <CapabilityMark level={row.cells[key] ?? "no"} />
              </td>
            ))}
          </tr>
        );
      })}
    </>
  );
}

function CapabilityMark({ level }: { level: CapabilityLevel }) {
  const t = useT();
  if (level === "yes") {
    return (
      <span className="font-medium text-[var(--color-success)]" title={t("ops.members.allowed")}>
        ✓
      </span>
    );
  }
  if (level === "read") {
    return (
      <span
        className="text-xs text-[var(--color-foreground-muted)]"
        title={t("ops.members.readOnly")}
      >
        {t("ops.members.readOnlyShort")}
      </span>
    );
  }
  return (
    <span className="text-[var(--color-foreground-subtle)]" title={t("ops.members.noAccess")}>
      —
    </span>
  );
}
