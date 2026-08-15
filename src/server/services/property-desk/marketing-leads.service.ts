import "server-only";

import type {
  LeadBudgetTier,
  LeadContactChannel,
  LeadPriority,
  LeadTemperature,
  LeadTimeline,
  MarketingLead,
  MarketingLeadAudience,
  MarketingLeadLevel,
  MarketingLeadStage,
  Prisma,
} from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { DomainError } from "@/lib/errors";
import { recordAudit } from "@/server/audit/audit";
import {
  buildMarketingLeadScopeFilter,
  canViewMarketingLead,
  canWriteLead,
  hasPdPermission,
  type PropertyDeskAccessContext,
} from "@/server/permissions/property-desk";
import { recordSystemActivity } from "@/server/services/property-desk/marketing-lead-activities.service";
import {
  computeLevel,
  isForwardTransition,
  stageChangeCrossesLevel,
} from "@/server/services/property-desk/lead-lifecycle";
import { computeLeadScore } from "@/server/services/property-desk/lead-scoring";
import {
  createOrganizationByPlatformAdmin,
  createPlatformUser,
} from "@/server/services/platform.service";

/**
 * Domain service for the persistent marketing lead pipeline.
 *
 * Reads honor the caller's level + `leadScope`; writes su forward-only
 * (osim ako pozivalac ima `pd_lead.reopen`), uvek audit-uju i emituju
 * SYSTEM activity redove za tranzicije, promene levela i konverziju.
 */

export type MarketingLeadWithAssignee = MarketingLead & {
  assignedTo: { id: string; name: string; email: string } | null;
  convertedOrganization: { id: string; name: string } | null;
};

export interface ListLeadsInput {
  stage?: MarketingLeadStage;
  audience?: MarketingLeadAudience;
  level?: MarketingLeadLevel | MarketingLeadLevel[];
  priority?: LeadPriority | LeadPriority[];
  temperature?: LeadTemperature | LeadTemperature[];
  timelineHorizon?: LeadTimeline | LeadTimeline[];
  assignedToUserId?: string | null;
  q?: string;
  source?: string;
  utmSource?: string;
  hasOverdueTask?: boolean;
  /** followUpWithinDays > 0 → only leads sa `nextFollowUpAt` u tom prozoru. */
  followUpWithinDays?: number;
  minScore?: number;
  page?: number;
  pageSize?: number;
  sort?: "recent" | "score";
}

export interface ListLeadsResult {
  items: MarketingLeadWithAssignee[];
  total: number;
  page: number;
  pageSize: number;
}

function asArray<T>(v: T | T[] | undefined): T[] | undefined {
  if (v === undefined) return undefined;
  return Array.isArray(v) ? v : [v];
}

export async function listMarketingLeads(
  ctx: PropertyDeskAccessContext,
  input: ListLeadsInput,
): Promise<ListLeadsResult> {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 25));

  const filters: Prisma.MarketingLeadWhereInput[] = [
    (await buildMarketingLeadScopeFilter(ctx)) as Prisma.MarketingLeadWhereInput,
  ];
  if (input.stage) filters.push({ stage: input.stage });
  if (input.audience) filters.push({ audience: input.audience });
  const levels = asArray(input.level);
  if (levels && levels.length > 0) filters.push({ level: { in: levels } });
  const priorities = asArray(input.priority);
  if (priorities && priorities.length > 0) {
    filters.push({ priority: { in: priorities } });
  }
  const temperatures = asArray(input.temperature);
  if (temperatures && temperatures.length > 0) {
    filters.push({ temperature: { in: temperatures } });
  }
  const timelines = asArray(input.timelineHorizon);
  if (timelines && timelines.length > 0) {
    filters.push({ timelineHorizon: { in: timelines } });
  }
  if (input.assignedToUserId === null) {
    filters.push({ assignedToUserId: null });
  } else if (input.assignedToUserId) {
    filters.push({ assignedToUserId: input.assignedToUserId });
  }
  if (input.source && input.source.trim().length > 0) {
    filters.push({ source: input.source.trim() });
  }
  if (input.utmSource && input.utmSource.trim().length > 0) {
    filters.push({ utmSource: input.utmSource.trim() });
  }
  if (input.hasOverdueTask) {
    filters.push({
      tasks: {
        some: {
          completedAt: null,
          dueAt: { lt: new Date() },
        },
      },
    });
  }
  if (
    typeof input.followUpWithinDays === "number" &&
    input.followUpWithinDays > 0
  ) {
    const now = new Date();
    const until = new Date(
      now.getTime() + input.followUpWithinDays * 24 * 60 * 60 * 1000,
    );
    filters.push({
      nextFollowUpAt: { gte: now, lte: until },
    });
  }
  if (typeof input.minScore === "number" && input.minScore > 0) {
    filters.push({ leadScore: { gte: input.minScore } });
  }
  if (input.q && input.q.trim().length > 0) {
    const q = input.q.trim();
    filters.push({
      OR: [
        { email: { contains: q, mode: "insensitive" } },
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
        { city: { contains: q, mode: "insensitive" } },
        { note: { contains: q, mode: "insensitive" } },
        { companyName: { contains: q, mode: "insensitive" } },
      ],
    });
  }

  const where: Prisma.MarketingLeadWhereInput = { AND: filters };
  const orderBy: Prisma.MarketingLeadOrderByWithRelationInput[] =
    input.sort === "recent"
      ? [{ createdAt: "desc" }]
      : [{ leadScore: "desc" }, { createdAt: "desc" }];

  const [items, total] = await Promise.all([
    prisma.marketingLead.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        convertedOrganization: { select: { id: true, name: true } },
      },
    }),
    prisma.marketingLead.count({ where }),
  ]);

  return { items, total, page, pageSize };
}

export async function getMarketingLead(
  ctx: PropertyDeskAccessContext,
  id: string,
): Promise<MarketingLeadWithAssignee> {
  const lead = await prisma.marketingLead.findUnique({
    where: { id },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      convertedOrganization: { select: { id: true, name: true } },
    },
  });
  if (!lead) throw new DomainError("NOT_FOUND", "Lead ne postoji.");
  if (!(await canViewMarketingLead(ctx, lead))) {
    throw new DomainError("FORBIDDEN", "Nemate pristup ovom lead-u.");
  }
  return lead;
}

// -----------------------------------------------------------------------------
// Update
// -----------------------------------------------------------------------------

/** Polja koja idu kroz `pd_lead.update_details`. */
export interface UpdateLeadDetailsInput {
  note?: string | null;
  lostReason?: string | null;
  audience?: MarketingLeadAudience;
  city?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  companyName?: string | null;
  companyWebsite?: string | null;
  companySize?: number | null;
  budgetTier?: LeadBudgetTier;
  budgetCurrency?: string | null;
  decisionMakerName?: string | null;
  decisionMakerTitle?: string | null;
  preferredContact?: LeadContactChannel | null;
  bestContactHour?: string | null;
  preferredLanguage?: string | null;
  competitor?: string | null;
  painPoint?: string | null;
  country?: string | null;
  region?: string | null;
  source?: string | null;
}

/** Polja koja idu kroz `pd_lead.update_classification`. */
export interface UpdateLeadClassificationInput {
  priority?: LeadPriority;
  temperature?: LeadTemperature;
  timelineHorizon?: LeadTimeline;
  nextFollowUpAt?: Date | null;
}

export interface UpdateLeadInput
  extends UpdateLeadDetailsInput,
    UpdateLeadClassificationInput {
  stage?: MarketingLeadStage;
  assignedToUserId?: string | null;
  /** Obavezan kada tranzicija nije forward. */
  reopenReason?: string | null;
}

const DETAIL_KEYS: (keyof UpdateLeadDetailsInput)[] = [
  "note",
  "lostReason",
  "audience",
  "city",
  "phone",
  "firstName",
  "lastName",
  "companyName",
  "companyWebsite",
  "companySize",
  "budgetTier",
  "budgetCurrency",
  "decisionMakerName",
  "decisionMakerTitle",
  "preferredContact",
  "bestContactHour",
  "preferredLanguage",
  "competitor",
  "painPoint",
  "country",
  "region",
  "source",
];

const CLASSIFICATION_KEYS: (keyof UpdateLeadClassificationInput)[] = [
  "priority",
  "temperature",
  "timelineHorizon",
  "nextFollowUpAt",
];

/** Polja koja utiču na deterministički lead-score. */
const SCORE_KEYS = new Set<keyof UpdateLeadInput>([
  "stage",
  "companyName",
  "companyWebsite",
  "companySize",
  "budgetTier",
  "timelineHorizon",
  "decisionMakerName",
  "decisionMakerTitle",
  "temperature",
]);

function trimOrNull(v: unknown): string | null {
  if (v === undefined) return null;
  if (v === null) return null;
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s.length === 0 ? null : s;
}

export async function updateMarketingLead(
  ctx: PropertyDeskAccessContext,
  id: string,
  input: UpdateLeadInput,
  actorUserId: string,
): Promise<MarketingLead> {
  const existing = await prisma.marketingLead.findUnique({ where: { id } });
  if (!existing) throw new DomainError("NOT_FOUND", "Lead ne postoji.");
  if (!(await canViewMarketingLead(ctx, existing))) {
    throw new DomainError("FORBIDDEN", "Nemate pristup ovom lead-u.");
  }
  if (!(await canWriteLead(ctx, existing))) {
    throw new DomainError(
      "FORBIDDEN",
      "Ovaj lead više nije u vašem level-u — samo MANAGER može da ga menja.",
    );
  }

  // ---- Stage change: forward-only, ili reopen sa razlogom ------------------
  const stageChanges =
    input.stage !== undefined && input.stage !== existing.stage;
  let reopenReason: string | null = null;
  if (stageChanges) {
    if (!(await hasPdPermission(ctx, "pd_lead.update_stage"))) {
      throw new DomainError(
        "FORBIDDEN",
        "Nemate dozvolu za promenu faze lead-a.",
      );
    }
    const forward = isForwardTransition(existing.stage, input.stage!);
    if (!forward) {
      if (!(await hasPdPermission(ctx, "pd_lead.reopen"))) {
        throw new DomainError(
          "FORBIDDEN",
          "Ova tranzicija zahteva pd_lead.reopen (default MANAGER + SUPER_ADMIN).",
        );
      }
      const reason = trimOrNull(input.reopenReason);
      if (!reason) {
        throw new DomainError(
          "VALIDATION",
          "Za vraćanje / preskakanje stage-a razlog je obavezan.",
        );
      }
      reopenReason = reason;
    }
  }

  // ---- Assignment ---------------------------------------------------------
  // Self-claim: član tima sme da uzme NERASPOREĐEN lead sebi, bez
  // `pd_lead.reassign`. Dodela drugom / oduzimanje tuđeg i dalje traži reassign.
  if (input.assignedToUserId !== undefined) {
    const isSelfClaim =
      existing.assignedToUserId === null &&
      input.assignedToUserId === actorUserId;
    if (!isSelfClaim && !(await hasPdPermission(ctx, "pd_lead.reassign"))) {
      throw new DomainError(
        "FORBIDDEN",
        "Nemate dozvolu za preraspoređivanje lead-a. Slobodan lead možete uzeti sebi.",
      );
    }
  }

  // ---- Details / classification permissions -------------------------------
  const touchesDetails = DETAIL_KEYS.some((k) => input[k] !== undefined);
  if (touchesDetails && !(await hasPdPermission(ctx, "pd_lead.update_details"))) {
    throw new DomainError(
      "FORBIDDEN",
      "Nemate dozvolu za uređivanje detalja lead-a.",
    );
  }
  const touchesClassification = CLASSIFICATION_KEYS.some(
    (k) => input[k] !== undefined,
  );
  if (
    touchesClassification &&
    !(await hasPdPermission(ctx, "pd_lead.update_classification"))
  ) {
    throw new DomainError(
      "FORBIDDEN",
      "Nemate dozvolu za klasifikaciju lead-a.",
    );
  }

  const data: Prisma.MarketingLeadUpdateInput = {};

  // Level tranzicija: auto-compute level iz stage-a; ako se level menja
  // pamtimo prev + reset levelEnteredAt i auto-unassign-ujemo (pool).
  let levelCrossed = false;
  if (stageChanges) {
    data.stage = input.stage!;
    if (stageChangeCrossesLevel(existing.stage, input.stage!)) {
      levelCrossed = true;
      data.level = computeLevel(input.stage!);
      data.previousLevel = existing.level;
      data.levelEnteredAt = new Date();
      // Ako pozivalac nije eksplicitno zadao assignedToUserId, auto-
      // -unassign vraća lead u pool sledećeg levela. Ako je pozivalac
      // hteo da zadrži assignee-a, mora eksplicitno da ga pošalje.
      if (input.assignedToUserId === undefined) {
        data.assignedTo = { disconnect: true };
      }
    }
  }

  if (input.assignedToUserId !== undefined) {
    data.assignedTo = input.assignedToUserId
      ? { connect: { id: input.assignedToUserId } }
      : { disconnect: true };
  }

  // Details.
  if (input.note !== undefined) data.note = input.note;
  if (input.lostReason !== undefined) data.lostReason = input.lostReason;
  if (input.audience !== undefined) {
    if (
      isAudienceLocked(existing.audience) &&
      input.audience !== existing.audience
    ) {
      throw new DomainError(
        "INVALID_STATE",
        "Publika je zaključana nakon što je postavljena na Investitor ili Agencija.",
        { fieldErrors: { audience: ["Publika se ne može menjati."] } },
      );
    }
    data.audience = input.audience;
  }
  if (input.city !== undefined) data.city = input.city;
  if (input.phone !== undefined) data.phone = input.phone ?? existing.phone;
  if (input.firstName !== undefined) data.firstName = input.firstName;
  if (input.lastName !== undefined) data.lastName = input.lastName;
  if (input.companyName !== undefined) data.companyName = input.companyName;
  if (input.companyWebsite !== undefined) data.companyWebsite = input.companyWebsite;
  if (input.companySize !== undefined) data.companySize = input.companySize;
  if (input.budgetTier !== undefined) data.budgetTier = input.budgetTier;
  if (input.budgetCurrency !== undefined) data.budgetCurrency = input.budgetCurrency;
  if (input.decisionMakerName !== undefined) data.decisionMakerName = input.decisionMakerName;
  if (input.decisionMakerTitle !== undefined) data.decisionMakerTitle = input.decisionMakerTitle;
  if (input.preferredContact !== undefined) data.preferredContact = input.preferredContact;
  if (input.bestContactHour !== undefined) data.bestContactHour = input.bestContactHour;
  if (input.preferredLanguage !== undefined) data.preferredLanguage = input.preferredLanguage;
  if (input.competitor !== undefined) data.competitor = input.competitor;
  if (input.painPoint !== undefined) data.painPoint = input.painPoint;
  if (input.country !== undefined) data.country = input.country;
  if (input.region !== undefined) data.region = input.region;
  if (input.source !== undefined) data.source = input.source;

  // Classification.
  if (input.priority !== undefined) data.priority = input.priority;
  if (input.temperature !== undefined) data.temperature = input.temperature;
  if (input.timelineHorizon !== undefined) data.timelineHorizon = input.timelineHorizon;
  if (input.nextFollowUpAt !== undefined) data.nextFollowUpAt = input.nextFollowUpAt;

  // Recompute score kad god se dira ijedno polje koje ulazi u formulu.
  const touchesScore = Object.keys(input).some((k) =>
    SCORE_KEYS.has(k as keyof UpdateLeadInput),
  );
  if (touchesScore) {
    const merged = {
      stage: input.stage ?? existing.stage,
      companyName: input.companyName ?? existing.companyName,
      companyWebsite: input.companyWebsite ?? existing.companyWebsite,
      companySize: input.companySize ?? existing.companySize,
      budgetTier: input.budgetTier ?? existing.budgetTier,
      timelineHorizon: input.timelineHorizon ?? existing.timelineHorizon,
      decisionMakerName: input.decisionMakerName ?? existing.decisionMakerName,
      decisionMakerTitle: input.decisionMakerTitle ?? existing.decisionMakerTitle,
      temperature: input.temperature ?? existing.temperature,
    };
    data.leadScore = computeLeadScore(merged);
  }

  const updated = await prisma.marketingLead.update({ where: { id }, data });

  // ---- Post-update side effects ------------------------------------------
  if (stageChanges) {
    await recordAudit({
      action: reopenReason
        ? "marketing_lead.reopened"
        : "marketing_lead.stage_changed",
      entityType: "MarketingLead",
      entityId: updated.id,
      actorUserId,
      previousValues: { stage: existing.stage, level: existing.level },
      newValues: { stage: updated.stage, level: updated.level },
      metadata: reopenReason ? { reopenReason } : undefined,
    });
    await recordSystemActivity({
      leadId: updated.id,
      kind: "STAGE_CHANGE",
      title: reopenReason
        ? `Vraćeno: ${existing.stage} → ${updated.stage}`
        : `Faza: ${existing.stage} → ${updated.stage}`,
      body:
        reopenReason ??
        (updated.stage === "LOST" && updated.lostReason
          ? `Razlog: ${updated.lostReason}`
          : null),
      actorUserId,
      metadata: {
        from: existing.stage,
        to: updated.stage,
        reopen: Boolean(reopenReason),
        reopenReason: reopenReason ?? undefined,
      },
    });
  }
  if (levelCrossed) {
    await recordSystemActivity({
      leadId: updated.id,
      kind: "SYSTEM",
      title: `Lead prebačen: ${existing.level} → ${updated.level} (auto-unassign)`,
      actorUserId,
      metadata: {
        from: existing.level,
        to: updated.level,
        autoUnassigned: input.assignedToUserId === undefined,
      },
    });
  }
  if (
    input.assignedToUserId !== undefined &&
    input.assignedToUserId !== existing.assignedToUserId
  ) {
    await recordAudit({
      action: "marketing_lead.assigned",
      entityType: "MarketingLead",
      entityId: updated.id,
      actorUserId,
      previousValues: { assignedToUserId: existing.assignedToUserId },
      newValues: { assignedToUserId: updated.assignedToUserId },
    });
    await recordSystemActivity({
      leadId: updated.id,
      kind: "ASSIGNMENT",
      title: updated.assignedToUserId
        ? "Lead dodeljen članu tima"
        : "Lead vraćen u pool (nema vlasnika)",
      actorUserId,
      metadata: {
        from: existing.assignedToUserId,
        to: updated.assignedToUserId,
      },
    });
  }
  await recordAudit({
    action: "marketing_lead.updated",
    entityType: "MarketingLead",
    entityId: updated.id,
    actorUserId,
    previousValues: {
      note: existing.note,
      lostReason: existing.lostReason,
      audience: existing.audience,
      city: existing.city,
      firstName: existing.firstName,
      lastName: existing.lastName,
      phone: existing.phone,
      priority: existing.priority,
      temperature: existing.temperature,
      timelineHorizon: existing.timelineHorizon,
      leadScore: existing.leadScore,
    },
    newValues: {
      note: updated.note,
      lostReason: updated.lostReason,
      audience: updated.audience,
      city: updated.city,
      firstName: updated.firstName,
      lastName: updated.lastName,
      phone: updated.phone,
      priority: updated.priority,
      temperature: updated.temperature,
      timelineHorizon: updated.timelineHorizon,
      leadScore: updated.leadScore,
    },
  });

  return updated;
}

export function isAudienceLocked(audience: MarketingLeadAudience): boolean {
  return audience === "INVESTOR" || audience === "AGENCY";
}

/** Super Admin i Operations smeju iz L3 da naprave tenant org + vlasnika. */
export function canCreateTenantFromLead(
  ctx: PropertyDeskAccessContext,
): boolean {
  if (ctx.isSuperAdmin) return true;
  return ctx.teamMember.teamRole === "OPERATIONS";
}

export async function convertMarketingLead(
  ctx: PropertyDeskAccessContext,
  id: string,
  organizationId: string,
  actorUserId: string,
): Promise<MarketingLead> {
  const existing = await prisma.marketingLead.findUnique({ where: { id } });
  if (!existing) throw new DomainError("NOT_FOUND", "Lead ne postoji.");
  if (!(await canViewMarketingLead(ctx, existing))) {
    throw new DomainError("FORBIDDEN", "Nemate pristup ovom lead-u.");
  }
  if (!(await canWriteLead(ctx, existing))) {
    throw new DomainError(
      "FORBIDDEN",
      "Konverziju može uraditi samo član tima čiji level pokriva ovaj lead.",
    );
  }
  if (!(await hasPdPermission(ctx, "pd_lead.convert"))) {
    throw new DomainError(
      "FORBIDDEN",
      "Nemate dozvolu za konverziju lead-a u organizaciju.",
    );
  }
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, name: true },
  });
  if (!org) {
    throw new DomainError("NOT_FOUND", "Organizacija ne postoji.");
  }
  if (existing.stage === "WON" && existing.convertedOrganizationId) {
    throw new DomainError(
      "INVALID_STATE",
      "Lead je već konvertovan u organizaciju.",
    );
  }

  const now = new Date();
  const crossedLevel = existing.level !== "OPERATIONS";
  const updated = await prisma.marketingLead.update({
    where: { id },
    data: {
      stage: "WON",
      level: "OPERATIONS",
      previousLevel: crossedLevel ? existing.level : existing.previousLevel,
      levelEnteredAt: crossedLevel ? now : existing.levelEnteredAt,
      convertedOrganization: { connect: { id: organizationId } },
      convertedAt: now,
      ...(crossedLevel ? { assignedTo: { disconnect: true } } : {}),
    },
  });

  await recordAudit({
    action: "marketing_lead.converted",
    entityType: "MarketingLead",
    entityId: updated.id,
    actorUserId,
    organizationId,
    previousValues: {
      stage: existing.stage,
      convertedOrganizationId: existing.convertedOrganizationId,
    },
    newValues: {
      stage: updated.stage,
      convertedOrganizationId: updated.convertedOrganizationId,
      convertedAt: updated.convertedAt,
    },
  });
  await recordSystemActivity({
    leadId: updated.id,
    kind: "CONVERSION",
    title: `Konvertovano u organizaciju „${org.name}"`,
    actorUserId,
    metadata: { organizationId },
  });
  if (crossedLevel) {
    await recordSystemActivity({
      leadId: updated.id,
      kind: "SYSTEM",
      title: `Lead prebačen: ${existing.level} → OPERATIONS (auto-unassign)`,
      actorUserId,
      metadata: {
        from: existing.level,
        to: "OPERATIONS",
        autoUnassigned: true,
      },
    });
  }

  return updated;
}

export interface ProvisionLeadOrganizationInput {
  name: string;
  slug?: string | null;
  legalName?: string | null;
  displayName?: string | null;
  city?: string | null;
  address?: string | null;
  taxNumber?: string | null;
  registrationNumber?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  country?: string | null;
  planCode: string;
  trialDays?: number | null;
  owner: {
    name: string;
    email: string;
    password: string;
  };
}

export interface ProvisionLeadResult {
  lead: MarketingLead;
  organization: { id: string; name: string; slug: string };
  owner: { id: string; email: string; name: string };
}

/**
 * L3 onboarding: napravi tenant organizaciju + vlasnika najvišeg stepena
 * (INVESTOR_OWNER / AGENCY_OWNER iz publike) i veži lead. Dalje vlasnik
 * upravlja članovima iz svog naloga.
 */
export async function provisionMarketingLead(
  ctx: PropertyDeskAccessContext,
  id: string,
  input: ProvisionLeadOrganizationInput,
  actorUserId: string,
): Promise<ProvisionLeadResult> {
  if (!canCreateTenantFromLead(ctx)) {
    throw new DomainError(
      "FORBIDDEN",
      "Novu organizaciju iz lead-a smeju da naprave Super Admin i Operations.",
    );
  }
  if (!(await hasPdPermission(ctx, "pd_lead.convert"))) {
    throw new DomainError(
      "FORBIDDEN",
      "Nemate dozvolu za konverziju lead-a u organizaciju.",
    );
  }

  const existing = await prisma.marketingLead.findUnique({ where: { id } });
  if (!existing) throw new DomainError("NOT_FOUND", "Lead ne postoji.");
  if (!(await canViewMarketingLead(ctx, existing))) {
    throw new DomainError("FORBIDDEN", "Nemate pristup ovom lead-u.");
  }
  if (!(await canWriteLead(ctx, existing))) {
    throw new DomainError(
      "FORBIDDEN",
      "Konverziju može uraditi samo član tima čiji level pokriva ovaj lead.",
    );
  }
  if (existing.stage === "WON" && existing.convertedOrganizationId) {
    throw new DomainError(
      "INVALID_STATE",
      "Lead je već konvertovan u organizaciju.",
    );
  }
  if (existing.level !== "OPERATIONS" && existing.stage !== "WON") {
    throw new DomainError(
      "INVALID_STATE",
      "Novu organizaciju možete napraviti tek kad lead pređe u L3 Operations.",
    );
  }
  if (!isAudienceLocked(existing.audience)) {
    throw new DomainError(
      "VALIDATION",
      "Postavite publiku na Investitor ili Agencija pre kreiranja organizacije.",
      { fieldErrors: { audience: ["Obavezno Investitor ili Agencija."] } },
    );
  }

  const orgType = existing.audience === "AGENCY" ? "AGENCY" : "INVESTOR";
  const ownerRole = orgType === "AGENCY" ? "AGENCY_OWNER" : "INVESTOR_OWNER";
  const name = input.name.trim();
  if (name.length < 2) {
    throw new DomainError("VALIDATION", "Naziv organizacije je obavezan.");
  }

  const slug = await uniqueOrganizationSlug(
    input.slug?.trim() || slugifyOrg(name),
  );
  const legalName = (input.legalName?.trim() || name).slice(0, 200);
  const displayName = (input.displayName?.trim() || name).slice(0, 120);
  const ownerName = input.owner.name.trim();
  const ownerEmail = input.owner.email.trim().toLowerCase();
  if (!ownerName) {
    throw new DomainError("VALIDATION", "Ime vlasnika je obavezno.");
  }
  if (!ownerEmail) {
    throw new DomainError("VALIDATION", "E-mail vlasnika je obavezan.");
  }

  const created = await createOrganizationByPlatformAdmin(
    {
      name,
      slug,
      type: orgType,
      legalName,
      displayName,
      city: trimOrNull(input.city) ?? existing.city,
      address: trimOrNull(input.address),
      taxNumber: trimOrNull(input.taxNumber),
      registrationNumber: trimOrNull(input.registrationNumber),
      email: trimOrNull(input.email) ?? existing.email,
      phone: trimOrNull(input.phone) ?? existing.phone,
      website: asWebsiteUrl(input.website ?? existing.companyWebsite),
      country: asCountryCode(input.country ?? existing.country),
      planCode: input.planCode,
      trialDays: input.trialDays ?? 30,
      status: "TRIAL",
    },
    actorUserId,
  );

  const owner = await createPlatformUser(
    {
      name: ownerName,
      email: ownerEmail,
      password: input.owner.password,
      organizationId: created.org.id,
      organizationRole: ownerRole,
    },
    actorUserId,
  );

  const lead = await convertMarketingLead(
    ctx,
    id,
    created.org.id,
    actorUserId,
  );

  return {
    lead,
    organization: {
      id: created.org.id,
      name: created.org.name,
      slug: created.org.slug,
    },
    owner: { id: owner.id, email: owner.email, name: owner.name },
  };
}

function slugifyOrg(input: string): string {
  const slug = input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug.length >= 2 ? slug : "org";
}

async function uniqueOrganizationSlug(base: string): Promise<string> {
  const root = slugifyOrg(base);
  let candidate = root;
  let n = 2;
  while (await prisma.organization.findUnique({ where: { slug: candidate } })) {
    const suffix = `-${n}`;
    candidate = `${root.slice(0, Math.max(2, 60 - suffix.length))}${suffix}`;
    n += 1;
  }
  return candidate;
}

function asWebsiteUrl(raw: string | null | undefined): string | null {
  const value = trimOrNull(raw);
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

function asCountryCode(raw: string | null | undefined): string {
  const value = (raw ?? "").trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(value)) return value;
  return "RS";
}

// -----------------------------------------------------------------------------
// Manual create — used by "New lead" dialog inside Property Desk. Landing
// form uses `upsertMarketingLead` in landing-marketing.service.ts.
// -----------------------------------------------------------------------------

export interface CreateMarketingLeadInput {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  audience?: MarketingLeadAudience;
  city?: string | null;
  note?: string | null;
  source?: string | null;
  assignedToUserId?: string | null;
  // Bogatija polja — opciono.
  companyName?: string | null;
  companyWebsite?: string | null;
  companySize?: number | null;
  budgetTier?: LeadBudgetTier;
  budgetCurrency?: string | null;
  decisionMakerName?: string | null;
  decisionMakerTitle?: string | null;
  preferredContact?: LeadContactChannel | null;
  bestContactHour?: string | null;
  preferredLanguage?: string | null;
  competitor?: string | null;
  painPoint?: string | null;
  country?: string | null;
  region?: string | null;
  priority?: LeadPriority;
  temperature?: LeadTemperature;
  timelineHorizon?: LeadTimeline;
  nextFollowUpAt?: Date | null;
}

export async function createMarketingLead(
  ctx: PropertyDeskAccessContext,
  input: CreateMarketingLeadInput,
  actorUserId: string,
): Promise<MarketingLead> {
  if (!(await hasPdPermission(ctx, "pd_lead.create"))) {
    throw new DomainError(
      "FORBIDDEN",
      "Nemate dozvolu za kreiranje marketing lead-a.",
    );
  }

  const email = input.email.trim().toLowerCase();
  if (!email) {
    throw new DomainError("BAD_REQUEST", "Email je obavezan.");
  }

  const existing = await prisma.marketingLead.findUnique({ where: { email } });
  if (existing) {
    // ID is embedded in the message so the client dialog can offer a
    // deep-link to the existing pipeline row without a second lookup.
    throw new DomainError(
      "CONFLICT",
      `Lead sa ovom email adresom već postoji u pipeline-u (id=${existing.id}).`,
    );
  }

  if (
    input.assignedToUserId !== undefined &&
    input.assignedToUserId !== null &&
    !(await hasPdPermission(ctx, "pd_lead.reassign"))
  ) {
    throw new DomainError(
      "FORBIDDEN",
      "Nemate dozvolu za dodelu lead-a drugom članu tima.",
    );
  }

  // Ako pozivalac ne prosleđuje assignedTo, dodeli samog sebe (osim ako je
  // SUPER_ADMIN — u tom slučaju ostavi neraspoređeno, jer SA nije član tima).
  const defaultAssignee = ctx.isSuperAdmin ? null : ctx.teamMember.userId;
  const assignedToUserId =
    input.assignedToUserId === undefined
      ? defaultAssignee
      : input.assignedToUserId;

  const leadScore = computeLeadScore({
    stage: "NEW",
    companyName: input.companyName,
    companyWebsite: input.companyWebsite,
    companySize: input.companySize,
    budgetTier: input.budgetTier,
    timelineHorizon: input.timelineHorizon,
    decisionMakerName: input.decisionMakerName,
    decisionMakerTitle: input.decisionMakerTitle,
    temperature: input.temperature,
  });

  const lead = await prisma.marketingLead.create({
    data: {
      email,
      firstName: input.firstName?.trim() || null,
      lastName: input.lastName?.trim() || null,
      phone: input.phone?.trim() || null,
      audience: input.audience ?? "OTHER",
      city: input.city?.trim() || null,
      note: input.note?.trim() || null,
      source: input.source?.trim() || "manual",
      assignedToUserId,
      stage: "NEW",
      level: "SOURCING",
      consent: false,
      companyName: input.companyName?.trim() || null,
      companyWebsite: input.companyWebsite?.trim() || null,
      companySize: input.companySize ?? null,
      budgetTier: input.budgetTier ?? "UNKNOWN",
      budgetCurrency: input.budgetCurrency?.trim() || "EUR",
      decisionMakerName: input.decisionMakerName?.trim() || null,
      decisionMakerTitle: input.decisionMakerTitle?.trim() || null,
      preferredContact: input.preferredContact ?? null,
      bestContactHour: input.bestContactHour?.trim() || null,
      preferredLanguage: input.preferredLanguage?.trim() || "sr",
      competitor: input.competitor?.trim() || null,
      painPoint: input.painPoint?.trim() || null,
      country: input.country?.trim() || "RS",
      region: input.region?.trim() || null,
      priority: input.priority ?? "NORMAL",
      temperature: input.temperature ?? "COLD",
      timelineHorizon: input.timelineHorizon ?? "UNDECIDED",
      nextFollowUpAt: input.nextFollowUpAt ?? null,
      leadScore,
    },
  });

  await recordAudit({
    action: "marketing_lead.created",
    entityType: "MarketingLead",
    entityId: lead.id,
    actorUserId,
    newValues: {
      email: lead.email,
      audience: lead.audience,
      assignedToUserId: lead.assignedToUserId,
      source: lead.source,
      leadScore: lead.leadScore,
    },
  });
  await recordSystemActivity({
    leadId: lead.id,
    kind: "SYSTEM",
    title: "Lead ručno unesen u pipeline",
    actorUserId,
    metadata: { source: lead.source },
  });

  return lead;
}

// -----------------------------------------------------------------------------
// Bulk operations
// -----------------------------------------------------------------------------

export interface BulkUpdateInput {
  ids: string[];
  action:
    | { kind: "assign"; assignedToUserId: string | null }
    | { kind: "stage"; stage: MarketingLeadStage }
    | { kind: "lost"; reason?: string | null };
}

export interface BulkUpdateResult {
  updated: number;
  skipped: number;
}

export async function bulkUpdateMarketingLeads(
  ctx: PropertyDeskAccessContext,
  input: BulkUpdateInput,
  actorUserId: string,
): Promise<BulkUpdateResult> {
  if (!(await hasPdPermission(ctx, "pd_lead.bulk"))) {
    throw new DomainError(
      "FORBIDDEN",
      "Nemate dozvolu za bulk operacije nad lead-ovima.",
    );
  }
  if (input.action.kind === "assign") {
    if (!(await hasPdPermission(ctx, "pd_lead.reassign"))) {
      throw new DomainError(
        "FORBIDDEN",
        "Nemate dozvolu za preraspoređivanje lead-ova.",
      );
    }
  } else {
    if (!(await hasPdPermission(ctx, "pd_lead.update_stage"))) {
      throw new DomainError(
        "FORBIDDEN",
        "Nemate dozvolu za promenu faze lead-ova.",
      );
    }
  }
  if (input.ids.length === 0) return { updated: 0, skipped: 0 };
  if (input.ids.length > 200) {
    throw new DomainError(
      "BAD_REQUEST",
      "Bulk operacija podržava do 200 lead-ova odjednom.",
    );
  }

  // Filtriraj samo lead-ove koje pozivalac stvarno sme da vidi. Sve što
  // ne prođe ide u `skipped` — nikad ne editujemo van scope-a.
  const scopeFilter =
    (await buildMarketingLeadScopeFilter(ctx)) as Prisma.MarketingLeadWhereInput;
  const visible = await prisma.marketingLead.findMany({
    where: { AND: [{ id: { in: input.ids } }, scopeFilter] },
  });
  const visibleIds = new Set(visible.map((l) => l.id));
  let skipped = input.ids.length - visibleIds.size;

  const canReopen = await hasPdPermission(ctx, "pd_lead.reopen");
  let updatedCount = 0;
  for (const lead of visible) {
    let after: MarketingLead | null = null;
    if (input.action.kind === "assign") {
      if (lead.assignedToUserId === input.action.assignedToUserId) continue;
      after = await prisma.marketingLead.update({
        where: { id: lead.id },
        data: {
          assignedTo: input.action.assignedToUserId
            ? { connect: { id: input.action.assignedToUserId } }
            : { disconnect: true },
        },
      });
      await recordSystemActivity({
        leadId: lead.id,
        kind: "ASSIGNMENT",
        title: after.assignedToUserId
          ? "Lead dodeljen (bulk)"
          : "Lead vraćen u pool (bulk)",
        actorUserId,
        metadata: {
          bulk: true,
          from: lead.assignedToUserId,
          to: after.assignedToUserId,
        },
      });
    } else if (input.action.kind === "stage") {
      if (lead.stage === input.action.stage) continue;
      // Poštuj forward-only pravilo i u bulk-u — pozivalac koji nema
      // reopen ne može da vraća/preskače stage-ove bez razloga.
      if (
        !canReopen &&
        !isForwardTransition(lead.stage, input.action.stage)
      ) {
        skipped += 1;
        continue;
      }
      const nextLevel = computeLevel(input.action.stage);
      const crossesLevel = nextLevel !== lead.level;
      after = await prisma.marketingLead.update({
        where: { id: lead.id },
        data: {
          stage: input.action.stage,
          level: nextLevel,
          previousLevel: crossesLevel ? lead.level : lead.previousLevel,
          levelEnteredAt: crossesLevel ? new Date() : lead.levelEnteredAt,
          // Bulk stage change → uvek auto-unassign kad menja level.
          assignedTo: crossesLevel ? { disconnect: true } : undefined,
        },
      });
      await recordSystemActivity({
        leadId: lead.id,
        kind: "STAGE_CHANGE",
        title: `Faza (bulk): ${lead.stage} → ${after.stage}`,
        actorUserId,
        metadata: {
          bulk: true,
          from: lead.stage,
          to: after.stage,
          crossedLevel: crossesLevel,
        },
      });
      if (crossesLevel) {
        await recordSystemActivity({
          leadId: lead.id,
          kind: "SYSTEM",
          title: `Lead prebačen: ${lead.level} → ${nextLevel} (auto-unassign)`,
          actorUserId,
          metadata: { bulk: true, from: lead.level, to: nextLevel },
        });
      }
    } else if (input.action.kind === "lost") {
      after = await prisma.marketingLead.update({
        where: { id: lead.id },
        data: {
          stage: "LOST",
          level: "ARCHIVED",
          previousLevel: lead.level !== "ARCHIVED" ? lead.level : lead.previousLevel,
          levelEnteredAt: lead.level !== "ARCHIVED" ? new Date() : lead.levelEnteredAt,
          lostReason: input.action.reason ?? null,
        },
      });
      await recordSystemActivity({
        leadId: lead.id,
        kind: "STAGE_CHANGE",
        title: `Faza (bulk): ${lead.stage} → LOST`,
        body: input.action.reason ? `Razlog: ${input.action.reason}` : null,
        actorUserId,
        metadata: { bulk: true, from: lead.stage, to: "LOST" },
      });
    }
    if (after) updatedCount += 1;
  }

  await recordAudit({
    action: "marketing_lead.bulk_updated",
    entityType: "MarketingLead",
    entityId: `bulk:${updatedCount}`,
    actorUserId,
    metadata: {
      action: input.action.kind,
      requested: input.ids.length,
      updated: updatedCount,
      skipped,
    },
  });

  return { updated: updatedCount, skipped };
}

// -----------------------------------------------------------------------------
// Reports / dashboards
// -----------------------------------------------------------------------------

export async function getPipelineStats(
  ctx: PropertyDeskAccessContext,
): Promise<{
  byStage: Record<MarketingLeadStage, number>;
  byLevel: Record<MarketingLeadLevel, number>;
  byAudience: Record<MarketingLeadAudience, number>;
  totalOpen: number;
  totalWon: number;
  totalLost: number;
}> {
  const where: Prisma.MarketingLeadWhereInput = (await buildMarketingLeadScopeFilter(
    ctx,
  )) as Prisma.MarketingLeadWhereInput;

  const [byStage, byLevel, byAudience] = await Promise.all([
    prisma.marketingLead.groupBy({
      by: ["stage"],
      where,
      _count: { stage: true },
    }),
    prisma.marketingLead.groupBy({
      by: ["level"],
      where,
      _count: { level: true },
    }),
    prisma.marketingLead.groupBy({
      by: ["audience"],
      where,
      _count: { audience: true },
    }),
  ]);

  const stageMap: Record<MarketingLeadStage, number> = {
    NEW: 0,
    CONTACTED: 0,
    QUALIFIED: 0,
    DEMO: 0,
    PROPOSAL: 0,
    WON: 0,
    LOST: 0,
    NURTURING: 0,
  };
  for (const row of byStage) stageMap[row.stage] = row._count.stage;

  const levelMap: Record<MarketingLeadLevel, number> = {
    SOURCING: 0,
    CLOSING: 0,
    OPERATIONS: 0,
    ARCHIVED: 0,
  };
  for (const row of byLevel) levelMap[row.level] = row._count.level;

  const audienceMap: Record<MarketingLeadAudience, number> = {
    INVESTOR: 0,
    AGENCY: 0,
    OTHER: 0,
  };
  for (const row of byAudience) audienceMap[row.audience] = row._count.audience;

  const totalOpen =
    stageMap.NEW +
    stageMap.CONTACTED +
    stageMap.QUALIFIED +
    stageMap.DEMO +
    stageMap.PROPOSAL +
    stageMap.NURTURING;

  return {
    byStage: stageMap,
    byLevel: levelMap,
    byAudience: audienceMap,
    totalOpen,
    totalWon: stageMap.WON,
    totalLost: stageMap.LOST,
  };
}

export async function getRecentLeads(
  ctx: PropertyDeskAccessContext,
  limit = 5,
): Promise<MarketingLeadWithAssignee[]> {
  const where: Prisma.MarketingLeadWhereInput = (await buildMarketingLeadScopeFilter(
    ctx,
  )) as Prisma.MarketingLeadWhereInput;
  return prisma.marketingLead.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: Math.min(50, Math.max(1, limit)),
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      convertedOrganization: { select: { id: true, name: true } },
    },
  });
}

/**
 * "Hot" lead-ovi: temperature === HOT OR priority in {HIGH, URGENT}.
 * Sortirano po score-u pa createdAt.
 */
export async function getHotLeads(
  ctx: PropertyDeskAccessContext,
  limit = 5,
): Promise<MarketingLeadWithAssignee[]> {
  const scope = (await buildMarketingLeadScopeFilter(
    ctx,
  )) as Prisma.MarketingLeadWhereInput;
  return prisma.marketingLead.findMany({
    where: {
      AND: [
        scope,
        { level: { in: ["SOURCING", "CLOSING", "OPERATIONS"] } },
        {
          OR: [
            { temperature: "HOT" },
            { priority: { in: ["HIGH", "URGENT"] } },
          ],
        },
      ],
    },
    orderBy: [{ leadScore: "desc" }, { createdAt: "desc" }],
    take: Math.min(20, Math.max(1, limit)),
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      convertedOrganization: { select: { id: true, name: true } },
    },
  });
}

/**
 * Lead-ovi sa follow-up-om u sledećih `days` dana. Uključuje samo one
 * gde je `nextFollowUpAt` u `[now, now+days]`.
 */
export async function getUpcomingFollowUps(
  ctx: PropertyDeskAccessContext,
  days = 7,
  limit = 10,
): Promise<MarketingLeadWithAssignee[]> {
  const now = new Date();
  const until = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  const scope = (await buildMarketingLeadScopeFilter(
    ctx,
  )) as Prisma.MarketingLeadWhereInput;
  return prisma.marketingLead.findMany({
    where: {
      AND: [
        scope,
        { nextFollowUpAt: { gte: now, lte: until } },
        { level: { in: ["SOURCING", "CLOSING", "OPERATIONS"] } },
      ],
    },
    orderBy: [{ nextFollowUpAt: "asc" }],
    take: Math.min(50, Math.max(1, limit)),
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      convertedOrganization: { select: { id: true, name: true } },
    },
  });
}
