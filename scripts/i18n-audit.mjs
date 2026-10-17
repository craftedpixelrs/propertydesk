import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";

const ROOT = "d:/propertydesk";
const DIRS = ["src/app", "src/features", "src/components"];

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (name.endsWith(".tsx")) out.push(p);
  }
  return out;
}

const attrRe =
  /(?:placeholder|title|label|aria-label|description|alt|emptyTitle|emptyDescription|centerLabel|hint|message|emptyLabel)\s*=\s*(["'`])([^"'`\n]{2,120})\1/g;
const jsxRe = />([^<>{}$][^<>{}]{0,120})</g;
const constStrRe =
  /(?:label|title|description|message|text|name|heading|subtitle|emptyTitle|emptyDescription|centerLabel)\s*:\s*(["'`])([^"'`\n]{2,120})\1/g;

const skipPatterns = [
  /^(className|var\(|flex|grid|px-|py-|text-|border|rounded|w-|h-|gap-|space-|items-|justify-|font-|bg-|hover:|focus:|md:|lg:|sm:|xl:|2xl:|sr-only|hidden|block|inline|absolute|relative|fixed|sticky|overflow|truncate|min-|max-|opacity-|z-|transition|animate|cursor|pointer-events|select-none|whitespace|break-|object-|aspect-|ring-|shadow-|from-|to-|via-)/,
  /^\d/,
  /^[{}[\]()]+$/,
  /^\/\//,
  /^https?:/,
  /^\/[a-z]/,
  /^#[0-9a-fA-F]/,
  /^\$/,
  /^\{/,
  /^--/,
  /^rgb/,
  /^oklch/,
  /^calc\(/,
  /^var\(/,
  /^em-/,
  /^rem/,
  /^\.{3}$/,
  /^…$/,
  /^&/,
  /^\+/,
  /^-/,
  /^×$/,
  /^→$/,
  /^·$/,
  /^•$/,
  /^,/,
  /^;/,
  /^:/,
  /^=/,
  /^%/,
  /^@/,
  /^#/,
  /^</,
  /^>/,
  /^PropertyDesk$/,
  /^propertydesk\.app$/,
  /^SUPER_ADMIN$/,
  /^INVESTOR$/,
  /^AGENCY$/,
  /^EUR$/,
  /^RSD$/,
  /^PDV$/,
  /^PIB$/,
  /^IBAN$/,
  /^SEF$/,
  /^KYC$/,
  /^PDF$/,
  /^API$/,
  /^QR$/,
  /^IPS$/,
  /^p90$/,
  /^d\)$/,
  /^m²$/,
  /^Overdue$/,
  /^Enter$/,
  /^Ctrl$/,
  /^⌘$/,
  /^K$/,
  /^…$/,
];

function isLikelyUI(s) {
  const t = s.trim();
  if (t.length < 2) return false;
  if (!/[A-Za-zČĆŠĐŽčćšđž]/.test(t)) return false;
  for (const p of skipPatterns) if (p.test(t)) return false;
  if (/^t\(/.test(t)) return false;
  if (/^\{/.test(t)) return false;
  return true;
}

function extractStrings(content) {
  const found = new Set();
  for (const re of [attrRe, jsxRe, constStrRe]) {
    let m;
    const r = new RegExp(re.source, re.flags);
    while ((m = r.exec(content))) {
      const s = m[2] ?? m[1];
      if (isLikelyUI(s)) found.add(s.trim());
    }
  }
  return [...found];
}

function hasI18n(content) {
  return /(useT|useI18n|\bt\()/.test(content);
}

function isUseClient(content) {
  return /"use client"/.test(content);
}

function categorize(path) {
  const p = path.replace(/\\/g, "/");
  if (p.includes("/(auth)/") || p.includes("/features/auth/")) return "auth";
  if (
    p.includes("sidebar-nav") ||
    p.includes("bottom-nav") ||
    p.includes("mobile-header") ||
    p.includes("command-palette") ||
    p.includes("organization-switcher") ||
    p.includes("more-grid") ||
    p.includes("/more/page") ||
    p.includes("search-button") ||
    p.includes("language-switcher") ||
    p.includes("impersonation-banner") ||
    p.includes("notification-bell")
  )
    return "dashboard chrome (nav, header, more)";
  if (p.includes("/dashboard/page") || p.includes("/prvi-koraci")) return "dashboard home";
  if (
    p.includes("/projekti") ||
    p.includes("/projects") ||
    p.includes("/jedinice") ||
    p.includes("/inventory") ||
    p.includes("/features/projects") ||
    p.includes("/features/units") ||
    p.includes("/features/floor-plan") ||
    p.includes("/features/sharing") ||
    p.includes("/ponuda")
  )
    return "projects / units / inventory";
  if (p.includes("/kupci") || p.includes("/buyers") || p.includes("/moji-kupci"))
    return "buyers / customers";
  if (
    p.includes("/lead") ||
    p.includes("/upiti") ||
    p.includes("/activities") ||
    p.includes("/aktivnosti") ||
    p.includes("/tasks") ||
    p.includes("/zadaci") ||
    p.includes("/comments") ||
    p.includes("/onboarding")
  )
    return "leads / CRM / activities / tasks";
  if (
    p.includes("/rezervacije") ||
    p.includes("/reservations") ||
    p.includes("/kalendar") ||
    p.includes("/calendar") ||
    p.includes("/features/reservations") ||
    p.includes("/features/calendar")
  )
    return "reservations / calendar";
  if (
    p.includes("/prodaje") ||
    p.includes("/sales") ||
    p.includes("/uplate") ||
    p.includes("/planovi-placanja") ||
    p.includes("/payment-plan") ||
    p.includes("/features/sales") ||
    p.includes("/features/payment-plan") ||
    p.includes("/features/board")
  )
    return "sales / payment plans / payments";
  if (
    p.includes("/agencij") ||
    p.includes("/agencies") ||
    p.includes("/provizij") ||
    p.includes("/commissions") ||
    p.includes("/features/agenc") ||
    p.includes("/agency-portal")
  )
    return "agencies / commissions";
  if (p.includes("/dokument") || p.includes("/documents") || p.includes("/features/documents"))
    return "documents";
  if (p.includes("/izvestaj") || p.includes("/reports") || p.includes("/features/reports"))
    return "reports";
  if (
    p.includes("/podesavanja") ||
    p.includes("/settings") ||
    p.includes("/features/settings") ||
    p.includes("/members")
  )
    return "settings";
  if (
    p.includes("/administracija") ||
    p.includes("/platform-admin") ||
    p.includes("/property-desk") ||
    p.includes("/naplata") ||
    p.includes("/features/billing") ||
    p.includes("/features/platform-admin")
  )
    return "platform admin / property-desk";
  if (p.includes("/(marketing)/") || p.includes("/features/marketing")) return "marketing (in-app)";
  if (p.includes("/(public)/") || p.includes("/(system)/")) return "public / system pages";
  if (
    p.includes("/components/") &&
    (p.includes("empty-state") ||
      p.includes("error-state") ||
      p.includes("confirm-dialog") ||
      p.includes("placeholder-page") ||
      p.includes("status-badge") ||
      p.includes("filter-drawer") ||
      p.includes("search-input") ||
      p.includes("form-actions") ||
      p.includes("loading-state") ||
      p.includes("desktop-data-table") ||
      p.includes("mobile-card-list") ||
      p.includes("responsive-data-view") ||
      p.includes("dialog.tsx") ||
      p.includes("drawer.tsx") ||
      p.includes("chart-card") ||
      p.includes("permission-guard") ||
      p.includes("page-header") ||
      p.includes("section-header") ||
      p.includes("stat-card") ||
      p.includes("activity-timeline"))
  )
    return "shared components (empty states, dialogs, forms, badges, tables)";
  if (p.includes("/components/"))
    return "shared components (empty states, dialogs, forms, badges, tables)";
  if (p.includes("/layout.tsx") || p.includes("/error.tsx") || p.includes("global-error"))
    return "other";
  return "other";
}

const files = DIRS.flatMap((d) => walk(join(ROOT, d)));
const hardcoded = [];
const i18nDone = [];

for (const file of files) {
  const content = readFileSync(file, "utf8");
  const rel = relative(ROOT, file).replace(/\\/g, "/");
  const strings = extractStrings(content);
  const i18n = hasI18n(content);
  const client = isUseClient(content);
  const cat = categorize(rel);

  if (i18n) {
    i18nDone.push({
      path: rel,
      category: cat,
      useClient: client,
      partialHardcoded: strings.length,
    });
  }
  if (strings.length > 0) {
    hardcoded.push({
      path: rel,
      category: cat,
      count: strings.length,
      examples: strings.slice(0, 8),
      useClient: client,
      hasI18n: i18n,
    });
  }
}

hardcoded.sort((a, b) => a.category.localeCompare(b.category) || a.path.localeCompare(b.path));
i18nDone.sort((a, b) => a.category.localeCompare(b.category) || a.path.localeCompare(b.path));

console.log(
  JSON.stringify(
    {
      hardcoded,
      i18nDone,
      totals: { files: files.length, hardcoded: hardcoded.length, i18nDone: i18nDone.length },
    },
    null,
    2,
  ),
);
