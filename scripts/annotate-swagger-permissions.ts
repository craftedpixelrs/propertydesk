#!/usr/bin/env tsx
/**
 * Annotate every `@swagger` operation with the real authorization rule
 * taken from the route handler (`requirePermission`, `requireSession`,
 * public + rate-limit, platform admin, cron secret).
 *
 * Idempotent. Handles CRLF (Windows) and multi-path swagger blocks.
 *
 * Run:
 *   pnpm docs:swagger:perms
 *   pnpm docs:swagger:spec
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { glob } from "node:fs/promises";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const API_DIR = resolve(ROOT, "src/app/api");

type Method = "get" | "post" | "patch" | "put" | "delete";

interface MethodAuth {
  label: string;
  kind: "permission" | "session" | "platform" | "public" | "cron" | "unknown";
}

/** Normalize swagger comment bodies to LF for reliable regex; restore later. */
function toLf(s: string): string {
  return s.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function splitHandlers(src: string): Partial<Record<Method, string>> {
  const out: Partial<Record<Method, string>> = {};
  const re = /export\s+const\s+(GET|POST|PATCH|PUT|DELETE)\s*=/g;
  const matches = [...src.matchAll(re)];
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i]!;
    const method = m[1]!.toLowerCase() as Method;
    const start = m.index ?? 0;
    const end =
      i + 1 < matches.length ? (matches[i + 1]!.index ?? src.length) : src.length;
    out[method] = src.slice(start, end);
  }
  return out;
}

function detectAuth(handler: string, relPath: string, fullSrc: string): MethodAuth {
  if (/requirePermission\s*\(\s*permissionForEntity/.test(handler)) {
    return {
      kind: "permission",
      label:
        'requirePermission(permissionForEntity(...)) — Buyer→"lead.read", Sale→"sale.read"',
    };
  }

  const perms = [
    ...handler.matchAll(/requirePermission\(\s*["']([^"']+)["']\s*\)/g),
  ].map((m) => m[1]!);

  if (perms.length === 1) {
    return { kind: "permission", label: `requirePermission("${perms[0]}")` };
  }
  if (perms.length > 1) {
    const uniq = [...new Set(perms)];
    return {
      kind: "permission",
      label: uniq.map((p) => `requirePermission("${p}")`).join(" + "),
    };
  }

  if (/requireSuperAdmin\s*\(/.test(handler)) {
    return {
      kind: "platform",
      label: "requireSuperAdmin() — platform SUPER_ADMIN",
    };
  }
  const platformPerm = handler.match(
    /requirePlatformPermission\(\s*["']([^"']+)["']\s*\)/,
  );
  if (platformPerm) {
    return {
      kind: "platform",
      label: `requirePlatformPermission("${platformPerm[1]}") — SUPER_ADMIN`,
    };
  }

  if (/verifyCronSecret\s*\(/.test(handler) || /x-cron-secret/.test(handler)) {
    return {
      kind: "cron",
      label: "CRON_SECRET (Authorization: Bearer ili x-cron-secret)",
    };
  }

  if (/requireSession\s*\(/.test(handler) || /loadUserContext\s*\(/.test(handler)) {
    return {
      kind: "session",
      label: "sesija (ulogovan + aktivna org) — bez posebne permission",
    };
  }

  if (
    /(^|\/)(public|health|docs)(\/|$)/.test(relPath) ||
    /\/marketing\//.test(relPath)
  ) {
    if (/enforceRateLimit/.test(handler)) {
      return { kind: "public", label: "javno + rate-limit (bez sesije)" };
    }
    return { kind: "public", label: "javno (bez sesije)" };
  }

  if (/toNextJsHandler/.test(fullSrc) || /\/auth\//.test(relPath)) {
    return {
      kind: "public",
      label: "Better Auth (javne auth rute / session cookie)",
    };
  }

  return { kind: "unknown", label: "proveri ručno — auth helper nije pronađen" };
}

function stripAuthLines(body: string): string {
  return body
    .replace(/^\s*\*\s+\*\*Auth:\*\*.*\n/gm, "")
    .replace(/^\s*\*\s+Auth:\s+`[^`]+`.*\n/gm, "");
}

function annotateMethodBody(body: string, auth: MethodAuth): string {
  let b = stripAuthLines(body);

  const keyIndent = " *     ";
  const descIndent = " *       ";
  const authLine = `${descIndent}**Auth:** \`${auth.label}\``;

  // Only inject security: [] when the operation has no security key yet
  // (avoid duplicating `security: - cookieAuth` etc.)
  if (auth.kind === "public" && !/^ \*     security:/m.test(b)) {
    if (/^ \*     responses:/m.test(b)) {
      b = b.replace(/^( \*     responses:)/m, `${keyIndent}security: []\n$1`);
    } else {
      b = `${keyIndent}security: []\n` + b;
    }
  }

  const opDescBlock = /^ \*     description:\s*\|\s*\n/m;
  const opDescSingle = /^ \*     description:\s+(\S.*)$/m;

  if (opDescBlock.test(b)) {
    b = b.replace(opDescBlock, ` *     description: |\n${authLine}\n`);
  } else if (opDescSingle.test(b)) {
    b = b.replace(opDescSingle, (_m, rest: string) => {
      const cleaned = String(rest)
        .replace(/\*\*Auth:\*\*\s*`[^`]+`\.?\s*/g, "")
        .trim();
      return ` *     description: |\n${authLine}\n${descIndent}${cleaned}`;
    });
  } else if (/^ \*     summary:/m.test(b)) {
    b = b.replace(
      /^( \*     summary:.*\n)/m,
      `$1 *     description: |\n${authLine}\n`,
    );
  } else if (/^ \*     tags:\s*\n(?: \*       - .+\n)+/m.test(b)) {
    b = b.replace(
      /^( \*     tags:\s*\n(?: \*       - .+\n)+)/m,
      `$1 *     description: |\n${authLine}\n`,
    );
  } else if (/^ \*     tags:\s*\[/m.test(b)) {
    // Compact form: ` *     tags: [auth]`
    b = b.replace(
      /^( \*     tags:\s*\[.*\]\s*\n)/m,
      `$1 *     description: |\n${authLine}\n`,
    );
  } else {
    b = ` *     description: |\n${authLine}\n` + b;
  }

  if (auth.kind === "permission") {
    b = b.replace(/^ \*       Dozvola:\s+`[^`]+`\.?\s*\n/gm, "");
  }

  return b;
}

function annotateSwaggerBlock(
  blockLf: string,
  methodAuth: Partial<Record<Method, MethodAuth>>,
): string {
  let result = blockLf;

  for (const method of ["get", "post", "patch", "put", "delete"] as Method[]) {
    const auth = methodAuth[method];
    if (!auth) continue;

    // Global: every path section that declares this method (auth catch-all + aliases)
    const methodRe = new RegExp(
      `(^ \\*   ${method}:\\s*\\n)([\\s\\S]*?)(?=^ \\*   (?:get|post|patch|put|delete):\\s*$|^ \\* /api/|^\\s*\\*/)`,
      "gm",
    );

    result = result.replace(methodRe, (_whole, header: string, body: string) => {
      return header + annotateMethodBody(body, auth);
    });
  }

  return result;
}

/** Find the JSDoc block that contains `@swagger` (may have prose before the tag). */
function findSwaggerBlock(
  src: string,
): { start: number; end: number; block: string } | null {
  const tag = src.search(/^\s*\*\s*@swagger\b/m);
  if (tag < 0) return null;

  const start = src.lastIndexOf("/**", tag);
  if (start < 0) return null;

  const end = src.indexOf("*/", tag);
  if (end < 0) return null;

  return { start, end: end + 2, block: src.slice(start, end + 2) };
}

async function main() {
  const files: string[] = [];
  for await (const entry of glob("**/route.ts", { cwd: API_DIR })) {
    files.push(entry);
  }

  let updated = 0;
  let skipped = 0;
  const report: Array<{ file: string; methods: Record<string, string> }> = [];

  for (const rel of files) {
    const abs = resolve(API_DIR, rel);
    const src = readFileSync(abs, "utf8");
    if (!src.includes("@swagger")) {
      skipped++;
      continue;
    }

    const handlers = splitHandlers(src);
    if (/toNextJsHandler/.test(src) && Object.keys(handlers).length === 0) {
      handlers.get = src;
      handlers.post = src;
    }

    const relPosix = rel.replace(/\\/g, "/");
    const methodAuth: Partial<Record<Method, MethodAuth>> = {};
    const reportMethods: Record<string, string> = {};

    for (const [method, body] of Object.entries(handlers) as [
      Method,
      string,
    ][]) {
      const auth = detectAuth(body, relPosix, src);
      methodAuth[method] = auth;
      reportMethods[method] = auth.label;
    }

    const found = findSwaggerBlock(src);
    if (!found) {
      skipped++;
      continue;
    }

    const useCrlf = found.block.includes("\r\n");
    const blockLf = toLf(found.block);
    const newBlockLf = annotateSwaggerBlock(blockLf, methodAuth);

    if (newBlockLf !== blockLf) {
      const newBlock = useCrlf ? newBlockLf.replace(/\n/g, "\r\n") : newBlockLf;
      writeFileSync(
        abs,
        src.slice(0, found.start) + newBlock + src.slice(found.end),
        "utf8",
      );
      updated++;
    }
    report.push({ file: relPosix, methods: reportMethods });
  }

  writeFileSync(
    resolve(ROOT, "scripts/.swagger-perms-report.json"),
    JSON.stringify(report, null, 2),
    "utf8",
  );

  const unknown = report.flatMap((r) =>
    Object.entries(r.methods)
      .filter(([, v]) => v.includes("proveri ručno"))
      .map(([m, v]) => `${r.file} ${m}: ${v}`),
  );

  console.log(
    `[swagger-perms] updated ${updated} files, skipped ${skipped}, report ${report.length}`,
  );
  if (unknown.length) {
    console.log(`[swagger-perms] UNKNOWN (${unknown.length}):`);
    for (const u of unknown) console.log("  -", u);
  } else {
    console.log("[swagger-perms] no unknown auth rules");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
