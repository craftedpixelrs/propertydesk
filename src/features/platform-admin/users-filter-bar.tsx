"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  AGENCY_ROLE_NAMES,
  INVESTOR_ROLE_NAMES,
  PROPERTY_DESK_ROLE_NAMES,
} from "@/server/permissions/roles";
import { useT } from "@/components/app/i18n-provider";
import type { TranslationKey } from "@/lib/i18n";

const PATH = "/administracija/korisnici";

const selectClass =
  "h-10 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm";

const PD_ROLE_KEY: Record<string, TranslationKey> = {
  SETTER: "admin.pd.teamRole.SETTER",
  CLOSER: "admin.pd.teamRole.CLOSER",
  OPERATIONS: "admin.pd.teamRole.OPERATIONS",
  MANAGER: "admin.pd.teamRole.MANAGER",
};

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

export interface UsersFilterValues {
  q: string;
  organizationId: string;
  orgType: string;
  role: string;
  status: string;
  platform: string;
}

const FILTER_KEYS = [
  "q",
  "organizationId",
  "orgType",
  "role",
  "status",
  "platform",
] as const;

export function UsersFilterBar({
  values,
  organizations,
}: {
  values: UsersFilterValues;
  organizations: Array<{
    id: string;
    name: string;
    type: "INVESTOR" | "AGENCY" | null;
  }>;
}) {
  const router = useRouter();
  const t = useT();
  const [pending, startTransition] = useTransition();
  const [qLocal, setQLocal] = useState(values.q);

  useEffect(() => {
    setQLocal(values.q);
  }, [values.q]);

  function apply(patch: Partial<UsersFilterValues>) {
    const next: UsersFilterValues = { ...values, q: qLocal, ...patch };
    const params = new URLSearchParams();
    for (const key of FILTER_KEYS) {
      const v = next[key]?.trim();
      if (v) params.set(key, v);
    }
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `${PATH}?${qs}` : PATH);
    });
  }

  useEffect(() => {
    if (qLocal.trim() === values.q.trim()) return;
    const handle = window.setTimeout(() => apply({ q: qLocal }), 350);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- debounce only on qLocal
  }, [qLocal]);

  const hasFilters = FILTER_KEYS.some((key) => values[key]);

  return (
    <div
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      aria-busy={pending}
    >
      <input
        type="search"
        value={qLocal}
        onChange={(e) => setQLocal(e.target.value)}
        placeholder={t("admin.usersFilter.searchPlaceholder")}
        className={`${selectClass} lg:col-span-2`}
        aria-label={t("admin.usersFilter.searchAria")}
      />
      <select
        value={values.organizationId}
        onChange={(e) => apply({ organizationId: e.target.value })}
        className={selectClass}
        aria-label={t("admin.usersFilter.orgAria")}
      >
        <option value="">{t("admin.usersFilter.allOrgs")}</option>
        <option value="none">{t("admin.usersFilter.noOrg")}</option>
        {organizations.map((org) => (
          <option key={org.id} value={org.id}>
            {org.name}
            {org.type === "INVESTOR"
              ? t("admin.orgInvestorSuffix")
              : org.type === "AGENCY"
                ? t("admin.orgAgencySuffix")
                : ""}
          </option>
        ))}
      </select>
      <select
        value={values.orgType}
        onChange={(e) => apply({ orgType: e.target.value })}
        className={selectClass}
        aria-label={t("admin.usersFilter.orgTypeAria")}
      >
        <option value="">{t("admin.allTypes")}</option>
        <option value="INVESTOR">{t("organization.types.investor")}</option>
        <option value="AGENCY">{t("organization.types.agency")}</option>
      </select>
      <select
        value={values.role}
        onChange={(e) => apply({ role: e.target.value })}
        className={selectClass}
        aria-label={t("admin.usersFilter.roleAria")}
      >
        <option value="">{t("admin.usersFilter.allRoles")}</option>
        <optgroup label={t("admin.usersFilter.groupInvestor")}>
          {INVESTOR_ROLE_NAMES.map((role) => (
            <option key={role} value={role}>
              {ORG_ROLE_KEY[role] ? t(ORG_ROLE_KEY[role]) : role}
            </option>
          ))}
        </optgroup>
        <optgroup label={t("admin.usersFilter.groupAgency")}>
          {AGENCY_ROLE_NAMES.map((role) => (
            <option key={role} value={role}>
              {ORG_ROLE_KEY[role] ? t(ORG_ROLE_KEY[role]) : role}
            </option>
          ))}
        </optgroup>
        <optgroup label={t("admin.usersFilter.groupPd")}>
          <option value="PD_TEAM">{t("admin.usersFilter.anyPdRole")}</option>
          {PROPERTY_DESK_ROLE_NAMES.map((role) => (
            <option key={role} value={role}>
              {PD_ROLE_KEY[role] ? t(PD_ROLE_KEY[role]) : role}
            </option>
          ))}
        </optgroup>
      </select>
      <select
        value={values.status}
        onChange={(e) => apply({ status: e.target.value })}
        className={selectClass}
        aria-label={t("admin.usersFilter.statusAria")}
      >
        <option value="">{t("common.allStatuses")}</option>
        <option value="verified">{t("admin.usersFilter.verified")}</option>
        <option value="unverified">{t("admin.usersFilter.unverified")}</option>
        <option value="banned">{t("admin.usersFilter.banned")}</option>
        <option value="login_locked">{t("admin.usersFilter.loginLocked")}</option>
        <option value="login_suspended">{t("admin.usersFilter.loginSuspended")}</option>
      </select>
      <select
        value={values.platform}
        onChange={(e) => apply({ platform: e.target.value })}
        className={selectClass}
        aria-label={t("admin.usersFilter.platformAria")}
      >
        <option value="">{t("admin.usersFilter.allPlatform")}</option>
        <option value="SUPER_ADMIN">SUPER_ADMIN</option>
        <option value="user">{t("admin.usersFilter.regularUser")}</option>
      </select>
      <div className="flex items-center gap-3 text-sm text-[var(--color-foreground-muted)]">
        {pending ? <span>{t("admin.updating")}</span> : null}
        {hasFilters ? (
          <button
            type="button"
            className="font-medium text-[var(--color-brand-700)] hover:underline"
            onClick={() => {
              setQLocal("");
              apply({
                q: "",
                organizationId: "",
                orgType: "",
                role: "",
                status: "",
                platform: "",
              });
            }}
          >
            {t("admin.usersFilter.resetFilters")}
          </button>
        ) : null}
      </div>
    </div>
  );
}
