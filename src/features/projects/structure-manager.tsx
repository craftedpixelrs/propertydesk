"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useT } from "@/components/app/i18n-provider";
import { apiClient, ApiClientError } from "@/lib/api-client";

interface FloorLite {
  id: string;
  label: string;
}
interface EntranceLite {
  id: string;
  code: string;
  name: string;
  floors: FloorLite[];
}
interface BuildingLite {
  id: string;
  code: string;
  name: string;
  entrances: EntranceLite[];
}

interface StructureManagerProps {
  projectId: string;
  buildings: BuildingLite[];
  canManage: boolean;
}

type OpenForm =
  | { kind: "building" }
  | { kind: "entrance"; buildingId: string; buildingName: string }
  | { kind: "floor"; entranceId: string; entranceLabel: string }
  | null;

export function StructureManager({
  projectId,
  buildings,
  canManage,
}: StructureManagerProps) {
  const t = useT();
  const router = useRouter();
  const [openForm, setOpenForm] = useState<OpenForm>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function onCreated() {
    setOpenForm(null);
    router.refresh();
  }

  return (
    <div className="space-y-3 text-sm">
      {buildings.length === 0 ? (
        <div className="rounded-md border border-dashed border-[var(--color-border)] p-4 text-[var(--color-foreground-muted)]">
          {t("inventory.structure.emptyHelp")}
        </div>
      ) : (
        buildings.map((b) => {
          const isOpen = expanded.has(b.id);
          return (
            <div
              key={b.id}
              className="rounded-md border border-[var(--color-border)]"
            >
              <div className="flex items-center justify-between gap-2 p-3">
                <button
                  type="button"
                  onClick={() => toggleExpanded(b.id)}
                  className="flex-1 text-left"
                >
                  <div className="font-medium">
                    {b.name}{" "}
                    <span className="text-xs font-mono text-[var(--color-foreground-muted)]">
                      ({b.code})
                    </span>
                  </div>
                  <div className="text-xs text-[var(--color-foreground-muted)]">
                    {t("inventory.structure.entranceFloorCounts", {
                      entrances: b.entrances.length,
                      floors: b.entrances.reduce((sum, e) => sum + e.floors.length, 0),
                    })}
                  </div>
                </button>
                {canManage ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setOpenForm({
                        kind: "entrance",
                        buildingId: b.id,
                        buildingName: b.name,
                      })
                    }
                  >
                    {t("inventory.structure.addEntranceShort")}
                  </Button>
                ) : null}
              </div>
              {isOpen && b.entrances.length > 0 ? (
                <div className="border-t border-[var(--color-border)] p-3 space-y-2">
                  {b.entrances.map((e) => (
                    <div
                      key={e.id}
                      className="rounded-md bg-[var(--color-background-muted,#f9fafb)] p-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <span className="font-medium">
                            {t("inventory.structure.entranceName", { name: e.name })}
                          </span>{" "}
                          <span className="text-xs font-mono text-[var(--color-foreground-muted)]">
                            ({e.code})
                          </span>
                          <div className="text-xs text-[var(--color-foreground-muted)]">
                            {t("inventory.structure.floorCount", { count: e.floors.length })}
                          </div>
                        </div>
                        {canManage ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setOpenForm({
                                kind: "floor",
                                entranceId: e.id,
                                entranceLabel: t("inventory.structure.entranceLabel", {
                                  building: b.name,
                                  entrance: e.name,
                                }),
                              })
                            }
                          >
                            {t("inventory.structure.addFloorShort")}
                          </Button>
                        ) : null}
                      </div>
                      {e.floors.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {e.floors.map((f) => (
                            <Link
                              key={f.id}
                              href={`/spratovi/${f.id}`}
                              className="rounded-md border border-[var(--color-border)] bg-white px-2 py-0.5 text-xs hover:bg-[var(--color-surface-inset)]"
                            >
                              {f.label}
                            </Link>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })
      )}

      {canManage ? (
        <div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpenForm({ kind: "building" })}
          >
            {t("inventory.structure.addBuildingShort")}
          </Button>
        </div>
      ) : null}

      {openForm?.kind === "building" ? (
        <BuildingForm
          projectId={projectId}
          onClose={() => setOpenForm(null)}
          onCreated={onCreated}
        />
      ) : null}
      {openForm?.kind === "entrance" ? (
        <EntranceForm
          buildingId={openForm.buildingId}
          buildingName={openForm.buildingName}
          onClose={() => setOpenForm(null)}
          onCreated={onCreated}
        />
      ) : null}
      {openForm?.kind === "floor" ? (
        <FloorForm
          entranceId={openForm.entranceId}
          entranceLabel={openForm.entranceLabel}
          onClose={() => setOpenForm(null)}
          onCreated={onCreated}
        />
      ) : null}
    </div>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const t = useT();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-4 shadow-lg">
        <div className="flex items-center justify-between pb-2">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--color-foreground-muted)] hover:text-black"
            aria-label={t("common.close")}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function BuildingForm({
  projectId,
  onClose,
  onCreated,
}: {
  projectId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const t = useT();
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await apiClient.post(`/projects/${projectId}/buildings`, {
        code: values.code,
        name: values.name,
        description: values.description || undefined,
      });
      onCreated();
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : t("common.unexpectedError"),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title={t("inventory.structure.newBuilding")} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-3">
        <ModalField
          label={t("structure.fields.code")}
          hint={t("inventory.structure.buildingCodeHint")}
          value={values.code ?? ""}
          onChange={(v) => setValues({ ...values, code: v })}
          required
        />
        <ModalField
          label={t("structure.fields.name")}
          hint={t("inventory.structure.buildingNameHint")}
          value={values.name ?? ""}
          onChange={(v) => setValues({ ...values, name: v })}
          required
        />
        <ModalField
          label={t("structure.fields.description")}
          value={values.description ?? ""}
          onChange={(v) => setValues({ ...values, description: v })}
        />
        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" type="button" onClick={onClose} disabled={loading}>
            {t("inventory.discard")}
          </Button>
          <Button type="submit" loading={loading}>
            {t("structure.addBuilding")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function EntranceForm({
  buildingId,
  buildingName,
  onClose,
  onCreated,
}: {
  buildingId: string;
  buildingName: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const t = useT();
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await apiClient.post(`/buildings/${buildingId}/entrances`, {
        code: values.code,
        name: values.name,
      });
      onCreated();
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : t("common.unexpectedError"),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title={t("inventory.structure.newEntrance", { name: buildingName })} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-3">
        <ModalField
          label={t("structure.fields.code")}
          hint={t("inventory.structure.entranceCodeHint")}
          value={values.code ?? ""}
          onChange={(v) => setValues({ ...values, code: v })}
          required
        />
        <ModalField
          label={t("structure.fields.name")}
          hint={t("inventory.structure.entranceNameHint")}
          value={values.name ?? ""}
          onChange={(v) => setValues({ ...values, name: v })}
          required
        />
        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" type="button" onClick={onClose} disabled={loading}>
            {t("inventory.discard")}
          </Button>
          <Button type="submit" loading={loading}>
            {t("structure.addEntrance")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function FloorForm({
  entranceId,
  entranceLabel,
  onClose,
  onCreated,
}: {
  entranceId: string;
  entranceLabel: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const t = useT();
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = { label: values.label };
      if (values.number) payload.number = Number(values.number);
      await apiClient.post(`/entrances/${entranceId}/floors`, payload);
      onCreated();
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : t("common.unexpectedError"),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title={t("inventory.structure.newFloor", { label: entranceLabel })} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-3">
        <ModalField
          label={t("structure.fields.floorLabel")}
          hint={t("inventory.structure.floorLabelHint")}
          value={values.label ?? ""}
          onChange={(v) => setValues({ ...values, label: v })}
          required
        />
        <ModalField
          label={t("structure.fields.floorNumber")}
          hint={t("inventory.structure.floorNumberHint")}
          type="number"
          value={values.number ?? ""}
          onChange={(v) => setValues({ ...values, number: v })}
        />
        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" type="button" onClick={onClose} disabled={loading}>
            {t("inventory.discard")}
          </Button>
          <Button type="submit" loading={loading}>
            {t("structure.addFloor")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ModalField({
  label,
  value,
  onChange,
  hint,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">
        {label}
        {required ? <span className="text-red-500">*</span> : null}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="h-10 w-full rounded-md border border-[var(--color-border)] bg-white px-3 text-sm"
      />
      {hint ? (
        <p className="text-xs text-[var(--color-foreground-muted)]">{hint}</p>
      ) : null}
    </div>
  );
}
