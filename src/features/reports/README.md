# reports

Operational and sales reports. Every report page is a React Server
Component that fetches pre-aggregated data and streams it directly to
the shared chart wrappers under `src/components/charts/`.

Routes (`/izvestaji/*`):

- `prodaje` — sales by status, contracted value by status, monthly
  trend (`buildSalesTrend`).
- `zalihe` — inventory by status, stacked bar per project × status.
- `uplate` — payment volumes by method.
- `rezervacije` — reservations by status/source and the
  reservation-to-sale conversion funnel (`buildConversionFunnel`).
- `kupci` — buyers by status and source.
- `agencije` — sales per agency, commissions, top agents.

`buildSalesTrend` and `buildConversionFunnel` in
`src/server/services/reports/reports.service.ts` use `$queryRaw` with
`date_trunc('month', "createdAt" AT TIME ZONE 'Europe/Belgrade')` so
month boundaries respect the app timezone rather than drifting to UTC.
