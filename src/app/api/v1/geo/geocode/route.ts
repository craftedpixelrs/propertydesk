import { apiHandler } from "@/lib/api/handler";
import { ApiError } from "@/lib/api/errors";
import { requirePermission } from "@/server/permissions/require";
import { geocodeAddress } from "@/server/services/geo/places.service";

export const GET = apiHandler({}, async ({ req }) => {
  await requirePermission("project.read");
  const address = (req.nextUrl.searchParams.get("address") ?? "").slice(0, 200);
  const city = (req.nextUrl.searchParams.get("city") ?? "").slice(0, 120);
  if (!address || !city) {
    throw new ApiError("VALIDATION_ERROR", "Adresa i grad su obavezni.");
  }
  const item = await geocodeAddress(address, city);
  return { data: { item } };
});

/**
 * @swagger
 * /api/v1/geo/geocode:
 *   get:
 *     tags:
 *       - projects
 *     summary: Geocode an address in a city
 *     description: |
 *       **Auth:** `requirePermission("project.read")`
 *     responses:
 *       "200":
 *         description: Coordinates
 *       "401":
 *         $ref: "#/components/responses/Unauthenticated"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 */
