import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePropertyDeskAccess } from "@/server/permissions/property-desk";
import {
  createMarketingLead,
  listMarketingLeads,
} from "@/server/services/property-desk/marketing-leads.service";

const LEVEL_ENUM = ["SOURCING", "CLOSING", "OPERATIONS", "ARCHIVED"] as const;
const PRIORITY_ENUM = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;
const TEMPERATURE_ENUM = ["COLD", "WARM", "HOT"] as const;
const TIMELINE_ENUM = ["WITHIN_30D", "WITHIN_90D", "LATER", "UNDECIDED"] as const;
const BUDGET_ENUM = ["STARTER", "GROWTH", "ENTERPRISE", "UNKNOWN"] as const;
const CHANNEL_ENUM = ["PHONE", "EMAIL", "WHATSAPP", "VIBER", "OTHER"] as const;

// GET dozvoljava listu vrednosti kao ponovljene query param-e ili
// zarezom razdvojenu vrednost — obe forme se normalizuju u niz.
const csv = (s: string | undefined) =>
  s && s.length > 0 ? s.split(",").filter(Boolean) : undefined;

const querySchema = z.object({
  stage: z
    .enum([
      "NEW",
      "CONTACTED",
      "QUALIFIED",
      "DEMO",
      "PROPOSAL",
      "WON",
      "LOST",
      "NURTURING",
    ])
    .optional(),
  audience: z.enum(["INVESTOR", "AGENCY", "OTHER"]).optional(),
  level: z.string().optional(),
  priority: z.string().optional(),
  temperature: z.string().optional(),
  timeline: z.string().optional(),
  assignedTo: z.string().optional(),
  source: z.string().max(80).optional(),
  utmSource: z.string().max(80).optional(),
  hasOverdueTask: z.enum(["1", "0"]).optional(),
  followUpWithinDays: z.coerce.number().int().min(0).max(365).optional(),
  minScore: z.coerce.number().int().min(0).max(100).optional(),
  sort: z.enum(["recent", "score"]).optional(),
  q: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

const createBody = z.object({
  email: z.string().trim().email("Email adresa nije ispravna.").max(200),
  firstName: z.string().trim().max(120).nullable().optional(),
  lastName: z.string().trim().max(120).nullable().optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  audience: z.enum(["INVESTOR", "AGENCY", "OTHER"]).optional(),
  city: z.string().trim().max(120).nullable().optional(),
  note: z.string().trim().max(4000).nullable().optional(),
  source: z.string().trim().max(80).nullable().optional(),
  assignedToUserId: z.string().min(1).nullable().optional(),
  // Bogatija polja — sva opciona.
  companyName: z.string().trim().max(200).nullable().optional(),
  companyWebsite: z.string().trim().max(300).nullable().optional(),
  companySize: z.coerce
    .number()
    .int()
    .min(0)
    .max(1000000)
    .nullable()
    .optional(),
  budgetTier: z.enum(BUDGET_ENUM).optional(),
  budgetCurrency: z.string().trim().max(10).nullable().optional(),
  decisionMakerName: z.string().trim().max(200).nullable().optional(),
  decisionMakerTitle: z.string().trim().max(200).nullable().optional(),
  preferredContact: z.enum(CHANNEL_ENUM).nullable().optional(),
  bestContactHour: z.string().trim().max(80).nullable().optional(),
  preferredLanguage: z.string().trim().max(10).nullable().optional(),
  competitor: z.string().trim().max(200).nullable().optional(),
  painPoint: z.string().trim().max(2000).nullable().optional(),
  country: z.string().trim().max(10).nullable().optional(),
  region: z.string().trim().max(200).nullable().optional(),
  priority: z.enum(PRIORITY_ENUM).optional(),
  temperature: z.enum(TEMPERATURE_ENUM).optional(),
  timelineHorizon: z.enum(TIMELINE_ENUM).optional(),
  nextFollowUpAt: z.coerce.date().nullable().optional(),
});

function parseEnumCsv<T extends readonly string[]>(
  raw: string | undefined,
  allowed: T,
): T[number][] | undefined {
  const values = csv(raw);
  if (!values) return undefined;
  const set = new Set<string>(allowed);
  const filtered = values.filter((v): v is T[number] => set.has(v));
  return filtered.length > 0 ? filtered : undefined;
}

export const GET = apiHandler({}, async ({ searchParams }) => {
  const ctx = await requirePropertyDeskAccess();
  const raw = Object.fromEntries(searchParams.entries());
  const parsed = querySchema.parse(raw);

  let assignedToUserId: string | null | undefined = undefined;
  if (parsed.assignedTo === "unassigned") assignedToUserId = null;
  else if (parsed.assignedTo === "me") assignedToUserId = ctx.session.user.id;
  else if (parsed.assignedTo) assignedToUserId = parsed.assignedTo;

  const result = await listMarketingLeads(ctx, {
    stage: parsed.stage,
    audience: parsed.audience,
    level: parseEnumCsv(parsed.level, LEVEL_ENUM),
    priority: parseEnumCsv(parsed.priority, PRIORITY_ENUM),
    temperature: parseEnumCsv(parsed.temperature, TEMPERATURE_ENUM),
    timelineHorizon: parseEnumCsv(parsed.timeline, TIMELINE_ENUM),
    assignedToUserId,
    q: parsed.q,
    source: parsed.source,
    utmSource: parsed.utmSource,
    hasOverdueTask: parsed.hasOverdueTask === "1",
    followUpWithinDays: parsed.followUpWithinDays,
    minScore: parsed.minScore,
    sort: parsed.sort,
    page: parsed.page,
    pageSize: parsed.pageSize,
  });
  return { data: result };
});

export const POST = apiHandler(
  { bodySchema: createBody },
  async ({ body }) => {
    const ctx = await requirePropertyDeskAccess();
    const lead = await createMarketingLead(ctx, body, ctx.session.user.id);
    return { data: lead, status: 201 };
  },
);

/**
 * @swagger
 * /api/v1/platform/property-desk/leads:
 *   get:
 *     tags:
 *       - platform-property-desk
 *     summary: Lista marketing lead-ova (scope-filtered)
 *     description: |
 *       **Auth:** `requirePropertyDeskAccess() — SUPER_ADMIN ili aktivan property_desk_team_member`
 *
 *       Rezultat je filtriran prema `leadScope` člana tima ili `pd_lead.view_team`.
 *       Parametar `assignedTo=me` filtrira po korisniku, `assignedTo=unassigned`
 *       vraća lead-ove bez vlasnika, a `hasOverdueTask=1` samo one koji imaju
 *       nezavršen task čiji je `dueAt` u prošlosti.
 *     parameters:
 *       - in: query
 *         name: stage
 *         schema:
 *           type: string
 *       - in: query
 *         name: audience
 *         schema:
 *           type: string
 *       - in: query
 *         name: assignedTo
 *         schema:
 *           type: string
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *       - in: query
 *         name: utmSource
 *         schema:
 *           type: string
 *       - in: query
 *         name: hasOverdueTask
 *         schema:
 *           type: string
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *     responses:
 *       "200":
 *         description: OK
 *       "401":
 *         $ref: "#/components/responses/Unauthenticated"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 *   post:
 *     tags:
 *       - platform-property-desk
 *     summary: Ručno kreiraj marketing lead
 *     description: |
 *       **Auth:** `requirePropertyDeskAccess() + pd_lead.create`
 *
 *       Duplikat email-a vraća `409 CONFLICT` sa `context.existingLeadId`.
 *       Ako `assignedToUserId` nije prosleđen, dodela ide na pozivaoca (osim
 *       za SUPER_ADMIN — njima ostaje neraspoređeno).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *     responses:
 *       "201":
 *         description: Kreirano
 *       "401":
 *         $ref: "#/components/responses/Unauthenticated"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 *       "409":
 *         description: Postoji lead sa istim email-om
 */
