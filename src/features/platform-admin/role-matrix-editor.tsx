"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { apiClient, ApiClientError } from "@/lib/api-client";
import type {
  RoleMatrix,
  RolePermissionCell,
} from "@/server/services/permissions/role-overrides.service";
import { useT } from "@/components/app/i18n-provider";
import type { TranslateFn, TranslationKey } from "@/lib/i18n";

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

function roleLabel(t: TranslateFn, role: string): string {
  const key = `admin.matrixRoles.${role}` as TranslationKey;
  const out = t(key);
  return out === key ? role : out;
}

function resourceLabel(t: TranslateFn, resource: string): string {
  const key = `admin.resource.${resource}` as TranslationKey;
  const out = t(key);
  return out === key ? resource : out;
}

function permHelp(t: TranslateFn, perm: string): string | undefined {
  const key = `admin.permHelp.${perm}` as TranslationKey;
  const out = t(key);
  return out === key ? undefined : out;
}

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

const LAYER_BADGE_CLASS: Record<RoleLayer, string> = {
  platform: "bg-indigo-50 text-indigo-800 border-indigo-200",
  investor: "bg-emerald-50 text-emerald-800 border-emerald-200",
  agency: "bg-sky-50 text-sky-800 border-sky-200",
  property_desk: "bg-violet-50 text-violet-800 border-violet-200",
};

function layerMeta(t: TranslateFn, layer: RoleLayer) {
  const keys = {
    platform: {
      title: "admin.roleMatrix.layers.platformTitle",
      description: "admin.roleMatrix.layers.platformDesc",
      groupLabel: "admin.roleMatrix.layers.platformGroup",
      badgeLabel: "admin.roleMatrix.layers.platformBadge",
    },
    investor: {
      title: "admin.roleMatrix.layers.investorTitle",
      description: "admin.roleMatrix.layers.investorDesc",
      groupLabel: "admin.roleMatrix.layers.investorGroup",
      badgeLabel: "admin.roleMatrix.layers.investorBadge",
    },
    agency: {
      title: "admin.roleMatrix.layers.agencyTitle",
      description: "admin.roleMatrix.layers.agencyDesc",
      groupLabel: "admin.roleMatrix.layers.agencyGroup",
      badgeLabel: "admin.roleMatrix.layers.agencyBadge",
    },
    property_desk: {
      title: "admin.roleMatrix.layers.pdTitle",
      description: "admin.roleMatrix.layers.pdDesc",
      groupLabel: "admin.roleMatrix.layers.pdGroup",
      badgeLabel: "admin.roleMatrix.layers.pdBadge",
    },
  } as const;
  const k = keys[layer];
  return {
    title: t(k.title),
    description: t(k.description),
    groupLabel: t(k.groupLabel),
    badgeLabel: t(k.badgeLabel),
    badgeClass: LAYER_BADGE_CLASS[layer],
  };
}


export function RoleMatrixEditor({ matrix, groups }: Props) {
  const router = useRouter();
  const t = useT();
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
            : t("admin.saveFailed"),
        );
      }
    });
  }

  async function onResetRole() {
    if (
      !window.confirm(
        t("admin.roleMatrix.resetConfirm", {
          role: roleLabel(t, selectedRole),
        }),
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
            : t("admin.resetFailed"),
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
  const currentMeta = layerMeta(t, currentLayer);

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
        <label className="text-sm font-medium">{t("admin.roleMatrix.roleLabel")}</label>
        <select
          value={selectedRole}
          onChange={(e) => selectRole(e.target.value)}
          className="h-10 min-w-64 rounded-md border border-[var(--color-border)] bg-white px-3 text-sm"
        >
          {groupedRoles.platform.length > 0 ? (
            <optgroup label={layerMeta(t, "platform").groupLabel}>
              {groupedRoles.platform.map((r) => (
                <option key={r} value={r}>
                  {roleLabel(t, r)}
                </option>
              ))}
            </optgroup>
          ) : null}
          {groupedRoles.investor.length > 0 ? (
            <optgroup label={layerMeta(t, "investor").groupLabel}>
              {groupedRoles.investor.map((r) => (
                <option key={r} value={r}>
                  {roleLabel(t, r)}
                </option>
              ))}
            </optgroup>
          ) : null}
          {groupedRoles.agency.length > 0 ? (
            <optgroup label={layerMeta(t, "agency").groupLabel}>
              {groupedRoles.agency.map((r) => (
                <option key={r} value={r}>
                  {roleLabel(t, r)}
                </option>
              ))}
            </optgroup>
          ) : null}
          {groupedRoles.property_desk.length > 0 ? (
            <optgroup label={layerMeta(t, "property_desk").groupLabel}>
              {groupedRoles.property_desk.map((r) => (
                <option key={r} value={r}>
                  {roleLabel(t, r)}
                </option>
              ))}
            </optgroup>
          ) : null}
        </select>
        <div className="ml-auto flex items-center gap-2">
          {pendingCount > 0 ? (
            <span className="text-xs text-amber-700">
              {t("admin.roleMatrix.unsaved", { count: pendingCount })}
            </span>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onResetRole}
            loading={isResetting}
          >
            {t("admin.roleMatrix.resetRole")}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onSave}
            loading={isSaving}
            disabled={pendingCount === 0}
          >
            {t("common.saveChanges")}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">{t("admin.roleMatrix.showPerms")}</span>
        <LayerTab
          active={layerFilter === "A"}
          onClick={() => selectLayer("A")}
          label={t("admin.roleMatrix.layerA")}
        />
        <LayerTab
          active={layerFilter === "B"}
          onClick={() => selectLayer("B")}
          label={t("admin.roleMatrix.layerB")}
        />
        <LayerTab
          active={layerFilter === "C"}
          onClick={() => selectLayer("C")}
          label={t("admin.roleMatrix.layerC")}
        />
        <LayerTab
          active={layerFilter === "all"}
          onClick={() => selectLayer("all")}
          label={t("admin.roleMatrix.all")}
        />
        <span className="text-xs text-[var(--color-foreground-muted)]">
          {t("admin.roleMatrix.groupCount", {
            groups: visibleGroups.length,
            perms: visiblePermCount,
          })}
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
              {t("admin.roleMatrix.pdNote")}
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
              <th className="px-3 py-2 text-left font-semibold">
                {t("admin.roleMatrix.colPermission")}
              </th>
              <th className="w-32 px-3 py-2 text-left font-semibold">
                {t("admin.roleMatrix.colDefault")}
              </th>
              <th className="w-40 px-3 py-2 text-left font-semibold">
                {t("admin.roleMatrix.colCurrent")}
              </th>
              <th className="w-64 px-3 py-2 text-left font-semibold">
                {t("common.actions")}
              </th>
            </tr>
          </thead>
          <tbody>
            {visibleGroups.map((group) => (
              <GroupBlock key={group.resource} group={group} stagedCells={stagedCells} selectedRole={selectedRole} stageChange={stageChange} t={t} />
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
  t: TranslateFn;
}

function GroupBlock({ group, stagedCells, selectedRole, stageChange, t }: GroupBlockProps) {
  return (
    <>
      <tr className="border-t border-[var(--color-border)] bg-[var(--color-surface-inset,#f9fafb)]">
        <td
          colSpan={4}
          className="px-3 py-1.5 font-semibold text-xs uppercase tracking-wider text-[var(--color-foreground-muted)]"
        >
          {resourceLabel(t, group.resource)}
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
                {permHelp(t, perm) ? (
                  <PermissionHelp text={permHelp(t, perm)!} />
                ) : null}
              </span>
            </td>
            <td className="px-3 py-1.5">
              <StatusDot value={cell.default} />
              <span className="ml-2 text-xs">
                {cell.default ? t("admin.roleMatrix.allowed") : t("admin.roleMatrix.denied")}
              </span>
            </td>
            <td className="px-3 py-1.5">
              <StatusDot value={cell.effective} />
              <span className="ml-2 text-xs">
                {cell.effective ? t("admin.roleMatrix.allowed") : t("admin.roleMatrix.denied")}
              </span>
              {cell.hasOverride ? (
                <span
                  title={t("admin.roleMatrix.overrideTitle")}
                  className="ml-2 inline-block size-1.5 rounded-full bg-amber-500 align-middle"
                />
              ) : null}
              {cell.pending ? (
                <span className="ml-2 text-[10px] uppercase tracking-wide text-amber-700">
                  {t("admin.roleMatrix.pendingSave")}
                </span>
              ) : null}
            </td>
            <td className="px-3 py-1.5">
              {isFrozen ? (
                <span className="text-xs italic text-[var(--color-foreground-muted)]">
                  {t("admin.roleMatrix.frozen")}
                </span>
              ) : (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => stageChange(perm, true)}
                    className={`h-7 rounded-md border px-2 text-xs ${cell.effective ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-[var(--color-border)] hover:bg-[var(--color-surface-inset)]"}`}
                  >
                    {t("admin.roleMatrix.allow")}
                  </button>
                  <button
                    type="button"
                    onClick={() => stageChange(perm, false)}
                    className={`h-7 rounded-md border px-2 text-xs ${!cell.effective ? "border-red-300 bg-red-50 text-red-800" : "border-[var(--color-border)] hover:bg-[var(--color-surface-inset)]"}`}
                  >
                    {t("admin.roleMatrix.deny")}
                  </button>
                  {cell.hasOverride || cell.pending ? (
                    <button
                      type="button"
                      onClick={() => stageChange(perm, "default")}
                      className="h-7 rounded-md border border-[var(--color-border)] px-2 text-xs hover:bg-[var(--color-surface-inset)]"
                      title={t("admin.roleMatrix.defaultTitle")}
                    >
                      {t("admin.roleMatrix.defaultBtn")}
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
