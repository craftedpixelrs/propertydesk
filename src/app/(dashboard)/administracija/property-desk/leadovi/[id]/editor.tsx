"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { useT } from "@/components/app/i18n-provider";
import type { TranslateFn, TranslationKey } from "@/lib/i18n";
import { computeLeadScore } from "@/server/services/property-desk/lead-scoring";
import { STAGE_TO_LEVEL } from "@/server/services/property-desk/lead-lifecycle";
import {
  LeadProvisionPanel,
  type ProvisionOrgOption,
  type ProvisionPlanOption,
} from "./provision-panel";

type Stage =
  | "NEW"
  | "CONTACTED"
  | "QUALIFIED"
  | "DEMO"
  | "PROPOSAL"
  | "WON"
  | "LOST"
  | "NURTURING";

type Level = "SOURCING" | "CLOSING" | "OPERATIONS" | "ARCHIVED";
type Priority = "LOW" | "NORMAL" | "HIGH" | "URGENT";
type Temperature = "COLD" | "WARM" | "HOT";
type Timeline = "WITHIN_30D" | "WITHIN_90D" | "LATER" | "UNDECIDED";
type BudgetTier = "STARTER" | "GROWTH" | "ENTERPRISE" | "UNKNOWN";
type ContactChannel = "PHONE" | "EMAIL" | "WHATSAPP" | "VIBER" | "OTHER";

function handoffListHref(stage: Stage): string {
  return `/administracija/property-desk/leadovi?handoff=${stage}`;
}

type BadgeTone =
  | "neutral"
  | "brand"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "violet";

const STAGE_TONE: Record<Stage, BadgeTone> = {
  NEW: "brand",
  CONTACTED: "info",
  QUALIFIED: "success",
  DEMO: "violet",
  PROPOSAL: "warning",
  WON: "success",
  LOST: "danger",
  NURTURING: "neutral",
};

/** Popunjena boja za forward dugmad — LOST je uvek crven, ostalo po fazi. */
const STAGE_ACTION_CLASS: Record<Stage, string> = {
  NEW: "border-transparent bg-[var(--color-brand-600)] text-white hover:bg-[var(--color-brand-700)]",
  CONTACTED:
    "border-transparent bg-[var(--color-info)] text-white hover:opacity-90",
  QUALIFIED:
    "border-transparent bg-[var(--color-success)] text-white hover:opacity-90",
  DEMO: "border-transparent bg-[#7c3aed] text-white hover:bg-[#6d28d9]",
  PROPOSAL:
    "border-transparent bg-[var(--color-warning)] text-white hover:opacity-90",
  WON: "border-transparent bg-[var(--color-success)] text-white hover:opacity-90",
  LOST: "border-transparent bg-[var(--color-danger)] text-white hover:opacity-90",
  NURTURING:
    "border-[var(--color-border-strong)] bg-[var(--color-surface-inset)] text-[var(--color-foreground)] hover:bg-[color-mix(in_oklab,var(--color-surface-inset)_85%,black)]",
};

const LEVEL_TONE: Record<
  Level,
  "neutral" | "brand" | "info" | "success" | "warning" | "danger"
> = {
  SOURCING: "brand",
  CLOSING: "info",
  OPERATIONS: "success",
  ARCHIVED: "neutral",
};

interface Props {
  leadId: string;
  initialStage: Stage;
  initialLevel: Level;
  allowedNextStages: Stage[];
  initialAssignedToUserId: string | null;
  initialNote: string | null;
  initialLostReason: string | null;
  initialConvertedOrganizationId: string | null;
  initialEmail: string;
  initialFirstName: string | null;
  initialLastName: string | null;
  initialPhone: string | null;
  initialCity: string | null;
  initialAudience: "INVESTOR" | "AGENCY" | "OTHER";
  // Classification
  initialPriority: Priority;
  initialTemperature: Temperature;
  initialTimelineHorizon: Timeline;
  initialNextFollowUpAt: string | null;
  initialLeadScore: number;
  // Company
  initialCompanyName: string | null;
  initialCompanyWebsite: string | null;
  initialCompanySize: number | null;
  initialBudgetTier: BudgetTier;
  initialBudgetCurrency: string | null;
  // Decision maker & contact
  initialDecisionMakerName: string | null;
  initialDecisionMakerTitle: string | null;
  initialPreferredContact: ContactChannel | null;
  initialBestContactHour: string | null;
  initialPreferredLanguage: string | null;
  initialCountry: string | null;
  initialRegion: string | null;
  // Qualification
  initialCompetitor: string | null;
  initialPainPoint: string | null;
  teamMembers: Array<{ userId: string; name: string }>;
  organizations: ProvisionOrgOption[];
  plans: ProvisionPlanOption[];
  canConvert: boolean;
  canCreateNewOrg: boolean;
  canReassign: boolean;
  canUpdateStage: boolean;
  canUpdateDetails: boolean;
  canUpdateClassification: boolean;
  canReopen: boolean;
  currentUserId: string;
  visibleLevels: Level[];
}

/**
 * Detalj marketing lead-a — kartice po sekcijama sa forward-only stage
 * bar-om i „Vrati unazad" dijalogom koji je vidljiv samo korisnicima sa
 * `pd_lead.reopen`.
 */
export function LeadDetailEditor(props: Props) {
  const {
    leadId,
    initialStage,
    initialLevel,
    allowedNextStages,
    initialAssignedToUserId,
    initialNote,
    initialLostReason,
    initialConvertedOrganizationId,
    initialEmail,
    initialFirstName,
    initialLastName,
    initialPhone,
    initialCity,
    initialAudience,
    initialPriority,
    initialTemperature,
    initialTimelineHorizon,
    initialNextFollowUpAt,
    initialCompanyName,
    initialCompanyWebsite,
    initialCompanySize,
    initialBudgetTier,
    initialBudgetCurrency,
    initialDecisionMakerName,
    initialDecisionMakerTitle,
    initialPreferredContact,
    initialBestContactHour,
    initialPreferredLanguage,
    initialCountry,
    initialRegion,
    initialCompetitor,
    initialPainPoint,
    teamMembers,
    organizations,
    plans,
    canConvert,
    canCreateNewOrg,
    canReassign,
    canUpdateStage,
    canUpdateDetails,
    canUpdateClassification,
    canReopen,
    currentUserId,
    visibleLevels,
  } = props;

  const router = useRouter();
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Pipeline state
  const [stage, setStage] = useState<Stage>(initialStage);
  const [convertedOrgId, setConvertedOrgId] = useState<string | null>(
    initialConvertedOrganizationId,
  );
  const [reopenTo, setReopenTo] = useState<Stage | "">("");
  const [reopenReason, setReopenReason] = useState<string>("");
  const [showReopen, setShowReopen] = useState(false);

  const [assignedTo, setAssignedTo] = useState<string>(
    initialAssignedToUserId ?? "",
  );

  // Classification
  const [priority, setPriority] = useState<Priority>(initialPriority);
  const [temperature, setTemperature] = useState<Temperature>(initialTemperature);
  const [timelineHorizon, setTimelineHorizon] = useState<Timeline>(
    initialTimelineHorizon,
  );
  const [nextFollowUpAt, setNextFollowUpAt] = useState<string>(
    initialNextFollowUpAt ? toDatetimeLocal(initialNextFollowUpAt) : "",
  );

  // Contact / kvalifikacija
  const [firstName, setFirstName] = useState<string>(initialFirstName ?? "");
  const [lastName, setLastName] = useState<string>(initialLastName ?? "");
  const [phone, setPhone] = useState<string>(initialPhone ?? "");
  const [city, setCity] = useState<string>(initialCity ?? "");
  const [audience, setAudience] = useState<"INVESTOR" | "AGENCY" | "OTHER">(
    initialAudience,
  );
  const [audienceLocked, setAudienceLocked] = useState(
    initialAudience === "INVESTOR" || initialAudience === "AGENCY",
  );
  const [decisionMakerName, setDecisionMakerName] = useState<string>(
    initialDecisionMakerName ?? "",
  );
  const [decisionMakerTitle, setDecisionMakerTitle] = useState<string>(
    initialDecisionMakerTitle ?? "",
  );
  const [preferredContact, setPreferredContact] = useState<ContactChannel | "">(
    initialPreferredContact ?? "",
  );
  const [bestContactHour, setBestContactHour] = useState<string>(
    initialBestContactHour ?? "",
  );
  const [preferredLanguage, setPreferredLanguage] = useState<string>(
    initialPreferredLanguage ?? "sr",
  );
  const [country, setCountry] = useState<string>(initialCountry ?? "RS");
  const [region, setRegion] = useState<string>(initialRegion ?? "");

  // {t("admin.pdEditor.company")} / novac
  const [companyName, setCompanyName] = useState<string>(initialCompanyName ?? "");
  const [companyWebsite, setCompanyWebsite] = useState<string>(
    initialCompanyWebsite ?? "",
  );
  const [companySize, setCompanySize] = useState<string>(
    initialCompanySize == null ? "" : String(initialCompanySize),
  );
  const [budgetTier, setBudgetTier] = useState<BudgetTier>(initialBudgetTier);
  const [budgetCurrency, setBudgetCurrency] = useState<string>(
    initialBudgetCurrency ?? "EUR",
  );

  // {t("admin.pdEditor.qualification")}
  const [competitor, setCompetitor] = useState<string>(initialCompetitor ?? "");
  const [painPoint, setPainPoint] = useState<string>(initialPainPoint ?? "");

  // Note / lost
  const [note, setNote] = useState<string>(initialNote ?? "");
  const [lostReason, setLostReason] = useState<string>(initialLostReason ?? "");

  async function patch(
    payload: Record<string, unknown>,
    successMessage?: string,
  ): Promise<boolean> {
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      await apiClient.patch(
        `/platform/property-desk/leads/${leadId}`,
        payload,
      );
      const nextStage =
        typeof payload.stage === "string" ? (payload.stage as Stage) : null;
      if (nextStage && leavesMyPipeline(nextStage)) {
        router.push(handoffListHref(nextStage));
        return true;
      }
      if (successMessage) setOk(successMessage);
      startTransition(() => router.refresh());
      return true;
    } catch (err) {
      setError(errorMessage(err, t));
      return false;
    } finally {
      setBusy(false);
    }
  }

  function leavesMyPipeline(next: Stage): boolean {
    return !visibleLevels.includes(STAGE_TO_LEVEL[next]);
  }

  async function changeStage(next: Stage) {
    setStage(next);
    await patch({ stage: next }, t("admin.pdEditor.stageChanged", { stage: t(`admin.pd.stage.${next}` as TranslationKey) }));
  }

  async function submitReopen() {
    if (!reopenTo) {
      setError(t("admin.pdEditor.pickStage"));
      return;
    }
    if (reopenReason.trim().length < 3) {
      setError(t("admin.pdEditor.reopenReasonRequired"));
      return;
    }
    setStage(reopenTo);
    await patch(
      { stage: reopenTo, reopenReason: reopenReason.trim() },
      t("admin.pdEditor.stageReopened", { stage: t(`admin.pd.stage.${reopenTo}` as TranslationKey) }),
    );
    setShowReopen(false);
    setReopenReason("");
    setReopenTo("");
  }

  async function saveAssignee() {
    await patch(
      { assignedToUserId: assignedTo || null },
      t("admin.pdEditor.assigneeSaved"),
    );
  }

  async function claimLead() {
    setAssignedTo(currentUserId);
    await patch({ assignedToUserId: currentUserId }, t("admin.pdEditor.claimed"));
  }

  async function saveClassification() {
    await patch(
      {
        priority,
        temperature,
        timelineHorizon,
        nextFollowUpAt: nextFollowUpAt
          ? new Date(nextFollowUpAt).toISOString()
          : null,
      },
      t("admin.pdEditor.classificationSaved"),
    );
  }

  async function saveCompany() {
    await patch(
      {
        companyName: companyName.trim() || null,
        companyWebsite: companyWebsite.trim() || null,
        companySize:
          companySize.trim() === ""
            ? null
            : Number.isFinite(Number(companySize))
              ? Number(companySize)
              : null,
        budgetTier,
        budgetCurrency: budgetCurrency.trim() || null,
      },
      t("admin.pdEditor.companySaved"),
    );
  }

  async function saveContact() {
    const saved = await patch(
      {
        firstName: firstName.trim() || null,
        lastName: lastName.trim() || null,
        phone: phone.trim() || null,
        city: city.trim() || null,
        ...(audienceLocked ? {} : { audience }),
        decisionMakerName: decisionMakerName.trim() || null,
        decisionMakerTitle: decisionMakerTitle.trim() || null,
        preferredContact: preferredContact || null,
        bestContactHour: bestContactHour.trim() || null,
        preferredLanguage: preferredLanguage.trim() || null,
        country: country.trim() || null,
        region: region.trim() || null,
      },
      t("admin.pdEditor.contactSaved"),
    );
    if (
      saved &&
      !audienceLocked &&
      (audience === "INVESTOR" || audience === "AGENCY")
    ) {
      setAudienceLocked(true);
    }
  }

  async function saveQualification() {
    await patch(
      {
        competitor: competitor.trim() || null,
        painPoint: painPoint.trim() || null,
        note: note.trim() ? note.trim() : null,
      },
      t("admin.pdEditor.qualificationSaved"),
    );
  }

  async function saveLostReason() {
    await patch(
      {
        stage: "LOST",
        lostReason: lostReason.trim() ? lostReason.trim() : null,
      },
      t("admin.pdEditor.markedLost"),
    );
    setStage("LOST");
  }

  function onProvisioned(organizationId: string, createdOwnerEmail?: string) {
    setStage("WON");
    setConvertedOrgId(organizationId);
    if (leavesMyPipeline("WON")) {
      router.push(handoffListHref("WON"));
      return;
    }
    setOk(
      createdOwnerEmail
        ? t("admin.pdEditor.orgCreated", { email: createdOwnerEmail })
        : t("admin.pdEditor.leadLinked"),
    );
    startTransition(() => router.refresh());
  }

  const forwardTerminal = allowedNextStages.length === 0;

  const parsedCompanySize =
    companySize.trim() === "" || !Number.isFinite(Number(companySize))
      ? null
      : Number(companySize);
  const liveScore = computeLeadScore({
    stage,
    companyName,
    companyWebsite,
    companySize: parsedCompanySize,
    budgetTier,
    timelineHorizon,
    decisionMakerName,
    decisionMakerTitle,
    temperature,
  });
  const scoreBarClass =
    liveScore >= 70
      ? "bg-[var(--color-success)]"
      : liveScore >= 40
        ? "bg-[var(--color-warning)]"
        : liveScore > 0
          ? "bg-[var(--color-brand-600)]"
          : "bg-[var(--color-surface-inset)]";

  return (
    <div className="space-y-4">
      {error ? (
        <div
          className="rounded-md border border-[var(--color-danger)] bg-[var(--color-danger-bg)] p-3 text-sm text-[var(--color-danger)]"
          role="alert"
        >
          {error}
        </div>
      ) : null}
      {ok ? (
        <div
          className="rounded-md border border-[var(--color-success)] bg-[var(--color-success-bg)] p-3 text-sm text-[var(--color-success)]"
          role="status"
        >
          {ok}
        </div>
      ) : null}

      {/* 1. PIPELINE */}
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-[var(--color-foreground-muted)]">
              {t("admin.pdEditor.stage")}
            </span>
            <Badge tone={STAGE_TONE[stage]}>{t(`admin.pd.stage.${stage}` as TranslationKey)}</Badge>
            <Badge tone={LEVEL_TONE[initialLevel]}>
              {t(`admin.pd.level.${initialLevel}` as TranslationKey)}
            </Badge>
            <span className="ml-2 text-xs text-[var(--color-foreground-muted)]">
              {t("admin.pdEditor.score")}
            </span>
            <div className="flex items-center gap-2">
              <div className="h-2 w-24 overflow-hidden rounded-full bg-[var(--color-surface-inset)]">
                <div
                  className={`h-full ${scoreBarClass}`}
                  style={{ width: `${Math.min(100, liveScore)}%` }}
                />
              </div>
              <span className="text-xs font-medium tabular-nums">{liveScore}</span>
              {liveScore === 0 ? (
                <span className="text-[11px] text-[var(--color-foreground-muted)]">
                  {t("admin.pdEditor.scoreHint")}
                </span>
              ) : null}
            </div>
            {convertedOrgId ? (
              <span className="text-xs text-[var(--color-foreground-muted)]">
                {t("admin.pdEditor.convertedTo")}{" "}
                <code>{convertedOrgId.slice(0, 8)}</code>
              </span>
            ) : null}
          </div>

          {canUpdateStage ? (
            forwardTerminal ? (
              <p className="text-xs italic text-[var(--color-foreground-muted)]">
                {t("admin.pdEditor.terminal")}
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {allowedNextStages.map((next) => (
                  <Button
                    key={next}
                    type="button"
                    size="sm"
                    variant="outline"
                    className={STAGE_ACTION_CLASS[next]}
                    onClick={() => changeStage(next)}
                    disabled={busy || stage === next}
                    title={t("admin.pdEditor.forwardTitle")}
                  >
                    → {t(`admin.pd.stage.${next}` as TranslationKey)}
                  </Button>
                ))}
              </div>
            )
          ) : (
            <p className="text-xs italic text-[var(--color-foreground-muted)]">
              {t("admin.pdEditor.noStagePerm")}
            </p>
          )}

          {!assignedTo ? (
            <div className="flex flex-wrap items-center gap-2 rounded-md border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-inset)] px-3 py-2">
              <span className="text-sm text-[var(--color-foreground-muted)]">
                {t("admin.pdEditor.unassignedPool")}
              </span>
              <Button
                type="button"
                size="sm"
                onClick={claimLead}
                disabled={busy}
              >
                {t("admin.pdEditor.claim")}
              </Button>
            </div>
          ) : assignedTo === currentUserId ? (
            <p className="text-xs text-[var(--color-foreground-muted)]">
              {t("admin.pdEditor.assignedToYou")}
            </p>
          ) : (
            <p className="text-xs text-[var(--color-foreground-muted)]">
              {t("admin.pdEditor.assignedTo", {
                name: teamMembers.find((m) => m.userId === assignedTo)?.name ?? assignedTo,
              })}
            </p>
          )}

          {canReopen ? (
            <div className="border-t border-[var(--color-border)] pt-3">
              {!showReopen ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowReopen(true)}
                  disabled={busy}
                >
                  {t("admin.pdEditor.reopen")}
                </Button>
              ) : (
                <div className="space-y-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-inset)] p-3">
                  <label className="block text-xs font-semibold">
                    {t("admin.pdEditor.targetStage")}
                    <select
                      value={reopenTo}
                      onChange={(e) => setReopenTo(e.target.value as Stage)}
                      className="mt-1 h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm"
                      disabled={busy}
                    >
                      <option value="">{t("admin.pdEditor.pickOption")}</option>
                      {(["NEW","CONTACTED","QUALIFIED","DEMO","PROPOSAL","WON","LOST","NURTURING"] as Stage[]).map((st) => (
                        <option key={st} value={st} disabled={st === stage}>
                          {t(`admin.pd.stage.${st}` as TranslationKey)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-xs font-semibold">
                    {t("admin.pdEditor.reopenReason")}
                    <textarea
                      value={reopenReason}
                      onChange={(e) => setReopenReason(e.target.value)}
                      className="mt-1 min-h-16 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-2 text-sm"
                      disabled={busy}
                    />
                  </label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={submitReopen}
                      disabled={busy}
                    >
                      {t("common.confirm")}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setShowReopen(false);
                        setReopenReason("");
                        setReopenTo("");
                      }}
                      disabled={busy}
                    >
                      {t("common.cancel")}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* 2. KLASIFIKACIJA */}
      {canUpdateClassification ? (
        <Card>
          <CardContent className="space-y-3 p-4">
            <h3 className="text-sm font-semibold">{t("admin.pdEditor.classification")}</h3>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <label className="block">
                <span className="mb-1 block text-xs font-medium">{t("admin.pdEditor.priority")}</span>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Priority)}
                  className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm"
                  disabled={busy}
                >
                  {(["LOW","NORMAL","HIGH","URGENT"] as Priority[]).map((p) => (
                    <option key={p} value={p}>
                      {t(`admin.pd.priority.${p}` as TranslationKey)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium">{t("admin.pdEditor.temperature")}</span>
                <select
                  value={temperature}
                  onChange={(e) =>
                    setTemperature(e.target.value as Temperature)
                  }
                  className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm"
                  disabled={busy}
                >
                  {(["COLD","WARM","HOT"] as Temperature[]).map((p) => (
                    <option key={p} value={p}>
                      {t(`admin.pd.temperature.${p}` as TranslationKey)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium">{t("admin.pdEditor.timeline")}</span>
                <select
                  value={timelineHorizon}
                  onChange={(e) =>
                    setTimelineHorizon(e.target.value as Timeline)
                  }
                  className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm"
                  disabled={busy}
                >
                  {(["WITHIN_30D","WITHIN_90D","LATER","UNDECIDED"] as Timeline[]).map((p) => (
                    <option key={p} value={p}>
                      {t(`admin.pd.timeline.${p}` as TranslationKey)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium">
                  {t("admin.pdEditor.nextFollowUp")}
                </span>
                <input
                  type="datetime-local"
                  value={nextFollowUpAt}
                  onChange={(e) => setNextFollowUpAt(e.target.value)}
                  className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm"
                  disabled={busy}
                />
              </label>
            </div>
            <Button type="button" size="sm" onClick={saveClassification} disabled={busy}>
              {t("admin.pdEditor.saveClassification")}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* 3. KOMPANIJA */}
      {canUpdateDetails ? (
        <Card>
          <CardContent className="space-y-3 p-4">
            <h3 className="text-sm font-semibold">{t("admin.pdEditor.company")}</h3>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              <label className="block">
                <span className="mb-1 block text-xs font-medium">{t("admin.pdEditor.companyName")}</span>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm"
                  disabled={busy}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium">{t("admin.pdEditor.website")}</span>
                <input
                  type="text"
                  value={companyWebsite}
                  onChange={(e) => setCompanyWebsite(e.target.value)}
                  placeholder="https://…"
                  className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm"
                  disabled={busy}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium">
                  {t("admin.pdEditor.employees")}
                </span>
                <input
                  type="number"
                  min={0}
                  value={companySize}
                  onChange={(e) => setCompanySize(e.target.value)}
                  className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm"
                  disabled={busy}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium">{t("admin.pdEditor.budget")}</span>
                <select
                  value={budgetTier}
                  onChange={(e) => setBudgetTier(e.target.value as BudgetTier)}
                  className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm"
                  disabled={busy}
                >
                  {(["STARTER","GROWTH","ENTERPRISE","UNKNOWN"] as BudgetTier[]).map((b) => (
                    <option key={b} value={b}>
                      {t(`admin.pd.budget.${b}` as TranslationKey)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium">{t("admin.pdEditor.currency")}</span>
                <input
                  type="text"
                  value={budgetCurrency}
                  onChange={(e) => setBudgetCurrency(e.target.value)}
                  className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm"
                  disabled={busy}
                />
              </label>
            </div>
            <Button type="button" size="sm" onClick={saveCompany} disabled={busy}>
              {t("admin.pdEditor.saveCompany")}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* 4. KONTAKT & ODLUKA */}
      {canUpdateDetails ? (
        <Card>
          <CardContent className="space-y-3 p-4">
            <h3 className="text-sm font-semibold">{t("admin.pdEditor.contact")}</h3>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              <label className="block">
                <span className="mb-1 block text-xs font-medium">{t("common.name")}</span>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm"
                  disabled={busy}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium">{t("admin.pdEditor.lastName")}</span>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm"
                  disabled={busy}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium">{t("common.phone")}</span>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm"
                  disabled={busy}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium">
                  {t("admin.pdEditor.decisionMaker")}
                </span>
                <input
                  type="text"
                  value={decisionMakerName}
                  onChange={(e) => setDecisionMakerName(e.target.value)}
                  className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm"
                  disabled={busy}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium">
                  {t("admin.pdEditor.decisionTitle")}
                </span>
                <input
                  type="text"
                  value={decisionMakerTitle}
                  onChange={(e) => setDecisionMakerTitle(e.target.value)}
                  className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm"
                  disabled={busy}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium">
                  {t("admin.pdEditor.preferredChannel")}
                </span>
                <select
                  value={preferredContact}
                  onChange={(e) =>
                    setPreferredContact(e.target.value as ContactChannel)
                  }
                  className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm"
                  disabled={busy}
                >
                  <option value="">{t("admin.pdEditor.channelUnset")}</option>
                  {(["PHONE","EMAIL","WHATSAPP","VIBER","OTHER"] as ContactChannel[]).map((c) => (
                    <option key={c} value={c}>
                      {t(`admin.pd.channel.${c}` as TranslationKey)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium">
                  {t("admin.pdEditor.bestHour")}
                </span>
                <input
                  type="text"
                  placeholder={t("admin.pdEditor.bestHourPlaceholder")}
                  value={bestContactHour}
                  onChange={(e) => setBestContactHour(e.target.value)}
                  className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm"
                  disabled={busy}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium">{t("admin.pdEditor.language")}</span>
                <input
                  type="text"
                  value={preferredLanguage}
                  onChange={(e) => setPreferredLanguage(e.target.value)}
                  className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm"
                  disabled={busy}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium">{t("admin.pdEditor.audience")}</span>
                <select
                  value={audience}
                  onChange={(e) =>
                    setAudience(e.target.value as typeof audience)
                  }
                  className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm disabled:opacity-60"
                  disabled={busy || audienceLocked}
                >
                  {(["INVESTOR","AGENCY","OTHER"] as const).map((v) => (
                    <option key={v} value={v}>{t(`admin.pd.audience.${v}` as TranslationKey)}</option>
                  ))}
                </select>
                <span className="mt-1 block text-[11px] text-[var(--color-foreground-muted)]">
                  {audienceLocked
                    ? t("admin.pdEditor.audienceLocked")
                    : t("admin.pdEditor.audienceHint")}
                </span>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium">{t("admin.pdEditor.country")}</span>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm"
                  disabled={busy}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium">{t("admin.pdEditor.region")}</span>
                <input
                  type="text"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm"
                  disabled={busy}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium">{t("admin.pdEditor.city")}</span>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm"
                  disabled={busy}
                />
              </label>
            </div>
            <Button type="button" size="sm" onClick={saveContact} disabled={busy}>
              {t("admin.pdEditor.saveContact")}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* 5. KVALIFIKACIJA */}
      {canUpdateDetails ? (
        <Card>
          <CardContent className="space-y-3 p-4">
            <h3 className="text-sm font-semibold">{t("admin.pdEditor.qualification")}</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-medium">
                  {t("admin.pdEditor.competitor")}
                </span>
                <input
                  type="text"
                  value={competitor}
                  onChange={(e) => setCompetitor(e.target.value)}
                  className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm"
                  disabled={busy}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium">{t("admin.pdEditor.painPoint")}</span>
                <input
                  type="text"
                  value={painPoint}
                  onChange={(e) => setPainPoint(e.target.value)}
                  className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm"
                  disabled={busy}
                />
              </label>
            </div>
            <label className="block">
              <span className="mb-1 block text-xs font-medium">{t("admin.pdEditor.note")}</span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="min-h-24 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-2 text-sm"
                disabled={busy}
              />
            </label>
            <Button type="button" size="sm" onClick={saveQualification} disabled={busy}>
              {t("admin.pdEditor.saveQualification")}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* 6. VLASNIŠTVO */}
      <Card>
        <CardContent className="space-y-3 p-4">
          <h3 className="text-sm font-semibold">{t("admin.pdEditor.ownership")}</h3>
          {canReassign ? (
            <>
              <label className="block text-sm font-medium">
                {t("admin.pdEditor.assignedMember")}
              </label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="h-10 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
                disabled={busy}
              >
                <option value="">{t("admin.pdEditor.unassigned")}</option>
                {teamMembers.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.name}
                  </option>
                ))}
              </select>
              <Button type="button" size="sm" onClick={saveAssignee} disabled={busy}>
                {t("admin.pdEditor.saveOwner")}
              </Button>
            </>
          ) : !assignedTo ? (
            <Button type="button" size="sm" onClick={claimLead} disabled={busy}>
              {t("admin.pdEditor.claim")}
            </Button>
          ) : assignedTo === currentUserId ? (
            <p className="text-sm text-[var(--color-foreground-muted)]">
              {t("admin.pdEditor.assignedToYouLong")}
            </p>
          ) : (
            <p className="text-sm text-[var(--color-foreground-muted)]">
              {t("admin.pdEditor.assignedOther", {
                name: teamMembers.find((m) => m.userId === assignedTo)?.name ?? t("admin.pdEditor.otherMember"),
              })}
            </p>
          )}
          <p className="text-xs text-[var(--color-foreground-muted)]">
            {t("admin.pdEditor.ownershipHint")}
          </p>
        </CardContent>
      </Card>

      {/* 7. LOST */}
      {canUpdateStage && stage !== "WON" ? (
        <Card>
          <CardContent className="space-y-3 p-4">
            <h3 className="text-sm font-semibold">{t("admin.pdEditor.markLost")}</h3>
            <textarea
              value={lostReason}
              onChange={(e) => setLostReason(e.target.value)}
              placeholder={t("admin.pdEditor.lostPlaceholder")}
              className="min-h-16 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-2 text-sm"
              disabled={busy}
            />
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={saveLostReason}
              disabled={busy}
            >
              {t("admin.pdEditor.markLost")}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* 8. KONVERZIJA / L3 ONBOARDING */}
      {canConvert ? (
        stage === "WON" || initialLevel === "OPERATIONS" || convertedOrgId ? (
          <LeadProvisionPanel
            leadId={leadId}
            email={initialEmail}
            firstName={firstName || initialFirstName}
            lastName={lastName || initialLastName}
            phone={phone || initialPhone}
            city={city || initialCity}
            country={country || initialCountry}
            companyName={companyName || initialCompanyName}
            companyWebsite={companyWebsite || initialCompanyWebsite}
            audience={audience}
            organizations={organizations}
            plans={plans}
            canCreateNewOrg={canCreateNewOrg}
            convertedOrgId={convertedOrgId}
            busy={busy}
            onBusy={setBusy}
            onError={setError}
            onConverted={onProvisioned}
          />
        ) : (
          <Card>
            <CardContent className="space-y-3 p-4">
              <h3 className="text-sm font-semibold">
                {t("admin.pdEditor.convertTitle")}
              </h3>
              <p className="text-xs text-[var(--color-foreground-muted)]">
                {t("admin.pdEditor.convertHint")}
              </p>
              <CloserLinkExisting
                organizations={organizations}
                busy={busy}
                onBusy={setBusy}
                onError={setError}
                onConverted={onProvisioned}
                leadId={leadId}
              />
            </CardContent>
          </Card>
        )
      ) : null}
    </div>
  );
}

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

function errorMessage(err: unknown, t: TranslateFn): string {
  if (err instanceof ApiClientError) return err.message;
  if (err instanceof Error) return err.message;
  return t("admin.genericError");
}

function CloserLinkExisting({
  leadId,
  organizations,
  busy,
  onBusy,
  onError,
  onConverted,
}: {
  leadId: string;
  organizations: ProvisionOrgOption[];
  busy: boolean;
  onBusy: (busy: boolean) => void;
  onError: (message: string | null) => void;
  onConverted: (organizationId: string) => void;
}) {
  const t = useT();
  const [convertOrg, setConvertOrg] = useState("");

  async function convert() {
    if (!convertOrg) {
      onError(t("admin.pdEditor.pickOrg"));
      return;
    }
    onBusy(true);
    onError(null);
    try {
      await apiClient.post(`/platform/property-desk/leads/${leadId}/convert`, {
        organizationId: convertOrg,
      });
      onConverted(convertOrg);
    } catch (err) {
      onError(errorMessage(err, t));
    } finally {
      onBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-3">
      <select
        value={convertOrg}
        onChange={(e) => setConvertOrg(e.target.value)}
        className="h-10 flex-1 min-w-64 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
        disabled={busy}
      >
        <option value="">{t("admin.pdEditor.pickOrgOption")}</option>
        {organizations.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
      <Button type="button" onClick={convert} disabled={busy || !convertOrg}>
        {t("admin.pdEditor.convert")}
      </Button>
    </div>
  );
}
