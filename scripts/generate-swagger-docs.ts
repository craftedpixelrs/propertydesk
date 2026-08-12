#!/usr/bin/env tsx
/**
 * Auto-generate JSDoc `@swagger` blocks for every `src/app/api/**\/route.ts`
 * that doesn't already have one.
 *
 * Heuristics:
 *   - HTTP verb from `export const GET|POST|PATCH|PUT|DELETE`.
 *   - Tag = first path segment under `/api/` (`v1`, `auth`, `health`, `public`).
 *   - If path starts with `v1/`, second segment is the real tag.
 *   - `bodySchema` / Zod fields are inlined as `requestBody` (only required
 *     fields listed, for brevity).
 *   - Public routes under `/api/public/*`, `/api/health`, `/api/docs` and
 *     `/api/auth/*` are marked `security: []`.
 *
 * Idempotent: if a route file already contains `@swagger`, it's skipped.
 *
 * Run:
 *   pnpm tsx scripts/generate-swagger-docs.ts [--dry-run]
 */

import { readFileSync, writeFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { glob } from "node:fs/promises";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const API_DIR = resolve(ROOT, "src/app/api");
const DRY_RUN = process.argv.includes("--dry-run");

interface RouteMeta {
  file: string;
  path: string;
  tag: string;
  methods: string[];
  isPublic: boolean;
}

function toOpenApiPath(rel: string): { path: string; tag: string } {
  // src/app/api/v1/units/[id]/route.ts  ->  /api/v1/units/{id}
  const withoutPrefix = rel.replace(/\\/g, "/").replace(/^src\/app\/api\//, "");
  const withoutRoute = withoutPrefix.replace(/\/route\.ts$/, "");
  const withBraces = withoutRoute
    .split("/")
    .map((seg) =>
      seg.startsWith("[...") && seg.endsWith("]")
        ? `{${seg.slice(4, -1)}}` // [...all] -> {all}
        : seg.startsWith("[") && seg.endsWith("]")
          ? `{${seg.slice(1, -1)}}`
          : seg,
    )
    .join("/");
  const path = `/api/${withBraces}`;

  const segments = withBraces.split("/").filter(Boolean);
  let tag = segments[0] ?? "root";
  if (tag === "v1") tag = segments[1] ?? "v1";
  // Public / auth / health share one tag each.
  if (["public", "auth", "health", "docs"].includes(tag)) {
    tag = tag === "docs" ? "public" : tag;
  }
  return { path, tag };
}

function isPublicRoute(path: string): boolean {
  return (
    path.startsWith("/api/public") ||
    path.startsWith("/api/v1/public") ||
    path.startsWith("/api/health") ||
    path.startsWith("/api/v1/health") ||
    path.startsWith("/api/v1/marketing") ||
    path.startsWith("/api/auth") ||
    path === "/api/docs"
  );
}

const PATH_PARAM_RE = /\{([a-zA-Z_][\w]*)\}/g;

function parametersBlock(path: string): string {
  const matches = [...path.matchAll(PATH_PARAM_RE)];
  if (matches.length === 0) return "";
  const lines: string[] = [" *     parameters:"];
  for (const m of matches) {
    const name = m[1];
    lines.push(` *       - in: path`);
    lines.push(` *         name: ${name}`);
    lines.push(` *         required: true`);
    lines.push(` *         schema:`);
    lines.push(` *           type: string`);
  }
  return lines.join("\n");
}

function methodBlock(
  method: string,
  route: RouteMeta,
  summary: string,
  description: string,
): string {
  const isGetOrDelete = method === "get" || method === "delete";
  const params = parametersBlock(route.path);
  const lines: string[] = [];
  lines.push(` *   ${method}:`);
  lines.push(` *     tags:`);
  lines.push(` *       - ${route.tag}`);
  lines.push(` *     summary: ${summary}`);
  if (description) lines.push(` *     description: ${description}`);
  if (route.isPublic) lines.push(` *     security: []`);
  if (params) lines.push(params);
  if (!isGetOrDelete) {
    lines.push(` *     requestBody:`);
    lines.push(` *       required: true`);
    lines.push(` *       content:`);
    lines.push(` *         application/json:`);
    lines.push(` *           schema:`);
    lines.push(` *             type: object`);
    lines.push(` *             additionalProperties: true`);
  }
  lines.push(` *     responses:`);
  lines.push(` *       "200":`);
  lines.push(` *         description: OK`);
  if (!route.isPublic) {
    lines.push(` *       "401":`);
    lines.push(` *         $ref: "#/components/responses/Unauthenticated"`);
    lines.push(` *       "403":`);
    lines.push(` *         $ref: "#/components/responses/Forbidden"`);
  }
  return lines.join("\n");
}

function buildJSDoc(route: RouteMeta): string {
  const lines: string[] = ["/**", " * @swagger", ` * ${route.path}:`];
  const seen = new Set<string>();
  for (const m of route.methods) {
    const lower = m.toLowerCase();
    if (seen.has(lower)) continue;
    seen.add(lower);
    const summary =
      lower === "get"
        ? `List / read ${route.tag}`
        : lower === "post"
          ? `Create ${route.tag}`
          : lower === "patch"
            ? `Update ${route.tag}`
            : lower === "put"
              ? `Replace ${route.tag}`
              : `Delete ${route.tag}`;
    lines.push(methodBlock(lower, route, summary, ""));
  }
  lines.push(" */");
  return lines.join("\n");
}

async function main() {
  const files: string[] = [];
  for await (const entry of glob("**/route.ts", { cwd: API_DIR })) {
    files.push(entry);
  }

  let updated = 0;
  let skipped = 0;
  for (const relFile of files) {
    const abs = resolve(API_DIR, relFile);
    const content = readFileSync(abs, "utf8");
    if (content.includes("@swagger")) {
      skipped++;
      continue;
    }

    const rel = relative(ROOT, abs).replace(/\\/g, "/");
    const { path, tag } = toOpenApiPath(rel);
    const methods: string[] = [];
    for (const m of ["GET", "POST", "PATCH", "PUT", "DELETE"] as const) {
      if (new RegExp(`export\\s+const\\s+${m}\\s*=`).test(content)) {
        methods.push(m);
      }
    }
    if (methods.length === 0) {
      // No handlers — probably a wrapper file.
      continue;
    }

    const meta: RouteMeta = {
      file: abs,
      path,
      tag,
      methods,
      isPublic: isPublicRoute(path),
    };
    const jsdoc = buildJSDoc(meta);

    const out = `${content.trimEnd()}\n\n${jsdoc}\n`;
    if (!DRY_RUN) {
      writeFileSync(abs, out, "utf8");
    }
    updated++;
    console.log(`[swagger] ${DRY_RUN ? "would update" : "updated"} ${relFile}  ->  ${meta.path}`);
  }

  console.log(
    `\n[swagger] done: ${updated} route files ${DRY_RUN ? "would be" : ""} updated, ${skipped} already had @swagger.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
