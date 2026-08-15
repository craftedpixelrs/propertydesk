import { z } from "zod";
import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import {
  loadOrganizationProfile,
  updateOrganizationProfile,
} from "@/server/services/organization-admin.service";

const updateSchema = z.object({
  displayName: z.string().min(2).max(120).optional(),
  legalName: z.string().min(2).max(200).optional(),
  registrationNumber: z.string().max(60).nullable().optional(),
  taxNumber: z.string().max(60).nullable().optional(),
  address: z.string().max(200).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  postalCode: z.string().max(20).nullable().optional(),
  country: z.string().max(2).nullable().optional(),
  phone: z.string().max(40).nullable().optional(),
  email: z
    .union([z.string().email().max(120), z.literal("")])
    .nullable()
    .optional()
    .transform((v) => (v == null || v === "" ? null : v)),
  website: z
    .string()
    .max(200)
    .nullable()
    .optional()
    .transform((v) => (v == null || v.trim() === "" ? null : v)),
  logoUrl: z.string().url().nullable().optional(),
  paymentAccountNumber: z.string().max(30).nullable().optional(),
  paymentBankName: z.string().max(120).nullable().optional(),
});

export const GET = apiHandler({}, async () => {
  const ctx = await requirePermission("organization.read");
  const data = await loadOrganizationProfile(ctx.organization.organizationId);
  return { data };
});

export const PATCH = apiHandler(
  { bodySchema: updateSchema },
  async ({ body }) => {
    const ctx = await requirePermission("organization.manage");
    const updated = await updateOrganizationProfile(
      ctx.organization.organizationId,
      body,
      ctx.session.user.id,
    );
    return { data: updated };
  },
);

/**
 * @swagger
 * /api/v1/organization/profile:
 *   get:
 *     tags:
 *       - organization
 *     summary: List / read organization
 *     description: |
 *       **Auth:** `requirePermission("organization.read")`
 *     responses:
 *       "200":
 *         description: |
 *           OK
 *       "401":
 *         $ref: "#/components/responses/Unauthenticated"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 *   patch:
 *     tags:
 *       - organization
 *     summary: Update organization
 *     description: |
 *       **Auth:** `requirePermission("organization.manage") + requirePermission("organization.read")`
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *     responses:
 *       "200":
 *         description: |
 *           OK
 *       "401":
 *         $ref: "#/components/responses/Unauthenticated"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 */
