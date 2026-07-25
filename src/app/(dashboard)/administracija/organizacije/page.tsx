import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listAllOrganizations } from "@/server/services/platform.service";
import { formatDate } from "@/lib/formatters/date";
import { Plus } from "lucide-react";

interface PageProps {
  searchParams: Promise<{
    page?: string;
    q?: string;
    type?: string;
    status?: string;
  }>;
}

const STATUS_LABEL: Record<string, string> = {
  TRIAL: "Probni",
  ACTIVE: "Aktivno",
  SUSPENDED: "Suspendovano",
  CLOSED: "Zatvoreno",
};

const TYPE_LABEL: Record<string, string> = {
  INVESTOR: "Investitor",
  AGENCY: "Agencija",
};

export default async function PlatformOrganizationsPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;
  const page = Number.parseInt(params.page ?? "1", 10) || 1;

  const { items, total } = await listAllOrganizations({
    page,
    pageSize: 25,
    search: params.q,
    type: (params.type as "INVESTOR" | "AGENCY" | undefined) ?? undefined,
    status:
      (params.status as
        | "TRIAL"
        | "ACTIVE"
        | "SUSPENDED"
        | "CLOSED"
        | undefined) ?? undefined,
  });

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Organizacije ({total})</h2>
        <Button asChild size="sm">
          <Link href="/administracija/organizacije/nova">
            <Plus className="size-4" /> Nova organizacija
          </Link>
        </Button>
      </div>

      <form className="grid gap-3 sm:grid-cols-4" action="/administracija/organizacije">
        <input
          type="text"
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="Pretraga po nazivu..."
          className="h-10 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
        />
        <select
          name="type"
          defaultValue={params.type ?? ""}
          className="h-10 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
        >
          <option value="">Svi tipovi</option>
          <option value="INVESTOR">Investitori</option>
          <option value="AGENCY">Agencije</option>
        </select>
        <select
          name="status"
          defaultValue={params.status ?? ""}
          className="h-10 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
        >
          <option value="">Svi statusi</option>
          <option value="TRIAL">Probni</option>
          <option value="ACTIVE">Aktivno</option>
          <option value="SUSPENDED">Suspendovano</option>
          <option value="CLOSED">Zatvoreno</option>
        </select>
        <Button type="submit" variant="secondary" size="sm">
          Primeni filtere
        </Button>
      </form>

      <Card>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <p className="p-6 text-sm text-[var(--color-foreground-muted)]">
              Nema organizacija koje odgovaraju filterima.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-[var(--color-foreground-subtle)]">
                  <tr>
                    <th className="border-b border-[var(--color-border)] px-4 py-2">Naziv</th>
                    <th className="border-b border-[var(--color-border)] px-4 py-2">Tip</th>
                    <th className="border-b border-[var(--color-border)] px-4 py-2">Status</th>
                    <th className="border-b border-[var(--color-border)] px-4 py-2">Plan</th>
                    <th className="border-b border-[var(--color-border)] px-4 py-2">Članovi</th>
                    <th className="border-b border-[var(--color-border)] px-4 py-2">Projekti</th>
                    <th className="border-b border-[var(--color-border)] px-4 py-2">Jedinice</th>
                    <th className="border-b border-[var(--color-border)] px-4 py-2">Kreirano</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-[var(--color-border)] last:border-b-0"
                    >
                      <td className="px-4 py-2">
                        <div className="font-medium">{row.name}</div>
                        <div className="font-mono text-xs text-[var(--color-foreground-subtle)]">
                          {row.slug}
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        {row.type ? TYPE_LABEL[row.type] : "—"}
                      </td>
                      <td className="px-4 py-2">
                        {row.status ? (
                          <Badge
                            tone={
                              row.status === "ACTIVE"
                                ? "success"
                                : row.status === "SUSPENDED" || row.status === "CLOSED"
                                  ? "danger"
                                  : "info"
                            }
                          >
                            {STATUS_LABEL[row.status]}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-2">{row.planName ?? "—"}</td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {row.memberCount}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {row.projectCount}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {row.unitCount}
                      </td>
                      <td className="px-4 py-2 text-xs">
                        {formatDate(row.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
