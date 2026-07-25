import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { DomainErrors } from "@/lib/errors";
import { requireSuperAdmin } from "@/server/permissions/require";
import { recordAudit } from "@/server/audit/audit";
import { sendEmail } from "@/server/auth/email";
import { previewBillingEmail } from "@/server/services/billing/emails/preview";

const paramsSchema = z.object({ key: z.string().min(1) });

const bodySchema = z.object({
  to: z.string().email("Neispravna email adresa.").optional(),
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
 * POST /api/v1/billing/templates/{key}/test-send
 *
 * Send a fully-rendered preview of a billing template to a chosen email.
 * When `to` is omitted, the recipient is the currently signed-in
 * super-admin — the common case ("send me a test").
 *
 * This uses `sendEmail` directly (not `notify`) because a test send is
 * not a real business event and must NOT produce an in-app notification
 * for the recipient. We do, however, record an audit row so we can
 * reconstruct who sent what and when.
 */
export const POST = apiHandler(
  { paramsSchema, bodySchema },
  async ({ params, body }) => {
    const ctx = await requireSuperAdmin();

    const recipient = body.to ?? ctx.session.user.email;
    if (!recipient) {
      throw DomainErrors.badRequest(
        "Nedostaje email adresa za slanje test poruke.",
      );
    }

    const rendered = await previewBillingEmail(params.key, {
      variables: body.variables,
      draft: body.draft,
    });

    await sendEmail({
      to: recipient,
      subject: `[TEST] ${rendered.subject}`,
      text: rendered.text,
      html: rendered.html,
    });

    await recordAudit({
      action: "billing.email_template_test_sent",
      entityType: "BillingEmailTemplate",
      entityId: params.key,
      actorUserId: ctx.session.user.id,
      newValues: { to: recipient, subject: rendered.subject },
    });

    return { data: { sent: true, to: recipient } };
  },
);
