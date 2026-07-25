"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
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
          Projekat još uvek nema objekata. Dodajte prvi objekat da biste
          organizovali jedinice po objektima, ulazima i spratovima. Ako
          nemate više objekata (samo jedna zgrada), možete i preskočiti — sva
          polja Objekat/Ulaz/Sprat na jedinici su opciona.
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
                    {b.entrances.length} ulaza ·{" "}
                    {b.entrances.reduce((sum, e) => sum + e.floors.length, 0)}{" "}
                    spratova
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
                    + Ulaz
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
                          <span className="font-medium">Ulaz {e.name}</span>{" "}
                          <span className="text-xs font-mono text-[var(--color-foreground-muted)]">
                            ({e.code})
                          </span>
                          <div className="text-xs text-[var(--color-foreground-muted)]">
                            {e.floors.length} spratova
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
                                entranceLabel: `${b.name} · Ulaz ${e.name}`,
                              })
                            }
                          >
                            + Sprat
                          </Button>
                        ) : null}
                      </div>
                      {e.floors.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {e.floors.map((f) => (
                            <span
                              key={f.id}
                              className="rounded-md border border-[var(--color-border)] bg-white px-2 py-0.5 text-xs"
                            >
                              {f.label}
                            </span>
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
            + Dodaj objekat
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
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-4 shadow-lg">
        <div className="flex items-center justify-between pb-2">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--color-foreground-muted)] hover:text-black"
            aria-label="Zatvori"
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
          : "Došlo je do neočekivane greške.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title="Novi objekat" onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-3">
        <ModalField
          label="Šifra"
          hint="Kratka jedinstvena šifra u okviru projekta (npr. A, L1)."
          value={values.code ?? ""}
          onChange={(v) => setValues({ ...values, code: v })}
          required
        />
        <ModalField
          label="Naziv"
          hint="Naziv objekta (npr. Lamela A, Zgrada 1)."
          value={values.name ?? ""}
          onChange={(v) => setValues({ ...values, name: v })}
          required
        />
        <ModalField
          label="Opis"
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
            Odustani
          </Button>
          <Button type="submit" loading={loading}>
            Dodaj objekat
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
          : "Došlo je do neočekivane greške.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title={`Novi ulaz — ${buildingName}`} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-3">
        <ModalField
          label="Šifra"
          hint="Kratka šifra ulaza (npr. 1, 2, A)."
          value={values.code ?? ""}
          onChange={(v) => setValues({ ...values, code: v })}
          required
        />
        <ModalField
          label="Naziv"
          hint="Kako se ulaz zove/vidi (npr. Ulaz 1, Ulaz A)."
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
            Odustani
          </Button>
          <Button type="submit" loading={loading}>
            Dodaj ulaz
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
          : "Došlo je do neočekivane greške.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title={`Novi sprat — ${entranceLabel}`} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-3">
        <ModalField
          label="Oznaka sprata"
          hint="Kako sprat piše (npr. PR za prizemlje, 1, 2, PK za potkrovlje, S za suteren)."
          value={values.label ?? ""}
          onChange={(v) => setValues({ ...values, label: v })}
          required
        />
        <ModalField
          label="Broj sprata"
          hint="Numerička vrednost za sortiranje (npr. 0 za prizemlje, -1 za suteren)."
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
            Odustani
          </Button>
          <Button type="submit" loading={loading}>
            Dodaj sprat
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
