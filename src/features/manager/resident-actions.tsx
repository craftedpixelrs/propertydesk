"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useT } from "@/components/app/i18n-provider";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { ActionDialog, Field, SelectField, TextareaField } from "./_shared/action-dialog";

export function ResendInviteButton({ accessId }: { accessId: string }) {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  async function onClick() {
    setBusy(true);
    setMsg(null);
    try {
      await apiClient.post(`/manager/residents/${accessId}/resend`);
      setMsg("Pozivnica je ponovo poslata.");
      router.refresh();
    } catch (err) {
      setMsg(err instanceof ApiClientError ? err.message : "Greška.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <span className="inline-flex items-center gap-2">
      <Button variant="ghost" size="sm" onClick={onClick} disabled={busy}>
        {t("manager.actions.resendInvite")}
      </Button>
      {msg ? <span className="text-xs text-[var(--color-foreground-muted)]">{msg}</span> : null}
    </span>
  );
}

export function RevokeAccessButton({ accessId }: { accessId: string }) {
  const t = useT();
  const [reason, setReason] = useState("");
  return (
    <ActionDialog
      trigger={
        <Button variant="ghost" size="sm">
          {t("manager.actions.revokeAccess")}
        </Button>
      }
      title={t("manager.residents.revoke")}
      submitLabel={t("manager.actions.revokeAccess")}
      submitVariant="destructive"
      onSubmit={async () => {
        const qs = reason.trim() ? `?reason=${encodeURIComponent(reason.trim())}` : "";
        await apiClient.delete(`/manager/residents/${accessId}${qs}`);
      }}
    >
      {() => (
        <TextareaField
          label={t("manager.payments.notesField")}
          id="rv-reason"
          value={reason}
          onChange={setReason}
        />
      )}
    </ActionDialog>
  );
}

export function AddResidentDialog({
  buildings,
  units,
  canInvite,
}: {
  buildings: Array<{ id: string; name: string }>;
  units: Array<{ id: string; code: string; buildingId: string }>;
  canInvite: boolean;
}) {
  const t = useT();
  const [buildingId, setBuildingId] = useState(buildings[0]?.id ?? "");
  const buildingUnits = units.filter((unit) => unit.buildingId === buildingId);
  const [unitId, setUnitId] = useState(buildingUnits[0]?.id ?? "");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<"OWNER" | "TENANT" | "USER">("OWNER");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [sendInvite, setSendInvite] = useState(true);

  function chooseBuilding(next: string) {
    setBuildingId(next);
    const first = units.find((unit) => unit.buildingId === next);
    setUnitId(first?.id ?? "");
  }

  return (
    <ActionDialog
      trigger={<Button>{t("manager.residents.addButton")}</Button>}
      title={t("manager.residents.addTitle")}
      description={t("manager.residents.addHint")}
      submitLabel={t("common.save")}
      onSubmit={async () => {
        if (!firstName.trim() && !lastName.trim()) {
          throw new Error(t("manager.residents.nameRequired"));
        }
        if (!unitId) {
          throw new Error(t("manager.residents.noUnits"));
        }
        const payload: Record<string, unknown> = { primaryRole: role };
        if (firstName.trim()) payload.firstName = firstName.trim();
        if (lastName.trim()) payload.lastName = lastName.trim();
        if (phone.trim()) payload.phone = phone.trim();
        if (email.trim()) payload.email = email.trim();
        const person = await apiClient.post<{ id: string }>(
          `/manager/buildings/${buildingId}/persons`,
          payload,
        );
        await apiClient.post(`/manager/units/${unitId}/ownerships`, {
          personId: person.id,
          role,
          sharePercent: role === "OWNER" ? 100 : 0,
          isPrimary: role === "OWNER",
        });
        if (canInvite && sendInvite && email.trim()) {
          await apiClient.post(`/manager/units/${unitId}/residents`, {
            personId: person.id,
            email: email.trim().toLowerCase(),
          });
        }
        setFirstName("");
        setLastName("");
        setPhone("");
        setEmail("");
      }}
    >
      {() => (
        <>
          <SelectField
            label={t("manager.residents.columns.building")}
            id="ar-building"
            value={buildingId}
            options={buildings.map((building) => ({ value: building.id, label: building.name }))}
            onChange={(value) => value && chooseBuilding(value)}
          />
          {buildingUnits.length === 0 ? (
            <p className="text-sm text-[var(--color-foreground-muted)]">
              {t("manager.residents.noUnits")}
            </p>
          ) : (
            <SelectField
              label={t("manager.residents.columns.unit")}
              id="ar-unit"
              value={unitId}
              options={buildingUnits.map((unit) => ({ value: unit.id, label: unit.code }))}
              onChange={(value) => value && setUnitId(value)}
            />
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field
              label={t("manager.residents.firstName")}
              id="ar-first"
              value={firstName}
              onChange={setFirstName}
            />
            <Field
              label={t("manager.residents.lastName")}
              id="ar-last"
              value={lastName}
              onChange={setLastName}
            />
            <SelectField
              label={t("manager.owners.columns.role")}
              id="ar-role"
              value={role}
              options={(["OWNER", "TENANT", "USER"] as const).map((item) => ({
                value: item,
                label: t(`manager.residents.roles.${item}`),
              }))}
              onChange={(value) => value && setRole(value)}
            />
            <Field
              label={t("manager.building.fields.contactPhone")}
              id="ar-phone"
              value={phone}
              onChange={setPhone}
            />
          </div>
          <Field
            label={t("manager.residents.columns.email")}
            id="ar-email"
            type="email"
            value={email}
            onChange={setEmail}
          />
          {canInvite ? (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={sendInvite}
                onChange={(event) => setSendInvite(event.currentTarget.checked)}
              />
              {t("manager.residents.sendInvite")}
            </label>
          ) : null}
        </>
      )}
    </ActionDialog>
  );
}
