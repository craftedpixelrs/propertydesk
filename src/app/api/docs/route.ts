import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * OpenAPI 3.1 spec of the PropertyDesk REST API.
 *
 * Served publicly — the spec itself is not secret (only the data it
 * describes is). Rate-limited at the reverse proxy level on production.
 *
 * - Development: generates the spec live from JSDoc in `src/app/api/**`
 *   so edits show up without rebuilding.
 * - Production: reads the build-time snapshot at `public/api-docs.json`
 *   (written by `scripts/build-swagger-spec.ts` during `pnpm build`).
 *   Runtime parsing is unreliable in production because webpack strips
 *   JSDoc comments from the bundled output.
 *
 * IMPORTANT: do not write the literal "@" + "swagger" token in prose above
 * the real annotation — swagger-jsdoc treats any of those as a path
 * definition and used to inject hundreds of junk numeric paths into the
 * published spec.
 *
 * @swagger
 * /api/docs:
 *   get:
 *     tags:
 *       - public
 *     summary: OpenAPI spec
 *     description: |
 *       **Auth:** `javno (bez sesije)`
 *       Returns the OpenAPI 3.1 JSON document for this API.
 *     security: []
 *     responses:
 *       "200":
 *         description: OpenAPI 3.1 JSON document.
 */
export const GET = async () => {
  if (process.env.NODE_ENV !== "production") {
    const { getApiDocs } = await import("@/lib/swagger");
    return NextResponse.json(getApiDocs());
  }

  try {
    const specPath = resolve(process.cwd(), "public", "api-docs.json");
    const spec = JSON.parse(readFileSync(specPath, "utf8"));
    return NextResponse.json(spec);
  } catch (err) {
    console.error("[api/docs] Failed to read spec:", err);
    return NextResponse.json(
      {
        error:
          "OpenAPI spec not available. Run `pnpm docs:swagger:spec` (or `pnpm build`) to generate it.",
      },
      { status: 503 },
    );
  }
};
