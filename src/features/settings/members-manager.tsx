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
import { formatDate } from "@/lib/formatters/date";
import {
  ALL_ORG_ROLE_NAMES,
  rolesForOrgType,
} from "@/server/permissions/roles";
import { toast } from "sonner";
import {
  ORG_ROLE_LABEL,
  type RoleCapabilityGuide,
  type CapabilityLevel,
} from "./role-capability-guide";

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

export function MembersManager({
  organizationType,
  members,
  invitations,
  roleGuide,
  currentUserId,
}: MembersManagerProps) {
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
      setInviteError("Unesite email.");
      return;
    }
    setSubmitting(true);
    setInviteError(null);
    try {
      await apiClient.post("/organization/members", {
        email,
        role: inviteRole || availableRoles[0],
      });
      toast.success(
        "Poziv je kreiran. Kopirajte link ispod — u lokalnom okruženju mejl se ne šalje.",
      );
      setInviteEmail("");
      setInviteRole(availableRoles[0] ?? "");
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setInviteError(err.message);
      } else {
        setInviteError("Slanje poziva nije uspelo.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function updateRole(membershipId: string, role: string) {
    try {
      await apiClient.patch(`/organization/members/${membershipId}`, { role });
      toast.success("Uloga je ažurirana.");
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError) toast.error(err.message);
      else toast.error("Neočekivana greška.");
    }
  }

  async function toggleActive(membershipId: string, active: boolean) {
    const member = members.find((m) => m.membershipId === membershipId);
    if (!active && member?.userId === currentUserId) {
      toast.error("Ne možete deaktivirati nalog na koji ste ulogovani.");
      return;
    }
    try {
      await apiClient.patch(`/organization/members/${membershipId}`, { active });
      toast.success(active ? "Korisnik je aktiviran." : "Korisnik je deaktiviran.");
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError) toast.error(err.message);
      else toast.error("Neočekivana greška.");
    }
  }

  async function removeMember(membershipId: string) {
    if (!confirm("Ukloniti korisnika iz organizacije? Ova akcija se ne može poništiti.")) {
      return;
    }
    try {
      await apiClient.delete(`/organization/members/${membershipId}`);
      toast.success("Korisnik je uklonjen.");
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError) toast.error(err.message);
      else toast.error("Neočekivana greška.");
    }
  }

  return (
    <div className="space-y-6">
      <PermissionGuard permission="organization.members:manage">
        <Card>
          <CardHeader>
            <CardTitle>Pozovi novog korisnika</CardTitle>
          </CardHeader>
          <CardContent>
            {inviteError ? (
              <Alert tone="danger" className="mb-3">
                <AlertTitle>Greška</AlertTitle>
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
                <Label htmlFor="invite-email">Email</Label>
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
                <Label htmlFor="invite-role">Uloga</Label>
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
                      {ORG_ROLE_LABEL[r] ?? r}
                    </option>
                  ))}
                </select>
              </div>
              <Button type="submit" loading={submitting}>
                Pošalji poziv
              </Button>
            </form>
          </CardContent>
        </Card>
      </PermissionGuard>

      <Card>
        <CardHeader>
          <CardTitle>Aktivni članovi ({members.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-[var(--color-foreground-subtle)]">
                <tr>
                  <th className="border-b border-[var(--color-border)] px-4 py-2">
                    Ime
                  </th>
                  <th className="border-b border-[var(--color-border)] px-4 py-2">Email</th>
                  <th className="border-b border-[var(--color-border)] px-4 py-2">Uloga</th>
                  <th className="border-b border-[var(--color-border)] px-4 py-2">Status</th>
                  <th className="border-b border-[var(--color-border)] px-4 py-2 text-right">
                    Akcije
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
                        fallback={<span>{ORG_ROLE_LABEL[m.role] ?? m.role}</span>}
                      >
                        <select
                          defaultValue={m.role}
                          onChange={(e) => updateRole(m.membershipId, e.target.value)}
                          className="h-8 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-xs"
                        >
                          {availableRoles.map((r) => (
                            <option key={r} value={r}>
                              {ORG_ROLE_LABEL[r] ?? r}
                            </option>
                          ))}
                        </select>
                      </PermissionGuard>
                    </td>
                    <td className="px-4 py-2">
                      {m.deactivatedAt ? (
                        <Badge tone="danger">Deaktivirano</Badge>
                      ) : m.emailVerified ? (
                        <Badge tone="success">Aktivno</Badge>
                      ) : (
                        <Badge tone="warning">Nepotvrđeno</Badge>
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
                                ? "Ne možete deaktivirati nalog na koji ste ulogovani."
                                : undefined
                            }
                            onClick={() =>
                              toggleActive(m.membershipId, m.deactivatedAt !== null)
                            }
                          >
                            {m.deactivatedAt ? "Aktiviraj" : "Deaktiviraj"}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => removeMember(m.membershipId)}
                          >
                            Ukloni
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
            <CardTitle>Pozivi u čekanju ({invitations.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <p className="border-b border-[var(--color-border)] px-4 py-3 text-sm text-[var(--color-foreground-muted)]">
              Korisnik još nije u organizaciji. Pošaljite mu link za prihvatanje
              — nalog se kreira / veže tek kad otvori link i prihvati poziv.
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
                      Uloga: {ORG_ROLE_LABEL[inv.role] ?? inv.role} · Ističe:{" "}
                      {formatDate(inv.expiresAt)}
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
                      {inv.status}
                    </Badge>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const url = `${window.location.origin}/accept-invitation/${inv.id}`;
                        void navigator.clipboard.writeText(url).then(
                          () => toast.success("Link poziva je kopiran."),
                          () => toast.error("Kopiranje nije uspelo."),
                        );
                      }}
                    >
                      Kopiraj link
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

function RolePermissionsTable({ guide }: { guide: RoleCapabilityGuide }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Šta koja uloga sme</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <p className="border-b border-[var(--color-border)] px-4 py-3 text-sm text-[var(--color-foreground-muted)]">
          Pregled dozvola po ulozi u vašoj organizaciji. Kad dodelite ulogu,
          član dobija tačno ova prava.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-[var(--color-foreground-subtle)]">
              <tr>
                <th className="border-b border-[var(--color-border)] px-4 py-2 font-medium">
                  Dozvola
                </th>
                {guide.roles.map((role) => (
                  <th
                    key={role.key}
                    className="border-b border-[var(--color-border)] px-3 py-2 text-center font-medium"
                  >
                    {role.label}
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
  return (
    <>
      <tr className="bg-[var(--color-surface-inset)]">
        <td
          colSpan={colSpan}
          className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--color-foreground-muted)]"
        >
          {section.title}
        </td>
      </tr>
      {section.rows.map((row) => (
        <tr
          key={row.id}
          className="border-b border-[var(--color-border)] last:border-b-0"
        >
          <td className="px-4 py-2">{row.label}</td>
          {roleKeys.map((key) => (
            <td key={key} className="px-3 py-2 text-center">
              <CapabilityMark level={row.cells[key] ?? "no"} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function CapabilityMark({ level }: { level: CapabilityLevel }) {
  if (level === "yes") {
    return (
      <span className="font-medium text-[var(--color-success)]" title="Dozvoljeno">
        ✓
      </span>
    );
  }
  if (level === "read") {
    return (
      <span
        className="text-xs text-[var(--color-foreground-muted)]"
        title="Samo pregled"
      >
        pregled
      </span>
    );
  }
  return (
    <span className="text-[var(--color-foreground-subtle)]" title="Nema pristup">
      —
    </span>
  );
}
