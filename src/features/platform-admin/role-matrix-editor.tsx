"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { apiClient, ApiClientError } from "@/lib/api-client";
import type {
  RoleMatrix,
  RolePermissionCell,
} from "@/server/services/permissions/role-overrides.service";

interface Group {
  resource: string;
  permissions: string[];
}

interface Props {
  matrix: RoleMatrix;
  groups: Group[];
}

interface PendingChange {
  role: string;
  permission: string;
  granted: boolean | "default";
}

const ROLE_LABEL: Record<string, string> = {
  INVESTOR_OWNER: "Investor · Vlasnik",
  INVESTOR_ADMIN: "Investor · Admin",
  SALES_MANAGER: "Investor · Menadžer prodaje",
  SALES_AGENT: "Investor · Agent prodaje",
  FINANCE: "Investor · Finansije",
  INVESTOR_VIEWER: "Investor · Čitač",
  AGENCY_OWNER: "Agencija · Vlasnik",
  AGENCY_ADMIN: "Agencija · Admin",
  AGENCY_AGENT: "Agencija · Agent",
  AGENCY_VIEWER: "Agencija · Čitač",
  SUPER_ADMIN: "Platforma · SUPER_ADMIN",
};

const RESOURCE_LABEL: Record<string, string> = {
  organization: "Organizacija",
  project: "Projekti",
  inventory: "Jedinice / zalihe",
  lead: "Kupci / lidovi",
  reservation: "Rezervacije",
  sale: "Prodaje",
  payment: "Uplate",
  agency: "Agencije",
  commission: "Provizije",
  document: "Dokumenti",
  report: "Izveštaji",
  audit: "Revizija",
  platform: "Platforma",
  billing: "Naplata",
  user: "Better Auth users",
  session: "Better Auth sessions",
};

/**
 * Kratak opis (1–2 rečenice) svake dozvole. Prikazuje se kao tooltip
 * pored naziva dozvole u matrici, da bi administrator razumeo šta tačno
 * dodeljuje pre nego što je dozvoli ili zabrani.
 */
const PERMISSION_HELP: Record<string, string> = {
  // Organizacija
  "organization.manage":
    "Uređivanje osnovnih podataka i podešavanja organizacije (naziv, brendiranje, konfiguracija).",
  "organization.members:manage":
    "Pozivanje i uklanjanje članova organizacije i dodela njihovih rola.",
  "organization.suspend":
    "Privremeno suspendovanje (zaključavanje) organizacije i njenog pristupa.",
  "organization.read": "Pregled podataka i podešavanja organizacije.",
  // Projekti
  "project.create": "Kreiranje novih projekata.",
  "project.read": "Pregled projekata i njihovih detalja.",
  "project.update": "Izmena podataka postojećeg projekta.",
  "project.delete": "Trajno brisanje projekta.",
  "project.archive":
    "Arhiviranje projekta — sklanja se iz aktivnog prikaza bez brisanja podataka.",
  // Jedinice / zalihe
  "inventory.read": "Pregled jedinica i trenutnog stanja zaliha.",
  "inventory.manage":
    "Puno upravljanje jedinicama (kreiranje, izmena i brisanje) — krovna dozvola.",
  "inventory.price":
    "Izmena cena jedinica bez pomeranja jedinice kroz prodajni tok.",
  "inventory.status":
    "Promena statusa jedinice (dostupna, rezervisana, prodata i sl.).",
  "inventory.reopen_sold":
    "Ponovno otvaranje već prodate jedinice i njeno vraćanje u prodaju.",
  "inventory.import": "Uvoz jedinica iz fajla (Excel/CSV).",
  "inventory.export": "Izvoz jedinica u fajl.",
  "inventory.bulk": "Masovne izmene nad više jedinica odjednom.",
  // Kupci / lidovi
  "lead.read": "Pregled kupaca i potencijalnih kupaca (lidova).",
  "lead.manage": "Kreiranje i izmena kupaca/lidova i njihovih podataka.",
  // Rezervacije
  "reservation.create": "Kreiranje nove rezervacije nad jedinicom.",
  "reservation.approve": "Odobravanje rezervacije koja čeka potvrdu.",
  "reservation.cancel": "Otkazivanje aktivne rezervacije.",
  "reservation.read": "Pregled rezervacija.",
  // Prodaje
  "sale.read": "Pregled prodaja i njihovih detalja.",
  "sale.manage": "Upravljanje prodajama (kreiranje, izmena, storniranje).",
  // Uplate
  "payment.read": "Pregled uplata.",
  "payment.manage": "Evidentiranje, alokacija i storniranje uplata.",
  // Agencije
  "agency.manage": "Upravljanje agencijama i vezama sa agencijama.",
  "agency.customer:register": "Registracija kupca u ime agencije.",
  "agency.read": "Pregled agencija i njihovih podataka.",
  // Provizije
  "commission.read": "Pregled provizija.",
  "commission.manage": "Obračun i izmena provizija.",
  // Dokumenti
  "document.read": "Pregled dokumenata (ugovori, aneksi, PDF-ovi).",
  "document.manage": "Otpremanje, izmena i brisanje dokumenata.",
  // Izveštaji / revizija
  "report.read": "Pregled izveštaja i analitike.",
  "audit.read": "Pregled revizijskog dnevnika (audit log).",
  // Platforma
  "platform.organization:manage":
    "Upravljanje svim organizacijama na platformi (super-admin).",
  "platform.impersonate":
    "Preuzimanje identiteta drugog korisnika radi podrške i dijagnostike.",
  "platform.user:manage":
    "Upravljanje korisničkim nalozima na nivou cele platforme.",
  // Naplata (SaaS)
  "billing.read": "Pregled sopstvene naplate (pretplata i fakture tenanta).",
  "billing.settings.manage": "Globalna podešavanja modula naplate.",
  "billing.plan.manage": "Upravljanje planovima pretplate.",
  "billing.subscription.read": "Pregled pretplata.",
  "billing.subscription.manage": "Kreiranje i izmena pretplata.",
  "billing.invoice.read": "Pregled faktura.",
  "billing.invoice.manage": "Kreiranje i izmena faktura.",
  "billing.invoice.cancel": "Storniranje/otkazivanje faktura.",
  "billing.payment.read": "Pregled uplata u modulu naplate.",
  "billing.payment.record": "Evidentiranje uplate u modulu naplate.",
  "billing.payment.reverse": "Storniranje uplate u modulu naplate.",
  "billing.bankstatement.import": "Uvoz izvoda banke.",
  "billing.bankstatement.review": "Pregled i uparivanje stavki izvoda banke.",
  "billing.sef.manage": "Upravljanje SEF integracijom (e-fakture).",
  "billing.jobs.run": "Ručno pokretanje automatskih poslova naplate.",
  "billing.template.manage": "Upravljanje šablonima (email/dokument) u naplati.",
  "billing.profile.manage":
    "Upravljanje profilom izdavaoca (podaci firme za fakturisanje).",
  "billing.bankaccount.manage": "Upravljanje bankovnim računima za naplatu.",
  // Better Auth interni resursi (ne koriste se direktno u aplikaciji)
  "user.create": "Interno (Better Auth): kreiranje korisničkog naloga.",
  "user.list": "Interno (Better Auth): listanje korisnika.",
  "user.set-role": "Interno (Better Auth): dodela role korisniku.",
  "user.ban": "Interno (Better Auth): banovanje korisnika.",
  "user.impersonate": "Interno (Better Auth): preuzimanje identiteta korisnika.",
  "user.impersonate-admins":
    "Interno (Better Auth): preuzimanje identiteta administratora.",
  "user.delete": "Interno (Better Auth): brisanje korisnika.",
  "user.set-password": "Interno (Better Auth): postavljanje lozinke korisnika.",
  "user.set-email": "Interno (Better Auth): postavljanje email adrese korisnika.",
  "user.get": "Interno (Better Auth): dohvatanje korisnika.",
  "user.update": "Interno (Better Auth): izmena korisnika.",
  "session.list": "Interno (Better Auth): listanje sesija.",
  "session.revoke": "Interno (Better Auth): opoziv sesije.",
  "session.delete": "Interno (Better Auth): brisanje sesije.",
};

export function RoleMatrixEditor({ matrix, groups }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState<Map<string, PendingChange>>(new Map());
  const [selectedRole, setSelectedRole] = useState<string>(matrix.roles[0] ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startSave] = useTransition();
  const [isResetting, startReset] = useTransition();

  const selectedCells = matrix.cells[selectedRole] ?? {};

  const stagedCells = useMemo(() => {
    // Compose the "as-displayed" grid: server matrix + any pending edits.
    const out: Record<string, RolePermissionCell & { pending: boolean }> = {};
    for (const perm of matrix.permissions) {
      const base = selectedCells[perm]!;
      const key = `${selectedRole}::${perm}`;
      const change = pending.get(key);
      if (!change) {
        out[perm] = { ...base, pending: false };
        continue;
      }
      const effective =
        change.granted === "default" ? base.default : change.granted;
      out[perm] = {
        default: base.default,
        effective,
        hasOverride: change.granted !== "default",
        pending: true,
      };
    }
    return out;
  }, [matrix.permissions, selectedCells, pending, selectedRole]);

  function stageChange(permission: string, next: boolean | "default") {
    const key = `${selectedRole}::${permission}`;
    setPending((prev) => {
      const clone = new Map(prev);
      const base = matrix.cells[selectedRole]?.[permission];
      if (!base) return prev;
      // If the requested value matches the current server state exactly,
      // remove the pending entry (nothing to save).
      const matchesServer =
        (next === "default" && !base.hasOverride) ||
        (next === true && base.hasOverride && base.effective) ||
        (next === false && base.hasOverride && !base.effective);
      if (matchesServer) {
        clone.delete(key);
      } else {
        clone.set(key, { role: selectedRole, permission, granted: next });
      }
      return clone;
    });
  }

  async function onSave() {
    setError(null);
    const forThisRole = Array.from(pending.values()).filter(
      (c) => c.role === selectedRole,
    );
    if (forThisRole.length === 0) return;
    startSave(async () => {
      try {
        await apiClient.patch(`/platform/roles/${selectedRole}`, {
          changes: forThisRole.map((c) => ({
            permission: c.permission,
            granted: c.granted,
          })),
        });
        setPending((prev) => {
          const clone = new Map(prev);
          for (const c of forThisRole) {
            clone.delete(`${c.role}::${c.permission}`);
          }
          return clone;
        });
        router.refresh();
      } catch (err) {
        setError(
          err instanceof ApiClientError
            ? err.message
            : "Snimanje nije uspelo.",
        );
      }
    });
  }

  async function onResetRole() {
    if (
      !window.confirm(
        `Vratiti sve dozvole role „${ROLE_LABEL[selectedRole] ?? selectedRole}" na podrazumevane vrednosti?`,
      )
    ) {
      return;
    }
    setError(null);
    startReset(async () => {
      try {
        await apiClient.post(`/platform/roles/${selectedRole}/reset`);
        setPending((prev) => {
          const clone = new Map(prev);
          for (const key of Array.from(clone.keys())) {
            if (key.startsWith(`${selectedRole}::`)) clone.delete(key);
          }
          return clone;
        });
        router.refresh();
      } catch (err) {
        setError(
          err instanceof ApiClientError
            ? err.message
            : "Resetovanje nije uspelo.",
        );
      }
    });
  }

  const pendingCount = Array.from(pending.values()).filter(
    (c) => c.role === selectedRole,
  ).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium">Rola:</label>
        <select
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
          className="h-10 min-w-64 rounded-md border border-[var(--color-border)] bg-white px-3 text-sm"
        >
          {matrix.roles.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABEL[r] ?? r}
            </option>
          ))}
        </select>
        <div className="ml-auto flex items-center gap-2">
          {pendingCount > 0 ? (
            <span className="text-xs text-amber-700">
              Nesnimljenih izmena: {pendingCount}
            </span>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onResetRole}
            loading={isResetting}
          >
            Vrati rolu na podrazumevano
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onSave}
            loading={isSaving}
            disabled={pendingCount === 0}
          >
            Sačuvaj izmene
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-md border border-[var(--color-border)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-surface-inset)]">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">Dozvola</th>
              <th className="w-32 px-3 py-2 text-left font-semibold">
                Podrazumevano
              </th>
              <th className="w-40 px-3 py-2 text-left font-semibold">
                Trenutno
              </th>
              <th className="w-64 px-3 py-2 text-left font-semibold">Akcija</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <GroupBlock key={group.resource} group={group} stagedCells={stagedCells} selectedRole={selectedRole} stageChange={stageChange} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface GroupBlockProps {
  group: Group;
  stagedCells: Record<string, RolePermissionCell & { pending: boolean }>;
  selectedRole: string;
  stageChange: (permission: string, next: boolean | "default") => void;
}

function GroupBlock({ group, stagedCells, selectedRole, stageChange }: GroupBlockProps) {
  return (
    <>
      <tr className="border-t border-[var(--color-border)] bg-[var(--color-surface-inset,#f9fafb)]">
        <td
          colSpan={4}
          className="px-3 py-1.5 font-semibold text-xs uppercase tracking-wider text-[var(--color-foreground-muted)]"
        >
          {RESOURCE_LABEL[group.resource] ?? group.resource}
        </td>
      </tr>
      {group.permissions.map((perm) => {
        const cell = stagedCells[perm];
        if (!cell) return null;
        const isFrozen =
          selectedRole === "SUPER_ADMIN" && perm.startsWith("platform.");
        return (
          <tr
            key={`${group.resource}::${perm}`}
            className="border-t border-[var(--color-border)]"
          >
            <td className="px-3 py-1.5 font-mono text-xs">
              <span className="inline-flex items-center">
                {perm}
                {PERMISSION_HELP[perm] ? (
                  <PermissionHelp text={PERMISSION_HELP[perm]} />
                ) : null}
              </span>
            </td>
            <td className="px-3 py-1.5">
              <StatusDot value={cell.default} />
              <span className="ml-2 text-xs">
                {cell.default ? "Dozvoljeno" : "Zabranjeno"}
              </span>
            </td>
            <td className="px-3 py-1.5">
              <StatusDot value={cell.effective} />
              <span className="ml-2 text-xs">
                {cell.effective ? "Dozvoljeno" : "Zabranjeno"}
              </span>
              {cell.hasOverride ? (
                <span
                  title="Ručno postavljena vrednost"
                  className="ml-2 inline-block size-1.5 rounded-full bg-amber-500 align-middle"
                />
              ) : null}
              {cell.pending ? (
                <span className="ml-2 text-[10px] uppercase tracking-wide text-amber-700">
                  čeka snimanje
                </span>
              ) : null}
            </td>
            <td className="px-3 py-1.5">
              {isFrozen ? (
                <span className="text-xs italic text-[var(--color-foreground-muted)]">
                  Zaključano (platform.* za SUPER_ADMIN)
                </span>
              ) : (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => stageChange(perm, true)}
                    className={`h-7 rounded-md border px-2 text-xs ${cell.effective ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-[var(--color-border)] hover:bg-[var(--color-surface-inset)]"}`}
                  >
                    Dozvoli
                  </button>
                  <button
                    type="button"
                    onClick={() => stageChange(perm, false)}
                    className={`h-7 rounded-md border px-2 text-xs ${!cell.effective ? "border-red-300 bg-red-50 text-red-800" : "border-[var(--color-border)] hover:bg-[var(--color-surface-inset)]"}`}
                  >
                    Zabrani
                  </button>
                  {cell.hasOverride || cell.pending ? (
                    <button
                      type="button"
                      onClick={() => stageChange(perm, "default")}
                      className="h-7 rounded-md border border-[var(--color-border)] px-2 text-xs hover:bg-[var(--color-surface-inset)]"
                      title="Ukloni override, vrati na podrazumevano"
                    >
                      Podrazumevano
                    </button>
                  ) : null}
                </div>
              )}
            </td>
          </tr>
        );
      })}
    </>
  );
}

function PermissionHelp({ text }: { text: string }) {
  return (
    <span
      title={text}
      aria-label={text}
      role="note"
      tabIndex={0}
      className="ml-1.5 inline-flex size-3.5 cursor-help select-none items-center justify-center rounded-full border border-[var(--color-border)] align-middle text-[9px] font-semibold leading-none text-[var(--color-foreground-muted)] hover:bg-[var(--color-surface-inset)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border)]"
    >
      ?
    </span>
  );
}

function StatusDot({ value }: { value: boolean }) {
  return (
    <span
      className={`inline-block size-2 rounded-full align-middle ${value ? "bg-emerald-500" : "bg-neutral-300"}`}
    />
  );
}
