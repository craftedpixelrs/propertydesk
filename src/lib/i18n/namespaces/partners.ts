type Leaves<T> = T extends string ? string : { [K in keyof T]: Leaves<T[K]> };

/** Agencies, commissions, agency portal. */
export const partnersSr = {
  approve: "Odobri",
  reject: "Odbij",
  accept: "Prihvati",
  invite: "Pozovi",
  lastName: "Prezime",
  buyer: "Kupac",
  sale: "Prodaja",
  unit: "Jedinica",
  note: "Napomena",
  created: "Kreirano",
  value: "Vrednost",
  level: "Nivo",
  valid: "Važi",
  unlimited: "Bez ograničenja",
  protectionDays: "Zaštita (dana)",
  invited: "Pozvana",
  invitedAt: "Pozvano",
  registeredAt: "Prijavljeno",
  totalCount: "Ukupno: {{count}}",
  allProjectsShort: "Svi",
  confirmGeneric: "Da li ste sigurni?",
  percentage: "Procenat",
  fixedAmount: "Fiksni iznos",
  percentageRate: "Procenat {{rate}}%",
  baseAmount: "Osnovica",
  connection: "Konekcija",

  connectionStatus: {
    INVITED: "Pozvana",
    ACTIVE: "Aktivna",
    SUSPENDED: "Suspendovana",
    REJECTED: "Odbijena",
    TERMINATED: "Prekinuta",
  },
  accessStatus: {
    ACTIVE: "Aktivan",
    SUSPENDED: "Suspendovan",
    ENDED: "Završen",
  },
  commissionStatus: {
    CALCULATED: "Obračunata",
    APPROVED: "Odobrena",
    INVOICED: "Fakturisana",
    DUE: "Dospela",
    PAID: "Plaćena",
    DISPUTED: "Sporna",
    CANCELED: "Otkazana",
  },

  agencies: {
    subtitle:
      "Upravljajte konekcijama, pristupom projektima i zaštitom kupaca za partnerske agencije.",
    totalConnections: "Ukupno konekcija: {{count}}",
    empty: "Nemate uspostavljene konekcije sa agencijama.",
    commissionRules: "Pravila provizije",
  },

  detail: {
    established: "Konekcija uspostavljena {{date}} · Status:",
    tabProjects: "Pristup projektima",
    tabProtection: "Zaštita kupaca",
    tabCommissions: "Pravila provizije",
    protectionHint:
      "Broj dana zaštite koji se automatski primenjuje kada odobrite prijavu kupca od ove agencije.",
  },

  registrations: {
    subtitle:
      "Odobrite ili odbijte agencijske prijave. Odobrena prijava startuje zaštitu kupca za konfigurisani broj dana.",
    empty: "Nema prijava.",
  },

  commissionsPage: {
    title: "Pravila provizije",
    subtitle:
      "Detaljna pravila kreirajte iz kartice pojedinačne agencije. Ovde vidite kompletan pregled.",
    goToAgencies: "Idi na agencije",
    activeTitle: "Aktivne provizije ({{count}})",
    emptyCalculated: "Nema izračunatih provizija.",
    rulesTotal: "Ukupno pravila: {{count}}",
    emptyRules: "Nema definisanih pravila provizije.",
  },

  ruleTier: {
    unit: "Jedinica",
    projectAndAgency: "Projekat + agencija",
    connection: "Konekcija",
    projectDefault: "Projekat (default)",
    project: "Projekat",
    connectionGeneral: "Konekcija (opšte)",
  },

  agents: {
    subtitle: "Članovi Vaše agencije. Dodajte i uklanjajte agente iz ove liste.",
  },

  connectionsPage: {
    title: "Konekcije sa investitorima",
    subtitle: "Investitori koji su Vas pozvali na saradnju.",
    empty: "Nemate uspostavljenih konekcija sa investitorima.",
    invitePending: "Poziv čeka",
  },

  settings: {
    title: "Podešavanja agencije",
    subtitle: "Podaci o Vašoj organizaciji vidljivi investitorima.",
    connectionsTitle: "Konekcije sa investitorima",
    connectionsHintPrefix: "Za pregled i prihvatanje poziva otvorite stranicu",
  },

  myCommissions: {
    subtitle:
      "Obračun provizija za realizovane prodaje. Detaljna razrada dolazi u sledećoj fazi.",
    empty: "Nema evidentiranih provizija.",
  },

  inviteForm: {
    trigger: "Pozovi agenciju",
    title: "Pozivanje agencije",
    description:
      "Unesite email. Ako agencija već ima nalog, stići će im poziv da prihvate. Ako nemaju, otvoriće nalog i uneti svoje podatke. Ne morate znati da li već postoje.",
    email: "Email agencije",
    agencyName: "Naziv agencije (opciono)",
    agencyNamePlaceholder: "npr. Top Nekretnine",
    protectionDays: "Podrazumevana zaštita kupca (dana)",
  },

  connectionActions: {
    suspend: "Suspenduj",
    reactivate: "Reaktiviraj",
    terminate: "Prekini",
    terminateConfirm: "Da li ste sigurni da želite da prekinete konekciju?",
  },

  rules: {
    addTitle: "Dodaj pravilo provizije",
    allDefault: "Sve (podrazumevano)",
    rate: "Stopa (%)",
    existingTitle: "Postojeća pravila",
    empty: "Nema pravila za ovu agenciju.",
  },

  protection: {
    daysLabel: "Dana zaštite",
  },

  access: {
    grantTitle: "Odobri pristup novom projektu",
    allGranted: "Svi projekti su već pristupačni ovoj agenciji.",
    selectProject: "Izaberite projekat",
    canViewPrices: "Sme videti cene",
    canRequestReservations: "Sme kreirati rezervacije",
    grant: "Dodeli pristup",
    assignedTitle: "Dodeljeni pristupi",
    empty: "Ova agencija još nema pristup nijednom projektu.",
    prices: "Cene",
    reservations: "Rezervacije",
    showPrices: "Prikazuj",
    allowReservations: "Dozvoli",
    revoke: "Opozovi",
    revokeConfirm: "Da li ste sigurni da želite da opozovete pristup?",
  },

  review: {
    rejectReason: "Razlog odbijanja (opciono):",
  },

  referral: {
    code: "Referral kod:",
    qrAlt: "QR kod za {{code}}",
    shareHint:
      "Kupac otvara javni katalog projekata, bez prijave. Svaka rezervacija preko ovog linka pripisuje se Vašoj agenciji.",
    copyLink: "Kopiraj link",
    copied: "Kopirano!",
    rotate: "Generiši novi kod",
    downloadQr: "Preuzmi QR (PNG)",
    copyManual: "Kopirajte ručno: {{url}}",
  },

  registerBuyer: {
    trigger: "Prijavi kupca (zaštita)",
    title: "Prijava kupca za zaštitu",
    description:
      "Kupac koji Vas kontaktirao za ovaj projekat biva prijavljen investitoru na zaštitu.",
    pending: "Prijava je uspešno kreirana i čeka odobrenje investitora.",
    conflict: "Prijava je označena za pregled.",
    submit: "Prijavi",
  },

  reserve: {
    trigger: "Rezerviši",
    title: "Kreiranje rezervacije",
    description:
      "Izaberite kupca kog ste prethodno registrovali kod ovog investitora.",
    selectBuyer: "Izaberite kupca",
  },

  commissionActions: {
    invoiced: "Fakturisano",
    paid: "Plaćeno",
    cancelReason: "Razlog otkazivanja:",
  },
} as const;

export const partnersEn: Leaves<typeof partnersSr> = {
  approve: "Approve",
  reject: "Reject",
  accept: "Accept",
  invite: "Invite",
  lastName: "Last name",
  buyer: "Buyer",
  sale: "Sale",
  unit: "Unit",
  note: "Note",
  created: "Created",
  value: "Value",
  level: "Level",
  valid: "Valid",
  unlimited: "No limit",
  protectionDays: "Protection (days)",
  invited: "Invited",
  invitedAt: "Invited",
  registeredAt: "Registered",
  totalCount: "Total: {{count}}",
  allProjectsShort: "All",
  confirmGeneric: "Are you sure?",
  percentage: "Percentage",
  fixedAmount: "Fixed amount",
  percentageRate: "Percentage {{rate}}%",
  baseAmount: "Base",
  connection: "Connection",

  connectionStatus: {
    INVITED: "Invited",
    ACTIVE: "Active",
    SUSPENDED: "Suspended",
    REJECTED: "Rejected",
    TERMINATED: "Terminated",
  },
  accessStatus: {
    ACTIVE: "Active",
    SUSPENDED: "Suspended",
    ENDED: "Ended",
  },
  commissionStatus: {
    CALCULATED: "Calculated",
    APPROVED: "Approved",
    INVOICED: "Invoiced",
    DUE: "Due",
    PAID: "Paid",
    DISPUTED: "Disputed",
    CANCELED: "Canceled",
  },

  agencies: {
    subtitle:
      "Manage connections, project access, and buyer protection for partner agencies.",
    totalConnections: "Total connections: {{count}}",
    empty: "You have no agency connections yet.",
    commissionRules: "Commission rules",
  },

  detail: {
    established: "Connection established {{date}} · Status:",
    tabProjects: "Project access",
    tabProtection: "Buyer protection",
    tabCommissions: "Commission rules",
    protectionHint:
      "Number of protection days applied automatically when you approve a buyer registration from this agency.",
  },

  registrations: {
    subtitle:
      "Approve or reject agency registrations. An approved registration starts buyer protection for the configured number of days.",
    empty: "No registrations.",
  },

  commissionsPage: {
    title: "Commission rules",
    subtitle:
      "Create detailed rules from an individual agency card. This page shows the full overview.",
    goToAgencies: "Go to agencies",
    activeTitle: "Active commissions ({{count}})",
    emptyCalculated: "No calculated commissions.",
    rulesTotal: "Total rules: {{count}}",
    emptyRules: "No commission rules defined.",
  },

  ruleTier: {
    unit: "Unit",
    projectAndAgency: "Project + agency",
    connection: "Connection",
    projectDefault: "Project (default)",
    project: "Project",
    connectionGeneral: "Connection (general)",
  },

  agents: {
    subtitle: "Members of your agency. Add and remove agents from this list.",
  },

  connectionsPage: {
    title: "Connections with investors",
    subtitle: "Investors who invited you to collaborate.",
    empty: "You have no connections with investors.",
    invitePending: "Invite pending",
  },

  settings: {
    title: "Agency settings",
    subtitle: "Your organization details visible to investors.",
    connectionsTitle: "Connections with investors",
    connectionsHintPrefix: "To review and accept invitations, open",
  },

  myCommissions: {
    subtitle:
      "Commission statements for completed sales. A detailed breakdown comes in the next phase.",
    empty: "No recorded commissions.",
  },

  inviteForm: {
    trigger: "Invite agency",
    title: "Invite an agency",
    description:
      "Enter their email. If the agency already has an account, they get an invite to accept. If not, they create an account and enter their details. You do not need to know whether they already exist.",
    email: "Agency email",
    agencyName: "Agency name (optional)",
    agencyNamePlaceholder: "e.g. Top Nekretnine",
    protectionDays: "Default buyer protection (days)",
  },

  connectionActions: {
    suspend: "Suspend",
    reactivate: "Reactivate",
    terminate: "Terminate",
    terminateConfirm: "Are you sure you want to terminate this connection?",
  },

  rules: {
    addTitle: "Add commission rule",
    allDefault: "All (default)",
    rate: "Rate (%)",
    existingTitle: "Existing rules",
    empty: "No rules for this agency.",
  },

  protection: {
    daysLabel: "Protection days",
  },

  access: {
    grantTitle: "Grant access to a new project",
    allGranted: "All projects are already accessible to this agency.",
    selectProject: "Select a project",
    canViewPrices: "Can view prices",
    canRequestReservations: "Can create reservations",
    grant: "Grant access",
    assignedTitle: "Granted access",
    empty: "This agency does not have access to any project yet.",
    prices: "Prices",
    reservations: "Reservations",
    showPrices: "Show",
    allowReservations: "Allow",
    revoke: "Revoke",
    revokeConfirm: "Are you sure you want to revoke access?",
  },

  review: {
    rejectReason: "Rejection reason (optional):",
  },

  referral: {
    code: "Referral code:",
    qrAlt: "QR code for {{code}}",
    shareHint:
      "The buyer opens a public project catalog, without signing in. Every reservation through this link is attributed to your agency.",
    copyLink: "Copy link",
    copied: "Copied!",
    rotate: "Generate new code",
    downloadQr: "Download QR (PNG)",
    copyManual: "Copy manually: {{url}}",
  },

  registerBuyer: {
    trigger: "Register buyer (protection)",
    title: "Register a buyer for protection",
    description:
      "A buyer who contacted you about this project is registered with the investor for protection.",
    pending: "The registration was created and is awaiting investor approval.",
    conflict: "The registration was flagged for review.",
    submit: "Register",
  },

  reserve: {
    trigger: "Reserve",
    title: "Create reservation",
    description:
      "Select a buyer you previously registered with this investor.",
    selectBuyer: "Select a buyer",
  },

  commissionActions: {
    invoiced: "Invoiced",
    paid: "Paid",
    cancelReason: "Cancellation reason:",
  },
};
