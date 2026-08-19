import { revalidatePath } from "next/cache";

import { apiHandler } from "@/lib/api/handler";
import { DomainErrors } from "@/lib/errors";
import { requirePermission } from "@/server/permissions/require";
import {
  removeOrganizationLogo,
  uploadOrganizationLogo,
} from "@/server/services/organization-logo.service";

function refreshAppChrome() {
  revalidatePath("/", "layout");
}

export const POST = apiHandler({}, async ({ req }) => {
  const ctx = await requirePermission("organization.manage");
  const form = await req.formData().catch(() => null);
  if (!form) throw DomainErrors.badRequest("Neispravna forma.");

  const file = form.get("file");
  if (!(file instanceof File)) {
    throw DomainErrors.badRequest("Datoteka je obavezna.");
  }

  const result = await uploadOrganizationLogo({
    organizationId: ctx.organization.organizationId,
    actorUserId: ctx.session.user.id,
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    buffer: Buffer.from(await file.arrayBuffer()),
  });

  refreshAppChrome();
  return { data: result, status: 201 };
});

export const DELETE = apiHandler({}, async () => {
  const ctx = await requirePermission("organization.manage");
  await removeOrganizationLogo({
    organizationId: ctx.organization.organizationId,
    actorUserId: ctx.session.user.id,
  });
  refreshAppChrome();
  return { data: { logoUrl: null } };
});

/**
 * @swagger
 * /api/v1/organization/logo:
 *   post:
 *     tags:
 *       - organization
 *     summary: Upload organization logo
 *     description: |
 *       **Auth:** `requirePermission("organization.manage")`
 *     responses:
 *       "201":
 *         description: OK
 *   delete:
 *     tags:
 *       - organization
 *     summary: Remove organization logo
 *     description: |
 *       **Auth:** `requirePermission("organization.manage")`
 *     responses:
 *       "200":
 *         description: OK
 */
