import { z } from "zod";
import { apiHandler } from "@/lib/api/handler";
import { requireSuperAdmin } from "@/server/permissions/require";
import {
  getOrganizationForPlatformAdmin,
  updateOrganizationByPlatformAdmin,
} from "@/server/services/platform.service";
import { remainingTrialDays } from "@/server/services/subscriptions/trial-days";

const paramsSchema = z.object({ id: z.string().min(1) });

const emptyToNull = (value: unknown) =>
  value === "" || value === undefined ? null : value;

const updateSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Slug može sadržati samo mala slova, brojeve i crticu."),
  type: z.enum(["INVESTOR", "AGENCY"]),
  legalName: z.string().min(2).max(200),
  displayName: z.string().min(2).max(120),
  registrationNumber: z.preprocess(emptyToNull, z.string().max(60).nullable()).optional(),
  taxNumber: z.preprocess(emptyToNull, z.string().max(60).nullable()).optional(),
  address: z.preprocess(emptyToNull, z.string().max(200).nullable()).optional(),
  city: z.preprocess(emptyToNull, z.string().max(100).nullable()).optional(),
  postalCode: z.preprocess(emptyToNull, z.string().max(20).nullable()).optional(),
  country: z.preprocess(emptyToNull, z.string().max(2).nullable()).optional(),
  phone: z.preprocess(emptyToNull, z.string().max(40).nullable()).optional(),
  email: z.preprocess(emptyToNull, z.string().email().max(120).nullable()).optional(),
  website: z.preprocess(emptyToNull, z.string().max(300).nullable()).optional(),
  planCode: z.string().min(1).max(60),
  status: z.enum(["TRIAL", "ACTIVE", "RESTRICTED", "SUSPENDED", "CLOSED"]).optional(),
  trialDays: z.number().int().min(0).max(365).optional().nullable(),
});

function toFormPayload(org: Awaited<ReturnType<typeof getOrganizationForPlatformAdmin>>) {
  const trialEndsAt = org.subscription?.trialEndsAt ?? null;

  return {
    id: org.id,
    name: org.name,
    slug: org.slug ?? "",
    type: org.profile?.type ?? "INVESTOR",
    legalName: org.profile?.legalName ?? org.name,
    displayName: org.profile?.displayName ?? org.name,
    registrationNumber: org.profile?.registrationNumber ?? "",
    taxNumber: org.profile?.taxNumber ?? "",
    address: org.profile?.address ?? "",
    city: org.profile?.city ?? "",
    postalCode: org.profile?.postalCode ?? "",
    country: org.profile?.country ?? "RS",
    phone: org.profile?.phone ?? "",
    email: org.profile?.email ?? "",
    website: org.profile?.website ?? "",
    planCode: org.subscription?.plan.code ?? "trial",
    status: org.profile?.status ?? "TRIAL",
    trialDays: remainingTrialDays(trialEndsAt),
    trialEndsAt: trialEndsAt?.toISOString() ?? null,
  };
}

export const GET = apiHandler({ paramsSchema }, async ({ params }) => {
  await requireSuperAdmin();
  const org = await getOrganizationForPlatformAdmin(params.id);
  return { data: toFormPayload(org) };
});

export const PATCH = apiHandler(
  { bodySchema: updateSchema, paramsSchema },
  async ({ body, params }) => {
    const ctx = await requireSuperAdmin();
    const org = await updateOrganizationByPlatformAdmin(
      params.id,
      body,
      ctx.session.user.id,
    );
    return { data: toFormPayload(org) };
  },
);

/**
 * @swagger
 * /api/v1/platform/organizations/{id}:
 *   get:
 *     tags:
 *       - platform
 *     summary: Read one organization (platform admin)
 *     description: |
 *       **Auth:** `requireSuperAdmin()`
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       "200":
 *         description: OK
 *       "401":
 *         $ref: "#/components/responses/Unauthenticated"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 *   patch:
 *     tags:
 *       - platform
 *     summary: Update organization profile, plan and status
 *     description: |
 *       **Auth:** `requireSuperAdmin()`
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *     responses:
 *       "200":
 *         description: OK
 *       "401":
 *         $ref: "#/components/responses/Unauthenticated"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 */
