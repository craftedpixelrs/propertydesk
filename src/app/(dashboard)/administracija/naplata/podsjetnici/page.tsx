import { requireSuperAdmin } from "@/server/permissions/require";
import { resolveDefaultBillingSettings } from "@/server/services/billing/settings/resolved.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createT } from "@/lib/i18n";
import { resolveRequestLocale } from "@/lib/i18n/resolve-locale";

export const dynamic = "force-dynamic";

export default async function ReminderScheduleRulesPage() {
  await requireSuperAdmin();
  const t = createT(await resolveRequestLocale());
  const resolved = resolveDefaultBillingSettings();

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-lg font-semibold">{t("admin.reminders.title")}</h2>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          {t("admin.reminders.subtitle")}
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("admin.reminders.schedule")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-[var(--color-foreground-subtle)]">
              <tr>
                <th className="border-b border-[var(--color-border)] px-3 py-2">
                  {t("admin.reminders.offset")}
                </th>
                <th className="border-b border-[var(--color-border)] px-3 py-2">
                  {t("admin.reminders.template")}
                </th>
                <th className="border-b border-[var(--color-border)] px-3 py-2">
                  {t("admin.reminders.channel")}
                </th>
              </tr>
            </thead>
            <tbody>
              {resolved.reminderSchedule.map((stage) => (
                <tr key={stage.templateKey} className="border-b border-[var(--color-border)] last:border-b-0">
                  <td className="px-3 py-2 tabular-nums">{stage.offsetDays > 0 ? `+${stage.offsetDays}` : stage.offsetDays}</td>
                  <td className="px-3 py-2 font-mono text-xs">{stage.templateKey}</td>
                  <td className="px-3 py-2">
                    <Badge tone="info">{stage.channel}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <p className="text-xs text-[var(--color-foreground-muted)]">
        {t("admin.reminders.footer")}
      </p>
    </section>
  );
}
