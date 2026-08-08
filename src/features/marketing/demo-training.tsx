import { CalendarCheck, Presentation, PlayCircle, GraduationCap } from "lucide-react";

const STEPS = [
  {
    icon: CalendarCheck,
    number: "01",
    title: "Zakažite demo iz kalendara",
    body:
      "Direktno birate slobodan termin iz našeg kalendara - bez čekanja i bez emailova napred-nazad. Dobijate potvrdu i podsetnik e-mailom.",
  },
  {
    icon: Presentation,
    number: "02",
    title: "25-minutni personalizovan demo",
    body:
      "Kratak video poziv u kome kroz Vaše primere prolazimo ključne tokove: projekte, statuse jedinica, rezervacije, prodaje i uplate.",
  },
  {
    icon: PlayCircle,
    number: "03",
    title: "30 dana besplatnog trial-a",
    body:
      "Ako Vam se dopadne, aktiviramo probni nalog sa svim funkcijama. Bez kartice, bez obaveze - test na Vašim realnim podacima.",
  },
  {
    icon: GraduationCap,
    number: "04",
    title: "60-minutni onboarding za tim",
    body:
      "Nakon aktivacije trial-a zakazujemo praktični onboarding sa Vašim prodajnim timom - kroz konkretne najbolje prakse i realne scenarije.",
  },
] as const;

export function DemoTraining() {
  return (
    <section
      aria-labelledby="demo-title"
      className="bg-[var(--color-surface-muted)]"
    >
      <div className="container-app py-16 sm:py-20">
        <div className="max-w-3xl">
          <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-brand-700)]">
            Demo i onboarding
          </div>
          <h2
            id="demo-title"
            className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl"
          >
            Kratak demo, pa realni trial - onboarding tek kada odlučite da probate
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[var(--color-foreground-muted)]">
            Vaše vreme je najskuplji resurs. Prvo Vam pokažemo sistem u 25
            minuta na Vašim primerima - bez marketinških slajdova. Ako Vam
            ima smisla, aktiviramo probni nalog i zakazujemo praktičan
            onboarding sa timom nakon toga.
          </p>
        </div>

        <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => {
            const Icon = s.icon;
            return (
              <li
                key={s.number}
                className="relative rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span
                    aria-hidden
                    className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--color-brand-50)] text-[var(--color-brand-700)]"
                  >
                    <Icon className="size-5" />
                  </span>
                  <span
                    aria-hidden
                    className="font-mono text-2xl font-bold text-[var(--color-brand-100)]"
                  >
                    {s.number}
                  </span>
                </div>
                <h3 className="mt-4 text-base font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-foreground-muted)]">
                  {s.body}
                </p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
