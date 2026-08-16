"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { useT } from "@/components/app/i18n-provider";
import type { TranslationKey } from "@/lib/i18n";
import {
  rolesForOrgType,
  type OrganizationRole,
} from "@/server/permissions/roles";

type TeamRole = "SETTER" | "CLOSER" | "OPERATIONS" | "MANAGER";
type LeadScope = "OWN" | "OWN_AND_UNASSIGNED" | "TEAM" | "ALL";

export interface OrgOption {
  id: string;
  name: string;
  type: "INVESTOR" | "AGENCY" | null;
}

const ORG_ROLE_KEY: Record<string, TranslationKey> = {
  INVESTOR_OWNER: "admin.orgRoles.INVESTOR_OWNER",
  INVESTOR_ADMIN: "admin.orgRoles.INVESTOR_ADMIN",
  SALES_MANAGER: "admin.orgRoles.SALES_MANAGER",
  SALES_AGENT: "admin.orgRoles.SALES_AGENT",
  FINANCE: "admin.orgRoles.FINANCE",
  INVESTOR_VIEWER: "admin.orgRoles.INVESTOR_VIEWER",
  AGENCY_OWNER: "admin.orgRoles.AGENCY_OWNER",
  AGENCY_ADMIN: "admin.orgRoles.AGENCY_ADMIN",
  AGENCY_AGENT: "admin.orgRoles.AGENCY_AGENT",
  AGENCY_VIEWER: "admin.orgRoles.AGENCY_VIEWER",
};

const TEAM_ROLE_KEY: Record<TeamRole, TranslationKey> = {
  SETTER: "admin.pd.teamRole.SETTER",
  CLOSER: "admin.pd.teamRole.CLOSER",
  OPERATIONS: "admin.pd.teamRole.OPERATIONS",
  MANAGER: "admin.pd.teamRole.MANAGER",
};

const SCOPE_KEY: Record<LeadScope, TranslationKey> = {
  OWN: "admin.pd.leadScope.OWN",
  OWN_AND_UNASSIGNED: "admin.pd.leadScope.OWN_AND_UNASSIGNED",
  TEAM: "admin.pd.leadScope.TEAM",
  ALL: "admin.pd.leadScope.ALL",
};

const inputClass =
  "h-10 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm";

export function AddUserDialog({ organizations }: { organizations: OrgOption[] }) {
  const router = useRouter();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [assignOrg, setAssignOrg] = useState(true);
  const [organizationId, setOrganizationId] = useState(
    organizations[0]?.id ?? "",
  );
  const [organizationRole, setOrganizationRole] = useState<OrganizationRole>(
    "SALES_AGENT",
  );
  const [assignPd, setAssignPd] = useState(false);
  const [pdRole, setPdRole] = useState<TeamRole>("SETTER");
  const [pdScope, setPdScope] = useState<LeadScope>("OWN_AND_UNASSIGNED");
  const [platformAdmin, setPlatformAdmin] = useState(false);

  const selectedOrg = organizations.find((o) => o.id === organizationId);
  const orgRoles = useMemo(() => {
    if (selectedOrg?.type) return rolesForOrgType(selectedOrg.type);
    return [];
  }, [selectedOrg]);

  function defaultRoleFor(orgId: string): OrganizationRole {
    const org = organizations.find((o) => o.id === orgId);
    const roles = org?.type ? rolesForOrgType(org.type) : [];
    return roles[0] ?? "SALES_AGENT";
  }

  function reset() {
    const firstId = organizations[0]?.id ?? "";
    setName("");
    setEmail("");
    setPassword("");
    setAssignOrg(true);
    setOrganizationId(firstId);
    setOrganizationRole(defaultRoleFor(firstId));
    setAssignPd(false);
    setPdRole("SETTER");
    setPdScope("OWN_AND_UNASSIGNED");
    setPlatformAdmin(false);
    setError(null);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!assignOrg && !assignPd && !platformAdmin) {
      setError(
        t("admin.addUser.needOne"),
      );
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiClient.post("/platform/users", {
        name: name.trim(),
        email: email.trim(),
        password: password || undefined,
        organizationId: assignOrg ? organizationId || null : null,
        organizationRole: assignOrg ? organizationRole : undefined,
        propertyDeskTeam: assignPd
          ? { teamRole: pdRole, leadScope: pdScope }
          : null,
        platformRole: platformAdmin ? "SUPER_ADMIN" : null,
      });
      toast.success(t("admin.addUser.success"));
      setOpen(false);
      reset();
      router.refresh();
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : t("admin.addUser.failed"),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" size="sm" className="gap-1">
          <UserPlus aria-hidden className="size-4" />
          {t("admin.addUser.trigger")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("admin.addUser.title")}</DialogTitle>
          <DialogDescription>
            {t("admin.addUser.description")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="new-user-name">{t("auth.fullName")}</Label>
            <input
              id="new-user-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={120}
              className={inputClass}
            />
          </div>
          <div>
            <Label htmlFor="new-user-email">{t("common.email")}</Label>
            <input
              id="new-user-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              maxLength={254}
              className={inputClass}
            />
          </div>
          <div>
            <Label htmlFor="new-user-password">{t("admin.addUser.password")}</Label>
            <input
              id="new-user-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={10}
              required
              className={inputClass}
              autoComplete="new-password"
            />
            <p className="mt-1 text-xs text-[var(--color-foreground-muted)]">
              {t("admin.addUser.passwordHint")}
            </p>
          </div>

          <fieldset className="space-y-3 rounded-md border border-[var(--color-border)] p-3">
            <legend className="px-1 text-sm font-medium">{t("admin.addUser.where")}</legend>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={assignOrg}
                onChange={(e) => setAssignOrg(e.target.checked)}
              />
              {t("admin.addUser.assignOrg")}
            </label>
            {assignOrg ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="new-user-org">{t("billing.columns.organization")}</Label>
                  <select
                    id="new-user-org"
                    value={organizationId}
                    onChange={(e) => {
                      const nextId = e.target.value;
                      setOrganizationId(nextId);
                      const next = organizations.find((o) => o.id === nextId);
                      const roles = next?.type
                        ? rolesForOrgType(next.type)
                        : [];
                      if (roles[0]) setOrganizationRole(roles[0]);
                    }}
                    required={assignOrg}
                    className={inputClass}
                  >
                    {organizations.length === 0 ? (
                      <option value="">{t("admin.addUser.noOrgs")}</option>
                    ) : (
                      organizations.map((org) => (
                        <option key={org.id} value={org.id}>
                          {org.name}
                          {org.type === "AGENCY"
                            ? t("admin.orgAgencySuffix")
                            : org.type === "INVESTOR"
                              ? t("admin.orgInvestorSuffix")
                              : ""}
                        </option>
                      ))
                    )}
                  </select>
                </div>
                <div>
                  <Label htmlFor="new-user-org-role">{t("admin.addUser.role")}</Label>
                  <select
                    id="new-user-org-role"
                    value={organizationRole}
                    onChange={(e) =>
                      setOrganizationRole(e.target.value as OrganizationRole)
                    }
                    required={assignOrg}
                    className={inputClass}
                  >
                    {orgRoles.map((role) => (
                      <option key={role} value={role}>
                        {ORG_ROLE_KEY[role] ? t(ORG_ROLE_KEY[role]) : role}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : null}

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={assignPd}
                onChange={(e) => setAssignPd(e.target.checked)}
              />
              {t("admin.addUser.assignPd")}
            </label>
            {assignPd ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="new-user-pd-role">{t("admin.editUser.teamRole")}</Label>
                  <select
                    id="new-user-pd-role"
                    value={pdRole}
                    onChange={(e) => setPdRole(e.target.value as TeamRole)}
                    className={inputClass}
                  >
                    {(Object.keys(TEAM_ROLE_KEY) as TeamRole[]).map((role) => (
                      <option key={role} value={role}>
                        {t(TEAM_ROLE_KEY[role])}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="new-user-pd-scope">{t("admin.editUser.leadScope")}</Label>
                  <select
                    id="new-user-pd-scope"
                    value={pdScope}
                    onChange={(e) => setPdScope(e.target.value as LeadScope)}
                    className={inputClass}
                  >
                    {(Object.keys(SCOPE_KEY) as LeadScope[]).map((scope) => (
                      <option key={scope} value={scope}>
                        {t(SCOPE_KEY[scope])}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : null}

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={platformAdmin}
                onChange={(e) => setPlatformAdmin(e.target.checked)}
              />
              {t("admin.addUser.platformAdmin")}
            </label>
          </fieldset>

          {error ? (
            <p className="text-sm text-[var(--color-danger)]">{error}</p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={busy}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" loading={busy}>
              {t("common.add")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
