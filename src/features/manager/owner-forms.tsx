"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useT } from "@/components/app/i18n-provider";
import { apiClient } from "@/lib/api-client";
import { ActionDialog, Field, SelectField, TextareaField } from "./_shared/action-dialog";

export interface PersonOption {
  id: string;
  label: string;
  email: string | null;
}

export interface UnitOption {
  id: string;
  code: string;
}

export function NewPersonDialog({ buildingId }: { buildingId: string }) {
  const t = useT();
  const [values, setValues] = useState({
    firstName: "",
    lastName: "",
    legalName: "",
    email: "",
    phone: "",
    address: "",
    primaryRole: "OWNER" as "OWNER" | "TENANT" | "USER",
    notes: "",
  });
  function set<K extends keyof typeof values>(k: K, v: (typeof values)[K]) {
    setValues((p) => ({ ...p, [k]: v }));
  }
  return (
    <ActionDialog
      trigger={<Button>{t("manager.actions.newPerson")}</Button>}
      title={t("manager.actions.newPerson")}
      submitLabel={t("common.save")}
      onSubmit={async () => {
        const payload: Record<string, unknown> = {
          primaryRole: values.primaryRole,
        };
        if (values.firstName.trim()) payload.firstName = values.firstName.trim();
        if (values.lastName.trim()) payload.lastName = values.lastName.trim();
        if (values.legalName.trim()) payload.legalName = values.legalName.trim();
        if (values.email.trim()) payload.email = values.email.trim();
        if (values.phone.trim()) payload.phone = values.phone.trim();
        if (values.address.trim()) payload.address = values.address.trim();
        if (values.notes.trim()) payload.notes = values.notes.trim();
        await apiClient.post(`/manager/buildings/${buildingId}/persons`, payload);
      }}
    >
      {() => (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Ime"
              id="np-first"
              value={values.firstName}
              onChange={(v) => set("firstName", v)}
            />
            <Field
              label="Prezime"
              id="np-last"
              value={values.lastName}
              onChange={(v) => set("lastName", v)}
            />
            <Field
              label="Naziv pravnog lica"
              id="np-legal"
              value={values.legalName}
              onChange={(v) => set("legalName", v)}
            />
            <SelectField
              label={t("manager.owners.columns.role")}
              id="np-role"
              value={values.primaryRole}
              options={[
                { value: "OWNER", label: "Vlasnik" },
                { value: "TENANT", label: "Stanar" },
                { value: "USER", label: "Korisnik" },
              ]}
              onChange={(v) => v && set("primaryRole", v)}
            />
            <Field
              label={t("manager.building.fields.contactEmail")}
              id="np-email"
              type="email"
              value={values.email}
              onChange={(v) => set("email", v)}
            />
            <Field
              label={t("manager.building.fields.contactPhone")}
              id="np-phone"
              value={values.phone}
              onChange={(v) => set("phone", v)}
            />
          </div>
          <Field
            label={t("manager.building.fields.address")}
            id="np-addr"
            value={values.address}
            onChange={(v) => set("address", v)}
          />
          <TextareaField
            label={t("manager.building.fields.notes")}
            id="np-notes"
            value={values.notes}
            onChange={(v) => set("notes", v)}
          />
        </>
      )}
    </ActionDialog>
  );
}

export function AssignOwnershipDialog({
  persons,
  units,
}: {
  persons: PersonOption[];
  units: UnitOption[];
}) {
  const t = useT();
  const [personId, setPersonId] = useState(persons[0]?.id ?? "");
  const [unitId, setUnitId] = useState(units[0]?.id ?? "");
  const [role, setRole] = useState<"OWNER" | "TENANT" | "USER">("OWNER");
  const [share, setShare] = useState("100");
  return (
    <ActionDialog
      trigger={<Button variant="outline">{t("manager.actions.assignOwner")}</Button>}
      title={t("manager.actions.assignOwner")}
      submitLabel={t("common.save")}
      onSubmit={async () => {
        await apiClient.post(`/manager/units/${unitId}/ownerships`, {
          personId,
          role,
          sharePercent: Number(share) || 100,
          isPrimary: true,
        });
      }}
    >
      {() => (
        <>
          <SelectField
            label={t("manager.owners.columns.name")}
            id="ao-person"
            value={personId}
            options={persons.map((p) => ({ value: p.id, label: p.label }))}
            onChange={(v) => v && setPersonId(v)}
          />
          <SelectField
            label={t("manager.units.columns.code")}
            id="ao-unit"
            value={unitId}
            options={units.map((u) => ({ value: u.id, label: u.code }))}
            onChange={(v) => v && setUnitId(v)}
          />
          <SelectField
            label={t("manager.owners.columns.role")}
            id="ao-role"
            value={role}
            options={[
              { value: "OWNER", label: "Vlasnik" },
              { value: "TENANT", label: "Stanar" },
              { value: "USER", label: "Korisnik" },
            ]}
            onChange={(v) => v && setRole(v)}
          />
          <Field
            label={t("manager.units.columns.share") + " %"}
            id="ao-share"
            type="number"
            value={share}
            onChange={setShare}
          />
        </>
      )}
    </ActionDialog>
  );
}

export function EndOwnershipButton({
  unitId,
  ownershipId,
  label,
}: {
  unitId: string;
  ownershipId: string;
  label: string;
}) {
  const t = useT();
  return (
    <ActionDialog
      trigger={
        <Button variant="ghost" size="sm">
          {t("manager.actions.endOwnership")}
        </Button>
      }
      title={`${t("manager.actions.endOwnership")} · ${label}`}
      submitLabel={t("manager.actions.endOwnership")}
      submitVariant="destructive"
      onSubmit={async () => {
        await apiClient.delete(`/manager/units/${unitId}/ownerships?ownershipId=${ownershipId}`);
      }}
    >
      {() => <p className="text-sm">{t("manager.common.confirmDelete")}</p>}
    </ActionDialog>
  );
}

export function InviteResidentDialog({
  persons,
  units,
}: {
  persons: PersonOption[];
  units: UnitOption[];
}) {
  const t = useT();
  const defaultPerson = persons.find((p) => p.email) ?? persons[0];
  const [personId, setPersonId] = useState(defaultPerson?.id ?? "");
  const [unitId, setUnitId] = useState(units[0]?.id ?? "");
  const [email, setEmail] = useState(defaultPerson?.email ?? "");
  return (
    <ActionDialog
      trigger={<Button variant="outline">{t("manager.actions.inviteToPortal")}</Button>}
      title={t("manager.actions.inviteToPortal")}
      submitLabel={t("manager.residents.inviteButton")}
      onSubmit={async () => {
        await apiClient.post(`/manager/units/${unitId}/residents`, {
          personId,
          email: email.trim().toLowerCase(),
        });
      }}
    >
      {() => (
        <>
          <SelectField
            label={t("manager.owners.columns.name")}
            id="ir-person"
            value={personId}
            options={persons.map((p) => ({ value: p.id, label: p.label }))}
            onChange={(v) => {
              if (v) {
                setPersonId(v);
                const p = persons.find((x) => x.id === v);
                if (p?.email) setEmail(p.email);
              }
            }}
          />
          <SelectField
            label={t("manager.units.columns.code")}
            id="ir-unit"
            value={unitId}
            options={units.map((u) => ({ value: u.id, label: u.code }))}
            onChange={(v) => v && setUnitId(v)}
          />
          <Field
            label={t("manager.residents.columns.email")}
            id="ir-email"
            type="email"
            value={email}
            required
            onChange={setEmail}
          />
        </>
      )}
    </ActionDialog>
  );
}
