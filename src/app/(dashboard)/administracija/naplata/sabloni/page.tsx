import Link from "next/link";
import { requireSuperAdmin } from "@/server/permissions/require";
import {
  listBillingEmailTemplates,
  seedDefaultBillingTemplates,
} from "@/server/services/billing/emails/templates";
import { SAMPLE_VARIABLES } from "@/server/services/billing/emails/preview";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createT, type TranslationKey } from "@/lib/i18n";
import { resolveRequestLocale } from "@/lib/i18n/resolve-locale";

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
  labelKey: TranslationKey;
  descriptionKey: TranslationKey;
  prefix: "subscription." | "invoice." | "reminder.";
}

const GROUPS: GroupSpec[] = [
  {
    id: "subscription",
    labelKey: "admin.templates.groupSubscription",
    descriptionKey: "admin.templates.groupSubscriptionDesc",
    prefix: "subscription.",
  },
  {
    id: "invoice",
    labelKey: "admin.templates.groupInvoice",
    descriptionKey: "admin.templates.groupInvoiceDesc",
    prefix: "invoice.",
  },
  {
    id: "reminder",
    labelKey: "admin.templates.groupReminder",
    descriptionKey: "admin.templates.groupReminderDesc",
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
  const t = createT(await resolveRequestLocale());
  await seedDefaultBillingTemplates();
  const templates = await listBillingEmailTemplates();

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-lg font-semibold">
          {t("admin.templates.title", { count: templates.length })}
        </h2>
        <p className="max-w-3xl text-sm text-[var(--color-foreground-muted)]">
          {t("admin.templates.subtitle")}
        </p>
      </header>

      {GROUPS.map((group) => {
        const rows = templates.filter((tpl) => tpl.key.startsWith(group.prefix));
        if (rows.length === 0) return null;
        return (
          <div key={group.id} className="space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <h3 className="text-base font-semibold text-[var(--color-foreground)]">
                  {t(group.labelKey)}
                </h3>
                <p className="text-xs text-[var(--color-foreground-muted)]">
                  {t(group.descriptionKey)}
                </p>
              </div>
              <span className="text-xs text-[var(--color-foreground-subtle)]">
                {t("admin.templatesCount", { count: rows.length })}
              </span>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {rows.map((tpl) => {
                const sample =
                  SAMPLE_VARIABLES[tpl.key as keyof typeof SAMPLE_VARIABLES];
                const subjectPreview = previewSubject(tpl.subject, sample);
                return (
                  <Card
                    key={tpl.id}
                    className="transition hover:border-[var(--color-brand-700)]"
                  >
                    <CardContent className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge tone={groupBadgeTone(group.id)}>
                              {t(group.labelKey)}
                            </Badge>
                            <Badge tone={tpl.active ? "success" : "neutral"}>
                              {tpl.active ? t("admin.activeInTeam") : t("admin.inactive")}
                            </Badge>
                          </div>
                          <div className="mt-2 text-sm font-semibold text-[var(--color-foreground)]">
                            {tpl.name}
                          </div>
                          <div className="font-mono text-[11px] text-[var(--color-foreground-subtle)]">
                            {tpl.key}
                          </div>
                        </div>
                      </div>

                      {tpl.description ? (
                        <p className="text-xs text-[var(--color-foreground-muted)]">
                          {tpl.description}
                        </p>
                      ) : null}

                      <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2">
                        <div className="text-[10px] uppercase tracking-wide text-[var(--color-foreground-subtle)]">
                          {t("admin.templates.inboxSubject")}
                        </div>
                        <div className="mt-0.5 truncate text-sm text-[var(--color-foreground)]">
                          {subjectPreview}
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <Link
                          href={`/administracija/naplata/sabloni/${encodeURIComponent(tpl.key)}`}
                          className="text-sm font-medium text-[var(--color-brand-700)] hover:underline"
                        >
                          {t("admin.templates.editTemplate")}
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
