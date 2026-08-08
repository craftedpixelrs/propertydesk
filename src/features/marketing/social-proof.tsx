import { Mail, Phone, Building2, ShieldCheck } from "lucide-react";

/**
 * Social proof section - pilot logos + founder + company card.
 *
 * The wording is intentionally conservative. We do NOT invent metrics
 * (X units, Y agencies, Z% conversion) until we have real data. Once
 * pilot clients are onboarded, replace each `PilotLogoSlot` with a
 * real `<Image>` element referencing `/images/landing/pilots/*.svg`.
 */

const PILOT_SLOTS = [
  "Investitor",
  "Investitor",
  "Agencija",
  "Agencija",
  "Investitor",
  "Agencija",
] as const;

export function SocialProof() {
  return (
    <section
      aria-labelledby="proof-title"
      className="bg-white"
    >
      <div className="container-app py-16 sm:py-20">
        <div className="max-w-3xl">
          <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-brand-700)]">
            Ko stoji iza proizvoda
          </div>
          <h2
            id="proof-title"
            className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl"
          >
            Razvijeno uz konsultacije sa investitorima i agentima
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[var(--color-foreground-muted)]">
            PropertyDesk gradimo direktno sa ljudima koji svakodnevno prodaju
            novogradnju - investitorima koji vode više projekata paralelno i
            agencijama koje treba da vide azurno stanje inventara u svakom
            trenutku.
          </p>
        </div>

        <div className="mt-10">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-foreground-subtle)]">
            Pilot partneri
          </div>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {PILOT_SLOTS.map((label, i) => (
              <PilotLogoSlot key={i} label={label} />
            ))}
          </ul>
          <p className="mt-3 text-xs text-[var(--color-foreground-subtle)]">
            Vaš logotip može biti ovde. Prijavite se za rani pristup i
            postanite jedan od pilot partnera.
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <FounderCard />
          <CompanyCard />
        </div>
      </div>
    </section>
  );
}

function PilotLogoSlot({ label }: { label: string }) {
  return (
    <li
      aria-label="Slot za logotip pilot partnera"
      className="flex h-20 items-center justify-center rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3"
    >
      <div className="text-center">
        <div className="text-sm font-semibold text-[var(--color-foreground-muted)]">
          Vaš logo?
        </div>
        <div className="mt-0.5 text-[10px] uppercase tracking-wider text-[var(--color-foreground-subtle)]">
          {label}
        </div>
      </div>
    </li>
  );
}

function FounderCard() {
  return (
    <article className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm sm:p-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <div
          aria-hidden
          className="grid h-28 w-28 flex-none place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--color-brand-500)] to-[var(--color-brand-800)] text-4xl font-bold text-white ring-1 ring-[var(--color-border)]"
        >
          MB
        </div>
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-brand-700)]">
            Osnivač
          </div>
          <h3 className="mt-1 text-xl font-bold text-[var(--color-foreground)]">
            Marko Banović
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-[var(--color-foreground-muted)]">
            Vodim razvoj PropertyDesk-a. Poslednjih godina sam blisko radio sa
            investitorima i agencijama koje prodaju novogradnju - ovaj proizvod
            je odgovor na iste probleme koje sam viđao iznova (Excel bez
            verzija, Viber grupe za rezervacije, ručno računanje provizija).
          </p>
          <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
            <li>
              <a
                href="mailto:marko.banovic@craftedpixel.rs"
                className="inline-flex items-center gap-1.5 font-medium text-[var(--color-brand-700)] hover:underline"
              >
                <Mail aria-hidden className="size-4" />
                marko.banovic@craftedpixel.rs
              </a>
            </li>
            <li>
              <a
                href="tel:+381654363142"
                className="inline-flex items-center gap-1.5 font-medium text-[var(--color-brand-700)] hover:underline"
              >
                <Phone aria-hidden className="size-4" />
                +381 65 43 63 142
              </a>
            </li>
          </ul>
        </div>
      </div>
    </article>
  );
}

function CompanyCard() {
  return (
    <article className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-brand-50)] p-6 shadow-sm sm:p-8">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="grid h-10 w-10 flex-none place-items-center rounded-lg bg-[var(--color-brand-600)] text-white"
        >
          <Building2 className="size-5" />
        </span>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-brand-700)]">
            Iza proizvoda
          </div>
          <h3 className="mt-1 text-xl font-bold text-[var(--color-foreground)]">
            CraftedPixel
          </h3>
        </div>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-[var(--color-foreground-muted)]">
        PropertyDesk razvija{" "}
        <a
          href="https://getcraftedpixel.com"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-[var(--color-brand-700)] hover:underline"
        >
          CraftedPixel
        </a>{" "}
        - softverska firma iz Srbije specijalizovana za proizvode koji
        rešavaju konkretne operativne probleme u B2B poslovanju.
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-[var(--color-foreground-muted)]">
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck aria-hidden className="size-4 text-[var(--color-brand-700)]" />
          Podaci u EU regionu
        </span>
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck aria-hidden className="size-4 text-[var(--color-brand-700)]" />
          Enkripcija u tranzitu i mirovanju
        </span>
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck aria-hidden className="size-4 text-[var(--color-brand-700)]" />
          Trajni audit dnevnik
        </span>
      </div>
    </article>
  );
}
