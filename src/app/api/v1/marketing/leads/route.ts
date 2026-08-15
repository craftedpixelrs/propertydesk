import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { ApiError } from "@/lib/api/errors";
import { prisma } from "@/server/db/prisma";
import { enforceRateLimit } from "@/server/rate-limit/enforce";
import { computeLeadScore } from "@/server/services/property-desk/lead-scoring";
import {
  LOOPS_USER_GROUPS,
  upsertLoopsContact,
} from "@/server/services/marketing/loops";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public marketing lead-capture endpoint.
 *
 * Accepts a JSON payload from the landing lead form, validates it, and
 * upserts the visitor as a Loops contact. Rate-limited to 5 requests
 * per minute per IP to blunt drive-by spam without blocking legitimate
 * multi-tab retries.
 *
 * The endpoint is deliberately at `/api/v1/marketing/leads` (not under
 * an authenticated tenant) because the landing site posts here without
 * a session.
 */

const AUDIENCES = ["INVESTOR", "AGENCY"] as const;
const PROJECT_COUNTS = ["ZERO", "ONE_TWO", "THREE_FIVE", "SIX_TEN", "TEN_PLUS"] as const;

// Reasonably strict phone regex — allows +country prefix, digits,
// spaces, dashes, and parentheses. Minimum 6 chars so `123` doesn't
// pass. Not a full ITU E.164 check; that would frustrate typical
// domestic input like `060 123 4567`.
const PHONE_REGEX = /^[+\d][\d\s\-()]{5,30}$/;

const bodySchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(2, "Ime je obavezno.")
    .max(80, "Ime je predugačko."),
  lastName: z
    .string()
    .trim()
    .min(2, "Prezime je obavezno.")
    .max(80, "Prezime je predugačko."),
  email: z
    .string()
    .trim()
    .email("Email adresa nije ispravna.")
    .max(200, "Email adresa je predugačka."),
  phone: z
    .string()
    .trim()
    .min(6, "Telefon je obavezan.")
    .max(40, "Telefon je predugačak.")
    .regex(PHONE_REGEX, "Telefon nije u ispravnom formatu."),
  companyName: z
    .string()
    .trim()
    .max(120, "Naziv firme je predugačak.")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  audience: z.enum(AUDIENCES, {
    message: "Odaberite da li ste investitor ili agencija.",
  }),
  projectCount: z.enum(PROJECT_COUNTS).optional(),
  city: z
    .string()
    .trim()
    .max(80, "Naziv grada je predugačak.")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  note: z
    .string()
    .trim()
    .max(2000, "Poruka je predugačka.")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  consent: z
    .boolean()
    .refine((v) => v === true, {
      message: "Saglasnost sa obradom podataka je obavezna.",
    }),
  utmSource: z.string().trim().max(80).optional(),
  utmMedium: z.string().trim().max(80).optional(),
  utmCampaign: z.string().trim().max(80).optional(),
  referrer: z.string().trim().max(300).optional(),
  // Opciona bogatija polja koja landing forma može da pošalje. Sva su
  // strogo opciona da bi postojeće integracije ostale kompatibilne.
  companyWebsite: z
    .string()
    .trim()
    .max(300)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  budgetTier: z.enum(["STARTER", "GROWTH", "ENTERPRISE", "UNKNOWN"]).optional(),
  timelineHorizon: z
    .enum(["WITHIN_30D", "WITHIN_90D", "LATER", "UNDECIDED"])
    .optional(),
  // Honeypot — bots fill this, humans never see it. Must be empty.
  website: z
    .string()
    .max(0, "invalid")
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

type LeadBody = z.infer<typeof bodySchema>;

const PROJECT_COUNT_LABELS: Record<(typeof PROJECT_COUNTS)[number], string> = {
  ZERO: "0 (u pripremi)",
  ONE_TWO: "1–2",
  THREE_FIVE: "3–5",
  SIX_TEN: "6–10",
  TEN_PLUS: "10+",
};

// Rough integer bucket used in the `marketing_lead.projectCount` column so
// managers can sort/aggregate leads by size band. Kept intentionally lossy —
// the exact bucket string is retained only in the Loops payload.
const PROJECT_COUNT_TO_INT: Record<(typeof PROJECT_COUNTS)[number], number> = {
  ZERO: 0,
  ONE_TWO: 2,
  THREE_FIVE: 5,
  SIX_TEN: 10,
  TEN_PLUS: 15,
};

const AUDIENCE_LABELS: Record<(typeof AUDIENCES)[number], string> = {
  INVESTOR: "Investitor",
  AGENCY: "Agencija za nekretnine",
};

export const POST = apiHandler<LeadBody>(
  { bodySchema },
  async ({ req, body }) => {
    enforceRateLimit({
      req,
      scope: "marketing.leads",
      options: { windowMs: 60_000, max: 5 },
    });

    // Silently succeed on honeypot hits — we don't want the bot to know
    // it was caught. Do NOT contact Loops or persist anything.
    if (body.website && body.website.length > 0) {
      return { data: { ok: true }, status: 202 };
    }

    // 1) Persist to our own marketing_lead pipeline. This is the primary
    // source of truth for the Property Desk operational team; the Loops
    // sync (below) is a secondary, marketing-automation destination.
    //
    // Upsert by email — a returning visitor should update UTM/note without
    // losing the existing pipeline stage or assignee.
    const emailNormalized = body.email.trim().toLowerCase();
    const projectCountBucket = body.projectCount
      ? PROJECT_COUNT_TO_INT[body.projectCount]
      : undefined;
    try {
      const before = await prisma.marketingLead.findUnique({
        where: { email: emailNormalized },
        select: {
          id: true,
          stage: true,
          companyName: true,
          companyWebsite: true,
          companySize: true,
          budgetTier: true,
          timelineHorizon: true,
          decisionMakerName: true,
          decisionMakerTitle: true,
          temperature: true,
        },
      });
      const leadScore = computeLeadScore({
        stage: before?.stage ?? "NEW",
        companyName: body.companyName ?? before?.companyName ?? null,
        companyWebsite: body.companyWebsite ?? before?.companyWebsite ?? null,
        companySize: before?.companySize ?? null,
        budgetTier: body.budgetTier ?? before?.budgetTier ?? "UNKNOWN",
        timelineHorizon:
          body.timelineHorizon ?? before?.timelineHorizon ?? "UNDECIDED",
        decisionMakerName: before?.decisionMakerName ?? null,
        decisionMakerTitle: before?.decisionMakerTitle ?? null,
        temperature: before?.temperature ?? "COLD",
      });
      const lead = await prisma.marketingLead.upsert({
        where: { email: emailNormalized },
        create: {
          email: emailNormalized,
          firstName: body.firstName,
          lastName: body.lastName,
          phone: body.phone,
          audience: body.audience,
          city: body.city ?? null,
          projectCount: projectCountBucket ?? null,
          note: body.note ?? null,
          source: "landing",
          utmSource: body.utmSource ?? null,
          utmMedium: body.utmMedium ?? null,
          utmCampaign: body.utmCampaign ?? null,
          consent: true,
          stage: "NEW",
          level: "SOURCING",
          companyName: body.companyName ?? null,
          companyWebsite: body.companyWebsite ?? null,
          budgetTier: body.budgetTier ?? "UNKNOWN",
          timelineHorizon: body.timelineHorizon ?? "UNDECIDED",
          leadScore,
        },
        update: {
          firstName: body.firstName,
          lastName: body.lastName,
          phone: body.phone,
          audience: body.audience,
          city: body.city ?? undefined,
          projectCount: projectCountBucket ?? undefined,
          note: body.note ?? undefined,
          utmSource: body.utmSource ?? undefined,
          utmMedium: body.utmMedium ?? undefined,
          utmCampaign: body.utmCampaign ?? undefined,
          consent: true,
          companyName: body.companyName ?? undefined,
          companyWebsite: body.companyWebsite ?? undefined,
          budgetTier: body.budgetTier ?? undefined,
          timelineHorizon: body.timelineHorizon ?? undefined,
          leadScore,
        },
      });
      // Emit a SYSTEM activity row so the Property Desk timeline shows the
      // arrival (and any subsequent re-submission) with UTM + referrer.
      await prisma.marketingLeadActivity.create({
        data: {
          leadId: lead.id,
          kind: "SYSTEM",
          title: before
            ? "Lead ponovo pristigao sa landing forme"
            : "Lead pristigao sa landing forme",
          body: body.note ?? null,
          metadata: {
            audience: body.audience,
            city: body.city ?? null,
            projectCount: body.projectCount ?? null,
            utmSource: body.utmSource ?? null,
            utmMedium: body.utmMedium ?? null,
            utmCampaign: body.utmCampaign ?? null,
            referrer: body.referrer ?? null,
          },
        },
      });
    } catch (err) {
      // Lead capture is critical — do not silently swallow. Log and 500.
      console.error("[marketing.leads] DB upsert failed:", err);
      throw new ApiError("INTERNAL_ERROR", "Prijava trenutno nije uspela.", {
        statusCode: 500,
        cause: err,
      });
    }

    // 2) Sync to Loops for marketing automation. Loops failures should NOT
    // lose the lead — but we still surface a friendly error so the operator
    // knows something's off and the visitor can retry.
    try {
      await upsertLoopsContact({
        email: body.email,
        firstName: body.firstName,
        lastName: body.lastName,
        subscribed: true,
        userGroup: LOOPS_USER_GROUPS[body.audience],
        source: "landing",
        // Custom properties. Loops auto-creates the property on first
        // send, so we can iterate on this list without a dashboard step.
        phone: body.phone,
        companyName: body.companyName,
        audience: body.audience,
        audienceLabel: AUDIENCE_LABELS[body.audience],
        projectCount: body.projectCount,
        projectCountLabel: body.projectCount
          ? PROJECT_COUNT_LABELS[body.projectCount]
          : undefined,
        city: body.city,
        note: body.note,
        utmSource: body.utmSource,
        utmMedium: body.utmMedium,
        utmCampaign: body.utmCampaign,
        referrer: body.referrer,
        signupAt: new Date().toISOString(),
        landingLocale: "sr-Latn",
        gdprConsent: true,
      });
    } catch (err) {
      // Fail-soft: the lead is already in our own DB (step 1). We log the
      // Loops error for the operator to reconcile but keep the request
      // successful so the visitor sees a confirmation, not a red banner.
      console.error("[marketing.leads] Loops sync failed (lead was saved):", err);
    }

    return { data: { ok: true }, status: 201 };
  },
);

/**
 * @swagger
 * /api/v1/marketing/leads:
 *   post:
 *     tags:
 *       - marketing
 *     summary: Prijava lead-a sa marketing landing stranice
 *     description: |
 *       **Auth:** `javno + rate-limit (bez sesije)`
 *       Javni endpoint — bez autentikacije. Rate-limitovan.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *     responses:
 *       "200":
 *         description: Lead primljen
 *       "422":
 *         $ref: "#/components/responses/ValidationFailed"
 *       "429":
 *         $ref: "#/components/responses/RateLimited"
 */
