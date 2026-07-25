import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { ApiError } from "@/lib/api/errors";
import { enforceRateLimit } from "@/server/rate-limit/enforce";
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
    // it was caught. Do NOT contact Loops.
    if (body.website && body.website.length > 0) {
      return { data: { ok: true }, status: 202 };
    }

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
      // `upsertLoopsContact` already logs the upstream body — surface a
      // 502-ish error to the client with a friendly Serbian message.
      const message =
        err instanceof Error
          ? err.message
          : "Prijava trenutno nije uspela.";
      throw new ApiError("INTERNAL_ERROR", message, {
        statusCode: 502,
        cause: err,
      });
    }

    return { data: { ok: true }, status: 201 };
  },
);
