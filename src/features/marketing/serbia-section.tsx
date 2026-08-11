import {
  QrCode,
  FileCheck,
  Languages,
  Coins,
  FileSpreadsheet,
  ShieldCheck,
  Percent,
  FileSignature,
} from "lucide-react";

const ITEMS = [
  {
    icon: Languages,
    title: "Srpski jezik i format",
    body: "Ceo interfejs, emailovi, PDF izlazi i validacije - na srpskom (sr-Latn). Format datuma, adresa i telefona po lokalnom standardu.",
  },
  {
    icon: Coins,
    title: "EUR i RSD",
    body: "Ugrađena podrška za obe valute. Automatski preračun po srednjem kursu NBS na dan izdavanja fakture za dinarsku protivvrednost.",
  },
  {
    icon: QrCode,
    title: "IPS QR za kaparu i fakture",
    body: "Ispravan IPS QR usklađen sa NBS specifikacijom - i na SaaS fakturama i na online rezervacijama sa kaparom. Kupac plaća skeniranjem, bez prekucavanja poziva na broj.",
  },
  {
    icon: FileCheck,
    title: "Integracija sa SEF-om",
    body: "Sistem elektronskih faktura, sa provajder-agnostičnom arhitekturom. Fakture se šalju i status prati kroz aplikaciju.",
  },
  {
    icon: ShieldCheck,
    title: "KYC za kupce (fizička i pravna lica)",
    body: "JMBG, broj lične karte, PIB, adresa - sa checklist-om (LK, potvrda adrese, poreska potvrda za pravna lica). Blok na prelazak u ugovor dok KYC nije potpun.",
  },
  {
    icon: Percent,
    title: "PDV režim: novogradnja i sekundarno tržište",
    body: "Automatski obračun PDV-a 10% za novogradnju ili poreza na prenos apsolutnih prava 2.5% za sekundarno tržište - upisan na svaku prodaju i propagiran u PDF ugovor.",
  },
  {
    icon: FileSignature,
    title: "Ugovori i predugovori u PDF-u",
    body: "Šabloni sa placeholder-ima ({{buyer.jmbg}}, {{sale.finalPrice}}, {{plan.installments}}) - generišu se u par klikova, sa audit tragom za status (poslato, potpisano).",
  },
  {
    icon: FileSpreadsheet,
    title: "Uvoz bankarskih izvoda i cenovnika",
    body: "CSV/XLSX izvod iz banke se uparuje po pozivu na broj i iznosu. Uvoz jedinica iz Excel-a: 3-korak wizard sa mapiranjem kolona i preview-om pre snimanja.",
  },
] as const;

export function SerbiaSection() {
  return (
    <section
      aria-labelledby="serbia-title"
      className="border-t border-[var(--color-border)]"
    >
      <div className="container-app py-16 sm:py-20">
        <div className="max-w-3xl">
          <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-brand-700)]">
            Napravljeno za Srbiju
          </div>
          <h2
            id="serbia-title"
            className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl"
          >
            Zakonska usklađenost i lokalni standardi ugrađeni od prvog dana
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[var(--color-foreground-muted)]">
            Ne prilagođavamo strani softver srpskom tržištu - PropertyDesk je
            izgrađen ovde, za ovaj poslovni kontekst.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ITEMS.map((it) => {
            const Icon = it.icon;
            return (
              <div
                key={it.title}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm"
              >
                <span
                  aria-hidden
                  className="inline-grid h-10 w-10 place-items-center rounded-lg bg-[var(--color-brand-50)] text-[var(--color-brand-700)]"
                >
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-4 text-base font-semibold">{it.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-foreground-muted)]">
                  {it.body}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
