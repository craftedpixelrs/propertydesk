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
  type OrganizationRole,
} from "@/server/permissions/roles";
import { toast } from "sonner";

const ROLE_LABEL: Record<string, string> = {
  INVESTOR_OWNER: "Vlasnik",
  INVESTOR_ADMIN: "Administrator",
  SALES_MANAGER: "Menadžer prodaje",
  SALES_AGENT: "Agent prodaje",
  FINANCE: "Finansije",
  INVESTOR_VIEWER: "Pregled (samo čitanje)",
  AGENCY_OWNER: "Vlasnik agencije",
  AGENCY_ADMIN: "Administrator agencije",
  AGENCY_AGENT: "Agent",
  AGENCY_VIEWER: "Pregled (samo čitanje)",
};

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
}

export function MembersManager({
  organizationType,
  members,
  invitations,
}: MembersManagerProps) {
  const router = useRouter();
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const availableRoles = organizationType
    ? rolesForOrgType(organizationType)
    : ALL_ORG_ROLE_NAMES;

  async function inviteMember(evt: React.FormEvent<HTMLFormElement>) {
    evt.preventDefault();
    setSubmitting(true);
    setInviteError(null);

    const fd = new FormData(evt.currentTarget);
    const payload = {
      email: String(fd.get("email") ?? "").trim(),
      role: String(fd.get("role") ?? ""),
    };

    try {
      await apiClient.post("/organization/members", payload);
      toast.success("Poziv je poslat.");
      (evt.target as HTMLFormElement).reset();
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setInviteError(err.message);
      } else {
        setInviteError("Neočekivana greška.");
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
              onSubmit={inviteMember}
              className="flex flex-col gap-3 sm:flex-row sm:items-end"
            >
              <div className="min-w-0 flex-1">
                <Label htmlFor="invite-email">Email</Label>
                <Input id="invite-email" name="email" type="email" required />
              </div>
              <div className="min-w-0 flex-1">
                <Label htmlFor="invite-role">Uloga</Label>
                <select
                  id="invite-role"
                  name="role"
                  required
                  defaultValue={availableRoles[0]}
                  className="mt-1 h-11 w-full rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 text-sm"
                >
                  {availableRoles.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABEL[r] ?? r}
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
                        fallback={<span>{ROLE_LABEL[m.role] ?? m.role}</span>}
                      >
                        <select
                          defaultValue={m.role}
                          onChange={(e) => updateRole(m.membershipId, e.target.value)}
                          className="h-8 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-xs"
                        >
                          {availableRoles.map((r) => (
                            <option key={r} value={r}>
                              {ROLE_LABEL[r] ?? r}
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
            <ul className="divide-y divide-[var(--color-border)]">
              {invitations.map((inv) => (
                <li
                  key={inv.id}
                  className="flex items-center justify-between px-4 py-3 text-sm"
                >
                  <div>
                    <div className="font-medium">{inv.email}</div>
                    <div className="text-xs text-[var(--color-foreground-muted)]">
                      Uloga: {ROLE_LABEL[inv.role] ?? inv.role} · Ističe:{" "}
                      {formatDate(inv.expiresAt)}
                    </div>
                  </div>
                  <Badge
                    tone={
                      inv.status === "pending" || inv.status === "PENDING"
                        ? "warning"
                        : "neutral"
                    }
                  >
                    {inv.status}
                  </Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

// Silence unused-import warning for the type-only export we keep for future use
export type _KeepOrganizationRole = OrganizationRole;
