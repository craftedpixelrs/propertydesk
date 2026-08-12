import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { NextResponse } from "next/server";

export const dynamic = "force-static";
export const runtime = "nodejs";

/**
 * OpenAPI 3.1 spec of the PropertyDesk REST API.
 *
 * Served publicly — the spec itself is not secret (only the data it
 * describes is). Rate-limited at the reverse proxy level on production.
 *
 * NOTE: The spec is generated at BUILD TIME by `scripts/build-swagger-spec.ts`
 * and written to `public/api-docs.json`. This is necessary because
 * `next-swagger-doc` reads route source files at runtime to extract JSDoc
 * @swagger blocks, but in production builds those comments are stripped
 * from the bundled output. By generating the spec at build time and writing
 * it to `public/`, we guarantee it's always available.
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
  try {
    const specPath = resolve(process.cwd(), "public", "api-docs.json");
    const spec = JSON.parse(readFileSync(specPath, "utf8"));
    return NextResponse.json(spec);
  } catch (err) {
    console.error("[api/docs] Failed to read spec:", err);
    return NextResponse.json(
      { error: "OpenAPI spec not available. Run `pnpm build` to generate it." },
      { status: 503 },
    );
  }
};
