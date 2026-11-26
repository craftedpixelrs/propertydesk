import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { importExportedUnits } from "@/server/services/units-import.service";

const bodySchema = z.object({
  fileName: z.string().min(1).max(200),
  contentBase64: z.string().min(1),
});

export const POST = apiHandler({ bodySchema }, async ({ body }) => {
  const ctx = await requirePermission("inventory.import");
  const buffer = Buffer.from(body.contentBase64, "base64");
  const result = await importExportedUnits({
    organizationId: ctx.organization.organizationId,
    actorUserId: ctx.session.user.id,
    fileName: body.fileName,
    buffer,
  });
  return { data: result };
});

/**
 * @swagger
 * /api/v1/units/import:
 *   post:
 *     tags:
 *       - units
 *     summary: Uvezi jedinice iz izvoznog fajla
 *     description: |
 *       Prima CSV ili XLSX sa istim kolonama kao izvoz jedinica.
 *       Red se poklapa po šifri projekta i šifri jedinice: postojeća
 *       jedinica se ažurira, nova šifra se dodaje.
 *       **Auth:** `requirePermission("inventory.import")`
 *     responses:
 *       "200":
 *         description: Rezultat uvoza (ažurirano, dodato, greške po redu).
 *       "400":
 *         description: Fajl nema obavezne kolone ili nije podržan format.
 *       "401":
 *         $ref: "#/components/responses/Unauthenticated"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 */
