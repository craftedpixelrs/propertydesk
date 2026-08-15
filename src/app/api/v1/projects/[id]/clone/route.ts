import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { cloneProjectStructure } from "@/server/services/projects/clone.service";

const paramsSchema = z.object({ id: z.string().min(1) });

const bodySchema = z.object({
  newProjectCode: z
    .string()
    .trim()
    .min(1, "Šifra novog projekta je obavezna."),
  newProjectName: z
    .string()
    .trim()
    .min(1, "Naziv novog projekta je obavezan."),
  newProjectSlug: z.string().trim().optional(),
  copyBuildings: z.boolean().optional(),
  copyEntrances: z.boolean().optional(),
  copyFloors: z.boolean().optional(),
  copyUnitsAsAvailable: z.boolean().optional(),
  copyCosts: z.boolean().optional(),
});

export const POST = apiHandler(
  { paramsSchema, bodySchema },
  async ({ params, body }) => {
    const ctx = await requirePermission("project.create");
    const data = await cloneProjectStructure({
      organizationId: ctx.organization.organizationId,
      actorUserId: ctx.session.user.id,
      sourceProjectId: params.id,
      newProjectCode: body.newProjectCode,
      newProjectName: body.newProjectName,
      newProjectSlug: body.newProjectSlug,
      copyBuildings: body.copyBuildings,
      copyEntrances: body.copyEntrances,
      copyFloors: body.copyFloors,
      copyUnitsAsAvailable: body.copyUnitsAsAvailable,
      copyCosts: body.copyCosts,
    });
    return { data, status: 201 };
  },
);

/**
 * @swagger
 * /api/v1/projects/{id}/clone:
 *   post:
 *     tags:
 *       - projects
 *     summary: Create projects
 *     description: |
 *       **Auth:** `requirePermission("project.create")`
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
 *         description: |
 *           OK
 *       "401":
 *         $ref: "#/components/responses/Unauthenticated"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 */
