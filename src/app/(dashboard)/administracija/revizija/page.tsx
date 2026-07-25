import { Card, CardContent } from "@/components/ui/card";
import { listAuditLogs } from "@/server/services/platform.service";
import { formatDateTime } from "@/lib/formatters/date";

interface PageProps {
  searchParams: Promise<{
    page?: string;
    action?: string;
    entityType?: string;
    organizationId?: string;
  }>;
}

export default async function PlatformAuditPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Number.parseInt(params.page ?? "1", 10) || 1;

  const { items, total } = await listAuditLogs({
    page,
    pageSize: 50,
    action: params.action,
    entityType: params.entityType,
    organizationId: params.organizationId,
  });

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Revizija ({total})</h2>

      <form className="grid gap-3 sm:grid-cols-4" action="/administracija/revizija">
        <input
          type="text"
          name="action"
          defaultValue={params.action ?? ""}
          placeholder="Akcija (npr. organization.created)"
          className="h-10 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
        />
        <input
          type="text"
          name="entityType"
          defaultValue={params.entityType ?? ""}
          placeholder="Tip entiteta"
          className="h-10 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
        />
        <input
          type="text"
          name="organizationId"
          defaultValue={params.organizationId ?? ""}
          placeholder="ID organizacije"
          className="h-10 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
        />
        <button
          type="submit"
          className="h-10 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-inset)] px-3 text-sm"
        >
          Primeni
        </button>
      </form>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-[var(--color-foreground-subtle)]">
                <tr>
                  <th className="border-b border-[var(--color-border)] px-4 py-2">Vreme</th>
                  <th className="border-b border-[var(--color-border)] px-4 py-2">Akcija</th>
                  <th className="border-b border-[var(--color-border)] px-4 py-2">Entitet</th>
                  <th className="border-b border-[var(--color-border)] px-4 py-2">Organizacija</th>
                  <th className="border-b border-[var(--color-border)] px-4 py-2">Akter</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-[var(--color-foreground-muted)]"
                    >
                      Nema revizijskih zapisa.
                    </td>
                  </tr>
                ) : (
                  items.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-[var(--color-border)] last:border-b-0"
                    >
                      <td className="whitespace-nowrap px-4 py-2 text-xs">
                        {formatDateTime(row.createdAt)}
                      </td>
                      <td className="px-4 py-2 font-mono text-xs">
                        {row.action}
                      </td>
                      <td className="px-4 py-2 text-xs">
                        {row.entityType}
                        {row.entityId ? (
                          <span className="ml-1 text-[var(--color-foreground-muted)]">
                            #{row.entityId.slice(0, 8)}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-2 text-xs">
                        {row.organization?.name ?? "—"}
                      </td>
                      <td className="px-4 py-2 text-xs">
                        {row.actor
                          ? row.actor.email
                          : row.impersonatedBy
                            ? `${row.impersonatedBy.email} (impersonated)`
                            : "sistem"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
