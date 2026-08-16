import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createT } from "@/lib/i18n";
import { resolveRequestLocale } from "@/lib/i18n/resolve-locale";

/**
 * Server-rendered filter form used by every /izvestaji page.
 *
 * Uses plain `<form method="get">` so the search params round-trip without
 * client JS. `exportHref` is the URL for the CSV/XLSX endpoint and includes
 * the current filters already; the parent computes it based on request
 * search params.
 */
export async function ReportFilters(props: {
  action: string;
  projects: Array<{ id: string; name: string }>;
  selectedProjectId?: string;
  from?: string;
  to?: string;
  exportCsvHref: string;
  exportXlsxHref: string;
  showProjectFilter?: boolean;
}) {
  const t = createT(await resolveRequestLocale());
  return (
    <Card>
      <CardContent className="py-4">
        <form
          method="get"
          action={props.action}
          className="flex flex-wrap items-end gap-3"
        >
          {props.showProjectFilter !== false ? (
            <label className="flex flex-col gap-1 text-xs">
              <span className="text-[var(--color-foreground-muted)]">
                {t("units.columns.project")}
              </span>
              <select
                name="projectId"
                defaultValue={props.selectedProjectId ?? ""}
                className="h-9 rounded border border-[var(--color-border)] bg-white px-2 text-sm"
              >
                <option value="">{t("common.allProjects")}</option>
                {props.projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-[var(--color-foreground-muted)]">{t("common.from")}</span>
            <Input type="date" name="from" defaultValue={props.from ?? ""} className="w-40" />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-[var(--color-foreground-muted)]">{t("common.to")}</span>
            <Input type="date" name="to" defaultValue={props.to ?? ""} className="w-40" />
          </label>
          <Button type="submit" size="sm">
            {t("common.apply")}
          </Button>
          <div className="ml-auto flex gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href={props.exportCsvHref} prefetch={false} target="_blank" rel="noopener">
                CSV
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href={props.exportXlsxHref} prefetch={false} target="_blank" rel="noopener">
                XLSX
              </Link>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function parseReportSearchParams(sp: Record<string, string | string[] | undefined>): {
  projectId?: string;
  from?: string;
  to?: string;
} {
  const single = (key: string) => {
    const v = sp[key];
    return Array.isArray(v) ? v[0] : v;
  };
  const projectId = single("projectId") || undefined;
  const from = single("from") || undefined;
  const to = single("to") || undefined;
  return { projectId, from, to };
}

export function toReportFilters(input: {
  organizationId: string;
  projectId?: string;
  from?: string;
  to?: string;
}) {
  const fromDate = input.from ? new Date(input.from) : undefined;
  const toDate = input.to ? new Date(input.to) : undefined;
  return {
    organizationId: input.organizationId,
    projectId: input.projectId,
    from: fromDate && !Number.isNaN(fromDate.getTime()) ? fromDate : undefined,
    to: toDate && !Number.isNaN(toDate.getTime()) ? toDate : undefined,
  };
}

export function exportHrefs(report: string, sp: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  params.set("report", report);
  for (const [k, v] of Object.entries(sp)) {
    if (v) params.set(k, v);
  }
  const csv = new URLSearchParams(params);
  csv.set("format", "csv");
  const xlsx = new URLSearchParams(params);
  xlsx.set("format", "xlsx");
  return {
    csv: `/api/v1/reports/export?${csv.toString()}`,
    xlsx: `/api/v1/reports/export?${xlsx.toString()}`,
  };
}
