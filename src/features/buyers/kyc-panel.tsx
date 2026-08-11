"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { DocumentList, type DocumentItem } from "@/features/documents/document-list";

/**
 * Faza 8.2 (B1) — KYC checklist panel on `/kupci/[id]`.
 *
 * Two blocks:
 *   1. Toggle-based checklist — the operator confirms they've seen
 *      each required document. Every save re-stamps `reviewedAt` on
 *      the server, so the badge on the buyer list ("KYC nepotpuno"
 *      vs. "KYC potpuno") stays fresh without background refreshes.
 *   2. `DocumentList` for `category=KYC` — attach the actual scans
 *      (ID front/back, poreska potvrda, ...) via the existing
 *      polymorphic document pipeline.
 */
export function KycPanel(props: {
  buyerId: string;
  entityType: "NATURAL" | "LEGAL";
  initial: {
    idFrontOk: boolean;
    idBackOk: boolean;
    addressProofOk: boolean;
    taxCertOk: boolean;
    notes: string | null;
    reviewedAt: string | null;
    reviewerName: string | null;
  };
  kycDocuments: DocumentItem[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState({
    idFrontOk: props.initial.idFrontOk,
    idBackOk: props.initial.idBackOk,
    addressProofOk: props.initial.addressProofOk,
    taxCertOk: props.initial.taxCertOk,
    notes: props.initial.notes ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const items =
    props.entityType === "NATURAL"
      ? [
          { key: "idFrontOk" as const, label: "Lična karta (lice)" },
          { key: "idBackOk" as const, label: "Lična karta (poleđina)" },
          { key: "addressProofOk" as const, label: "Potvrda prebivališta / računa" },
        ]
      : [
          { key: "idFrontOk" as const, label: "Lična karta ovlašćenog lica" },
          { key: "taxCertOk" as const, label: "Poreska potvrda / rešenje o PIB-u" },
          { key: "addressProofOk" as const, label: "Potvrda sedišta / APR izvod" },
        ];

  const missing = items.filter((i) => !state[i.key]).length;
  const isComplete = missing === 0;

  async function save() {
    if (!props.canManage) return;
    setBusy(true);
    setError(null);
    try {
      await apiClient.patch(`/buyers/${props.buyerId}/kyc`, state);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Greška.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
              isComplete
                ? "bg-emerald-100 text-emerald-700"
                : "bg-amber-100 text-amber-800"
            }`}
          >
            {isComplete ? "KYC potpun" : `Nedostaje ${missing} stavki`}
          </span>
          {props.initial.reviewedAt ? (
            <span className="ml-2 text-xs text-[var(--color-foreground-muted)]">
              Pregledao{" "}
              {props.initial.reviewerName ?? "korisnik"} —{" "}
              {new Date(props.initial.reviewedAt).toLocaleString("sr-Latn-RS")}
            </span>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        {items.map((it) => (
          <label
            key={it.key}
            className="flex items-center justify-between rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
          >
            <span>{it.label}</span>
            <input
              type="checkbox"
              checked={state[it.key]}
              onChange={(e) =>
                setState((s) => ({ ...s, [it.key]: e.target.checked }))
              }
              disabled={!props.canManage}
              className="size-4"
            />
          </label>
        ))}
      </div>

      <label className="block text-sm">
        <span className="mb-1 block text-xs text-[var(--color-foreground-muted)]">
          Napomena (interna)
        </span>
        <textarea
          className="min-h-[80px] w-full rounded-md border border-[var(--color-border)] p-2 text-sm"
          value={state.notes}
          onChange={(e) => setState((s) => ({ ...s, notes: e.target.value }))}
          disabled={!props.canManage}
          maxLength={2000}
        />
      </label>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {props.canManage ? (
        <div className="flex justify-end">
          <Button loading={busy} onClick={save}>
            Sačuvaj KYC status
          </Button>
        </div>
      ) : null}

      <div className="pt-3">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-foreground-muted)]">
          Priloženi dokumenti (KYC)
        </h3>
        <DocumentList
          entityType="Buyer"
          entityId={props.buyerId}
          documents={props.kycDocuments}
          category="KYC"
          canManage={props.canManage}
          emptyTitle="Nema priloženih KYC dokumenata"
          emptyDescription="Otpremite skenove lične karte, poreske potvrde ili drugih KYC dokumenata."
        />
      </div>
    </div>
  );
}
