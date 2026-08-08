import { requireSuperAdmin } from "@/server/permissions/require";
import { listExchangeRates } from "@/server/services/billing/exchange-rates/service";
import {
  ExchangeRateEditor,
  type ExchangeRateRow,
} from "@/features/billing/exchange-rate-editor";

export const dynamic = "force-dynamic";

/**
 * Kursna lista — manually-maintained EUR/RSD exchange rates.
 *
 * When an organization has "fakturisi u dinarskoj protivvrednosti"
 * enabled, `issueInvoice` looks up the newest rate whose
 * `effectiveDate <= issueDate` and converts the invoice to RSD. Rates are
 * plain rows here — no ranges, no interpolation: the pick-newest rule is
 * both simple and matches the Serbian tax-law convention of "srednji
 * kurs na dan izdavanja".
 */
export default async function ExchangeRatesPage() {
  await requireSuperAdmin();
  const rows = await listExchangeRates({
    baseCurrency: "EUR",
    quoteCurrency: "RSD",
  });

  const initial: ExchangeRateRow[] = rows.map((r) => ({
    id: r.id,
    baseCurrency: r.baseCurrency,
    quoteCurrency: r.quoteCurrency,
    rate: r.rate.toString(),
    effectiveDate: r.effectiveDate.toISOString(),
    source: r.source,
    note: r.note,
    createdAt: r.createdAt.toISOString(),
  }));

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold">Kursna lista (EUR / RSD)</h2>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          Ručno održavana lista srednjeg kursa. Prilikom izdavanja fakture
          domaćem klijentu (organizacije sa uključenom opcijom
          „Fakturiši u dinarskoj protivvrednosti"), sistem uzima najnoviji
          kurs čiji je datum važenja pre ili jednak datumu izdavanja
          fakture.
        </p>
        <p className="text-xs text-[var(--color-foreground-subtle)]">
          Napomena: automatsko povlačenje sa NBS-a nije aktivno. Ako
          kasnije uključimo integraciju, ovde će se pojavljivati i redovi
          sa izvorom „NBS".
        </p>
      </header>

      <ExchangeRateEditor initialRates={initial} />
    </section>
  );
}
