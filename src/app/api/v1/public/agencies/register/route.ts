import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { enforceRateLimit } from "@/server/rate-limit/enforce";
import { registerAgency } from "@/server/services/agencies/register.service";

const bodySchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().trim().email().max(200),
  password: z.string().min(10).max(128),
  displayName: z.string().min(2).max(200),
  legalName: z.string().min(2).max(200),
  taxNumber: z.string().min(2).max(32),
  registrationNumber: z.string().min(2).max(32),
  address: z.string().min(2).max(300),
  city: z.string().min(2).max(120),
  postalCode: z.string().min(3).max(16),
  phone: z.string().min(5).max(40),
  website: z.string().max(200).optional().nullable(),
});

export const POST = apiHandler({ bodySchema }, async ({ req, body }) => {
  enforceRateLimit({
    req,
    scope: "public.agency.register",
    callerId: body.email.toLowerCase(),
    options: { windowMs: 60 * 60_000, max: 5 },
  });
  const result = await registerAgency({
    ownerName: body.name,
    email: body.email,
    password: body.password,
    displayName: body.displayName,
    legalName: body.legalName,
    taxNumber: body.taxNumber,
    registrationNumber: body.registrationNumber,
    address: body.address,
    city: body.city,
    postalCode: body.postalCode,
    phone: body.phone,
    website: body.website,
  });
  return { data: result, status: 201 };
});

/**
 * @swagger
 * /api/v1/public/agencies/register:
 *   post:
 *     tags:
 *       - public
 *     summary: Self-registracija agencije
 *     description: |
 *       **Auth:** `javno + rate-limit (bez sesije)`
 *       Kreira besplatan partner nalog. Katalog je odmah vidljiv;
 *       zahtev za saradnju čeka verifikaciju platforme.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *               - displayName
 *               - legalName
 *               - taxNumber
 *               - registrationNumber
 *               - address
 *               - city
 *               - postalCode
 *               - phone
 *     responses:
 *       "201":
 *         description: Created
 *       "409":
 *         $ref: "#/components/responses/Conflict"
 */
