"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/app/i18n-provider";
import { apiClient, ApiClientError } from "@/lib/api-client";

export function HandoverPanel(props: {
  saleId: string;
  canManage: boolean;
  initial: {
    keysHanded: boolean;
    meterElectricity: string;
    meterWater: string;
    meterHeating: string;
    defects: string;
    attendees: string;
    completedAt: string | null;
    completedByName: string | null;
  };
}) {
  const { t } = useI18n();
  const [keysHanded, setKeysHanded] = useState(props.initial.keysHanded);
  const [meterElectricity, setMeterElectricity] = useState(props.initial.meterElectricity);
  const [meterWater, setMeterWater] = useState(props.initial.meterWater);
  const [meterHeating, setMeterHeating] = useState(props.initial.meterHeating);
  const [defects, setDefects] = useState(props.initial.defects);
  const [attendees, setAttendees] = useState(props.initial.attendees);
  const [complete, setComplete] = useState(Boolean(props.initial.completedAt));
  const [completedByName, setCompletedByName] = useState(props.initial.completedByName);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const saved = await apiClient.put<{
        completedByUser?: { name: string | null } | null;
      }>(`/sales/${props.saleId}/handover`, {
        keysHanded,
        meterElectricity,
        meterWater,
        meterHeating,
        defects,
        attendees,
        complete,
      });
      setCompletedByName(saved.completedByUser?.name ?? completedByName);
      setMessage(t("deals.clientPack.saved"));
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t("errors.generic"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 text-sm">
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={keysHanded}
          disabled={!props.canManage || busy}
          onChange={(event) => setKeysHanded(event.target.checked)}
        />
        {t("deals.clientPack.keys")}
      </label>
      <div className="grid gap-2 sm:grid-cols-3">
        <Field
          label={t("deals.clientPack.meterElectricity")}
          value={meterElectricity}
          disabled={!props.canManage || busy}
          onChange={setMeterElectricity}
        />
        <Field
          label={t("deals.clientPack.meterWater")}
          value={meterWater}
          disabled={!props.canManage || busy}
          onChange={setMeterWater}
        />
        <Field
          label={t("deals.clientPack.meterHeating")}
          value={meterHeating}
          disabled={!props.canManage || busy}
          onChange={setMeterHeating}
        />
      </div>
      <label className="block space-y-1">
        <span className="text-xs text-[var(--color-foreground-muted)]">
          {t("deals.clientPack.defects")}
        </span>
        <textarea
          className="min-h-20 w-full rounded-md border border-[var(--color-border)] px-3 py-2"
          value={defects}
          disabled={!props.canManage || busy}
          onChange={(event) => setDefects(event.target.value)}
        />
      </label>
      <label className="block space-y-1">
        <span className="text-xs text-[var(--color-foreground-muted)]">
          {t("deals.clientPack.attendees")}
        </span>
        <input
          className="h-10 w-full rounded-md border border-[var(--color-border)] px-3"
          value={attendees}
          disabled={!props.canManage || busy}
          onChange={(event) => setAttendees(event.target.value)}
        />
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={complete}
          disabled={!props.canManage || busy}
          onChange={(event) => setComplete(event.target.checked)}
        />
        {t("deals.clientPack.complete")}
      </label>
      {complete && completedByName ? (
        <p className="text-xs text-[var(--color-foreground-muted)]">
          {t("deals.clientPack.completedBy", { name: completedByName })}
        </p>
      ) : null}
      <p className="text-xs text-[var(--color-foreground-muted)]">
        {t("deals.clientPack.photosHint")}
      </p>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      {props.canManage ? (
        <Button size="sm" loading={busy} onClick={save}>
          {t("deals.clientPack.save")}
        </Button>
      ) : null}
    </div>
  );
}

function Field(props: {
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs text-[var(--color-foreground-muted)]">{props.label}</span>
      <input
        className="h-10 w-full rounded-md border border-[var(--color-border)] px-3"
        value={props.value}
        disabled={props.disabled}
        onChange={(event) => props.onChange(event.target.value)}
      />
    </label>
  );
}
