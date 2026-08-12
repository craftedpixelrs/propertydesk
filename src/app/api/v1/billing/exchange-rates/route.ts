import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requireSuperAdmin } from "@/server/permissions/require";
import {
  createExchangeRate,
  listExchangeRates,
} from "@/server/services/billing/exchange-rates/service";

const bodySchema = z.object({
  baseCurrency: z.string().min(3).max(3).optional(),
  quoteCurrency: z.string().min(3).max(3).optional(),
  rate: z.union([
    z.number().positive(),
    z.string().regex(/^\d+(\.\d+)?$/, "Kurs mora biti pozitivan broj."),
  ]),
  effectiveDate: z.coerce.date(),
  note: z.string().max(500).nullish(),
  source: z.enum(["MANUAL", "NBS"]).optional(),
});

export const GET = apiHandler({}, async ({ searchParams }) => {
  await requireSuperAdmin();
  const rows = await listExchangeRates({
    baseCurrency: searchParams.get("base") ?? undefined,
    quoteCurrency: searchParams.get("quote") ?? undefined,
    limit: searchParams.get("limit")
      ? Math.max(1, Math.min(1000, Number(searchParams.get("limit"))))
      : undefined,
  });
  return { data: rows };
});

export const POST = apiHandler({ bodySchema }, async ({ body }) => {
  const ctx = await requireSuperAdmin();
  const created = await createExchangeRate(
    {
      baseCurrency: body.baseCurrency,
      quoteCurrency: body.quoteCurrency,
      rate: body.rate,
      effectiveDate: body.effectiveDate,
      note: body.note ?? null,
      source: body.source,
    },
    ctx.session.user.id,
  );
  return { data: created, status: 201 };
});

/**
 * @swagger
 * /api/v1/billing/exchange-rates:
 *   get:
 *     tags:
 *       - billing
 *     summary: List / read billing
 *     responses:
 *       "200":
 *         description: OK
 *       "401":
 *         $ref: "#/components/responses/Unauthenticated"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 *   post:
 *     tags:
 *       - billing
 *     summary: Create billing
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
