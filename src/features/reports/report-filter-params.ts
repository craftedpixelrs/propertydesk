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
  return {
    organizationId: input.organizationId,
    projectId: input.projectId,
    from: parseIsoDateOnly(input.from, false),
    to: parseIsoDateOnly(input.to, true),
  };
}

function parseIsoDateOnly(value: string | undefined, endOfDay: boolean): Date | undefined {
  if (!value) return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) {
    const fallback = new Date(value);
    return Number.isNaN(fallback.getTime()) ? undefined : fallback;
  }
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  return endOfDay
    ? new Date(year, month, day, 23, 59, 59, 999)
    : new Date(year, month, day, 0, 0, 0, 0);
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
