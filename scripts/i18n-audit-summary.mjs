import { readFileSync } from "fs";

const d = JSON.parse(readFileSync("scripts/i18n-audit-output.json", "utf8").replace(/^\uFEFF/, ""));

function clean(s) {
  if (!s || s.length > 100) return null;
  if (/[{}();=>\[\]|\\]/.test(s)) return null;
  const skip = new Set([
    "asc",
    "desc",
    "void",
    "Promise",
    "Broj",
    "Lead",
    "Level",
    "Faza",
    "Prioritet",
    "Starter",
    "Growth",
    "Scale",
    "Overdue",
    "Enter",
    "Ctrl",
    "p90",
    "PDF",
    "API",
    "SEF",
    "KYC",
    "IBAN",
    "PIB",
    "PDV",
    "SUPER_ADMIN",
    "INVESTOR",
    "AGENCY",
    "EUR",
    "RSD",
    "utmSource",
    "utmMedium",
    "utmCampaign",
    "new Set",
  ]);
  if (skip.has(s)) return null;
  if (s.startsWith("npr.")) return null;
  if (!/[A-Za-zČĆŠĐŽčćšđž]/.test(s)) return null;
  return s;
}

const byCat = {};
for (const f of d.hardcoded) {
  const ex = f.examples.map(clean).filter(Boolean);
  const count = ex.length > 0 ? ex.length : f.count;
  if (count === 0) continue;
  if (!byCat[f.category]) byCat[f.category] = [];
  byCat[f.category].push({
    path: f.path,
    count,
    examples: ex.length ? ex.slice(0, 8) : f.examples.slice(0, 5),
    useClient: f.useClient,
    hasI18n: f.hasI18n,
  });
}

for (const [cat, files] of Object.entries(byCat).sort()) {
  console.log(`\n## ${cat} (${files.length} files)\n`);
  for (const f of files.sort((a, b) => a.path.localeCompare(b.path))) {
    const type = f.useClient ? "use client" : "server component";
    const partial = f.hasI18n ? " | **PARTIAL i18n**" : "";
    console.log(`### ${f.path}`);
    console.log(`- ~${f.count} distinct strings | ${type}${partial}`);
    console.log(`- Examples: ${f.examples.join(" · ")}`);
  }
}

console.log("\n\n## FILES WITH i18n (t/useT/useI18n)\n");
const i18nByCat = {};
for (const f of d.i18nDone) {
  if (!i18nByCat[f.category]) i18nByCat[f.category] = [];
  i18nByCat[f.category].push(f);
}
for (const [cat, files] of Object.entries(i18nByCat).sort()) {
  console.log(`\n### ${cat} (${files.length})`);
  for (const f of files.sort((a, b) => a.path.localeCompare(b.path))) {
    const extra =
      f.partialHardcoded > 0 ? ` — still ~${f.partialHardcoded} hardcoded` : " — fully keyed";
    console.log(`- ${f.path} (${f.useClient ? "client" : "server"})${extra}`);
  }
}

console.log(
  `\n\nTotals: ${d.totals.files} TSX scanned, ${Object.values(byCat).flat().length} with hardcoded UI, ${d.i18nDone.length} with any i18n`,
);
