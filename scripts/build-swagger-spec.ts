#!/usr/bin/env tsx
/**
 * Build-time script: generate OpenAPI spec and write it to
 * `public/api-docs.json` so it can be served as a static asset.
 *
 * This is necessary because `next-swagger-doc` reads route source files at
 * runtime to extract JSDoc @swagger blocks. In production builds (especially
 * with Turbopack), those comments are stripped from the bundled output,
 * leaving the spec empty. By generating the spec at build time and writing
 * it to `public/`, we guarantee it's always available regardless of how
 * the app was built.
 */

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getApiDocs } from "../src/lib/swagger.ts";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const OUT_PATH = resolve(ROOT, "public", "api-docs.json");

const spec = getApiDocs();
writeFileSync(OUT_PATH, JSON.stringify(spec, null, 2), "utf8");

console.log(`[swagger] spec written to ${OUT_PATH} (${Object.keys(spec.paths || {}).length} paths)`);
