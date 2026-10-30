"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useT } from "@/components/app/i18n-provider";
import { apiClient } from "@/lib/api-client";
import { ActionDialog, Field, TextareaField } from "./_shared/action-dialog";

interface BuildingSummary {
  id: string;
  name: string;
  address: string;
  city: string;
  municipality: string | null;
  postalCode: string | null;
  legalName: string | null;
  registrationNumber: string | null;
  taxNumber: string | null;
  paymentAccountNumber: string | null;
  paymentBankName: string | null;
  cadastralLot: string | null;
  cadastralMunicipality: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  storeyCount: number | null;
  notes: string | null;
}

export function EditBuildingDialog({ building }: { building: BuildingSummary }) {
  const t = useT();
  const [values, setValues] = useState({
    name: building.name,
    address: building.address,
    city: building.city,
    municipality: building.municipality ?? "",
    postalCode: building.postalCode ?? "",
    legalName: building.legalName ?? "",
    registrationNumber: building.registrationNumber ?? "",
    taxNumber: building.taxNumber ?? "",
    paymentAccountNumber: building.paymentAccountNumber ?? "",
    paymentBankName: building.paymentBankName ?? "",
    cadastralLot: building.cadastralLot ?? "",
    cadastralMunicipality: building.cadastralMunicipality ?? "",
    contactEmail: building.contactEmail ?? "",
    contactPhone: building.contactPhone ?? "",
    storeyCount: building.storeyCount != null ? String(building.storeyCount) : "",
    notes: building.notes ?? "",
  });

  function set<K extends keyof typeof values>(key: K, value: string) {
    setValues((p) => ({ ...p, [key]: value }));
  }

  return (
    <ActionDialog
      trigger={<Button variant="outline">{t("manager.actions.edit")}</Button>}
      title={t("manager.actions.editInfo")}
      submitLabel={t("common.save")}
      onSubmit={async () => {
        const payload: Record<string, unknown> = {
          name: values.name.trim(),
          address: values.address.trim(),
          city: values.city.trim(),
          municipality: values.municipality.trim() || null,
          postalCode: values.postalCode.trim() || null,
          legalName: values.legalName.trim() || null,
          registrationNumber: values.registrationNumber.trim() || null,
          taxNumber: values.taxNumber.trim() || null,
          paymentAccountNumber: values.paymentAccountNumber.trim() || null,
          paymentBankName: values.paymentBankName.trim() || null,
          cadastralLot: values.cadastralLot.trim() || null,
          cadastralMunicipality: values.cadastralMunicipality.trim() || null,
          contactEmail: values.contactEmail.trim() || null,
          contactPhone: values.contactPhone.trim() || null,
          notes: values.notes.trim() || null,
        };
        const n = Number(values.storeyCount);
        if (values.storeyCount.trim() && Number.isFinite(n)) {
          payload.storeyCount = Math.round(n);
        } else if (!values.storeyCount.trim()) {
          payload.storeyCount = null;
        }
        await apiClient.patch(`/manager/buildings/${building.id}`, payload);
      }}
    >
      {() => (
        <div className="max-h-[60vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field
              label={t("manager.building.fields.name")}
              id="eb-name"
              value={values.name}
              required
              onChange={(v) => set("name", v)}
            />
            <Field
              label={t("manager.building.fields.city")}
              id="eb-city"
              value={values.city}
              required
              onChange={(v) => set("city", v)}
            />
            <Field
              label={t("manager.building.fields.address")}
              id="eb-addr"
              value={values.address}
              required
              onChange={(v) => set("address", v)}
            />
            <Field
              label={t("manager.building.fields.postalCode")}
              id="eb-postal"
              value={values.postalCode}
              onChange={(v) => set("postalCode", v)}
            />
            <Field
              label={t("manager.building.fields.municipality")}
              id="eb-mun"
              value={values.municipality}
              onChange={(v) => set("municipality", v)}
            />
            <Field
              label={t("manager.building.fields.storeyCount")}
              id="eb-storey"
              type="number"
              value={values.storeyCount}
              onChange={(v) => set("storeyCount", v)}
            />
            <Field
              label={t("manager.building.fields.legalName")}
              id="eb-legal"
              value={values.legalName}
              onChange={(v) => set("legalName", v)}
            />
            <Field
              label={t("manager.building.fields.registrationNumber")}
              id="eb-mb"
              value={values.registrationNumber}
              onChange={(v) => set("registrationNumber", v)}
            />
            <Field
              label={t("manager.building.fields.taxNumber")}
              id="eb-pib"
              value={values.taxNumber}
              onChange={(v) => set("taxNumber", v)}
            />
            <Field
              label={t("manager.building.fields.paymentAccountNumber")}
              id="eb-acct"
              value={values.paymentAccountNumber}
              onChange={(v) => set("paymentAccountNumber", v)}
            />
            <Field
              label={t("manager.building.fields.paymentBankName")}
              id="eb-bank"
              value={values.paymentBankName}
              onChange={(v) => set("paymentBankName", v)}
            />
            <Field
              label={t("manager.building.fields.cadastralLot")}
              id="eb-plot"
              value={values.cadastralLot}
              onChange={(v) => set("cadastralLot", v)}
            />
            <Field
              label={t("manager.building.fields.cadastralMunicipality")}
              id="eb-ko"
              value={values.cadastralMunicipality}
              onChange={(v) => set("cadastralMunicipality", v)}
            />
            <Field
              label={t("manager.building.fields.contactEmail")}
              id="eb-email"
              type="email"
              value={values.contactEmail}
              onChange={(v) => set("contactEmail", v)}
            />
            <Field
              label={t("manager.building.fields.contactPhone")}
              id="eb-phone"
              value={values.contactPhone}
              onChange={(v) => set("contactPhone", v)}
            />
          </div>
          <div className="mt-3">
            <TextareaField
              label={t("manager.building.fields.notes")}
              id="eb-notes"
              value={values.notes}
              onChange={(v) => set("notes", v)}
            />
          </div>
        </div>
      )}
    </ActionDialog>
  );
}

export function ArchiveBuildingButton({
  buildingId,
  archived,
}: {
  buildingId: string;
  archived: boolean;
}) {
  const t = useT();
  const [reason, setReason] = useState("");
  if (archived) {
    return (
      <ActionDialog
        trigger={<Button variant="outline">{t("manager.actions.restore")}</Button>}
        title={t("manager.building.restoreTitle")}
        submitLabel={t("common.yes")}
        onSubmit={async () => {
          await apiClient.post(`/manager/buildings/${buildingId}/restore`);
        }}
      >
        {() => <p className="text-sm">{t("manager.building.restoreTitle")}?</p>}
      </ActionDialog>
    );
  }
  return (
    <ActionDialog
      trigger={<Button variant="outline">{t("manager.actions.archive")}</Button>}
      title={t("manager.building.archiveTitle")}
      description={t("manager.building.archiveConfirm")}
      submitLabel={t("manager.actions.archive")}
      submitVariant="destructive"
      onSubmit={async () => {
        await apiClient.post(`/manager/buildings/${buildingId}/archive`, {
          reason: reason.trim() || null,
        });
      }}
    >
      {() => (
        <Field
          label={t("manager.building.fields.notes")}
          id="arch-reason"
          value={reason}
          onChange={setReason}
        />
      )}
    </ActionDialog>
  );
}
