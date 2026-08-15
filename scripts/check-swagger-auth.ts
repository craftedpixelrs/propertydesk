import { readFileSync } from "node:fs";

const j = JSON.parse(
  readFileSync(new URL("../public/api-docs.json", import.meta.url), "utf8"),
);

let withAuth = 0;
let without = 0;
const byKind: Record<string, number> = {};
const samples: string[] = [];
const missing: string[] = [];

for (const [path, methods] of Object.entries(j.paths || {}) as [
  string,
  Record<string, { description?: string }>,
][]) {
  for (const [m, op] of Object.entries(methods)) {
    if (!["get", "post", "put", "patch", "delete"].includes(m)) continue;
    const d = op.description || "";
    const match = d.match(/\*\*Auth:\*\*\s*`([^`]+)`/);
    if (match) {
      withAuth++;
      const label = match[1]!;
      const kind = label.startsWith("requirePermission")
        ? "permission"
        : label.startsWith("requireSuperAdmin") ||
            label.startsWith("requirePlatform")
          ? "platform"
          : label.startsWith("CRON")
            ? "cron"
            : label.startsWith("javno") || label.startsWith("Better")
              ? "public"
              : label.startsWith("sesija")
                ? "session"
                : "other";
      byKind[kind] = (byKind[kind] || 0) + 1;
      if (samples.length < 8) {
        samples.push(`${m.toUpperCase()} ${path} → ${label}`);
      }
    } else {
      without++;
      missing.push(`${m.toUpperCase()} ${path}`);
    }
  }
}

console.log("with Auth:", withAuth, "without:", without);
console.log("by kind:", byKind);
console.log("samples:");
for (const s of samples) console.log(" ", s);
if (missing.length) {
  console.log(`missing Auth (${missing.length}):`);
  for (const s of missing) console.log(" ", s);
}
