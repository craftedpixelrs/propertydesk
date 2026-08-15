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
  SETTER: "Property Desk · Setter",
  CLOSER: "Property Desk · Closer",
  OPERATIONS: "Property Desk · Operativa",
  MANAGER: "Property Desk · Menadžer tima",
};

/**
 * Layer classification for a role. Drives visual grouping in the dropdown
 * and the contextual header shown above the matrix, so that the admin
 * cannot confuse platform authorization (Layer A) with in-organization
 * application authorization (Layer B) with the internal SaaS marketing/
 * sales team (Layer C).
 */
type RoleLayer = "platform" | "investor" | "agency" | "property_desk";
type PermLayerFilter = "A" | "B" | "C" | "all";

const PROPERTY_DESK_ROLES = new Set([
  "SETTER",
  "CLOSER",
  "OPERATIONS",
  "MANAGER",
]);

function classifyRole(role: string): RoleLayer {
  if (role === "SUPER_ADMIN") return "platform";
  if (PROPERTY_DESK_ROLES.has(role)) return "property_desk";
  if (role.startsWith("AGENCY_")) return "agency";
  return "investor";
}

function layerOfRole(role: string): PermLayerFilter {
  switch (classifyRole(role)) {
    case "platform":
      return "A";
    case "property_desk":
      return "C";
    default:
      return "B";
  }
}

function layerOfResource(resource: string): PermLayerFilter {
  if (resource.startsWith("pd_")) return "C";
  if (
    resource === "platform" ||
    resource === "billing" ||
    resource === "user" ||
    resource === "session"
  ) {
    return "A";
  }
  return "B";
}

const LAYER_META: Record<
  RoleLayer,
  {
    title: string;
    description: string;
    badgeClass: string;
    groupLabel: string;
    badgeLabel: string;
  }
> = {
  platform: {
    title: "Platformski sloj (nalog · pretplata)",
    description:
      "Uređujete platformsku ulogu. Ove dozvole kontrolišu pristup celoj platformi i administraciju svih organizacija — ne diraju pretplate ni planove pojedinačnih naloga. Pretplata i plan se konfigurišu u „Naplati“.",
    badgeClass: "bg-indigo-50 text-indigo-800 border-indigo-200",
    groupLabel: "Platforma (SUPER_ADMIN)",
    badgeLabel: "Sloj A",
  },
  investor: {
    title: "Aplikacioni sloj (investitor · unutar organizacije)",
    description:
      "Uređujete aplikacionu ulogu koja se dodeljuje članu organizacije tipa investitor. Kontroliše šta korisnik radi u aplikaciji svoje organizacije. Dodela role članovima ide kroz „Podešavanja → Korisnici“, a ne odavde.",
    badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
    groupLabel: "Aplikacione uloge — Investitor",
    badgeLabel: "Sloj B",
  },
  agency: {
    title: "Aplikacioni sloj (agencija · unutar organizacije)",
    description:
      "Uređujete aplikacionu ulogu koja se dodeljuje članu organizacije tipa agencija. Kontroliše šta korisnik radi u aplikaciji svoje organizacije. Dodela role članovima ide kroz „Podešavanja → Korisnici“, a ne odavde.",
    badgeClass: "bg-sky-50 text-sky-800 border-sky-200",
    groupLabel: "Aplikacione uloge — Agencija",
    badgeLabel: "Sloj B",
  },
  property_desk: {
    title: "Property Desk interni tim (SaaS marketing · sales)",
    description:
      "Uređujete Property Desk internu ulogu — koristi se u našoj SaaS marketing/sales ekipi (Setter, Closer, Operativa, Menadžer). Ne meša se sa tenant Member.role — dodela se radi kroz „Property Desk → Tim“. Dozvole se odnose isključivo na `pd_*` resurse.",
    badgeClass: "bg-violet-50 text-violet-800 border-violet-200",
    groupLabel: "Property Desk (interni tim)",
    badgeLabel: "Sloj C",
  },
};

const RESOURCE_LABEL: Record<string, string> = {
  organization: "Organizacija",
  project: "Projekti",
  inventory: "Jedinice / zalihe",
  lead: "Kupci / lidovi (tenant)",
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
  invitation: "Better Auth pozivnice",
  member: "Better Auth članovi",
  pd_team: "Property Desk · Tim",
  pd_lead: "Property Desk · Lead-ovi",
  pd_lead_activity: "Property Desk · Timeline aktivnosti",
  pd_lead_task: "Property Desk · Taskovi",
  pd_report: "Property Desk · Izveštaji",
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
  // Property Desk · Tim
  "pd_team.view":
    "Pregled liste članova Property Desk internog tima (bez uređivanja).",
  "pd_team.add_member":
    "Dodavanje / uklanjanje osoba iz Property Desk tima. Namerno rezervisano za SUPER_ADMIN.",
  "pd_team.manage_role":
    "Promena Property Desk uloge (SETTER/CLOSER/OPERATIONS/MANAGER) postojećem članu tima.",
  "pd_team.manage_scope":
    "Promena `leadScope` člana tima (OWN, OWN_AND_UNASSIGNED, TEAM, ALL) — koliko se lead-ova vidi.",
  "pd_team.disable":
    "Deaktivacija / reaktivacija člana tima. Deaktivirani član gubi pristup Property Desk delu aplikacije.",
  // Property Desk · Lead-ovi
  "pd_lead.view_own":
    "Pregled lead-ova u okviru sopstvenog `leadScope` (moji + neraspoređeni, po dodeli).",
  "pd_lead.view_team":
    "Pregled svih lead-ova u pipeline-u, nezavisno od `leadScope` (menadžerska vidljivost).",
  "pd_lead.create": "Manuelno kreiranje novog marketing lead-a.",
  "pd_lead.reassign":
    "Promena vlasnika lead-a — prebacivanje između članova tima. Uzimanje slobodnog (neraspoređenog) lead-a sebi ne zahteva ovu dozvolu.",
  "pd_lead.update_stage": "Pomeranje lead-a kroz pipeline (NEW → … → WON/LOST).",
  "pd_lead.update_details":
    "Izmena kontakt polja lead-a (ime/prezime/telefon/grad/audience/source/bilješke).",
  "pd_lead.convert":
    "Konverzija lead-a u pravu tenant organizaciju (`stage=WON` + veza na organizaciju).",
  "pd_lead.delete": "Trajno brisanje lead-a iz baze.",
  "pd_lead.bulk":
    "Bulk operacije nad selekcijom lead-ova (assign, promena faze, oznaka LOST).",
  // Property Desk · Aktivnosti
  "pd_lead_activity.read":
    "Čitanje timeline-a lead-a (pozivi, mejlovi, sastanci, sistemske izmene).",
  "pd_lead_activity.create":
    "Ručno dodavanje aktivnosti u timeline lead-a (CALL/EMAIL/MEETING/NOTE).",
  // Property Desk · Taskovi
  "pd_lead_task.read": "Čitanje taskova vezanih za lead.",
  "pd_lead_task.create": "Kreiranje novog taska nad lead-om.",
  "pd_lead_task.assign":
    "Dodela taska drugom članu tima (`assignedToUserId` različit od tvog).",
  "pd_lead_task.complete":
    "Obeležavanje taska kao završenog (`completed=true`).",
  // Property Desk · Izveštaji
  "pd_report.pipeline":
    "Pristup pipeline i konverzionim izveštajima Property Desk-a.",
};

export function RoleMatrixEditor({ matrix, groups }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState<Map<string, PendingChange>>(new Map());
  const [selectedRole, setSelectedRole] = useState<string>(matrix.roles[0] ?? "");
  const [layerFilter, setLayerFilter] = useState<PermLayerFilter>(
    layerOfRole(matrix.roles[0] ?? "INVESTOR_OWNER"),
  );
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

  const groupedRoles = useMemo(() => {
    const buckets: Record<RoleLayer, string[]> = {
      platform: [],
      investor: [],
      agency: [],
      property_desk: [],
    };
    for (const r of matrix.roles) {
      buckets[classifyRole(r)].push(r);
    }
    return buckets;
  }, [matrix.roles]);

  const currentLayer = classifyRole(selectedRole);
  const currentMeta = LAYER_META[currentLayer];

  const visibleGroups = useMemo(() => {
    if (layerFilter === "all") return groups;
    return groups.filter((g) => layerOfResource(g.resource) === layerFilter);
  }, [groups, layerFilter]);

  const visiblePermCount = visibleGroups.reduce(
    (n, g) => n + g.permissions.length,
    0,
  );

  function selectRole(role: string) {
    setSelectedRole(role);
    setLayerFilter(layerOfRole(role));
  }

  function selectLayer(next: PermLayerFilter) {
    setLayerFilter(next);
    if (next === "all") return;
    const roleLayer: RoleLayer =
      next === "A" ? "platform" : next === "C" ? "property_desk" : "investor";
    if (layerOfRole(selectedRole) === next) return;
    const first =
      next === "B"
        ? groupedRoles.investor[0] ?? groupedRoles.agency[0]
        : groupedRoles[roleLayer][0];
    if (first) setSelectedRole(first);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium">Rola:</label>
        <select
          value={selectedRole}
          onChange={(e) => selectRole(e.target.value)}
          className="h-10 min-w-64 rounded-md border border-[var(--color-border)] bg-white px-3 text-sm"
        >
          {groupedRoles.platform.length > 0 ? (
            <optgroup label={LAYER_META.platform.groupLabel}>
              {groupedRoles.platform.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r] ?? r}
                </option>
              ))}
            </optgroup>
          ) : null}
          {groupedRoles.investor.length > 0 ? (
            <optgroup label={LAYER_META.investor.groupLabel}>
              {groupedRoles.investor.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r] ?? r}
                </option>
              ))}
            </optgroup>
          ) : null}
          {groupedRoles.agency.length > 0 ? (
            <optgroup label={LAYER_META.agency.groupLabel}>
              {groupedRoles.agency.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r] ?? r}
                </option>
              ))}
            </optgroup>
          ) : null}
          {groupedRoles.property_desk.length > 0 ? (
            <optgroup label={LAYER_META.property_desk.groupLabel}>
              {groupedRoles.property_desk.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r] ?? r}
                </option>
              ))}
            </optgroup>
          ) : null}
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

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">Prikaži dozvole:</span>
        <LayerTab
          active={layerFilter === "A"}
          onClick={() => selectLayer("A")}
          label="Sloj A · Platforma"
        />
        <LayerTab
          active={layerFilter === "B"}
          onClick={() => selectLayer("B")}
          label="Sloj B · Aplikacija"
        />
        <LayerTab
          active={layerFilter === "C"}
          onClick={() => selectLayer("C")}
          label="Sloj C · Property Desk"
        />
        <LayerTab
          active={layerFilter === "all"}
          onClick={() => selectLayer("all")}
          label="Sve"
        />
        <span className="text-xs text-[var(--color-foreground-muted)]">
          {visibleGroups.length} grupa · {visiblePermCount} dozvola
        </span>
      </div>

      <div
        className={`flex items-start gap-2 rounded-md border p-3 text-xs ${currentMeta.badgeClass}`}
        role="note"
      >
        <span className="mt-0.5 shrink-0 rounded-sm border border-current/30 bg-white/50 px-1.5 py-0.5 font-semibold uppercase tracking-wide">
          {currentMeta.badgeLabel}
        </span>
        <div className="min-w-0">
          <div className="font-semibold">{currentMeta.title}</div>
          <p className="mt-0.5 leading-snug">{currentMeta.description}</p>
          {currentLayer === "property_desk" ? (
            <p className="mt-1 text-[11px] italic opacity-80">
              Dodela ovih rola korisnicima ide kroz „Property Desk → Tim“.
              Prikazane dozvole važe za `pd_*` resurse — sve ostalo ostaje na
              SUPER_ADMIN nivou.
            </p>
          ) : null}
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
            {visibleGroups.map((group) => (
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

function LayerTab({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`h-8 rounded-md border px-2.5 text-xs font-medium ${
        active
          ? "border-[var(--color-brand-600)] bg-[var(--color-brand-50)] text-[var(--color-brand-800)]"
          : "border-[var(--color-border)] bg-white text-[var(--color-foreground)] hover:bg-[var(--color-surface-inset)]"
      }`}
    >
      {label}
    </button>
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
