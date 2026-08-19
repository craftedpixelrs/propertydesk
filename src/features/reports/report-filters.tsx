import { Card, CardContent } from "@/components/ui/card";
import { ReportFiltersBar } from "@/features/reports/report-filters-bar";

export {
  parseReportSearchParams,
  toReportFilters,
  exportHrefs,
} from "@/features/reports/report-filter-params";

/**
 * Filter bar used by every /izvestaji page.
 *
 * Changing project or dates updates the URL immediately (no Apply
 * button) so the server page re-fetches. Export links already include
 * the current search params from the parent.
 */
export function ReportFilters(props: {
  action: string;
  projects: Array<{ id: string; name: string }>;
  selectedProjectId?: string;
  from?: string;
  to?: string;
  exportCsvHref: string;
  exportXlsxHref: string;
  showProjectFilter?: boolean;
}) {
  return (
    <Card>
      <CardContent className="py-4">
        <ReportFiltersBar {...props} />
      </CardContent>
    </Card>
  );
}
