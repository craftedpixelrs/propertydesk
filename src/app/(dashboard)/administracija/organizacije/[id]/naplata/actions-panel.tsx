"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT } from "@/components/app/i18n-provider";
import type { TranslateFn, TranslationKey } from "@/lib/i18n";

interface Plan {
  id: string;
  code: string;
  name: string;
}

export interface SubscriptionActionsPanelProps {
  subscriptionId: string;
  currentStatus: string;
  currentPlanCode: string;
  currentCycle: string;
  plans: Plan[];
  canIssueInvoice: boolean;
}

const CYCLES = ["MONTHLY", "QUARTERLY", "SEMI_ANNUAL", "ANNUAL"] as const;

function cycleLabel(cycle: string, t: TranslateFn) {
  const key = `billing.cycle.${cycle}` as TranslationKey;
  const out = t(key);
  return out === key ? cycle : out;
}

/**
 * Manual admin actions on an OrganizationSubscription. Every mutation
 * requires a `reason` string which is written to the audit log.
 */
export function SubscriptionActionsPanel(props: SubscriptionActionsPanelProps) {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function post(action: string, body: Record<string, unknown>) {
    setBusy(true);
    try {
      const res = await fetch(
        `/api/v1/billing/subscriptions/${props.subscriptionId}/${action}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(
          t("admin.orgBilling.errorPrefix", {
            message: j?.error?.message ?? res.statusText,
          }),
        );
      } else {
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("admin.orgBilling.actionsTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-3">
          <Button
            disabled={busy || props.currentStatus === "ACTIVE"}
            onClick={() => {
              const reason = prompt(t("admin.orgBilling.reasonActivate"));
              if (reason) post("activate", { reason });
            }}
          >
            {t("admin.orgBilling.activate")}
          </Button>
          <Button
            disabled={busy || props.currentStatus === "SUSPENDED"}
            variant="secondary"
            onClick={() => {
              const reason = prompt(t("admin.orgBilling.reasonSuspend"));
              if (reason) post("suspend", { reason });
            }}
          >
            {t("admin.orgBilling.suspend")}
          </Button>
          <Button
            disabled={busy || props.currentStatus === "RESTRICTED"}
            variant="secondary"
            onClick={() => {
              const reason = prompt(t("admin.orgBilling.reasonRestrict"));
              if (reason) post("restrict", { reason });
            }}
          >
            {t("admin.orgBilling.restrict")}
          </Button>
          <Button
            disabled={busy}
            variant="secondary"
            onClick={() => {
              const reason = prompt(t("admin.orgBilling.reasonReactivate"));
              if (reason) post("reactivate", { reason });
            }}
          >
            {t("admin.orgBilling.reactivate")}
          </Button>
          <Button
            disabled={busy || props.currentStatus === "CANCELED"}
            variant="secondary"
            onClick={() => {
              const reason = prompt(t("admin.orgBilling.reasonCancel"));
              if (reason) post("cancel", { reason });
            }}
          >
            {t("admin.orgBilling.cancel")}
          </Button>
          <Button
            disabled={busy || !props.canIssueInvoice}
            onClick={() => post("issue-invoice", {})}
            title={
              props.canIssueInvoice
                ? undefined
                : t("admin.orgBilling.issueInvoiceDone")
            }
          >
            {t("admin.orgBilling.issueInvoice")}
          </Button>
        </div>

        <ChangePlanForm plans={props.plans} currentPlanCode={props.currentPlanCode} onSubmit={post} busy={busy} />
        <ChangeCycleForm currentCycle={props.currentCycle} onSubmit={post} busy={busy} />
        <ExtendTrialForm onSubmit={post} busy={busy} />
      </CardContent>
    </Card>
  );
}

function ChangePlanForm({
  plans,
  currentPlanCode,
  onSubmit,
  busy,
}: {
  plans: Plan[];
  currentPlanCode: string;
  onSubmit: (action: string, body: Record<string, unknown>) => void;
  busy: boolean;
}) {
  const t = useT();
  const [planId, setPlanId] = useState(plans[0]?.id ?? "");
  const [reason, setReason] = useState("");
  return (
    <div className="grid gap-2 md:grid-cols-[1fr_2fr_auto]">
      <select
        className="h-10 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
        value={planId}
        onChange={(e) => setPlanId(e.target.value)}
      >
        {plans.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} ({p.code}) {p.code === currentPlanCode ? t("admin.orgBilling.currentPlan") : ""}
          </option>
        ))}
      </select>
      <Input
        placeholder={t("admin.orgBilling.reasonChangePlan")}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      <Button
        disabled={busy || !reason.trim()}
        onClick={() => onSubmit("change-plan", { planId, reason: reason.trim() })}
      >
        {t("admin.orgBilling.changePlan")}
      </Button>
    </div>
  );
}

function ChangeCycleForm({
  currentCycle,
  onSubmit,
  busy,
}: {
  currentCycle: string;
  onSubmit: (action: string, body: Record<string, unknown>) => void;
  busy: boolean;
}) {
  const t = useT();
  const [cycle, setCycle] = useState(currentCycle);
  const [reason, setReason] = useState("");
  return (
    <div className="grid gap-2 md:grid-cols-[1fr_2fr_auto]">
      <select
        className="h-10 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
        value={cycle}
        onChange={(e) => setCycle(e.target.value)}
      >
        {CYCLES.map((c) => (
          <option key={c} value={c}>
            {cycleLabel(c, t)}
          </option>
        ))}
      </select>
      <Input
        placeholder={t("admin.orgBilling.reasonChangeCycle")}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      <Button
        disabled={busy || !reason.trim() || cycle === currentCycle}
        onClick={() => onSubmit("change-cycle", { cycle, reason: reason.trim() })}
      >
        {t("admin.orgBilling.changeCycle")}
      </Button>
    </div>
  );
}

function ExtendTrialForm({
  onSubmit,
  busy,
}: {
  onSubmit: (action: string, body: Record<string, unknown>) => void;
  busy: boolean;
}) {
  const t = useT();
  const [days, setDays] = useState("7");
  const [reason, setReason] = useState("");
  return (
    <div className="grid gap-2 md:grid-cols-[1fr_2fr_auto]">
      <Input
        type="number"
        min="1"
        max="365"
        placeholder={t("admin.orgBilling.daysPlaceholder")}
        value={days}
        onChange={(e) => setDays(e.target.value)}
      />
      <Input
        placeholder={t("admin.orgBilling.reasonExtendTrial")}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      <Button
        disabled={busy || !reason.trim() || Number(days) <= 0}
        onClick={() =>
          onSubmit("extend-trial", { days: Number(days), reason: reason.trim() })
        }
      >
        {t("admin.orgBilling.extendTrial")}
      </Button>
    </div>
  );
}
