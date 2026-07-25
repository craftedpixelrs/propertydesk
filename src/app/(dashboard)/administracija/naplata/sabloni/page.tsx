import Link from "next/link";
import { requireSuperAdmin } from "@/server/permissions/require";
import {
  listBillingEmailTemplates,
  seedDefaultBillingTemplates,
} from "@/server/services/billing/emails/templates";
import { SAMPLE_VARIABLES } from "@/server/services/billing/emails/preview";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

/**
 * Substitute `{{var}}` placeholders inside a subject line for preview.
 * Kept local (mirrors the whitelist regex used server-side) so the list
 * page can render a realistic subject without hitting the network per row.
 */
const SUBJECT_VAR_RE = /\{\{\s*([a-zA-Z][a-zA-Z0-9_]*)\s*\}\}/g;
function previewSubject(
  raw: string,
  variables: Record<string, string> | undefined,
): string {
  if (!variables) return raw;
  return raw.replace(SUBJECT_VAR_RE, (_, name: string) =>
    Object.prototype.hasOwnProperty.call(variables, name)
      ? (variables[name] ?? "")
      : `{{${name}}}`,
  );
}

interface GroupSpec {
  id: string;
  label: string;
  description: string;
  prefix: "subscription." | "invoice." | "reminder.";
}

const GROUPS: GroupSpec[] = [
  {
    id: "subscription",
    label: "Pretplata",
    description:
      "Životni ciklus pretplate — probni period, aktivacija, promene, restrikcije.",
    prefix: "subscription.",
  },
  {
    id: "invoice",
    label: "Faktura",
    description:
      "Događaji vezani za pojedinačne fakture — izdavanje, PDF, uplata, storniranje.",
    prefix: "invoice.",
  },
  {
    id: "reminder",
    label: "Podsetnik",
    description:
      "Automatski podsetnici za neplaćene fakture — od blage note do poslednje opomene.",
    prefix: "reminder.",
  },
];

function groupBadgeTone(id: string): "info" | "success" | "warning" | "neutral" {
  switch (id) {
    case "subscription":
      return "info";
    case "invoice":
      return "success";
    case "reminder":
      return "warning";
    default:
      return "neutral";
  }
}

export default async function BillingTemplatesPage() {
  await requireSuperAdmin();
  await seedDefaultBillingTemplates();
  const templates = await listBillingEmailTemplates();

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-lg font-semibold">
          Email šabloni ({templates.length})
        </h2>
        <p className="max-w-3xl text-sm text-[var(--color-foreground-muted)]">
          Svi šabloni koriste zajednički brendirani layout i bezbednu
          whitelist supstituciju promenljivih. Neaktivni šabloni ne blokiraju
          slanje — u tom slučaju se koristi ugrađeni default šablon.
        </p>
      </header>

      {GROUPS.map((group) => {
        const rows = templates.filter((t) => t.key.startsWith(group.prefix));
        if (rows.length === 0) return null;
        return (
          <div key={group.id} className="space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <h3 className="text-base font-semibold text-[var(--color-foreground)]">
                  {group.label}
                </h3>
                <p className="text-xs text-[var(--color-foreground-muted)]">
                  {group.description}
                </p>
              </div>
              <span className="text-xs text-[var(--color-foreground-subtle)]">
                {rows.length} šablon{rows.length === 1 ? "" : rows.length < 5 ? "a" : "a"}
              </span>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {rows.map((t) => {
                const sample =
                  SAMPLE_VARIABLES[t.key as keyof typeof SAMPLE_VARIABLES];
                const subjectPreview = previewSubject(t.subject, sample);
                return (
                  <Card
                    key={t.id}
                    className="transition hover:border-[var(--color-brand-700)]"
                  >
                    <CardContent className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge tone={groupBadgeTone(group.id)}>
                              {group.label}
                            </Badge>
                            <Badge tone={t.active ? "success" : "neutral"}>
                              {t.active ? "Aktivan" : "Neaktivan"}
                            </Badge>
                          </div>
                          <div className="mt-2 text-sm font-semibold text-[var(--color-foreground)]">
                            {t.name}
                          </div>
                          <div className="font-mono text-[11px] text-[var(--color-foreground-subtle)]">
                            {t.key}
                          </div>
                        </div>
                      </div>

                      {t.description ? (
                        <p className="text-xs text-[var(--color-foreground-muted)]">
                          {t.description}
                        </p>
                      ) : null}

                      <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2">
                        <div className="text-[10px] uppercase tracking-wide text-[var(--color-foreground-subtle)]">
                          Naslov u inboxu
                        </div>
                        <div className="mt-0.5 truncate text-sm text-[var(--color-foreground)]">
                          {subjectPreview}
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <Link
                          href={`/administracija/naplata/sabloni/${encodeURIComponent(t.key)}`}
                          className="text-sm font-medium text-[var(--color-brand-700)] hover:underline"
                        >
                          Uredi šablon →
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </section>
  );
}
