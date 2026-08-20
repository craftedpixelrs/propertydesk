import { apiHandler } from "@/lib/api/handler";
import { DomainErrors } from "@/lib/errors";
import { requirePermission } from "@/server/permissions/require";
import { uploadProjectCoverImage } from "@/server/services/projects/cover-image.service";

export const POST = apiHandler({}, async ({ req }) => {
  const ctx = await requirePermission("project.update").catch(() =>
    requirePermission("project.create"),
  );
  const form = await req.formData().catch(() => null);
  if (!form) throw DomainErrors.badRequest("Neispravna forma.");

  const file = form.get("file");
  if (!(file instanceof File)) {
    throw DomainErrors.badRequest("Datoteka je obavezna.");
  }
  const projectIdRaw = String(form.get("projectId") ?? "").trim();

  const result = await uploadProjectCoverImage({
    organizationId: ctx.organization.organizationId,
    actorUserId: ctx.session.user.id,
    projectId: projectIdRaw || undefined,
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    buffer: Buffer.from(await file.arrayBuffer()),
  });

  return { data: result, status: 201 };
});

/**
 * @swagger
 * /api/v1/projects/cover:
 *   post:
 *     tags:
 *       - projects
 *     summary: Upload a project cover photo
 *     description: |
 *       **Auth:** `requirePermission("project.update")` or `project.create`
 *     responses:
 *       "201":
 *         description: Public cover path
 *       "401":
 *         $ref: "#/components/responses/Unauthenticated"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 */
