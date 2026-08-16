"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";

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

type TeamRole = "SETTER" | "CLOSER" | "OPERATIONS" | "MANAGER";
type LeadScope = "OWN" | "OWN_AND_UNASSIGNED" | "TEAM" | "ALL";

export interface EditablePlatformUser {
  id: string;
  name: string;
  email: string;
  role: string | null;
  emailVerified: boolean;
  banned: boolean;
  banReason: string | null;
  propertyDeskTeam: {
    id: string;
    teamRole: TeamRole;
    leadScope: LeadScope;
    enabled: boolean;
  } | null;
}

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

export function EditUserDialog({ user }: { user: EditablePlatformUser }) {
  const router = useRouter();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [emailVerified, setEmailVerified] = useState(user.emailVerified);
  const [banned, setBanned] = useState(user.banned);
  const [banReason, setBanReason] = useState(user.banReason ?? "");
  const [platformAdmin, setPlatformAdmin] = useState(user.role === "SUPER_ADMIN");
  const [pdMember, setPdMember] = useState(Boolean(user.propertyDeskTeam));
  const [pdRole, setPdRole] = useState<TeamRole>(
    user.propertyDeskTeam?.teamRole ?? "SETTER",
  );
  const [pdScope, setPdScope] = useState<LeadScope>(
    user.propertyDeskTeam?.leadScope ?? "OWN_AND_UNASSIGNED",
  );
  const [pdEnabled, setPdEnabled] = useState(
    user.propertyDeskTeam?.enabled ?? true,
  );

  function resetFromUser() {
    setName(user.name);
    setEmail(user.email);
    setEmailVerified(user.emailVerified);
    setBanned(user.banned);
    setBanReason(user.banReason ?? "");
    setPlatformAdmin(user.role === "SUPER_ADMIN");
    setPdMember(Boolean(user.propertyDeskTeam));
    setPdRole(user.propertyDeskTeam?.teamRole ?? "SETTER");
    setPdScope(user.propertyDeskTeam?.leadScope ?? "OWN_AND_UNASSIGNED");
    setPdEnabled(user.propertyDeskTeam?.enabled ?? true);
    setError(null);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiClient.patch(`/platform/users/${user.id}`, {
        name: name.trim(),
        email: email.trim(),
        emailVerified,
        banned,
        banReason: banned ? banReason.trim() || null : null,
        platformRole: platformAdmin ? "SUPER_ADMIN" : null,
        propertyDeskTeam: {
          member: pdMember,
          ...(pdMember
            ? { teamRole: pdRole, leadScope: pdScope, enabled: pdEnabled }
            : {}),
        },
      });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : t("admin.editUser.failed"),
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
        if (next) resetFromUser();
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-1">
          <Pencil aria-hidden className="size-4" />
          {t("admin.editUser.trigger")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("admin.editUser.title")}</DialogTitle>
          <DialogDescription>
            {t("admin.editUser.description")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor={`user-name-${user.id}`}>{t("common.name")}</Label>
            <input
              id={`user-name-${user.id}`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={120}
              className={inputClass}
            />
          </div>
          <div>
            <Label htmlFor={`user-email-${user.id}`}>{t("common.email")}</Label>
            <input
              id={`user-email-${user.id}`}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              maxLength={254}
              className={inputClass}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={emailVerified}
              onChange={(e) => setEmailVerified(e.target.checked)}
            />
            {t("admin.editUser.emailVerified")}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={platformAdmin}
              onChange={(e) => setPlatformAdmin(e.target.checked)}
            />
            {t("admin.editUser.platformAdmin")}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={banned}
              onChange={(e) => setBanned(e.target.checked)}
            />
            {t("admin.editUser.banned")}
          </label>
          {banned ? (
            <div>
              <Label htmlFor={`user-ban-${user.id}`}>{t("admin.editUser.banReason")}</Label>
              <input
                id={`user-ban-${user.id}`}
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                maxLength={500}
                placeholder={t("admin.editUser.banReasonPlaceholder")}
                className={inputClass}
              />
            </div>
          ) : null}

          <fieldset className="space-y-3 rounded-md border border-[var(--color-border)] p-3">
            <legend className="px-1 text-sm font-medium">
              {t("admin.editUser.pdLegend")}
            </legend>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={pdMember}
                onChange={(e) => setPdMember(e.target.checked)}
              />
              {t("admin.editUser.pdMember")}
            </label>
            {pdMember ? (
              <>
                <div>
                  <Label htmlFor={`user-pd-role-${user.id}`}>{t("admin.editUser.teamRole")}</Label>
                  <select
                    id={`user-pd-role-${user.id}`}
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
                  <Label htmlFor={`user-pd-scope-${user.id}`}>
                    {t("admin.editUser.leadScope")}
                  </Label>
                  <select
                    id={`user-pd-scope-${user.id}`}
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
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={pdEnabled}
                    onChange={(e) => setPdEnabled(e.target.checked)}
                  />
                  {t("admin.editUser.activeInTeam")}
                </label>
              </>
            ) : null}
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
              {t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
