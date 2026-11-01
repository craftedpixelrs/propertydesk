"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, type ReactNode, useState } from "react";
import { X } from "lucide-react";
import type { MaintenancePriority, MaintenanceStatus } from "@prisma/client";

import { PermissionGuard } from "@/components/app/permission-guard";
import { useI18n } from "@/components/app/i18n-provider";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { ApiClientError, apiClient } from "@/lib/api-client";
import { formatDateTime } from "@/lib/formatters";
import { ActionDialog, Field, SelectField, TextareaField } from "./_shared/action-dialog";

const PIPELINE: MaintenanceStatus[] = [
  "OPEN",
  "TRIAGED",
  "IN_PROGRESS",
  "AWAITING_PARTS",
  "COMPLETED",
];

const STATUSES: MaintenanceStatus[] = [...PIPELINE, "CANCELED"];

const PRIORITY_TONE: Record<MaintenancePriority, string> = {
  LOW: "bg-slate-100 text-slate-700",
  NORMAL: "bg-sky-100 text-sky-700",
  HIGH: "bg-amber-100 text-amber-700",
  URGENT: "bg-red-100 text-red-700",
};

export interface TicketDrawerData {
  id: string;
  code: string;
  title: string;
  description: string | null;
  status: MaintenanceStatus;
  priority: MaintenancePriority;
  category:
    | "PLUMBING"
    | "ELECTRICAL"
    | "HEATING"
    | "ELEVATOR"
    | "COMMON_AREAS"
    | "ROOF"
    | "FACADE"
    | "SECURITY"
    | "CLEANING"
    | "OTHER";
  buildingId: string;
  buildingName: string;
  unitId: string | null;
  unitCode: string | null;
  entranceCode: string | null;
  floor: string | null;
  reporterName: string | null;
  reporterKind: "resident" | "staff" | "none";
  reporterEmail: string | null;
  reporterPhone: string | null;
  assigneeName: string | null;
  supplierId: string | null;
  supplierName: string | null;
  notices: Array<{ id: string; title: string }>;
  openedAt: string;
  closedAt: string | null;
  history: Array<{
    id: string;
    fromStatus: MaintenanceStatus | null;
    toStatus: MaintenanceStatus;
    note: string | null;
    at: string;
    actorName: string | null;
  }>;
  workEntries: Array<{
    id: string;
    body: string;
    visibleToResident: boolean;
    at: string;
    actorName: string | null;
  }>;
}

export function useOpenTicket() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return (ticketId: string) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set("ticket", ticketId);
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
  };
}

export function OpenTicketButton({
  ticketId,
  className,
  children,
}: {
  ticketId: string;
  className?: string;
  children: ReactNode;
}) {
  const open = useOpenTicket();
  return (
    <button type="button" onClick={() => open(ticketId)} className={className}>
      {children}
    </button>
  );
}

/**
 * Side panel over the ticket list and board. The list stays put; `?ticket=`
 * keeps filters and lets the back button close the panel. Photos, the full
 * work log and payouts stay on the dossier page.
 */
export function TicketDrawer({
  ticket,
  suppliers,
}: {
  ticket: TicketDrawerData | null;
  suppliers: Array<{ id: string; name: string }>;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function close() {
    const next = new URLSearchParams(searchParams.toString());
    next.delete("ticket");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <Drawer
      direction="right"
      open={ticket != null}
      onOpenChange={(next) => {
        if (!next) close();
      }}
      shouldScaleBackground={false}
    >
      <DrawerContent side="right" className="md:max-w-xl">
        {ticket ? (
          <>
            <DrawerHeader className="flex shrink-0 flex-row items-start justify-between gap-3 border-b border-[var(--color-border)] p-4 pr-3">
              <div className="min-w-0 space-y-1">
                <div className="font-mono text-xs text-[var(--color-foreground-muted)]">
                  {ticket.code}
                </div>
                <DrawerTitle className="truncate">{ticket.title}</DrawerTitle>
                <DrawerDescription>{t("manager.ticket.panelHint")}</DrawerDescription>
              </div>
              <DrawerClose asChild>
                <Button variant="ghost" size="icon" aria-label={t("common.close")}>
                  <X className="size-5" />
                </Button>
              </DrawerClose>
            </DrawerHeader>
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4">
              <StatusRail ticket={ticket} />
              <Facts ticket={ticket} />
              <section className="space-y-1">
                <h3 className="text-sm font-medium">{t("manager.ticket.descriptionField")}</h3>
                <p className="text-sm whitespace-pre-wrap text-[var(--color-foreground)]">
                  {ticket.description?.trim() || "—"}
                </p>
              </section>
              <History ticket={ticket} />
              <Work ticket={ticket} />
              <Notices ticket={ticket} />
              <PermissionGuard permission="ticket.manage">
                <TicketStatusForm
                  key={`${ticket.id}:${ticket.status}`}
                  ticketId={ticket.id}
                  current={ticket.status}
                  suppliers={suppliers}
                />
              </PermissionGuard>
            </div>
            <div className="flex shrink-0 items-center justify-end border-t border-[var(--color-border)] px-4 py-3">
              <Link
                href={`/zgrade/kvarovi/${ticket.id}`}
                className="text-sm text-[var(--color-brand-700)] hover:underline"
              >
                {t("manager.ticket.openDossier")}
              </Link>
            </div>
          </>
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}

function StatusRail({ ticket }: { ticket: TicketDrawerData }) {
  const { t } = useI18n();
  const reached = new Set(ticket.history.map((row) => row.toStatus));
  reached.add(ticket.status);
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-medium">{t("manager.ticket.statusRail")}</h3>
      {ticket.status === "CANCELED" ? (
        <p className="rounded-md bg-neutral-200 px-3 py-2 text-sm text-neutral-800">
          {t("manager.ticket.canceledBanner")}
        </p>
      ) : null}
      <ol className="flex flex-wrap gap-1.5">
        {PIPELINE.map((status) => {
          const current = status === ticket.status;
          const been = reached.has(status);
          return (
            <li
              key={status}
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                current
                  ? "bg-[var(--color-brand-700)] text-white"
                  : been
                    ? "bg-[var(--color-surface-inset)] text-[var(--color-foreground)]"
                    : "border border-[var(--color-border)] text-[var(--color-foreground-muted)]"
              }`}
            >
              {t(`manager.tickets.status.${status}`)}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function Facts({ ticket }: { ticket: TicketDrawerData }) {
  const { t, locale } = useI18n();
  const reporter =
    ticket.reporterKind === "none"
      ? "—"
      : `${ticket.reporterName ?? "—"} · ${
          ticket.reporterKind === "resident"
            ? t("manager.ticket.reporterResident")
            : t("manager.ticket.reporterStaff")
        }`;
  const place = [
    ticket.buildingName,
    ticket.unitCode ?? t("manager.ticket.noUnit"),
    ticket.entranceCode ? `${t("manager.ticket.entranceField")} ${ticket.entranceCode}` : null,
    ticket.floor ? `${t("manager.ticket.floorField")} ${ticket.floor}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <section className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_TONE[ticket.priority]}`}
        >
          {t(`manager.tickets.priority.${ticket.priority}`)}
        </span>
        <span className="inline-flex rounded-full bg-[var(--color-surface-inset)] px-2 py-0.5 text-xs">
          {t(`manager.ticket.categories.${ticket.category}`)}
        </span>
      </div>
      <Fact
        label={t("manager.ticket.locationTitle")}
        value={place}
        href={
          ticket.unitId
            ? `/zgrade/${ticket.buildingId}/delovi/${ticket.unitId}`
            : `/zgrade/${ticket.buildingId}`
        }
      />
      <Fact label={t("manager.ticket.reporterField")} value={reporter} />
      {ticket.reporterEmail ? (
        <Fact label={t("manager.building.fields.contactEmail")} value={ticket.reporterEmail} />
      ) : null}
      {ticket.reporterPhone ? (
        <Fact label={t("manager.building.fields.contactPhone")} value={ticket.reporterPhone} />
      ) : null}
      <Fact
        label={t("manager.ticket.assigneeField")}
        value={ticket.assigneeName ?? `— ${t("manager.ticket.noAssignee")} —`}
      />
      <Fact
        label={t("manager.ticket.supplierField")}
        value={ticket.supplierName ?? "—"}
        href={ticket.supplierId ? "/zgrade/izvodjaci" : undefined}
      />
      <Fact
        label={t("manager.ticket.openedAt")}
        value={formatDateTime(ticket.openedAt, undefined, locale)}
      />
      {ticket.closedAt ? (
        <Fact
          label={t("manager.ticket.closedAt")}
          value={formatDateTime(ticket.closedAt, undefined, locale)}
        />
      ) : null}
    </section>
  );
}

function History({ ticket }: { ticket: TicketDrawerData }) {
  const { t, locale } = useI18n();
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-medium">{t("manager.ticket.statusHistory")}</h3>
      {ticket.history.length === 0 ? (
        <p className="text-sm text-[var(--color-foreground-muted)]">—</p>
      ) : (
        <ul className="space-y-2">
          {ticket.history.map((row) => (
            <li key={row.id} className="border-b border-[var(--color-border)] pb-2 text-sm">
              <div className="flex items-start justify-between gap-2 text-xs text-[var(--color-foreground-muted)]">
                <span>
                  {row.fromStatus ? `${t(`manager.tickets.status.${row.fromStatus}`)} → ` : ""}
                  {t(`manager.tickets.status.${row.toStatus}`)}
                  {row.actorName ? ` · ${row.actorName}` : ""}
                </span>
                <span className="shrink-0">{formatDateTime(row.at, undefined, locale)}</span>
              </div>
              {row.note ? <p className="mt-1 whitespace-pre-wrap">{row.note}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Work({ ticket }: { ticket: TicketDrawerData }) {
  const { t, locale } = useI18n();
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-medium">{t("manager.ticket.workLogTitle")}</h3>
      {ticket.workEntries.length === 0 ? (
        <p className="text-sm text-[var(--color-foreground-muted)]">
          {t("manager.ticket.workLogEmpty")}
        </p>
      ) : (
        <ul className="space-y-2">
          {ticket.workEntries.map((row) => (
            <li key={row.id} className="border-b border-[var(--color-border)] pb-2 text-sm">
              <div className="flex items-start justify-between gap-2 text-xs text-[var(--color-foreground-muted)]">
                <span>
                  {formatDateTime(row.at, undefined, locale)}
                  {row.actorName ? ` · ${row.actorName}` : ""}
                </span>
                <span>
                  {row.visibleToResident
                    ? t("manager.ticket.workLogVisible")
                    : t("manager.ticket.workLogInternal")}
                </span>
              </div>
              <p className="mt-1 whitespace-pre-wrap">{row.body}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Notices({ ticket }: { ticket: TicketDrawerData }) {
  const { t } = useI18n();
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium">{t("manager.ticket.linkedNotices")}</h3>
        <TicketNoticeButton ticket={ticket} />
      </div>
      {ticket.notices.length === 0 ? (
        <p className="text-sm text-[var(--color-foreground-muted)]">
          {t("manager.ticket.noLinkedNotices")}
        </p>
      ) : (
        <ul className="space-y-1 text-sm">
          {ticket.notices.map((notice) => (
            <li key={notice.id}>
              <Link
                href={`/zgrade/obavestenja/${notice.id}`}
                className="text-[var(--color-brand-700)] hover:underline"
              >
                {notice.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function TicketNoticeButton({ ticket }: { ticket: TicketDrawerData }) {
  const { t } = useI18n();
  const [title, setTitle] = useState(`${ticket.code}: ${ticket.title}`);
  const [body, setBody] = useState("");
  const commonArea = !ticket.unitId;

  return (
    <PermissionGuard permission="notice.manage">
      <ActionDialog
        trigger={
          <Button type="button" variant="outline" size="sm">
            {t("manager.ticket.writeNotice")}
          </Button>
        }
        title={t("manager.ticket.writeNotice")}
        description={t("manager.ticket.writeNoticeHint")}
        submitLabel={t("common.save")}
        onSubmit={async () => {
          const trimmedTitle = title.trim();
          const trimmedBody = body.trim();
          if (trimmedTitle.length < 2 || trimmedBody.length < 2) {
            throw new Error(t("manager.ticket.writeNoticeRequired"));
          }
          await apiClient.post("/manager/notices", {
            buildingId: ticket.buildingId,
            title: trimmedTitle,
            body: trimmedBody,
            channel: commonArea ? "PORTAL_AND_EMAIL" : "PORTAL_ONLY",
            audience: commonArea ? "ALL" : "SPECIFIC_UNITS",
            audienceParams: ticket.unitId ? { unitIds: [ticket.unitId] } : {},
            ticketId: ticket.id,
            publishNow: true,
          });
          setBody("");
        }}
      >
        {() => (
          <>
            <Field
              id="ticket-notice-title"
              label={t("manager.notices.titleField")}
              value={title}
              onChange={setTitle}
              required
            />
            <TextareaField
              id="ticket-notice-body"
              label={t("manager.notices.bodyField")}
              value={body}
              onChange={setBody}
              required
            />
          </>
        )}
      </ActionDialog>
    </PermissionGuard>
  );
}

function Fact({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="shrink-0 text-[var(--color-foreground-muted)]">{label}</span>
      {href ? (
        <Link href={href} className="text-right text-[var(--color-brand-700)] hover:underline">
          {value}
        </Link>
      ) : (
        <span className="text-right">{value}</span>
      )}
    </div>
  );
}

function TicketStatusForm({
  ticketId,
  current,
  suppliers,
}: {
  ticketId: string;
  current: MaintenanceStatus;
  suppliers: Array<{ id: string; name: string }>;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [status, setStatus] = useState<MaintenanceStatus>(current);
  const [note, setNote] = useState("");
  const [actualCost, setActualCost] = useState("");
  const [fund, setFund] = useState<"" | "CURRENT_MAINTENANCE" | "INVESTMENT_FUND" | "OTHER">("");
  const [supplierId, setSupplierId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (status === current) return;
    setPending(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        status,
        statusNote: note.trim() || null,
      };
      if (supplierId) payload.supplierId = supplierId;
      if (actualCost.trim()) payload.actualCost = Number(actualCost);
      if (fund) payload.fund = fund;
      await apiClient.patch(`/manager/tickets/${ticketId}`, payload);
      setNote("");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message || t("common.unexpectedError")
          : err instanceof Error
            ? err.message
            : t("common.unexpectedError"),
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 border-t border-[var(--color-border)] pt-4">
      <h3 className="text-sm font-medium">{t("manager.actions.changeStatus")}</h3>
      <SelectField
        label={t("manager.tickets.columns.status")}
        id={`drawer-status-${ticketId}`}
        value={status}
        options={STATUSES.map((item) => ({
          value: item,
          label: t(`manager.tickets.status.${item}`),
        }))}
        onChange={(value) => {
          if (value) setStatus(value);
        }}
      />
      {status === "COMPLETED" ? (
        <div className="grid grid-cols-2 gap-3">
          <Field
            label={t("manager.ticket.actualCostField")}
            id={`drawer-cost-${ticketId}`}
            type="number"
            value={actualCost}
            onChange={setActualCost}
          />
          <SelectField
            label={t("manager.ticket.fundField")}
            id={`drawer-fund-${ticketId}`}
            value={fund}
            options={[
              { value: "", label: "—" },
              ...(["CURRENT_MAINTENANCE", "INVESTMENT_FUND", "OTHER"] as const).map((item) => ({
                value: item,
                label: t(`manager.expenseFund.${item}`),
              })),
            ]}
            onChange={setFund}
          />
        </div>
      ) : null}
      <SelectField
        label={t("manager.ticket.supplierField")}
        id={`drawer-supplier-${ticketId}`}
        value={supplierId}
        options={[
          { value: "", label: "—" },
          ...suppliers.map((supplier) => ({ value: supplier.id, label: supplier.name })),
        ]}
        onChange={setSupplierId}
      />
      <TextareaField
        label={t("manager.payments.notesField")}
        id={`drawer-note-${ticketId}`}
        value={note}
        rows={3}
        onChange={setNote}
      />
      <p className="text-xs text-[var(--color-foreground-muted)]">
        {t("manager.ticket.statusNoteHint")}
      </p>
      {error ? (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending || status === current}>
        {pending ? t("common.saving") : t("manager.ticket.applyStatus")}
      </Button>
    </form>
  );
}
