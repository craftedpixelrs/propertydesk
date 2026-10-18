import type { CityFaq } from "./cities";

/** English body copy for `/softver-za-prodaju-novogradnje/[grad]`. */
export interface CityEnCopy {
  name: string;
  nameLokativ: string;
  nameGenitiv: string;
  intro: string;
  districtsTitle: string;
  faqs: CityFaq[];
}

export const CITY_EN: Record<string, CityEnCopy> = {
  beograd: {
    name: "Belgrade",
    nameLokativ: "in Belgrade",
    nameGenitiv: "Belgrade",
    intro:
      "Belgrade is the largest new-build market in Serbia, from the wide boulevards of New Belgrade and Vračar to Zemun, Voždovac and Palilula. Investors here run several buildings at once and work with dozens of partner agencies, so one current price list and one reservation per apartment are what keep a sale from dying on a double hold or a stale spreadsheet.",
    districtsTitle: "Municipalities we cover",
    faqs: [
      {
        q: "Does PropertyDesk cover every Belgrade municipality?",
        a: "Yes. PropertyDesk is not tied to a map. The system works the same whether the project is in New Belgrade, Vračar, Voždovac or Zemun. You enter the location once, and the public project link shows buyers the map and the municipality.",
      },
      {
        q: "We work with 10 agencies per project. Can that live in one place?",
        a: "Yes. An investor can have as many partner agencies as needed, each with its own commission rules per project and per unit. Agencies see only what you allow — the price list, available units and reservation status — and reserve with one click, without a Viber thread.",
      },
      {
        q: "How does PropertyDesk help with boutique projects in Vračar and Dedinje?",
        a: "For a small number of expensive units, presentation matters more than volume. You get a public project site in your brand, a photo gallery, a floor plan and branded PDF offers, without a separate website and without a middleman.",
      },
      {
        q: "We have a New Belgrade project with 300+ apartments. Does it scale?",
        a: "Yes. Importing 300+ units from Excel takes a few steps and is included in the pilot. Larger portfolios use the Growth or Scale plan, with priority support, cost tracking per project and a consolidated report for the director.",
      },
    ],
  },
  "novi-sad": {
    name: "Novi Sad",
    nameLokativ: "in Novi Sad",
    nameGenitiv: "Novi Sad",
    intro:
      "Novi Sad is Serbia’s second-largest new-build market and is growing faster than Belgrade relative to its population. Local investors often sell in Grbavica, Liman, Novo Naselje and Telep while the next site is still being prepared, so a clear reservation record and one price per unit are what stop the team from losing track of spreadsheet edits.",
    districtsTitle: "Neighbourhoods in focus",
    faqs: [
      {
        q: "We sell projects in Grbavica and Liman at the same time. Can one app hold both?",
        a: "Yes. PropertyDesk is multi-project: each project has its own price list, agency list and payment plan, and the director’s report covers every project at once, with a filter by project and period.",
      },
      {
        q: "Novi Sad has many small agencies. Does the system work with them?",
        a: "Yes. Agencies sign up on their own and you connect them with a click. They get their own portal and referral code, and they see only the projects and units you approve — without a new Excel file every morning.",
      },
      {
        q: "Buyers in the diaspora cannot come to Novi Sad. How do we collect the deposit?",
        a: "Through the public unit link and an IPS QR code. A buyer abroad opens the link, sees the apartment, presses Reserve and scans the IPS QR from their bank. You confirm receipt in reservation requests once the money lands.",
      },
      {
        q: "Does PropertyDesk work with EUR prices and RSD payments?",
        a: "Yes. Keep the price list in EUR, enter the EUR/RSD rate (or import the National Bank list), and RSD payments are converted and allocated FIFO to open instalments — without a manual calculation on every statement.",
      },
    ],
  },
  nis: {
    name: "Niš",
    nameLokativ: "in Niš",
    nameGenitiv: "Niš",
    intro:
      "Niš is the largest new-build centre in southern Serbia, with active construction in Medijana, Pantelej and Crveni Krst, and a growing number of smaller investors building one building at a time. For those teams the difference is not pricing policy. It is that one person no longer has to email an Excel file to five agencies.",
    districtsTitle: "City areas",
    faqs: [
      {
        q: "I run a small agency in Niš. Can I use PropertyDesk?",
        a: "Yes. Agencies sign up free and connect to investors who invite them. Only investors pay. Catalogue access and reservations are free for the agency.",
      },
      {
        q: "We have one project of 40 apartments. Is the system too big for us?",
        a: "No. The Starter plan is built for one active project. The price is about two hours of bookkeeping a month, and you get the full flow: price list, reservations, contracts, payments and a report you can actually read.",
      },
      {
        q: "We sell direct, without agencies. Is PropertyDesk still useful?",
        a: "Yes. The agency module is optional. Direct sales still get a buyer CRM, protection from double reservations, contracts from a template, an instalment plan, statement import and reports.",
      },
      {
        q: "Buyers in and around Niš want a paper contract. Does that work?",
        a: "Yes. PropertyDesk generates a PDF pre-contract and contract from your office template, with your logo and terms, and you print and sign them the usual way. E-signature is not in v1. Everything else does not need a printer.",
      },
    ],
  },
  kragujevac: {
    name: "Kragujevac",
    nameLokativ: "in Kragujevac",
    nameGenitiv: "Kragujevac",
    intro:
      "After a few quiet years, Kragujevac has active new-build again, especially in Erdoglija and around the centre. Local investors often have one building on sale and one in preparation, so what matters is being able to import the existing Excel file in an hour and start work without an IT person.",
    districtsTitle: "City areas",
    faqs: [
      {
        q: "We are an investor in Kragujevac. How long does setup take?",
        a: "Basic setup for one project takes half a day. Send us the current Excel price list and we import the units and map the fields. You get a system ready to use, without typing every row by hand.",
      },
      {
        q: "We have no IT person. Can the team run it alone?",
        a: "Yes. The interface is in Serbian and English, without jargon for its own sake. Price lists, reservations and contracts feel like the spreadsheet you already know, without formulas that break and without “who has the file open”.",
      },
      {
        q: "How do we bring in local agencies that have never used software?",
        a: "Invite them by email. They get a simple sign-up and see only the projects you connect. Nothing to install, no software contract on their side. They work in the browser.",
      },
    ],
  },
  subotica: {
    name: "Subotica",
    nameLokativ: "in Subotica",
    nameGenitiv: "Subotica",
    intro:
      "Subotica is a growing market because of the Hungarian border and buyers from the diaspora. Projects usually have fewer units, but the buyers are often far away, so a public project link, a photo gallery and an online reservation with an IPS QR deposit are what raise conversion.",
    districtsTitle: "City areas",
    faqs: [
      {
        q: "We sell to buyers in Hungary and Austria. How do we collect the deposit?",
        a: "Through the public project link. The buyer reserves with their details and pays the deposit by scanning an IPS QR from their bank. For foreign buyers without IPS, you see the SWIFT payment in the system and confirm receipt by hand.",
      },
      {
        q: "Does PropertyDesk support a bilingual presentation (Serbian and English)?",
        a: "Yes. The site and the team interface run in Serbian and in English. The public project offer (photos, plan, price) is shared by link, which is enough for a buyer abroad to see the apartment before they reserve.",
      },
      {
        q: "We have a small project of 15 apartments. Is PropertyDesk worth it?",
        a: "Yes. The Starter plan is built for one project of this size, and the difference shows at the first double reservation or the first buyer lost in email. Current offer: 50% off the first 3 months for sign-ups until 15 November 2026.",
      },
    ],
  },
  zlatibor: {
    name: "Zlatibor",
    nameLokativ: "on Zlatibor",
    nameGenitiv: "Zlatibor",
    intro:
      "Zlatibor is the most active mountain new-build market in Serbia, from studio apartments for rent to full apart-hotels and weekend flats. Buyers are almost entirely from other cities (Belgrade, Novi Sad, the diaspora), so the sale has to run online: a public project link, a photo gallery, a map and an IPS QR deposit without a visit to the site.",
    districtsTitle: "Areas of the destination",
    faqs: [
      {
        q: "We sell apartments to buyers in Belgrade and abroad. How, without a trip to Zlatibor?",
        a: "The buyer opens the public project link, sees the gallery and the floor plan, reserves a unit and pays the deposit by scanning an IPS QR — without coming to the office. You send the contract as a PDF from the template and agree the signature around the buyer’s schedule.",
      },
      {
        q: "We have several smaller projects (apart-hotels, villas). Can they share one account?",
        a: "Yes. Each project is kept separate (its own price list, agencies and payment plan), and the consolidated report shows all of them in one place, filtered by location and period.",
      },
      {
        q: "Buyers often ask about renting after handover. Does PropertyDesk do that?",
        a: "Not in v1. PropertyDesk follows the new-build sale through to handover. After-sales (rental management, maintenance) is not in this version. It can be a later module if pilot partners on Zlatibor ask for it.",
      },
    ],
  },
  kopaonik: {
    name: "Kopaonik",
    nameLokativ: "on Kopaonik",
    nameGenitiv: "Kopaonik",
    intro:
      "Kopaonik is the premium end of mountain new-build in Serbia. Projects are smaller, prices per square metre are higher, and buyers expect a photo presentation at an international standard. For this group PropertyDesk replaces a separate marketing site and gives one place for reservations, contracts and the deposit.",
    districtsTitle: "Areas of the destination",
    faqs: [
      {
        q: "Kopaonik projects are small but exclusive. Is a full platform worth it?",
        a: "Yes. A short run of expensive units tolerates the fewest mistakes. One double-booked unit or one miscalculated instalment is a serious amount. A platform for a boutique project costs less than a single lost sale.",
      },
      {
        q: "Buyers are often abroad. Does the system cover what they need?",
        a: "Yes. A public project link with a gallery, a map, an EUR price list and an IPS QR deposit works in the browser, with nothing to install and no office visit. SWIFT payments are confirmed by hand in the system.",
      },
      {
        q: "We sell through one exclusive agency. How does it see everything?",
        a: "Connect the agency to the project and give it exclusive-partner access. It sees every unit, every reservation and every payment status in real time, without waiting for an export from you.",
      },
    ],
  },
  cacak: {
    name: "Čačak",
    nameLokativ: "in Čačak",
    nameGenitiv: "Čačak",
    intro:
      "Čačak is the centre of central Serbia, with a steady set of local investors who build one building or a small mixed-use block at a time. Those projects do not need an enterprise system. They need a team of two or three people to cover everything without IT support, without a licence per user and without months of implementation.",
    districtsTitle: "City areas",
    faqs: [
      {
        q: "We are one investor with one project. Which plan do we need?",
        a: "Starter. It covers one active project, the full flow from price list to payments, and a team of up to 5 users. There is no extra price per user or per unit.",
      },
      {
        q: "Sales and construction sit in the same company. Can the system track costs too?",
        a: "Partly. PropertyDesk follows the sales side and records project costs (land, construction, marketing, other) for margin and P&L. It is not a replacement for accounting software. You connect the two by export.",
      },
      {
        q: "Buyers in Čačak often want a mortgage. How does the system help?",
        a: "For each sale you generate a reservation confirmation and a payment plan as a branded PDF, which the buyer takes to the bank. A direct bank integration is not in v1. The paperwork is ready in a few clicks.",
      },
    ],
  },
  pancevo: {
    name: "Pančevo",
    nameLokativ: "in Pančevo",
    nameGenitiv: "Pančevo",
    intro:
      "Pančevo sits in the wider Belgrade belt and has its own investors, often firms building in Belgrade and Pančevo at the same time. For them the system has to tell projects apart by location, price and agency without a second account.",
    districtsTitle: "City areas",
    faqs: [
      {
        q: "We sell in Belgrade and Pančevo at the same time. Can one account do both?",
        a: "Yes. One account holds several projects, wherever they are. Each project has its own agencies, prices and payment plan, and reports filter by project, city or period.",
      },
      {
        q: "Buyers want to pay in instalments. How does the system track that?",
        a: "You build a custom payment plan (amounts, due dates, EUR or RSD), and the system allocates each payment FIFO to the oldest open instalment. You see who is late, and by how many days, without a spreadsheet.",
      },
      {
        q: "Agencies in Pančevo live on Viber. Can it stay simple for them?",
        a: "Yes. They do not have to learn a new tool. They get one link, sign in, see free units and reserve with a click. Instead of “is 3A still free?” they see the status.",
      },
    ],
  },
  kraljevo: {
    name: "Kraljevo",
    nameLokativ: "in Kraljevo",
    nameGenitiv: "Kraljevo",
    intro:
      "Kraljevo and the area around it (with Čačak and Kragujevac) is a west-central belt of steady local investors, often family firms building one building at a time. For this profile the risk is not scale. It is losing one buyer to a missed reservation or a contract stuck in Word.",
    districtsTitle: "City areas",
    faqs: [
      {
        q: "We are a small firm. How do we know the system is not too complicated?",
        a: "The basic flow (add a project, import the price list, make a reservation, contract, payment) takes a few minutes once you have seen it. Standard onboarding is a one-hour video call on your own data, without a manual to read.",
      },
      {
        q: "Some buyers pay cash. Can the system record that?",
        a: "Yes. You enter a cash payment by hand with a date and a receipt number. The system treats it like a bank payment: FIFO allocation to instalments and a balance. You still take the cash to the bank. PropertyDesk does not replace the till.",
      },
      {
        q: "Can we stop using it without a fuss?",
        a: "Yes. There is no lock-in. You cancel from the app at any time. The owner downloads a JSON export of projects, buyers and payments from Settings → Organisation, and the export stays available for 30 days after cancellation.",
      },
    ],
  },
};
