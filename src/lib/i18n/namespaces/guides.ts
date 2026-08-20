type Leaves<T> = T extends string ? string : { [K in keyof T]: Leaves<T[K]> };

const page = (
  title: string,
  steps: [string, string][],
) => {
  const out: Record<string, string> = { title };
  steps.forEach(([stepTitle, body], i) => {
    const n = i + 1;
    out[`s${n}Title`] = stepTitle;
    out[`s${n}Body`] = body;
  });
  return out as {
    title: string;
    s1Title: string;
    s1Body: string;
    s2Title: string;
    s2Body: string;
    s3Title: string;
    s3Body: string;
    s4Title?: string;
    s4Body?: string;
  };
};

export const guidesSr = {
  chrome: {
    open: "Kako se koristi",
    title: "Vodič stranice",
    stepOf: "Korak {{current}} od {{total}}",
    next: "Dalje",
    previous: "Nazad",
    finish: "Završi",
    skip: "Preskoči",
    dontShowAgain: "Ne prikazuj automatski",
  },
  dashboard: page("Kontrolna tabla", [
    ["Čemu služi", "Ovde vidite stanje prodaje: dostupne jedinice, rezervacije, ugovoreno i naplaćeno. To je početna tačka radnog dana."],
    ["Kako da čitate brojke", "Kartice gore su KPI iz vaše organizacije. Klik na izveštaj ili projekat vodi u detalj — ništa se ovde ne unosi."],
    ["Prvi koraci", "Ako je nalog nov, checklista „Prvi koraci“ vodi kroz profil, projekat, jedinice i tim. Možete je sakriti i vratiti iz /prvi-koraci."],
    ["Šta dalje", "Investitor: Projekti → jedinice → kupci. Agencija: Ponuda → registracija kupca → rezervacija."],
  ]),
  projects: page("Projekti", [
    ["Čemu služi", "Projekat je zgrada ili naselje koje prodajete. Ovde kreirate, menjate i otvarate strukturu, jedinice i javni sajt."],
    ["Novi projekat", "Kliknite Novi projekat. Obavezni su šifra i naziv. Grad, adresu i opštinu birate iz predloga — PTT i mapa se popune. Možete odmah otpremiti naslovnu sliku."],
    ["Struktura", "Na detalju dodajte Objekat → Ulaz → Sprat, pa jedinice. Duplikat kopira strukturu bez kupaca i prodaja."],
    ["Javna ponuda", "Share link i microsite su na detalju projekta. Naslovna slika ide na javni sajt i u chat pregled."],
  ]),
  inventory: page("Jedinice", [
    ["Čemu služi", "Lista svih stanova, parkinga i ostava. Filtrirajte po projektu, statusu i ceni. Ovde pratite šta je slobodno."],
    ["Statusi", "Dostupna, rezervisana, prodata… Status menja rezervacija ili prodaja, ne ručno „od oka“. Interna napomena ostaje samo vama."],
    ["Uvoz", "Za više od ~10 jedinica: projekat → Uvoz. Skinite šablon na jeziku aplikacije, mapirajte kolone, pa potvrdite preview."],
    ["Cene i foto", "Na jedinici menjate cenu (ostaje istorija), galeriju i naslovnu. Agencija vidi cenu samo ako joj date pravo."],
  ]),
  customers: page("Kupci", [
    ["Čemu služi", "CRM: svi interesenti i kupci. Duplikati se hvataju po telefonu i emailu da ne radite isti dosije dvaput."],
    ["Novi kupac", "Kupci → Novi. Unesite ime i telefon ili email. Pravno lice: PIB i naziv firme. KYC dopunite pre ugovora."],
    ["Timeline", "Na kartici kupca beležite pozive, sastanke i komentare. @pominjanje šalje obaveštenje kolegi. Treba dozvola pregleda kupaca."],
    ["Zaštita i KYC", "Agencijski kupac može imati buyer protection. Tab KYC je checklist + skenovi — to ne ide agenciji."],
  ]),
  tasks: page("Zadaci", [
    ["Čemu služi", "Vaši zadaci: Danas, Prekoračeni, Nadolazeći. Sistem i sam pravi zadatke (ističe rezervacija, dospela rata)."],
    ["Kako da radite", "Otvorite zadatak, uradite posao na povezanom entitetu, pa označite završenim. Filteri ostaju u URL-u."],
    ["Dodela", "Možete dodeliti kolegi ako imate pravo. Prioritet pomaže da se jutro ne raspline."],
  ]),
  reservations: page("Rezervacije", [
    ["Čemu služi", "Drži jedinicu za kupca na ograničeno vreme. Aktivna rezervacija je jedinstvena po stanu — drugi dobija konflikt."],
    ["Interna", "Sa jedinice ili kupca: Rezerviši. Unesite rok. Odobri / odbij / produži su na detalju."],
    ["Online + IPS", "Javni share link: kupac šalje zahtev i dobija IPS QR za kaparu. Vi potvrđujete uplatu u Zahtevima."],
    ["Kanban", "Tabla pokazuje tok zahteva. Cron automatski ističe istekle rezervacije i javlja kupcu."],
  ]),
  calendar: page("Kalendar", [
    ["Čemu služi", "Mesečni pregled rokova: rezervacije, rate, zadaci, primopredaje. Nije Google/Outlook sync."],
    ["Kako da koristite", "Filter dugmad gore sužavaju tip događaja. Klik na traku otvara entitet."],
    ["Prazan kalendar", "Ako je prazan, proverite aktivnu organizaciju. Novi tenant nema seed rokove."],
  ]),
  sales: page("Prodaje", [
    ["Čemu služi", "Ugovorena prodaja jedinice. Ovde idu predugovor/ugovor, plan otplate, uplate i storno."],
    ["Kreiranje", "Najčešće iz odobrene rezervacije. Unesite cenu, način plaćanja i datum ulaska u posed. Draft ne ulazi u P&L."],
    ["Ugovor", "Izaberite šablon → generišite PDF. Poslato/potpisano je ručna oznaka. KYC mora biti kompletan za ugovor."],
    ["Plan i PDV", "Primenite šablon rata ili unesite ručno. VAT/RPI režim birate na prodaji. Provizija agencije se snapshot-uje."],
  ]),
  payments: page("Uplate", [
    ["Čemu služi", "Uplate kupaca na prodaju. FIFO ide na najstariju otvorenu ratu. Ništa se ne briše — storno pravi negativan par."],
    ["Unos", "Iznos, datum, način, referenca. Višak ostaje kao neprimenjen iznos."],
    ["Bankovni izvod", "Uvezite CSV/XLSX, mapirajte kolone. Sistem predlaže poklapanje po iznosu, pozivu na broj i datumu."],
    ["Kašnjenje", "Cron označava dospele rate. Kupac dobija podsetnik 3 dana pre, na dan i 7 dana posle."],
  ]),
  agencies: page("Agencije", [
    ["Čemu služi", "Partnerske agencije koje prodaju vaš inventar. Nisu plaćeni nalog — pristup ide samo preko vašeg poziva."],
    ["Poziv", "Unesite email (naziv opciono). Ne morate da znate da li već imaju nalog. Novi nalog pravi partner org; postojeći samo prihvata."],
    ["Pristup", "Na konekciji dodelite projekte i da li vide cene. Bez grant-a Ponuda im je prazna."],
    ["Provizija", "Pravilo bira sistem (jedinica → projekat → konekcija). Iznos se snima u trenutku ugovora."],
  ]),
  agencyRegistrations: page("Registracije agencija", [
    ["Čemu služi", "Zahtevi agencije da zaštiti kupca (buyer protection). Vi odobravate ili odbijate."],
    ["Kako", "Otvorite zahtev → Odobri ili Odbij uz razlog. Konflikt ide na ručni pregled ako druga agencija već drži kupca."],
    ["Posle odobrenja", "Prodaja tom kupcu u periodu zaštite veže se za tu agenciju i njihovu proviziju."],
  ]),
  commissions: page("Provizije", [
    ["Čemu služi", "Iznosi koje dugujete agencijama. Lifecycle: na čekanju → odobreno → spremno → isplaćeno."],
    ["Kako", "Odobrite iznos, pa zabeležite isplatu. Snapshot se ne menja ako kasnije dirate pravilo."],
    ["Izveštaj", "Širi pregled je u Izveštaji → Agencije, uključujući referral atribuciju."],
  ]),
  documents: page("Dokumenti", [
    ["Čemu služi", "Arhiva fajlova po projektu, kupcu, prodaji. Vidljivost INTERNAL ostaje vama; AGENCY vidi samo ako ima pristup projektu."],
    ["Otprema", "PDF, slike, Office. Max 20 MB. KYC skenovi idu na kupca, ne ovde kao „ugovor“."],
    ["Brisanje", "U aplikaciji nestaje odmah; fajl na S3 se čisti posle 45 dana."],
  ]),
  reports: page("Izveštaji", [
    ["Čemu služi", "Zalihe, prodaje, uplate, agencije — filteri u URL-u da podelite isti pogled sa timom."],
    ["Izvoz", "CSV/XLSX za računovodstvo. P&L gleda ugovorene prodaje, ne draft."],
    ["Share", "Link filterisanog izveštaja šaljete kolegi. Prava i dalje važe — agent ne vidi tuđe kupce."],
  ]),
  settings: page("Podešavanja", [
    ["Čemu služi", "Profil firme, tim, šabloni ugovora i planovi otplate. Investitor vidi i pretplatu i SaaS fakture."],
    ["Kartice gore", "Organizacija, korisnici, pa ostalo. Agencija nema Pretplatu/Fakture — partner je besplatan."],
    ["Vodič", "Svaka kartica ima svoj vodič. Kliknite „Kako se koristi“ na toj stranici."],
  ]),
  settingsOrg: page("Organizacija", [
    ["Čemu služi", "Pravni identitet i brend: PIB, adresa, logo, boja. Ide u PDF, share link i email."],
    ["Obavezna polja", "Investitor: sva polja. Agencija: sva sem sajta. Bez toga aplikacija ostaje zaključana."],
    ["Logo", "PNG, JPEG, WebP ili SVG (sanitizovan). Na Growth/Scale white-label sidebar pokazuje samo logo."],
  ]),
  settingsMembers: page("Tim", [
    ["Čemu služi", "Pozivnice i uloge. Uloga određuje meni i dugmad."],
    ["Pozovi", "Email + uloga. Link važi 7 dana. Vlasnik kasnije menja ulogu bez novog poziva."],
    ["Agencija", "AGENCY_OWNER vodi nalog; agent vidi samo svoje kupce i ponudu."],
  ]),
  settingsSubscription: page("Pretplata", [
    ["Čemu služi", "Vaš PropertyDesk paket, rok i fakture. Samo investitor — agencija ovaj meni nema."],
    ["Plan", "Upgrade/downgrade radi platform admin (Naplata organizacije). Ovde vidite status i PDF + IPS QR."],
    ["Otkaz", "Ostaje aktivno do kraja plaćenog perioda, zatim grace za izvoz podataka."],
  ]),
  settingsInvoices: page("SaaS fakture", [
    ["Čemu služi", "Računi za korišćenje PropertyDesk-a, ne računi koje vi šaljete kupcima stanova."],
    ["Plaćanje", "PDF ima IPS QR. Status se ažurira kad uplata stigne ili je admin zabeleži."],
    ["Kašnjenje", "PAST_DUE može privremeno da ugasi nove projekte dok se ne plati."],
  ]),
  settingsPaymentPlans: page("Planovi otplate", [
    ["Čemu služi", "Šabloni rata za prodaju: kapara, procenti, sidra datuma (ugovor / primopredaja)."],
    ["Nivoi", "Org šablon je podrazumevani. Projekat može imati svoj. Na prodaji ih primenite ili kucate ručno."],
    ["Savet", "Promena šablona ne dira već kreirane planove na starim prodajama."],
  ]),
  settingsContracts: page("Šabloni ugovora", [
    ["Čemu služi", "HTML/tekst šabloni sa {{seller.*}} i {{buyer.*}} placeholderima. Izlaz je PDF."],
    ["Kako", "Dodajte kind (predugovor/ugovor), pa tekst. Testirajte na draft prodaji."],
    ["Ograničenje", "e-potpis još nije u v1 — poslato/potpisano je ručna oznaka."],
  ]),
  offer: page("Ponuda", [
    ["Čemu služi", "Inventar koji vam je investitor otvorio. Tuđe rezervacije se ne nude."],
    ["Pregled", "Birajte projekat, filtrirajte jedinice. Cena zavisi od flag-a konekcije."],
    ["Rezervacija", "Sa dostupne jedinice → Rezerviši, vezano za vašu agenciju i kupca."],
    ["Prazna lista", "Investitor još nije dodelio projekat, ili je sve rezervisano/prodato."],
  ]),
  myBuyers: page("Moji kupci", [
    ["Čemu služi", "Kupci koje je vaša agencija registrovala kod investitora, sa buyer protection."],
    ["Registracija", "Izaberite projekat, unesite kupca (JMBG zbog jedinstvene zaštite). Konflikt ide na pregled."],
    ["Šta ne vidite", "Ne vidite kupce drugih agencija ni interne napomene investitora."],
    ["Dalje", "Sa kartice kupca rezervišete jedinicu iz ponude."],
  ]),
  myReservations: page("Moje rezervacije", [
    ["Čemu služi", "Rezervacije koje je vaša agencija napravila. Pratiti TTL i status."],
    ["Akcije", "Detalj pokazuje rok i jedinicu. Produžavanje/odbijanje radi investitor."],
    ["Istek", "Kad rok prođe, jedinica se vraća u ponudu. Kupac i vi dobijate obaveštenje."],
  ]),
  myCommissions: page("Moje provizije", [
    ["Čemu služi", "Šta vam investitor duguje po ugovorima. Iznos je snapshot sa momenta prodaje."],
    ["Statusi", "Na čekanju dok investitor ne odobri, zatim spremno kad je kupac dovoljno platio, pa isplaćeno."],
    ["Pitanja", "Ako iznos „ne liči“ na novo pravilo — gledate stari snapshot. To je namerno."],
  ]),
  agents: page("Agenti", [
    ["Čemu služi", "Članovi vaše agencije. Vlasnik/admin poziva agente i menja uloge."],
    ["Poziv", "Email + uloga (agent ili pregled). Isti tok kao pozivnica člana."],
    ["Prava", "Agent vidi svoje kupce i ponudu; ne briše nalog agencije."],
  ]),
  connections: page("Konekcije", [
    ["Čemu služi", "Pozivi investitora da radite na njihovim projektima."],
    ["Prihvati", "Novi poziv stoji kao INVITED. Kliknite Prihvati — tek tada vidite Ponudu."],
    ["Prvi nalog", "Dok ne popunite profil agencije (sve sem sajta), portal je zaključan."],
    ["Referral", "Na konekciji je 8-znak kod + QR. Rotacija gasi stare linkove."],
  ]),
  platformAdmin: page("Administracija", [
    ["Čemu služi", "Platforma: organizacije, planovi, naplata, role, Property Desk CRM."],
    ["Organizacije", "Lista tenanata. Agencija je partner nalog — Naplata pokazuje samo napomenu, bez fakture."],
    ["Naplata", "SaaS fakture, cron, šabloni emailova. Ne dirajte demo/prod host dok to eksplicitno ne kažemo."],
  ]),
  propertyDesk: page("Property Desk", [
    ["Čemu služi", "Interni sales CRM za PropertyDesk: leadovi, tim, konverzija u tenant."],
    ["Pipeline", "Faze od NEW do WON. Konverzija pravi ili veže organizaciju. Agencija uvek dobija partner plan."],
    ["Dozvole", "pd_* prava menjate u Administracija → Role, isto kao ostale uloge."],
  ]),
} as const;

export const guidesEn: Leaves<typeof guidesSr> = {
  chrome: {
    open: "How this page works",
    title: "Page guide",
    stepOf: "Step {{current}} of {{total}}",
    next: "Next",
    previous: "Back",
    finish: "Finish",
    skip: "Skip",
    dontShowAgain: "Don’t auto-open",
  },
  dashboard: page("Dashboard", [
    ["What it is", "Your sales snapshot: available units, reservations, contracted and collected. Start the day here."],
    ["How to read it", "The cards are KPIs for this organization. Clicks open a report or project — you don’t enter data here."],
    ["First steps", "New accounts see a First steps checklist (profile, project, units, team). Hide it and bring it back from /prvi-koraci."],
    ["Where next", "Investor: Projects → units → buyers. Agency: Offer → register a buyer → reserve."],
  ]),
  projects: page("Projects", [
    ["What it is", "A project is the building or development you sell. Create, edit, and open structure, units, and the public site."],
    ["New project", "Click New project. Code and name are required. Pick city, address, and municipality from suggestions — postal code and map fill in. You can upload a cover photo immediately."],
    ["Structure", "On the detail page add Building → Entrance → Floor, then units. Duplicate copies structure without buyers or sales."],
    ["Public offer", "Share links and the microsite live on the project. The cover image is used on the public site and chat previews."],
  ]),
  inventory: page("Units", [
    ["What it is", "All apartments, parking, and storage. Filter by project, status, and price. This is your availability list."],
    ["Statuses", "Available, reserved, sold… Reservations and sales change status — don’t invent it. Internal notes stay private."],
    ["Import", "For more than ~10 units: project → Import. Download the template in the app language, map columns, confirm the preview."],
    ["Prices and photos", "Edit price (history is kept), gallery, and cover. Agencies see price only if you grant it."],
  ]),
  customers: page("Buyers", [
    ["What it is", "CRM for leads and buyers. Duplicates are caught by phone and email."],
    ["New buyer", "Buyers → New. Name plus phone or email. Companies need tax ID and legal name. Finish KYC before a contract."],
    ["Timeline", "Log calls, meetings, and comments. @mention notifies a colleague. Buyer-view permission is required."],
    ["Protection and KYC", "Agency buyers can have buyer protection. The KYC tab is a checklist plus scans — agencies never see it."],
  ]),
  tasks: page("Tasks", [
    ["What it is", "Your work: Today, Overdue, Upcoming. The system also creates tasks (reservation expiring, installment due)."],
    ["How to work", "Open the task, do the work on the linked record, then mark it done. Filters stay in the URL."],
    ["Assignment", "Assign a colleague if you have permission. Priority keeps the morning focused."],
  ]),
  reservations: page("Reservations", [
    ["What it is", "Holds a unit for a buyer for a limited time. Only one active reservation per unit — the second request conflicts."],
    ["Internal", "From a unit or buyer: Reserve. Set the deadline. Approve / reject / extend on the detail page."],
    ["Online + IPS", "Public share link: the buyer submits a request and gets an IPS QR for the deposit. You confirm payment under Requests."],
    ["Kanban", "The board shows the request flow. A job expires overdue reservations and emails the buyer."],
  ]),
  calendar: page("Calendar", [
    ["What it is", "A monthly view of deadlines: reservations, installments, tasks, handovers. Not Google/Outlook sync."],
    ["How to use it", "Use the filters at the top. Click a bar to open the record."],
    ["Empty calendar", "If it’s empty, check the active organization. A new tenant has no seeded dates."],
  ]),
  sales: page("Sales", [
    ["What it is", "A contracted unit sale: contract PDF, payment plan, payments, and reversals."],
    ["Create", "Usually from an approved reservation. Enter price, payment method, and possession date. Drafts stay out of P&L."],
    ["Contract", "Pick a template → generate PDF. Sent/signed is a manual mark. KYC must be complete for a full contract."],
    ["Plan and VAT", "Apply an installment template or enter rows. VAT/RPI is set on the sale. Agency commission is snapshotted."],
  ]),
  payments: page("Payments", [
    ["What it is", "Buyer payments on a sale. FIFO hits the oldest open installment. Nothing is deleted — a reversal creates a paired negative."],
    ["Entry", "Amount, date, method, reference. Surplus stays unapplied."],
    ["Bank statement", "Import CSV/XLSX, map columns. Matches use amount, payment reference, and date."],
    ["Overdue", "A daily job flags late installments. The buyer gets reminders 3 days before, on the day, and 7 days after."],
  ]),
  agencies: page("Agencies", [
    ["What it is", "Partner agencies that sell your inventory. They are not a paid tenant — access comes only from your invite."],
    ["Invite", "Enter an email (name optional). You don’t need to know if they already have an account."],
    ["Access", "On the connection, grant projects and whether they see prices. Without a grant their Offer is empty."],
    ["Commission", "The system picks the rule (unit → project → connection). The amount is frozen at contract time."],
  ]),
  agencyRegistrations: page("Agency registrations", [
    ["What it is", "Agency requests to protect a buyer. You approve or reject."],
    ["How", "Open the request → Approve or Reject with a reason. Conflicts need review if another agency already holds the buyer."],
    ["After approval", "Sales to that buyer during the protection window attach to that agency and their commission."],
  ]),
  commissions: page("Commissions", [
    ["What it is", "Amounts you owe agencies. Lifecycle: pending → approved → ready → paid."],
    ["How", "Approve the amount, then record the payout. Changing a rule later does not change this snapshot."],
    ["Report", "The wider view is Reports → Agencies, including referral attribution."],
  ]),
  documents: page("Documents", [
    ["What it is", "Files on projects, buyers, and sales. INTERNAL stays with you; AGENCY needs project access."],
    ["Upload", "PDF, images, Office. 20 MB max. KYC scans belong on the buyer, not as a sale “contract” here."],
    ["Delete", "The file disappears in the app immediately; S3 purge runs after 45 days."],
  ]),
  reports: page("Reports", [
    ["What it is", "Inventory, sales, payments, agencies — filters live in the URL so you can share the same view."],
    ["Export", "CSV/XLSX for accounting. P&L uses contracted sales, not drafts."],
    ["Share", "Send the filtered link. Permissions still apply — an agent never sees another agent’s buyers."],
  ]),
  settings: page("Settings", [
    ["What it is", "Company profile, team, contract templates, and payment-plan templates. Investors also see subscription and SaaS invoices."],
    ["Tabs", "Organization, members, then the rest. Agencies have no Subscription/Invoices — the partner account is free."],
    ["Guides", "Each tab has its own guide. Click “How this page works” there."],
  ]),
  settingsOrg: page("Organization", [
    ["What it is", "Legal identity and brand: tax ID, address, logo, color. Used in PDFs, share links, and email."],
    ["Required fields", "Investor: every field. Agency: every field except the website. The app stays locked until then."],
    ["Logo", "PNG, JPEG, WebP, or sanitized SVG. On Growth/Scale white-label the sidebar shows the logo only."],
  ]),
  settingsMembers: page("Team", [
    ["What it is", "Invites and roles. The role decides the menu and buttons."],
    ["Invite", "Email + role. The link lasts 7 days. The owner can change role later without a new invite."],
    ["Agency", "AGENCY_OWNER runs the account; an agent sees their own buyers and the offer."],
  ]),
  settingsSubscription: page("Subscription", [
    ["What it is", "Your PropertyDesk plan, dates, and invoices. Investors only — agencies don’t have this menu."],
    ["Plan", "A platform admin changes the plan (Organization billing). You see status and PDF + IPS QR here."],
    ["Cancel", "Access stays until the paid period ends, then a grace window to export data."],
  ]),
  settingsInvoices: page("SaaS invoices", [
    ["What it is", "Bills for using PropertyDesk — not the invoices you send apartment buyers."],
    ["Pay", "The PDF has an IPS QR. Status updates when payment arrives or an admin records it."],
    ["Late", "PAST_DUE can temporarily block new projects until you pay."],
  ]),
  settingsPaymentPlans: page("Payment plan templates", [
    ["What it is", "Installment templates: deposit, percentages, date anchors (contract / handover)."],
    ["Levels", "The org template is the default. A project can override. Apply it on a sale or type rows by hand."],
    ["Tip", "Editing a template does not change plans already created on old sales."],
  ]),
  settingsContracts: page("Contract templates", [
    ["What it is", "HTML/text templates with {{seller.*}} and {{buyer.*}} placeholders. Output is PDF."],
    ["How", "Add a kind (pre-contract/contract), then the text. Test on a draft sale."],
    ["Limit", "e-sign is not in v1 — sent/signed is a manual mark."],
  ]),
  offer: page("Offer", [
    ["What it is", "Inventory the investor opened for you. Units reserved by others are hidden."],
    ["Browse", "Pick a project and filter units. Price depends on the connection flag."],
    ["Reserve", "From an available unit → Reserve, tied to your agency and buyer."],
    ["Empty list", "The investor has not granted a project yet, or everything is reserved/sold."],
  ]),
  myBuyers: page("My buyers", [
    ["What it is", "Buyers your agency registered with the investor, with buyer protection."],
    ["Register", "Pick a project, enter the buyer (national ID for unique protection). Conflicts go to review."],
    ["What you don’t see", "You never see another agency’s buyers or the investor’s internal notes."],
    ["Next", "From the buyer card, reserve a unit from the offer."],
  ]),
  myReservations: page("My reservations", [
    ["What it is", "Reservations your agency created. Watch TTL and status."],
    ["Actions", "The detail shows the deadline and unit. The investor extends or rejects."],
    ["Expiry", "When time runs out the unit returns to the offer. You and the buyer get a notice."],
  ]),
  myCommissions: page("My commissions", [
    ["What it is", "What the investor owes you. The amount is a snapshot from the sale."],
    ["Statuses", "Pending until approved, ready when the buyer has paid enough, then paid."],
    ["Questions", "If the amount “doesn’t match” a new rule — you’re looking at the old snapshot. That’s on purpose."],
  ]),
  agents: page("Agents", [
    ["What it is", "People in your agency. Owner/admin invite agents and change roles."],
    ["Invite", "Email + role (agent or viewer). Same flow as a member invite."],
    ["Rights", "An agent sees their buyers and the offer; they cannot delete the agency account."],
  ]),
  connections: page("Connections", [
    ["What it is", "Investor invites to work on their projects."],
    ["Accept", "A new invite stays INVITED. Click Accept — only then does Offer fill."],
    ["First account", "Until the agency profile is complete (everything except website), the portal stays locked."],
    ["Referral", "Each connection has an 8-character code + QR. Rotating it kills old links."],
  ]),
  platformAdmin: page("Administration", [
    ["What it is", "Platform: organizations, plans, billing, roles, Property Desk CRM."],
    ["Organizations", "Tenant list. An agency is a partner account — Billing shows a note only, no invoice."],
    ["Billing", "SaaS invoices, cron, email templates. Don’t touch demo/prod hosts until we say so."],
  ]),
  propertyDesk: page("Property Desk", [
    ["What it is", "Internal sales CRM for PropertyDesk: leads, team, convert to a tenant."],
    ["Pipeline", "Stages from NEW to WON. Convert creates or links an organization. Agencies always get the partner plan."],
    ["Permissions", "Edit pd_* rights under Administration → Roles, same as other roles."],
  ]),
};
