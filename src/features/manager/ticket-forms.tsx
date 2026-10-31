"use client";

import { useState } from "react";
import type { MaintenanceCategory, MaintenancePriority, MaintenanceStatus } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { useT } from "@/components/app/i18n-provider";
import { apiClient } from "@/lib/api-client";
import { ActionDialog, Field, SelectField, TextareaField } from "./_shared/action-dialog";

const CATEGORIES: MaintenanceCategory[] = [
  "PLUMBING",
  "ELECTRICAL",
  "HEATING",
  "ELEVATOR",
  "COMMON_AREAS",
  "ROOF",
  "FACADE",
  "SECURITY",
  "CLEANING",
  "OTHER",
];

const CATEGORY_LABEL_SR: Record<MaintenanceCategory, string> = {
  PLUMBING: "Vodovod",
  ELECTRICAL: "Struja",
  HEATING: "Grejanje",
  ELEVATOR: "Lift",
  COMMON_AREAS: "Zajednički prostori",
  ROOF: "Krov",
  FACADE: "Fasada",
  SECURITY: "Obezbeđenje",
  CLEANING: "Čišćenje",
  OTHER: "Ostalo",
};

const PRIORITIES: MaintenancePriority[] = ["LOW", "NORMAL", "HIGH", "URGENT"];
const STATUSES: MaintenanceStatus[] = [
  "OPEN",
  "TRIAGED",
  "IN_PROGRESS",
  "AWAITING_PARTS",
  "COMPLETED",
  "CANCELED",
];

export function NewTicketDialog({
  buildings,
  units,
  suppliers,
  defaultBuildingId,
}: {
  buildings: Array<{ id: string; name: string }>;
  units: Array<{ id: string; code: string; buildingId: string }>;
  suppliers: Array<{ id: string; name: string }>;
  defaultBuildingId?: string;
}) {
  const t = useT();
  const [buildingId, setBuildingId] = useState(defaultBuildingId ?? buildings[0]?.id ?? "");
  const [unitId, setUnitId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<MaintenanceCategory>("OTHER");
  const [priority, setPriority] = useState<MaintenancePriority>("NORMAL");
  const [supplierId, setSupplierId] = useState("");
  const [estimatedCost, setEstimatedCost] = useState("");

  const unitsForBuilding = units.filter((u) => u.buildingId === buildingId);

  return (
    <ActionDialog
      trigger={<Button>{t("manager.actions.newTicket")}</Button>}
      title={t("manager.actions.newTicket")}
      submitLabel={t("common.save")}
      onSubmit={async () => {
        await apiClient.post("/manager/tickets", {
          buildingId,
          unitId: unitId || null,
          title: title.trim(),
          description: description.trim() || null,
          category,
          priority,
          supplierId: supplierId || null,
          estimatedCost: estimatedCost.trim() ? Number(estimatedCost) : null,
        });
      }}
    >
      {() => (
        <>
          <div className="grid grid-cols-2 gap-3">
            <SelectField
              label={t("manager.tickets.columns.building")}
              id="nt-building"
              value={buildingId}
              options={buildings.map((b) => ({ value: b.id, label: b.name }))}
              onChange={(v) => {
                if (v) {
                  setBuildingId(v);
                  setUnitId("");
                }
              }}
            />
            <SelectField
              label={t("manager.tickets.columns.unit")}
              id="nt-unit"
              value={unitId}
              options={[
                { value: "", label: `— ${t("manager.ticket.noUnit")} —` },
                ...unitsForBuilding.map((u) => ({ value: u.id, label: u.code })),
              ]}
              onChange={setUnitId}
            />
          </div>
          <Field
            label={t("manager.tickets.columns.title")}
            id="nt-title"
            value={title}
            required
            onChange={setTitle}
          />
          <TextareaField
            label={t("manager.ticket.descriptionField")}
            id="nt-desc"
            value={description}
            onChange={setDescription}
          />
          <div className="grid grid-cols-2 gap-3">
            <SelectField
              label={t("manager.ticket.categoryField")}
              id="nt-cat"
              value={category}
              options={CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABEL_SR[c] }))}
              onChange={(v) => v && setCategory(v)}
            />
            <SelectField
              label={t("manager.ticket.priorityField")}
              id="nt-prio"
              value={priority}
              options={PRIORITIES.map((p) => ({
                value: p,
                label: t(`manager.tickets.priority.${p}` as const),
              }))}
              onChange={(v) => v && setPriority(v)}
            />
            <SelectField
              label={t("manager.ticket.supplierField")}
              id="nt-sup"
              value={supplierId}
              options={[
                { value: "", label: "—" },
                ...suppliers.map((s) => ({ value: s.id, label: s.name })),
              ]}
              onChange={setSupplierId}
            />
            <Field
              label={t("manager.ticket.estimatedCostField")}
              id="nt-ec"
              type="number"
              value={estimatedCost}
              onChange={setEstimatedCost}
            />
          </div>
        </>
      )}
    </ActionDialog>
  );
}

export function ChangeTicketStatusDialog({
  ticketId,
  currentStatus,
  suppliers,
}: {
  ticketId: string;
  currentStatus: MaintenanceStatus;
  suppliers: Array<{ id: string; name: string }>;
}) {
  const t = useT();
  const [status, setStatus] = useState<MaintenanceStatus>(currentStatus);
  const [note, setNote] = useState("");
  const [actualCost, setActualCost] = useState("");
  const [fund, setFund] = useState<"CURRENT_MAINTENANCE" | "INVESTMENT_FUND" | "OTHER" | "">("");
  const [supplierId, setSupplierId] = useState("");

  const requiresCost = status === "COMPLETED";

  return (
    <ActionDialog
      trigger={<Button>{t("manager.actions.changeStatus")}</Button>}
      title={t("manager.actions.changeStatus")}
      submitLabel={t("common.save")}
      onSubmit={async () => {
        const payload: Record<string, unknown> = {
          status,
          statusNote: note.trim() || null,
          supplierId: supplierId || null,
        };
        if (actualCost.trim()) payload.actualCost = Number(actualCost);
        if (fund) payload.fund = fund;
        await apiClient.patch(`/manager/tickets/${ticketId}`, payload);
      }}
    >
      {() => (
        <>
          <SelectField
            label={t("manager.tickets.columns.status")}
            id="ts-status"
            value={status}
            options={STATUSES.map((s) => ({
              value: s,
              label: t(`manager.tickets.status.${s}` as const),
            }))}
            onChange={(v) => v && setStatus(v)}
          />
          <SelectField
            label={t("manager.ticket.supplierField")}
            id="ts-supplier"
            value={supplierId}
            options={[
              { value: "", label: "—" },
              ...suppliers.map((s) => ({ value: s.id, label: s.name })),
            ]}
            onChange={setSupplierId}
          />
          {requiresCost ? (
            <div className="grid grid-cols-2 gap-3">
              <Field
                label={t("manager.ticket.actualCostField")}
                id="ts-ac"
                type="number"
                value={actualCost}
                onChange={setActualCost}
              />
              <SelectField
                label={t("manager.ticket.fundField")}
                id="ts-fund"
                value={fund}
                options={[
                  { value: "", label: "—" },
                  ...(["CURRENT_MAINTENANCE", "INVESTMENT_FUND", "OTHER"] as const).map((f) => ({
                    value: f,
                    label: t(`manager.expenseFund.${f}` as const),
                  })),
                ]}
                onChange={setFund}
              />
            </div>
          ) : null}
          <TextareaField
            label={t("manager.payments.notesField")}
            id="ts-note"
            value={note}
            onChange={setNote}
          />
        </>
      )}
    </ActionDialog>
  );
}

export function EditTicketDialog({
  ticket,
  assignees,
  suppliers,
}: {
  ticket: {
    id: string;
    title: string;
    description: string | null;
    category: MaintenanceCategory;
    priority: MaintenancePriority;
    assignedToUserId: string | null;
    supplierId: string | null;
    estimatedCost: string | null;
    actualCost: string | null;
    fund: "CURRENT_MAINTENANCE" | "INVESTMENT_FUND" | "OTHER" | null;
  };
  assignees: Array<{ id: string; name: string }>;
  suppliers: Array<{ id: string; name: string }>;
}) {
  const t = useT();
  const [title, setTitle] = useState(ticket.title);
  const [description, setDescription] = useState(ticket.description ?? "");
  const [category, setCategory] = useState<MaintenanceCategory>(ticket.category);
  const [priority, setPriority] = useState<MaintenancePriority>(ticket.priority);
  const [assignedToUserId, setAssignedToUserId] = useState(ticket.assignedToUserId ?? "");
  const [supplierId, setSupplierId] = useState(ticket.supplierId ?? "");
  const [estimatedCost, setEstimatedCost] = useState(ticket.estimatedCost ?? "");

  return (
    <ActionDialog
      trigger={<Button variant="outline">{t("manager.actions.edit")}</Button>}
      title={t("manager.actions.edit")}
      submitLabel={t("common.save")}
      onSubmit={async () => {
        await apiClient.patch(`/manager/tickets/${ticket.id}`, {
          title: title.trim(),
          description: description.trim() || null,
          category,
          priority,
          assignedToUserId: assignedToUserId || null,
          supplierId: supplierId || null,
          estimatedCost: estimatedCost.toString().trim() ? Number(estimatedCost) : null,
        });
      }}
    >
      {() => (
        <>
          <Field
            label={t("manager.tickets.columns.title")}
            id="et-title"
            value={title}
            required
            onChange={setTitle}
          />
          <TextareaField
            label={t("manager.ticket.descriptionField")}
            id="et-desc"
            value={description}
            onChange={setDescription}
          />
          <div className="grid grid-cols-2 gap-3">
            <SelectField
              label={t("manager.ticket.categoryField")}
              id="et-cat"
              value={category}
              options={CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABEL_SR[c] }))}
              onChange={(v) => v && setCategory(v)}
            />
            <SelectField
              label={t("manager.ticket.priorityField")}
              id="et-prio"
              value={priority}
              options={PRIORITIES.map((p) => ({
                value: p,
                label: t(`manager.tickets.priority.${p}` as const),
              }))}
              onChange={(v) => v && setPriority(v)}
            />
            <SelectField
              label={t("manager.ticket.assigneeField")}
              id="et-assignee"
              value={assignedToUserId}
              options={[
                { value: "", label: `— ${t("manager.ticket.noAssignee")} —` },
                ...assignees.map((u) => ({ value: u.id, label: u.name })),
              ]}
              onChange={setAssignedToUserId}
            />
            <SelectField
              label={t("manager.ticket.supplierField")}
              id="et-sup"
              value={supplierId}
              options={[
                { value: "", label: "—" },
                ...suppliers.map((s) => ({ value: s.id, label: s.name })),
              ]}
              onChange={setSupplierId}
            />
            <Field
              label={t("manager.ticket.estimatedCostField")}
              id="et-ec"
              type="number"
              value={estimatedCost}
              onChange={setEstimatedCost}
            />
          </div>
        </>
      )}
    </ActionDialog>
  );
}

export function UploadTicketPhotoButton({ ticketId }: { ticketId: string }) {
  const t = useT();
  const [file, setFile] = useState<File | null>(null);
  return (
    <ActionDialog
      trigger={<Button variant="outline">{t("manager.actions.uploadPhoto")}</Button>}
      title={t("manager.actions.uploadPhoto")}
      submitLabel={t("common.save")}
      onSubmit={async () => {
        if (!file) throw new Error("Odaberite fotografiju.");
        const form = new FormData();
        form.append("file", file);
        form.append("category", "TICKET");
        form.append("entityType", "MaintenanceTicket");
        form.append("entityId", ticketId);
        form.append("visibility", "INTERNAL");
        const res = await fetch("/api/v1/documents", {
          method: "POST",
          body: form,
          credentials: "include",
        });
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
          throw new Error(j.error?.message ?? `HTTP ${res.status}`);
        }
      }}
    >
      {() => (
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.currentTarget.files?.[0] ?? null)}
          className="block w-full text-sm"
        />
      )}
    </ActionDialog>
  );
}

export function NewSupplierDialog({ defaultBuildingId }: { defaultBuildingId?: string }) {
  const t = useT();
  const [name, setName] = useState("");
  const [category, setCategory] = useState<MaintenanceCategory | "">("");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [taxNumber, setTaxNumber] = useState("");
  return (
    <ActionDialog
      trigger={<Button>{t("manager.actions.newSupplier")}</Button>}
      title={t("manager.actions.newSupplier")}
      submitLabel={t("common.save")}
      onSubmit={async () => {
        await apiClient.post("/manager/suppliers", {
          name: name.trim(),
          buildingId: defaultBuildingId ?? null,
          category: category || null,
          contactPerson: contactPerson.trim() || null,
          phone: phone.trim() || null,
          email: email.trim() || null,
          taxNumber: taxNumber.trim() || null,
        });
      }}
    >
      {() => (
        <>
          <Field
            label={t("manager.suppliers.columns.name")}
            id="ns-name"
            value={name}
            required
            onChange={setName}
          />
          <div className="grid grid-cols-2 gap-3">
            <SelectField
              label={t("manager.suppliers.columns.category")}
              id="ns-cat"
              value={category}
              options={[
                { value: "", label: "—" },
                ...CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABEL_SR[c] })),
              ]}
              onChange={setCategory}
            />
            <Field
              label={t("manager.suppliers.columns.taxNumber")}
              id="ns-pib"
              value={taxNumber}
              onChange={setTaxNumber}
            />
            <Field
              label="Kontakt osoba"
              id="ns-cp"
              value={contactPerson}
              onChange={setContactPerson}
            />
            <Field
              label={t("manager.building.fields.contactPhone")}
              id="ns-ph"
              value={phone}
              onChange={setPhone}
            />
            <Field
              label={t("manager.building.fields.contactEmail")}
              id="ns-em"
              type="email"
              value={email}
              onChange={setEmail}
            />
          </div>
        </>
      )}
    </ActionDialog>
  );
}

export function EditSupplierDialog({
  supplier,
}: {
  supplier: {
    id: string;
    name: string;
    category: MaintenanceCategory | null;
    contactPerson: string | null;
    phone: string | null;
    email: string | null;
    taxNumber: string | null;
  };
}) {
  const t = useT();
  const [name, setName] = useState(supplier.name);
  const [category, setCategory] = useState<MaintenanceCategory | "">(supplier.category ?? "");
  const [contactPerson, setContactPerson] = useState(supplier.contactPerson ?? "");
  const [phone, setPhone] = useState(supplier.phone ?? "");
  const [email, setEmail] = useState(supplier.email ?? "");
  const [taxNumber, setTaxNumber] = useState(supplier.taxNumber ?? "");
  return (
    <ActionDialog
      trigger={
        <Button variant="ghost" size="sm">
          {t("manager.actions.edit")}
        </Button>
      }
      title={`${t("manager.actions.edit")} · ${supplier.name}`}
      submitLabel={t("common.save")}
      onSubmit={async () => {
        await apiClient.patch(`/manager/suppliers/${supplier.id}`, {
          name: name.trim(),
          category: category || null,
          contactPerson: contactPerson.trim() || null,
          phone: phone.trim() || null,
          email: email.trim() || null,
          taxNumber: taxNumber.trim() || null,
        });
      }}
    >
      {() => (
        <>
          <Field
            label={t("manager.suppliers.columns.name")}
            id="es-name"
            value={name}
            required
            onChange={setName}
          />
          <div className="grid grid-cols-2 gap-3">
            <SelectField
              label={t("manager.suppliers.columns.category")}
              id="es-cat"
              value={category}
              options={[
                { value: "", label: "—" },
                ...CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABEL_SR[c] })),
              ]}
              onChange={setCategory}
            />
            <Field
              label={t("manager.suppliers.columns.taxNumber")}
              id="es-pib"
              value={taxNumber}
              onChange={setTaxNumber}
            />
            <Field
              label="Kontakt osoba"
              id="es-cp"
              value={contactPerson}
              onChange={setContactPerson}
            />
            <Field
              label={t("manager.building.fields.contactPhone")}
              id="es-ph"
              value={phone}
              onChange={setPhone}
            />
            <Field
              label={t("manager.building.fields.contactEmail")}
              id="es-em"
              type="email"
              value={email}
              onChange={setEmail}
            />
          </div>
        </>
      )}
    </ActionDialog>
  );
}

export function AddWorkEntryDialog({ ticketId }: { ticketId: string }) {
  const t = useT();
  const [body, setBody] = useState("");
  const [visible, setVisible] = useState(true);

  return (
    <ActionDialog
      trigger={<Button variant="outline">{t("manager.ticket.workLogAdd")}</Button>}
      title={t("manager.ticket.workLogAdd")}
      description={t("manager.ticket.workLogHint")}
      submitLabel={t("common.save")}
      onSubmit={async () => {
        await apiClient.post(`/manager/tickets/${ticketId}/entries`, {
          body: body.trim(),
          visibleToResident: visible,
        });
        setBody("");
        setVisible(true);
      }}
    >
      {() => (
        <>
          <TextareaField
            label={t("manager.ticket.workLogBody")}
            id="we-body"
            required
            value={body}
            onChange={setBody}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={visible}
              onChange={(event) => setVisible(event.currentTarget.checked)}
            />
            {t("manager.ticket.workLogVisible")}
          </label>
        </>
      )}
    </ActionDialog>
  );
}
