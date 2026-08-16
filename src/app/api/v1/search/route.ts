import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { loadUserContext } from "@/server/auth/context";
import { ApiError } from "@/lib/api/errors";
import {
  runGlobalSearch,
  toSearchCaller,
  type SearchHit,
} from "@/server/services/search.service";

/**
 * Global command-palette search endpoint.
 *
 * Tenant hits (projects / units / buyers) are included only when the
 * caller has an active organization and the matching `*.read` permission.
 * SUPER_ADMIN and Property Desk operators can search without an active
 * org — they get organizations, users and marketing leads instead.
 */

const querySchema = z.object({
  q: z.string().trim().min(1).max(200),
  limit: z.coerce.number().int().min(1).max(20).optional(),
});

export type { SearchHit };

export const GET = apiHandler({}, async ({ req }) => {
  const ctx = await loadUserContext();
  if (!ctx) {
    throw new ApiError("UNAUTHENTICATED", "Prijava je obavezna.", {
      statusCode: 401,
    });
  }

  const parsed = querySchema.safeParse({
    q: req.nextUrl.searchParams.get("q") ?? "",
    limit: req.nextUrl.searchParams.get("limit") ?? undefined,
  });
  if (!parsed.success) {
    return { data: { hits: [] as SearchHit[] } };
  }

  const hits = await runGlobalSearch({
    caller: toSearchCaller(ctx),
    q: parsed.data.q,
    perEntity: parsed.data.limit ?? 5,
  });

  return { data: { hits } };
});

/**
 * @swagger
 * /api/v1/search:
 *   get:
 *     tags:
 *       - search
 *     summary: Globalna pretraga
 *     description: |
 *       **Auth:** sesija (ulogovan). Aktivna organizacija nije obavezna —
 *       platform admin i Property Desk tim pretražuju svoje entitete i
 *       bez nje.
 *     responses:
 *       "200":
 *         description: |
 *           OK
 *       "401":
 *         $ref: "#/components/responses/Unauthenticated"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 */
