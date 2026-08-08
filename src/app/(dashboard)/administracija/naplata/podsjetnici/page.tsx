import { requireSuperAdmin } from "@/server/permissions/require";
import { resolveDefaultBillingSettings } from "@/server/services/billing/settings/resolved.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function ReminderScheduleRulesPage() {
  await requireSuperAdmin();
  const resolved = resolveDefaultBillingSettings();

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-lg font-semibold">Pravila podsetnika</h2>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          Automatski podsetnici se šalju prema rasporedu ispod. Offset je izražen u danima od datuma
          dospeća fakture (negativan = pre dospeća, pozitivan = nakon).
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Trenutni raspored</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-[var(--color-foreground-subtle)]">
              <tr>
                <th className="border-b border-[var(--color-border)] px-3 py-2">Offset (dana)</th>
                <th className="border-b border-[var(--color-border)] px-3 py-2">Šablon</th>
                <th className="border-b border-[var(--color-border)] px-3 py-2">Kanal</th>
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
        Izmena rasporeda po organizaciji se vrši u okviru <em>Podešavanja naplate</em> na
        detaljnoj stranici organizacije.
      </p>
    </section>
  );
}
