# Ugovor o obradi podataka (šablon)

Za prvog klijenta koji unosi JMBG, broj lične karte ili KYC dokumenta.
PropertyDesk je obrađivač. Organizacija klijenta je rukovalac.

PIB, matični broj i adresa izdavaoca se **ne izmišljaju** u ovom
fajlu. Upisuju se tek kad je pravno lice registrovano, na isto mesto
kao impressum (`COMPANY` u `src/lib/constants/app.ts` namerno nema
te brojeve dok entitet ne postoji).

## Strane

| | |
| --- | --- |
| Rukovalac | naziv, PIB, MB, adresa, email klijenta |
| Obrađivač | CraftedPixel / PropertyDesk, `hello@propertydesk.app`. PIB i adresa: ________ |
| Predmet | vođenje prodaje novogradnje u aplikaciji na `my.propertydesk.app` |

## Šta se obrađuje

Nalozi zaposlenih, projekti, jedinice, kupci (ime, telefon, email,
JMBG, PIB, adresa), KYC dokumenta, rezervacije, ugovori, uplate,
provizije. Podaci kupaca ostaju u organizaciji klijenta. Druga
organizacija ih ne vidi.

Kod MANAGER tenanta (upravnici zgrada, Faza 11) dodatno:
`ManagedBuilding`, `ManagedUnit`, `BuildingPerson` (ime, email,
telefon, adresa — **bez JMBG, broja lične karte i PIB-a**),
`UnitOwnership`, `DuesCharge` / `DuesPayment`, `MaintenanceTicket`,
`BuildingNotice`, `Assembly` + `AssemblyVote`, `ResidentAccess`
(magic-link pristup stanaru). Stanari **nisu** nalozi u sistemu
(nema `User` reda) — pristup se čuva kao HMAC-potpisan cookie
`pd_resident` (ključ `BETTER_AUTH_SECRET`); povlačenje pristupa je
trenutno (prvi sledeći zahtev padne na proveri potpisa / statusa).

## Minimizacija pri predaji zgrade (investitor → upravnik)

Kada investitor preda zgradu upravniku
(`BuildingHandoverRequest` → accept), kopira se samo ono što
upravniku treba za rad: struktura zgrade (ulazi, posebni delovi),
imena vlasnika sa `email`, `phone`, `address`. **JMBG, broj lične
karte (`identityNumber`) i PIB (`taxId`) iz `Buyer` reda se NIKAD
ne kopiraju** u `BuildingPerson`. Pravilo je ugrađeno u
`src/server/services/manager/handover.service.ts` (whitelist polja);
dokumentovano u [`docs/upravnici.md`](./upravnici.md). Investitor
zadržava originalni `Buyer` red za svoje računovodstvo; upravnik
ima zasebnu, mršaviju kopiju za zaduženja i skupštine.

Posledica za ugovor o obradi: za MANAGER tenanta ne upisujete JMBG
u šablon, osim ako sam upravnik od stanara prikupi JMBG za
sopstvenu svrhu (npr. ugovor o korišćenju) — u tom slučaju je
rukovalac i dalje upravnik, a PropertyDesk pruža samo tehničku
infrastrukturu i nema automatizovan unos JMBG-a za `BuildingPerson`.

## Svrha i rok

Izvršenje pretplate. Dok traje nalog, plus 30 dana za izvoz posle
ograničenja. Računi i ugovori ostaju onoliko koliko zakon traži i
posle anonimizacije kupca.

## Šta obrađivač radi

- drži podatke u EU regionu, šifrovano u tranzitu;
- ne koristi ih za svoj marketing;
- ne prodaje ih;
- podizvođači: hosting/baza, skladište dokumenata (S3), Resend za
  transakcioni mejl, Sentry ako je uključen;
- anonimizacija kupca na zahtev rukovaoca (`buyer.anonymize`, vlasnik i admin investitora);
- JSON izvoz za vlasnika (`organization.export`), uključujući period
  kad je nalog ograničen.

## Šta još nije automatski

SEF slanje, automatski kurs NBS, mejl kupcu za ratu, elektronski
potpis. Ručni SEF portal i ručni kurs su deo usluge dok se to ne uključi.

## Potpis

Datum, potpis rukovaoca, potpis obrađivača. Jedan primerak uz pilot
nalog iz [`pilot-nalog.md`](./pilot-nalog.md).
