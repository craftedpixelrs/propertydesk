import { Check, Building2, Users } from "lucide-react";

import { LANDING_IMAGES } from "@/lib/constants/app";
import { MockupFrame } from "@/features/marketing/mockup-frame";

const INVESTOR_ITEMS = [
  "Zalihe stanova, garaža i lokala kroz više projekata (uvoz iz Excel-a, klon projekta)",
  "CRM sa KYC-em (JMBG, PIB, LK), detekcijom duplikata i @mentions komentarima",
  "Online rezervacija sa IPS QR kaparom - kupac plaća skeniranjem",
  "Generator ugovora i predugovora u PDF-u sa svim placeholder-ima",
  "Cash-flow projekcija 12 meseci, marža po projektu i vreme do prodaje",
  "Javni sajt projekta (microsite) sa mapom i dostupnim jedinicama",
  "Kontrola pristupa i provizija za partnerske agencije",
];

const AGENCY_ITEMS = [
  "Pregled dodeljenih projekata i slobodnih jedinica",
  "Referral kod sa jedinstvenim linkom i QR-om za marketing",
  "Registracija i zaštita kupaca (buyer protection)",
  "Rezervacije direktno iz ponude investitora, uz KYC checklist",
  "Praćenje provizija od odobrenja do isplate, sa referral bonusima",
  "Zaseban tim agenata i uloge sa dozvolama",
  "Nema više izgubljenih kontakata i konfuzije sa investitorima",
];

interface PersonaCardProps {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  eyebrow: string;
  title: string;
  description: string;
  items: string[];
}

function PersonaCard({
  icon: Icon,
  eyebrow,
  title,
  description,
  items,
}: PersonaCardProps) {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm sm:p-8">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="grid h-11 w-11 place-items-center rounded-lg bg-[var(--color-brand-50)] text-[var(--color-brand-700)]"
        >
          <Icon className="size-5" aria-hidden />
        </span>
        <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-brand-700)]">
          {eyebrow}
        </div>
      </div>
      <h3 className="mt-4 text-2xl font-bold tracking-tight">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-[var(--color-foreground-muted)]">
        {description}
      </p>
      <ul className="mt-5 space-y-2.5">
        {items.map((it) => (
          <li key={it} className="flex items-start gap-2.5 text-sm">
            <Check
              aria-hidden
              className="mt-0.5 size-4 flex-none text-[var(--color-success)]"
            />
            <span className="text-[var(--color-foreground)]">{it}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

export function Personas() {
  return (
    <section
      id="za-koga"
      aria-labelledby="personas-title"
      className="scroll-mt-20 bg-[var(--color-surface-muted)]"
    >
      <div className="container-app py-16 sm:py-20">
        <div className="max-w-3xl">
          <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-brand-700)]">
            Za koga
          </div>
          <h2
            id="personas-title"
            className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl"
          >
            Dve strane, jedna platforma
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[var(--color-foreground-muted)]">
            PropertyDesk je dizajniran za dvosmernu saradnju investitora i
            agencija. Svaka strana dobija svoj portal i tačno one podatke koji
            su joj potrebni - ništa više, ništa manje.
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <PersonaCard
            icon={Building2}
            eyebrow="Za investitore"
            title="Prodaja novogradnje pod punom kontrolom"
            description="Vodite prodajni tim, projekte i zalihe. Kontrolišete kojim agencijama otvarate ponudu, pod kojim uslovima i sa kakvom provizijom."
            items={INVESTOR_ITEMS}
          />
          <PersonaCard
            icon={Users}
            eyebrow="Za agencije za nekretnine"
            title="Sve što treba za rad sa investitorima"
            description="Bez haosa u Excel-u i Viber grupama. Vidite tačno šta je slobodno, štitite kupca i pratite proviziju do isplate."
            items={AGENCY_ITEMS}
          />
        </div>

        <div className="mt-12 flex justify-center">
          <MockupFrame
            variant="mobile"
            src={LANDING_IMAGES.personasMobile?.src}
            width={LANDING_IMAGES.personasMobile?.width}
            height={LANDING_IMAGES.personasMobile?.height}
            alt="Mobilna aplikacija PropertyDesk za rad na terenu"
            label="PWA za teren - uskoro"
          />
        </div>
      </div>
    </section>
  );
}
