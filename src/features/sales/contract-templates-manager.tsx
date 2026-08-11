"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { apiClient, ApiClientError } from "@/lib/api-client";

export interface ContractTemplateRow {
  id: string;
  kind: "PRE_CONTRACT" | "CONTRACT";
  name: string;
  description: string | null;
  contentHtml: string;
  isActive: boolean;
  updatedAt: string;
}

/**
 * Faza 8.1 (A1) — admin CRUD for `SaleContractTemplate`. Follows the
 * same pattern as `/podesavanja/planovi-placanja` (payment plan
 * templates manager): list on the left, editor on the right, no
 * modal dialogs.
 */
export function ContractTemplatesManager(props: {
  templates: ContractTemplateRow[];
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(
    props.templates[0]?.id ?? null,
  );
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [draftKind, setDraftKind] = useState<"PRE_CONTRACT" | "CONTRACT">(
    "PRE_CONTRACT",
  );
  const [draftName, setDraftName] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftContent, setDraftContent] = useState("");

  const selected = useMemo(
    () => props.templates.find((t) => t.id === selectedId) ?? null,
    [props.templates, selectedId],
  );

  function startCreate() {
    setCreating(true);
    setSelectedId(null);
    setDraftKind("PRE_CONTRACT");
    setDraftName("");
    setDraftDescription("");
    setDraftContent(SAMPLE_CONTENT);
  }

  async function save() {
    setError(null);
    if (!draftName.trim()) {
      setError("Naziv šablona je obavezan.");
      return;
    }
    if (!draftContent.trim()) {
      setError("Sadržaj šablona ne sme biti prazan.");
      return;
    }
    setBusy(true);
    try {
      if (creating) {
        await apiClient.post("/sale-contract-templates", {
          kind: draftKind,
          name: draftName.trim(),
          description: draftDescription.trim() || null,
          contentHtml: draftContent,
        });
      } else if (selected) {
        await apiClient.patch(`/sale-contract-templates/${selected.id}`, {
          kind: draftKind,
          name: draftName.trim(),
          description: draftDescription.trim() || null,
          contentHtml: draftContent,
        });
      }
      setCreating(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Greška.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Obrisati šablon? Ova radnja se ne može poništiti.")) return;
    setBusy(true);
    try {
      await apiClient.delete(`/sale-contract-templates/${id}`);
      if (selectedId === id) setSelectedId(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Greška.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(id: string, isActive: boolean) {
    setBusy(true);
    try {
      await apiClient.patch(`/sale-contract-templates/${id}`, {
        isActive: !isActive,
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Greška.");
    } finally {
      setBusy(false);
    }
  }

  function editSelected(t: ContractTemplateRow) {
    setCreating(false);
    setSelectedId(t.id);
    setDraftKind(t.kind);
    setDraftName(t.name);
    setDraftDescription(t.description ?? "");
    setDraftContent(t.contentHtml);
  }

  const editorTemplate = creating
    ? { id: "new", kind: draftKind, name: draftName, description: draftDescription, contentHtml: draftContent }
    : selected;

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <aside className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Šabloni</h2>
          <Button size="sm" onClick={startCreate} disabled={busy}>
            Novi
          </Button>
        </div>
        {props.templates.length === 0 ? (
          <p className="rounded-md border border-dashed border-[var(--color-border)] p-3 text-xs text-[var(--color-foreground-muted)]">
            Još nemate ni jedan šablon. Klik na "Novi" da dodate prvi.
          </p>
        ) : (
          <ul className="space-y-1">
            {props.templates.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => editSelected(t)}
                  className={`flex w-full flex-col items-start rounded-md border px-3 py-2 text-left text-sm transition ${
                    selectedId === t.id && !creating
                      ? "border-[var(--color-brand-500)] bg-[var(--color-brand-50)]"
                      : "border-[var(--color-border)] hover:bg-[var(--color-surface-inset)]"
                  }`}
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <span className="truncate font-medium">{t.name}</span>
                    <span className="shrink-0 text-[10px] uppercase text-[var(--color-foreground-muted)]">
                      {t.kind === "PRE_CONTRACT" ? "Predugovor" : "Ugovor"}
                    </span>
                  </div>
                  <span
                    className={`mt-0.5 text-[10px] ${t.isActive ? "text-emerald-700" : "text-slate-500"}`}
                  >
                    {t.isActive ? "Aktivan" : "Deaktiviran"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      <section className="space-y-3">
        {editorTemplate ? (
          <>
            {error ? (
              <div className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-[var(--color-foreground-muted)]">
                  Naziv šablona
                </label>
                <input
                  type="text"
                  className="h-10 w-full rounded-md border border-[var(--color-border)] px-3 text-sm"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-[var(--color-foreground-muted)]">
                  Vrsta
                </label>
                <select
                  className="h-10 w-full rounded-md border border-[var(--color-border)] px-3 text-sm"
                  value={draftKind}
                  onChange={(e) =>
                    setDraftKind(e.target.value as "PRE_CONTRACT" | "CONTRACT")
                  }
                >
                  <option value="PRE_CONTRACT">Predugovor</option>
                  <option value="CONTRACT">Ugovor</option>
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--color-foreground-muted)]">
                Opis (interni)
              </label>
              <input
                type="text"
                className="h-10 w-full rounded-md border border-[var(--color-border)] px-3 text-sm"
                value={draftDescription}
                onChange={(e) => setDraftDescription(e.target.value)}
              />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-[var(--color-foreground-muted)]">
                  Sadržaj (HTML) — koristite <code>{`{{var}}`}</code> placeholder-e
                </span>
                <span className="text-[var(--color-foreground-subtle)]">
                  {draftContent.length} znakova
                </span>
              </div>
              <textarea
                className="min-h-[400px] w-full rounded-md border border-[var(--color-border)] p-3 font-mono text-xs"
                value={draftContent}
                onChange={(e) => setDraftContent(e.target.value)}
                spellCheck={false}
              />
            </div>
            <details className="rounded-md border border-[var(--color-border)] p-3 text-xs">
              <summary className="cursor-pointer font-medium">
                Dostupni placeholder-i
              </summary>
              <div className="mt-2 grid grid-cols-2 gap-1 font-mono text-[11px] text-[var(--color-foreground-muted)]">
                {AVAILABLE_PLACEHOLDERS.map((p) => (
                  <span key={p}>{`{{${p}}}`}</span>
                ))}
              </div>
            </details>
            <div className="flex items-center justify-between">
              <div>
                {selected && !creating ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => toggleActive(selected.id, selected.isActive)}
                  >
                    {selected.isActive ? "Deaktiviraj" : "Aktiviraj"}
                  </Button>
                ) : null}
              </div>
              <div className="flex gap-2">
                {selected && !creating ? (
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={busy}
                    onClick={() => remove(selected.id)}
                  >
                    Obriši
                  </Button>
                ) : null}
                <Button loading={busy} onClick={save}>
                  Sačuvaj
                </Button>
              </div>
            </div>
          </>
        ) : (
          <p className="rounded-md border border-dashed border-[var(--color-border)] p-6 text-center text-sm text-[var(--color-foreground-muted)]">
            Izaberite šablon sa liste ili kreirajte novi.
          </p>
        )}
      </section>
    </div>
  );
}

const AVAILABLE_PLACEHOLDERS = [
  "buyer.fullName",
  "buyer.firstName",
  "buyer.lastName",
  "buyer.jmbg",
  "buyer.taxId",
  "buyer.identity",
  "buyer.legalName",
  "buyer.email",
  "buyer.phone",
  "buyer.address",
  "unit.code",
  "unit.projectName",
  "unit.address",
  "unit.totalArea",
  "unit.internalArea",
  "sale.listPrice",
  "sale.finalPrice",
  "sale.depositAmount",
  "sale.currency",
  "sale.contractDate",
  "sale.preContractDate",
  "sale.plannedHandoverDate",
  "tax.mode",
  "tax.amount",
  "tax.payer",
  "plan.installments",
  "investor.legalName",
  "investor.pib",
  "investor.registrationNumber",
  "investor.address",
  "today",
];

const SAMPLE_CONTENT = `<p><strong>Ugovor o kupoprodaji nepokretnosti</strong></p>
<p>Zaključen dana {{today}} između:</p>
<p><strong>Prodavac:</strong> {{investor.legalName}}, PIB {{investor.pib}}, sedište {{investor.address}}, koga zastupa direktor.</p>
<p><strong>Kupac:</strong> {{buyer.fullName}}, {{buyer.identity}}, adresa {{buyer.address}}.</p>
<p><strong>Predmet ugovora:</strong></p>
<p>Prodavac prodaje, a kupac kupuje jedinicu <strong>{{unit.code}}</strong> u projektu <strong>{{unit.projectName}}</strong>, na adresi {{unit.address}}, ukupne površine {{unit.totalArea}} m² (od čega korisne {{unit.internalArea}} m²).</p>
<p><strong>Cena:</strong> {{sale.finalPrice}} {{sale.currency}} (slovima).</p>
<p>Način plaćanja:</p>
{{plan.installments}}
<p>Porez: {{tax.mode}}, iznos {{tax.amount}} {{sale.currency}}, obveznik {{tax.payer}}.</p>
<p>Datum ugovora: {{sale.contractDate}}. Planirana primopredaja: {{sale.plannedHandoverDate}}.</p>
<p>Ugovorne strane potvrđuju da su pročitale i razumele sadržaj ugovora i istovremeno ga potpisuju.</p>`;
