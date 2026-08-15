import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import {
  requirePdPermission,
  requirePropertyDeskAccess,
} from "@/server/permissions/property-desk";
import {
  convertMarketingLead,
  provisionMarketingLead,
} from "@/server/services/property-desk/marketing-leads.service";

const paramsSchema = z.object({ id: z.string().min(1) });

const bodySchema = z
  .object({
    organizationId: z.string().min(1).optional(),
    createOrganization: z
      .object({
        name: z.string().trim().min(2).max(120),
        slug: z
          .string()
          .trim()
          .max(60)
          .regex(
            /^[a-z0-9-]*$/,
            "Slug može sadržati samo mala slova, brojeve i crticu.",
          )
          .optional()
          .nullable(),
        legalName: z.string().max(200).optional().nullable(),
        displayName: z.string().max(120).optional().nullable(),
        city: z.string().max(100).optional().nullable(),
        address: z.string().max(200).optional().nullable(),
        taxNumber: z.string().max(60).optional().nullable(),
        registrationNumber: z.string().max(60).optional().nullable(),
        email: z.string().max(120).optional().nullable(),
        phone: z.string().max(40).optional().nullable(),
        website: z.string().max(300).optional().nullable(),
        country: z.string().max(2).optional().nullable(),
        planCode: z.string().min(1).max(60),
        trialDays: z.number().int().min(0).max(365).optional().nullable(),
        owner: z.object({
          name: z.string().trim().min(1).max(120),
          email: z.string().trim().email().max(254),
          password: z.string().min(10).max(128),
        }),
      })
      .optional(),
  })
  .refine(
    (body) => Boolean(body.organizationId) !== Boolean(body.createOrganization),
    {
      message:
        "Pošaljite organizationId ili createOrganization — tačno jedno.",
    },
  );

export const POST = apiHandler(
  { paramsSchema, bodySchema },
  async ({ params, body }) => {
    const access = await requirePropertyDeskAccess();
    const ctx = await requirePdPermission(access, "pd_lead.convert");
    const actorUserId = ctx.session.user.id;

    if (body.createOrganization) {
      const result = await provisionMarketingLead(
        ctx,
        params.id,
        body.createOrganization,
        actorUserId,
      );
      return { data: result };
    }

    const lead = await convertMarketingLead(
      ctx,
      params.id,
      body.organizationId!,
      actorUserId,
    );
    return { data: { lead, organization: null, owner: null } };
  },
);

/**
 * @swagger
 * /api/v1/platform/property-desk/leads/{id}/convert:
 *   post:
 *     tags:
 *       - platform-property-desk
 *     summary: Konvertuj marketing lead u tenant organizaciju
 *     description: |
 *       **Auth:** `requirePropertyDeskAccess() + pd_lead.convert + canViewMarketingLead(lead)`
 *
 *       Dva moda (tačno jedan):
 *       1. `organizationId` — veži postojeći tenant. Default: CLOSER,
 *          OPERATIONS, MANAGER, SUPER_ADMIN.
 *       2. `createOrganization` — napravi novi tenant + vlasnika najvišeg
 *          stepena (`INVESTOR_OWNER` / `AGENCY_OWNER` iz zaključane
 *          publike) i veži lead. Samo SUPER_ADMIN i OPERATIONS. Tip
 *          organizacije i paket se uzimaju iz lead-a / `planCode`.
 *
 *       Oba moda postavljaju `stage=WON`, `convertedOrganizationId`,
 *       `convertedAt`. Ako lead još nije bio u L3, auto-unassign ide u
 *       Operations pool.
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
 *             properties:
 *               organizationId:
 *                 type: string
 *               createOrganization:
 *                 type: object
 *     responses:
 *       "200":
 *         description: OK
 *       "401":
 *         $ref: "#/components/responses/Unauthenticated"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 *       "404":
 *         description: Lead ili organizacija ne postoji
 *       "409":
 *         description: Lead je već konvertovan
 */
