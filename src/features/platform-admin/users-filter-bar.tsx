"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  AGENCY_ROLE_NAMES,
  INVESTOR_ROLE_NAMES,
  PROPERTY_DESK_ROLE_NAMES,
} from "@/server/permissions/roles";
import { ORG_ROLE_LABEL } from "@/features/settings/role-capability-guide";

const PATH = "/administracija/korisnici";

const selectClass =
  "h-10 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm";

const PD_ROLE_LABEL: Record<string, string> = {
  SETTER: "Setter",
  CLOSER: "Closer",
  OPERATIONS: "Operations",
  MANAGER: "Manager",
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
        placeholder="Pretraga po imenu ili e-mail-u…"
        className={`${selectClass} lg:col-span-2`}
        aria-label="Pretraga"
      />
      <select
        value={values.organizationId}
        onChange={(e) => apply({ organizationId: e.target.value })}
        className={selectClass}
        aria-label="Organizacija"
      >
        <option value="">Sve organizacije</option>
        <option value="none">Bez organizacije</option>
        {organizations.map((org) => (
          <option key={org.id} value={org.id}>
            {org.name}
            {org.type === "INVESTOR"
              ? " (investitor)"
              : org.type === "AGENCY"
                ? " (agencija)"
                : ""}
          </option>
        ))}
      </select>
      <select
        value={values.orgType}
        onChange={(e) => apply({ orgType: e.target.value })}
        className={selectClass}
        aria-label="Tip organizacije"
      >
        <option value="">Svi tipovi</option>
        <option value="INVESTOR">Investitor</option>
        <option value="AGENCY">Agencija</option>
      </select>
      <select
        value={values.role}
        onChange={(e) => apply({ role: e.target.value })}
        className={selectClass}
        aria-label="Uloga"
      >
        <option value="">Sve uloge</option>
        <optgroup label="Investitor">
          {INVESTOR_ROLE_NAMES.map((role) => (
            <option key={role} value={role}>
              {ORG_ROLE_LABEL[role] ?? role}
            </option>
          ))}
        </optgroup>
        <optgroup label="Agencija">
          {AGENCY_ROLE_NAMES.map((role) => (
            <option key={role} value={role}>
              {ORG_ROLE_LABEL[role] ?? role}
            </option>
          ))}
        </optgroup>
        <optgroup label="Property Desk (interni tim)">
          <option value="PD_TEAM">Bilo koja PD uloga</option>
          {PROPERTY_DESK_ROLE_NAMES.map((role) => (
            <option key={role} value={role}>
              {PD_ROLE_LABEL[role] ?? role}
            </option>
          ))}
        </optgroup>
      </select>
      <select
        value={values.status}
        onChange={(e) => apply({ status: e.target.value })}
        className={selectClass}
        aria-label="Status naloga"
      >
        <option value="">Svi statusi</option>
        <option value="verified">Verifikovan</option>
        <option value="unverified">Neverifikovan</option>
        <option value="banned">Banovan</option>
      </select>
      <select
        value={values.platform}
        onChange={(e) => apply({ platform: e.target.value })}
        className={selectClass}
        aria-label="Platformska uloga"
      >
        <option value="">Svi — platforma</option>
        <option value="SUPER_ADMIN">SUPER_ADMIN</option>
        <option value="user">Običan korisnik</option>
      </select>
      <div className="flex items-center gap-3 text-sm text-[var(--color-foreground-muted)]">
        {pending ? <span>Ažuriranje…</span> : null}
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
            Poništi filtere
          </button>
        ) : null}
      </div>
    </div>
  );
}
