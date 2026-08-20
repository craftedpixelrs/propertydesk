import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { ApiError } from "@/lib/api/errors";
import { requirePermission } from "@/server/permissions/require";
import {
  suggestAddresses,
  suggestLocalPlaces,
  type GeoSuggestKind,
} from "@/server/services/geo/places.service";

const kindSchema = z.enum(["city", "municipality", "address"]);

export const GET = apiHandler({}, async ({ req }) => {
  await requirePermission("project.read");
  const kind = kindSchema.safeParse(req.nextUrl.searchParams.get("kind"));
  if (!kind.success) {
    throw new ApiError("VALIDATION_ERROR", "Nepoznata vrsta predloga.");
  }
  const q = (req.nextUrl.searchParams.get("q") ?? "").slice(0, 120);
  const city = (req.nextUrl.searchParams.get("city") ?? "").slice(0, 120);
  const items =
    kind.data === "address"
      ? await suggestAddresses(q, city)
      : suggestLocalPlaces(kind.data as Exclude<GeoSuggestKind, "address">, q, city);
  return { data: { items } };
});

/**
 * @swagger
 * /api/v1/geo/suggest:
 *   get:
 *     tags:
 *       - projects
 *     summary: Suggest city, municipality, or street
 *     description: |
 *       **Auth:** `requirePermission("project.read")`
 *     responses:
 *       "200":
 *         description: Suggestion list
 *       "401":
 *         $ref: "#/components/responses/Unauthenticated"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 */
