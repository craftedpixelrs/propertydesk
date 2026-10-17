# Pilot nalog — pre nego što klijent uđe

Nalog se ne otvara sam. Posle demoa ga pravi super-admin. Trial je
30 dana. Datum kraja se upisuje u lead. Ne produžava se tiho.

## Pre predaje naloga

- [ ] `my.` health: `GET /api/v1/health` i `GET /api/v1/health/ready`
      (`database: ok`).
- [ ] Image na `my.` je onaj koji je proveren na demo. `fix-bugs-v1`
      ne promocuje host dok se to ne kaže.
- [ ] Mejl: forgot-password na inbox koji ti ne kontrolišeš stiže sa
      `noreply@propertydesk.app`. U logu nema `[email:console]`.
      Vidi [`email.md`](./email.md).
- [ ] Crontab na VPS-u gađa `https://my.propertydesk.app`, ne stari
      `app.propertydesk.app`. Vidi [`cron-jobs.md`](./cron-jobs.md).
- [ ] SEF provajder je `MANUAL`. `SERBIAN_SEF` vraća grešku, ne
      „primljeno“.
- [ ] Kurs za dinarsku protivvrednost unet ručno ako će biti RSD.
- [ ] Jedan restore dumpa van `my.`. Vidi [`restore.md`](./restore.md).
- [ ] Potpisan šablon iz [`obrada-podataka.md`](./obrada-podataka.md)
      pre prvog JMBG-a. PIB obrađivača upisan, ne izmišljen.
- [ ] Prva faktura suvo prošla: profil firme, račun, IPS QR, PDF.

## Excel, jednom, pre obećanja

1. Uzmi pravi cenovnik (ili šablon iz `/projekti/{id}/uvoz`).
2. Uvezi ga na prazan projekat na stagingu ili na svom nalogu.
3. Proveri šifru, cenu, sprat i status na tri nasumične jedinice.
4. Zapiši koliko je trajalo. Tek onda reci „uvoz prve tabele je u paketu“.

## Šta piše u dogovoru

- 30 dana, datum kraja, paket posle toga (Starter / Growth / Scale).
- Ko radi uvoz i podešavanje jednog projekta.
- Kanal podrške: `hello@propertydesk.app` i jedan Viber/WhatsApp.
- Nije uključeno: SEF API, automatski NBS, mejl kupcu, WordPress, AI, marketplace.
- Izvoz: Podešavanja → Organizacija. Anonimizacija kupca: kartica kupca, dugme za vlasnika ili admina.

## Demo

Vođen, na srpskom, bez super-admina. Link `demo.propertydesk.app` ne
šalji unapred — lozinka je na stranici prijave i podaci se pokvare.
