import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requireSuperAdmin } from "@/server/permissions/require";
import { previewBillingEmail } from "@/server/services/billing/emails/preview";

const paramsSchema = z.object({ key: z.string().min(1) });

const bodySchema = z.object({
  variables: z.record(z.string(), z.string()).optional(),
  draft: z
    .object({
      subject: z.string().max(500).optional(),
      bodyText: z.string().max(50_000).optional(),
      bodyHtml: z.string().max(200_000).optional(),
    })
    .optional(),
});

/**
 * POST /api/v1/billing/templates/{key}/preview
 *
 * Render the template with sample data plus any operator-supplied
 * overrides. Never sends email — this is a read-only render pipeline,
 * safe to hit as often as the admin editor wants for live preview.
 *
 * The optional `draft` field lets the editor show unsaved changes:
 * subject/text/html supplied here take precedence over the DB row, so
 * the operator sees exactly what a save would produce.
 */
export const POST = apiHandler(
  { paramsSchema, bodySchema },
  async ({ params, body }) => {
    await requireSuperAdmin();
    const preview = await previewBillingEmail(params.key, {
      variables: body.variables,
      draft: body.draft,
    });
    return {
      data: {
        subject: preview.subject,
        html: preview.html,
        text: preview.text,
        variables: preview.variables,
      },
    };
  },
);

/**
 * @swagger
 * /api/v1/billing/templates/{key}/preview:
 *   post:
 *     tags:
 *       - billing
 *     summary: Create billing
 *     parameters:
 *       - in: path
 *         name: key
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
