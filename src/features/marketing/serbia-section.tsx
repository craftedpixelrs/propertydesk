import { QrCode, FileCheck, Languages, Coins, FileSpreadsheet } from "lucide-react";

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
    title: "IPS QR na fakturama",
    body: "Sve SaaS fakture nose ispravan IPS QR kod usklađen sa specifikacijom NBS-a. Vaši klijenti plaćaju skeniranjem - bez prekucavanja.",
  },
  {
    icon: FileCheck,
    title: "Integracija sa SEF-om",
    body: "Sistem elektronskih faktura, sa provajder-agnostičnom arhitekturom. Fakture se šalju i status prati kroz aplikaciju.",
  },
  {
    icon: FileSpreadsheet,
    title: "Uvoz bankarskih izvoda",
    body: "CSV/XLSX izvod iz Vaše banke, automatsko uparivanje po pozivu na broj, iznosu i datumu.",
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
