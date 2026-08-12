import { NextResponse } from "next/server";

import { getApiDocs } from "@/lib/swagger";

/**
 * OpenAPI 3.1 spec of the PropertyDesk REST API.
 *
 * Served publicly — the spec itself is not secret (only the data it
 * describes is). Rate-limited at the reverse proxy level on production.
 *
 * @swagger
 * /api/docs:
 *   get:
 *     tags:
 *       - public
 *     summary: OpenAPI spec
 *     description: Returns the OpenAPI 3.1 JSON document for this API.
 *     security: []
 *     responses:
 *       "200":
 *         description: OpenAPI 3.1 JSON document.
 */
export const GET = () => {
  return NextResponse.json(getApiDocs());
};
