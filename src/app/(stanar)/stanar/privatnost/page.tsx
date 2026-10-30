import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/server/db/prisma";
import { requireResidentSession } from "@/server/auth/resident-guard";
import { listResidentUnitsForSession } from "@/server/auth/resident-session";

/**
 * Resident-facing privacy / "moji podaci" page. Shows exactly what the
 * manager stores about this resident and references `/obrada-podataka`
 * for the processing-notice text. Keeps us honest about ZZPL data
 * minimization — JMBG/identity numbers never reach the manager tenant
 * and so cannot appear here either.
 */
export default async function ResidentPrivacyPage() {
  const session = await requireResidentSession();
  const [person, accesses] = await Promise.all([
    prisma.buildingPerson.findUnique({
      where: { id: session.personId },
      select: {
        firstName: true,
        lastName: true,
        legalName: true,
        email: true,
        phone: true,
        address: true,
        primaryRole: true,
      },
    }),
    listResidentUnitsForSession(session),
  ]);

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold">Moji podaci i privatnost</h1>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          Pregled podataka koje PropertyDesk vodi o Vama za potrebe upravljanja zgradom.
        </p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Lični podaci</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {person ? (
            <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Row label="Ime i prezime" value={displayName(person)} />
              <Row label="Email" value={person.email ?? "—"} />
              <Row label="Telefon" value={person.phone ?? "—"} />
              <Row label="Adresa" value={person.address ?? "—"} />
              <Row label="Rola" value={person.primaryRole} />
            </dl>
          ) : (
            <p>Podaci nisu dostupni.</p>
          )}
          <p className="pt-2 text-xs text-[var(--color-foreground-muted)]">
            PropertyDesk NE čuva JMBG, broj lične karte ni PIB u zgradskom modulu — upravnik
            pristupa samo osnovnim kontaktima potrebnim za rad (član 5. GDPR i ZZPL, princip
            minimizacije).
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Zgrade i posebni delovi na koje imate pristup</CardTitle>
        </CardHeader>
        <CardContent>
          {accesses.length === 0 ? (
            <p className="text-sm">Trenutno nemate dodeljen aktivan pristup.</p>
          ) : (
            <ul className="list-inside list-disc space-y-1 text-sm">
              {accesses.map((a) => (
                <li key={a.id}>
                  {a.unit.building.name} · {a.unit.code}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Vaša prava</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            Prema ZZPL i GDPR imate pravo na pristup, ispravku, ograničenje obrade i prigovor. Za
            ispravke podataka ili pritužbe obratite se upravniku zgrade — PropertyDesk kao obrađivač
            ne menja podatke bez naloga rukovaoca.
          </p>
          <p>
            Detaljan opis osnova obrade i rokova čuvanja dostupan je na stranici{" "}
            <Link href="/obrada-podataka" className="text-[var(--color-brand-700)] hover:underline">
              Obrada podataka
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function displayName(p: {
  firstName: string | null;
  lastName: string | null;
  legalName: string | null;
}): string {
  if (p.legalName) return p.legalName;
  const parts = [p.firstName, p.lastName].filter(Boolean);
  return parts.length ? parts.join(" ") : "—";
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-[var(--color-foreground-muted)] uppercase">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
