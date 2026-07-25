import "server-only";
import type { BillingEmailTemplate } from "@prisma/client";
import { createId } from "@paralleldrive/cuid2";

import { prisma } from "@/server/db/prisma";
import { recordAudit } from "@/server/audit/audit";
import { DomainErrors } from "@/lib/errors";
import {
  isFullHtmlDocument,
  renderCallout,
  renderKeyValue,
  wrapBillingEmail,
  type BillingEmailTone,
  type BillingEmailCta,
  type KeyValuePair,
} from "./layout";

/**
 * Email template registry for billing lifecycle events.
 *
 * Templates are stored in the DB (`billing_email_template`) so operators can
 * tweak wording without a deploy. The rendered output is a strict superset of
 * a whitelisted variable list: unknown placeholders are left as-is; there is
 * NO arbitrary interpolation (no `eval`, no template engines).
 *
 * Two moving parts collaborate to produce the final HTML:
 *
 *   1. The DB row (or the fallback in `DEFAULT_TEMPLATES` below) supplies the
 *      *content* of the message — the subject, plaintext body, and a small
 *      block of "intro" HTML that operators can freely edit.
 *
 *   2. `TEMPLATE_LAYOUTS[key]` supplies the *structure* around that intro —
 *      the branded shell, the status badge, the key-value information card,
 *      any callout box, and the CTA button. This structure is intentionally
 *      NOT editable through the admin UI: it guarantees every billing email
 *      looks the same and cannot be visually broken by a wrong copy-paste.
 *
 * A template referenced by `renderBillingEmail(key, vars)`:
 *   - Substitutes `{{name}}` placeholders through `safeSubstitute`.
 *   - Feeds the substituted intro + layout parts into `wrapBillingEmail`.
 *   - Legacy full-document templates (starting with `<!doctype`) bypass the
 *     wrapper — that's the escape hatch for one-off manually-authored HTML.
 */

export type BillingTemplateKey =
  | "subscription.trial_started"
  | "subscription.trial_ending"
  | "subscription.activated"
  | "subscription.plan_changed"
  | "invoice.issued"
  | "invoice.sent"
  | "invoice.paid"
  | "invoice.canceled"
  | "reminder.pre_due"
  | "reminder.due_day"
  | "reminder.post_due"
  | "reminder.final_notice"
  | "subscription.restricted"
  | "subscription.suspended";

export const DEFAULT_TEMPLATES: Array<{
  key: BillingTemplateKey;
  name: string;
  description: string;
  subject: string;
  bodyText: string;
  bodyHtml: string;
  variables: string[];
}> = [
  {
    key: "subscription.trial_started",
    name: "Pretplata — probni period započeo",
    description: "Šalje se korisniku odmah nakon aktivacije probne pretplate.",
    subject: "Vaš probni period za PropertyDesk je aktiviran",
    bodyText: `Poštovani {{organizationName}},

Zahvaljujemo Vam na registraciji! Vaš probni period je aktivan do {{trialEndsAt}}.

Sve funkcionalnosti platforme su dostupne bez ograničenja tokom probnog perioda.

Ukoliko imate pitanja, kontaktirajte nas na {{supportEmail}}.

Srdačan pozdrav,
Tim PropertyDesk`,
    bodyHtml: `<p style="margin:0 0 16px 0;color:#0f172a;font-size:15px;line-height:1.6;">Poštovani <strong>{{organizationName}}</strong>, zahvaljujemo Vam na registraciji! Vaš PropertyDesk nalog je spreman i sve funkcionalnosti su dostupne bez ograničenja tokom probnog perioda.</p>`,
    variables: [
      "organizationName",
      "trialEndsAt",
      "daysRemaining",
      "supportEmail",
      "appUrl",
    ],
  },
  {
    key: "subscription.trial_ending",
    name: "Pretplata — probni period ističe",
    description: "Šalje se 3 dana pre isteka probnog perioda.",
    subject: "Vaš probni period ističe za {{daysRemaining}} dana",
    bodyText: `Poštovani {{organizationName}},

Vaš probni period ističe {{trialEndsAt}}. Kako biste nastavili sa nesmetanim radom, molimo Vas da odaberete plan.

Sa poštovanjem,
Tim PropertyDesk`,
    bodyHtml: `<p style="margin:0 0 16px 0;color:#0f172a;font-size:15px;line-height:1.6;">Poštovani <strong>{{organizationName}}</strong>, Vaš probni period se privodi kraju. Kako biste nastavili sa nesmetanim radom, molimo Vas da odaberete plan pre isteka.</p>`,
    variables: [
      "organizationName",
      "trialEndsAt",
      "daysRemaining",
      "appUrl",
    ],
  },
  {
    key: "subscription.activated",
    name: "Pretplata aktivirana",
    description: "Šalje se nakon aktivacije plaćene pretplate.",
    subject: "Vaša pretplata je aktivirana",
    bodyText: `Poštovani {{organizationName}},

Uspešno ste aktivirali plan {{planName}} sa ciklusom {{billingCycle}}. Naredna naplata: {{nextBillingDate}}.

Hvala Vam na poverenju.

Tim PropertyDesk`,
    bodyHtml: `<p style="margin:0 0 16px 0;color:#0f172a;font-size:15px;line-height:1.6;">Poštovani <strong>{{organizationName}}</strong>, uspešno ste aktivirali svoju pretplatu. Hvala Vam na poverenju.</p>`,
    variables: [
      "organizationName",
      "planName",
      "billingCycle",
      "nextBillingDate",
      "appUrl",
    ],
  },
  {
    key: "subscription.plan_changed",
    name: "Promena plana pretplate",
    description: "Šalje se pri promeni tekućeg SaaS plana.",
    subject: "Vaš plan pretplate je promenjen",
    bodyText: `Poštovani {{organizationName}},

Vaš plan je promenjen sa {{previousPlan}} na {{planName}}. Nova cena: {{price}} {{currency}} ({{billingCycle}}).

Tim PropertyDesk`,
    bodyHtml: `<p style="margin:0 0 16px 0;color:#0f172a;font-size:15px;line-height:1.6;">Poštovani <strong>{{organizationName}}</strong>, plan Vaše pretplate je uspešno promenjen. Nova cena i ciklus stupaju na snagu odmah.</p>`,
    variables: [
      "organizationName",
      "planName",
      "previousPlan",
      "price",
      "currency",
      "billingCycle",
      "appUrl",
    ],
  },
  {
    key: "invoice.issued",
    name: "Faktura izdata",
    description: "Šalje se odmah po izdavanju fakture (pre slanja PDF-a).",
    subject: "Faktura {{invoiceNumber}} je izdata",
    bodyText: `Poštovani {{organizationName}},

Izdali smo Vam fakturu {{invoiceNumber}} u iznosu od {{totalAmount}} {{currency}}. Rok plaćanja: {{dueDate}}.

Fakturu možete pregledati u aplikaciji: {{appUrl}}/podesavanja/fakture/{{invoiceId}}

Tim PropertyDesk`,
    bodyHtml: `<p style="margin:0 0 16px 0;color:#0f172a;font-size:15px;line-height:1.6;">Poštovani <strong>{{organizationName}}</strong>, izdali smo Vam novu fakturu za tekući period.</p>`,
    variables: [
      "organizationName",
      "invoiceNumber",
      "invoiceId",
      "totalAmount",
      "currency",
      "dueDate",
      "appUrl",
    ],
  },
  {
    key: "invoice.sent",
    name: "Faktura poslata",
    description: "Šalje se korisniku sa PDF-om fakture u prilogu.",
    subject: "Faktura {{invoiceNumber}} — PDF u prilogu",
    bodyText: `Poštovani {{organizationName}},

U prilogu se nalazi Vaša faktura {{invoiceNumber}} u iznosu od {{totalAmount}} {{currency}}. Rok plaćanja: {{dueDate}}.

Način plaćanja: uplatom na račun ili preko IPS QR koda u fakturi.

Tim PropertyDesk`,
    bodyHtml: `<p style="margin:0 0 16px 0;color:#0f172a;font-size:15px;line-height:1.6;">Poštovani <strong>{{organizationName}}</strong>, u prilogu se nalazi PDF Vaše fakture. Možete platiti bankarskim transferom ili skeniranjem IPS QR koda u fakturi.</p>`,
    variables: [
      "organizationName",
      "invoiceNumber",
      "invoiceId",
      "totalAmount",
      "currency",
      "dueDate",
      "appUrl",
    ],
  },
  {
    key: "invoice.paid",
    name: "Faktura plaćena",
    description: "Potvrda evidentiranja uplate.",
    subject: "Uplata evidentirana — faktura {{invoiceNumber}}",
    bodyText: `Poštovani {{organizationName}},

Vaša uplata za fakturu {{invoiceNumber}} u iznosu od {{amountPaid}} {{currency}} je evidentirana.

Naredna naplata: {{nextBillingDate}}.

Tim PropertyDesk`,
    bodyHtml: `<p style="margin:0 0 16px 0;color:#0f172a;font-size:15px;line-height:1.6;">Poštovani <strong>{{organizationName}}</strong>, Vaša uplata je uspešno evidentirana. Hvala Vam na blagovremenoj uplati.</p>`,
    variables: [
      "organizationName",
      "invoiceNumber",
      "amountPaid",
      "currency",
      "nextBillingDate",
      "appUrl",
    ],
  },
  {
    key: "invoice.canceled",
    name: "Faktura otkazana",
    description: "Šalje se pri otkazivanju fakture.",
    subject: "Faktura {{invoiceNumber}} je otkazana",
    bodyText: `Poštovani {{organizationName}},

Obaveštavamo Vas da je faktura {{invoiceNumber}} otkazana. Razlog: {{reason}}.

Tim PropertyDesk`,
    bodyHtml: `<p style="margin:0 0 16px 0;color:#0f172a;font-size:15px;line-height:1.6;">Poštovani <strong>{{organizationName}}</strong>, obaveštavamo Vas da je navedena faktura otkazana.</p>`,
    variables: [
      "organizationName",
      "invoiceNumber",
      "reason",
      "appUrl",
    ],
  },
  {
    key: "reminder.pre_due",
    name: "Podsetnik — 3 dana pre isteka",
    description: "Šalje se 3 dana pre roka plaćanja fakture.",
    subject: "Podsetnik: faktura {{invoiceNumber}} dospeva {{dueDate}}",
    bodyText: `Poštovani {{organizationName}},

Podsećamo Vas da faktura {{invoiceNumber}} u iznosu od {{amountDue}} {{currency}} dospeva {{dueDate}}.

Molimo Vas da izvršite uplatu na vreme kako biste izbegli suspenziju pristupa.

Tim PropertyDesk`,
    bodyHtml: `<p style="margin:0 0 16px 0;color:#0f172a;font-size:15px;line-height:1.6;">Poštovani <strong>{{organizationName}}</strong>, podsećamo Vas da ističe rok za plaćanje sledeće fakture. Molimo Vas da izvršite uplatu na vreme.</p>`,
    variables: [
      "organizationName",
      "invoiceNumber",
      "invoiceId",
      "amountDue",
      "currency",
      "dueDate",
      "appUrl",
    ],
  },
  {
    key: "reminder.due_day",
    name: "Podsetnik — dan dospeća",
    description: "Šalje se na sam dan dospeća fakture.",
    subject: "Faktura {{invoiceNumber}} dospeva danas",
    bodyText: `Poštovani {{organizationName}},

Faktura {{invoiceNumber}} u iznosu od {{amountDue}} {{currency}} dospeva danas.

Tim PropertyDesk`,
    bodyHtml: `<p style="margin:0 0 16px 0;color:#0f172a;font-size:15px;line-height:1.6;">Poštovani <strong>{{organizationName}}</strong>, danas je poslednji dan za plaćanje sledeće fakture bez kašnjenja.</p>`,
    variables: [
      "organizationName",
      "invoiceNumber",
      "invoiceId",
      "amountDue",
      "currency",
      "appUrl",
    ],
  },
  {
    key: "reminder.post_due",
    name: "Podsetnik — 3 dana posle dospeća",
    description: "Šalje se 3 dana nakon roka plaćanja.",
    subject: "Faktura {{invoiceNumber}} u kašnjenju",
    bodyText: `Poštovani {{organizationName}},

Faktura {{invoiceNumber}} je u kašnjenju {{daysOverdue}} dana. Iznos: {{amountDue}} {{currency}}. Molimo Vas za hitno plaćanje.

Tim PropertyDesk`,
    bodyHtml: `<p style="margin:0 0 16px 0;color:#0f172a;font-size:15px;line-height:1.6;">Poštovani <strong>{{organizationName}}</strong>, sledeća faktura je već u kašnjenju. Molimo Vas za hitno plaćanje kako biste izbegli dalje mere.</p>`,
    variables: [
      "organizationName",
      "invoiceNumber",
      "invoiceId",
      "amountDue",
      "currency",
      "daysOverdue",
      "appUrl",
    ],
  },
  {
    key: "reminder.final_notice",
    name: "Poslednja opomena — 7 dana",
    description: "Šalje se 7 dana nakon dospeća; najavljuje ograničavanje pristupa.",
    subject: "POSLEDNJA OPOMENA — faktura {{invoiceNumber}}",
    bodyText: `Poštovani {{organizationName}},

Ovo je poslednja opomena za fakturu {{invoiceNumber}} u iznosu od {{amountDue}} {{currency}}, dospelu {{dueDate}}.

Ukoliko uplata ne bude izvršena u naredna 3 dana, Vaš pristup platformi biće ograničen.

Tim PropertyDesk`,
    bodyHtml: `<p style="margin:0 0 16px 0;color:#0f172a;font-size:15px;line-height:1.6;">Poštovani <strong>{{organizationName}}</strong>, ovo je poslednja opomena pre ograničavanja pristupa Vašem PropertyDesk nalogu.</p>`,
    variables: [
      "organizationName",
      "invoiceNumber",
      "invoiceId",
      "amountDue",
      "currency",
      "dueDate",
      "appUrl",
    ],
  },
  {
    key: "subscription.restricted",
    name: "Pristup ograničen",
    description: "Šalje se kada je pristup organizacije ograničen zbog neizmirenih obaveza.",
    subject: "Vaš pristup je ograničen — potrebna uplata",
    bodyText: `Poštovani {{organizationName}},

Vaš pristup PropertyDesk platformi je ograničen zbog neizmirenih obaveza.

Otvorene stavke: {{amountDue}} {{currency}}.

Za nastavak rada molimo Vas da izvršite uplatu. Nakon evidentiranja uplate, pristup se automatski vraća.

Tim PropertyDesk`,
    bodyHtml: `<p style="margin:0 0 16px 0;color:#0f172a;font-size:15px;line-height:1.6;">Poštovani <strong>{{organizationName}}</strong>, Vaš pristup PropertyDesk platformi je privremeno ograničen zbog neizmirenih obaveza.</p>`,
    variables: [
      "organizationName",
      "amountDue",
      "currency",
      "appUrl",
    ],
  },
  {
    key: "subscription.suspended",
    name: "Pretplata suspendovana",
    description: "Šalje se pri automatskoj suspenziji naloga.",
    subject: "Vaša pretplata je suspendovana",
    bodyText: `Poštovani {{organizationName}},

Vaša pretplata je suspendovana. Kontaktirajte {{supportEmail}} za nastavak saradnje.

Tim PropertyDesk`,
    bodyHtml: `<p style="margin:0 0 16px 0;color:#0f172a;font-size:15px;line-height:1.6;">Poštovani <strong>{{organizationName}}</strong>, Vaša pretplata je suspendovana. Za nastavak saradnje molimo Vas da nas kontaktirate.</p>`,
    variables: [
      "organizationName",
      "supportEmail",
    ],
  },
];

export const ALL_TEMPLATE_KEYS = DEFAULT_TEMPLATES.map((t) => t.key) as readonly BillingTemplateKey[];

// -----------------------------------------------------------------------------
// Structural layout definitions per key
// -----------------------------------------------------------------------------

interface TemplateLayout {
  preheader: string;
  badge?: { label: string; tone: BillingEmailTone };
  title: string;
  keyValues?: KeyValuePair[];
  callout?: { text: string; tone: BillingEmailTone };
  cta?: BillingEmailCta;
  footerNote?: string;
}

/**
 * Structural shell for every default template. All string fields may
 * contain `{{variable}}` placeholders which are substituted at render
 * time. Fields left `undefined` are simply skipped.
 */
export const TEMPLATE_LAYOUTS: Record<BillingTemplateKey, TemplateLayout> = {
  "subscription.trial_started": {
    preheader:
      "Vaš probni period je aktivan do {{trialEndsAt}} — sve funkcionalnosti dostupne.",
    badge: { label: "Probni period aktivan", tone: "info" },
    title: "Dobrodošli u PropertyDesk",
    keyValues: [
      { label: "Organizacija", value: "{{organizationName}}" },
      { label: "Aktivan do", value: "{{trialEndsAt}}", emphasize: true },
    ],
    cta: { label: "Otvori aplikaciju", href: "{{appUrl}}" },
    footerNote: "Sve funkcionalnosti su dostupne tokom probnog perioda.",
  },
  "subscription.trial_ending": {
    preheader:
      "Vaš probni period ističe {{trialEndsAt}} — odaberite plan da nastavite.",
    badge: { label: "Probni period ističe", tone: "warning" },
    title: "Probni period se približava kraju",
    keyValues: [
      { label: "Organizacija", value: "{{organizationName}}" },
      { label: "Ističe", value: "{{trialEndsAt}}", emphasize: true },
      { label: "Preostalo dana", value: "{{daysRemaining}}" },
    ],
    cta: { label: "Odaberi plan", href: "{{appUrl}}/podesavanja/pretplata" },
  },
  "subscription.activated": {
    preheader:
      "Plan {{planName}} je aktiviran — sledeća naplata: {{nextBillingDate}}.",
    badge: { label: "Aktivirano", tone: "success" },
    title: "Pretplata je uspešno aktivirana",
    keyValues: [
      { label: "Plan", value: "{{planName}}", emphasize: true },
      { label: "Ciklus", value: "{{billingCycle}}" },
      { label: "Sledeća naplata", value: "{{nextBillingDate}}" },
    ],
    cta: {
      label: "Otvori pretplatu",
      href: "{{appUrl}}/podesavanja/pretplata",
    },
  },
  "subscription.plan_changed": {
    preheader:
      "Prešli ste sa plana {{previousPlan}} na {{planName}} — {{price}} {{currency}} po ciklusu.",
    badge: { label: "Promena plana", tone: "info" },
    title: "Plan pretplate je promenjen",
    keyValues: [
      { label: "Prethodni plan", value: "{{previousPlan}}" },
      { label: "Novi plan", value: "{{planName}}", emphasize: true },
      { label: "Ciklus", value: "{{billingCycle}}" },
      { label: "Cena", value: "{{price}} {{currency}}", emphasize: true },
    ],
    cta: {
      label: "Vidi detalje pretplate",
      href: "{{appUrl}}/podesavanja/pretplata",
    },
  },
  "invoice.issued": {
    preheader:
      "Faktura {{invoiceNumber}} u iznosu od {{totalAmount}} {{currency}} — rok {{dueDate}}.",
    badge: { label: "Izdata", tone: "info" },
    title: "Faktura {{invoiceNumber}}",
    keyValues: [
      { label: "Broj fakture", value: "{{invoiceNumber}}" },
      { label: "Iznos", value: "{{totalAmount}} {{currency}}", emphasize: true },
      { label: "Rok plaćanja", value: "{{dueDate}}" },
      { label: "Način plaćanja", value: "Bankarski transfer / IPS QR" },
    ],
    cta: {
      label: "Otvori fakturu",
      href: "{{appUrl}}/podesavanja/fakture/{{invoiceId}}",
    },
    footerNote:
      "PDF sa detaljima šaljemo u zasebnoj poruci u naredna 24h.",
  },
  "invoice.sent": {
    preheader:
      "PDF fakture {{invoiceNumber}} — iznos {{totalAmount}} {{currency}}, rok {{dueDate}}.",
    badge: { label: "PDF u prilogu", tone: "info" },
    title: "Faktura {{invoiceNumber}} — PDF u prilogu",
    keyValues: [
      { label: "Broj fakture", value: "{{invoiceNumber}}" },
      { label: "Iznos", value: "{{totalAmount}} {{currency}}", emphasize: true },
      { label: "Rok plaćanja", value: "{{dueDate}}" },
      { label: "Način plaćanja", value: "Bankarski transfer / IPS QR" },
    ],
    cta: {
      label: "Preuzmi PDF",
      href: "{{appUrl}}/podesavanja/fakture/{{invoiceId}}",
    },
  },
  "invoice.paid": {
    preheader:
      "Uplata za fakturu {{invoiceNumber}} je evidentirana — {{amountPaid}} {{currency}}.",
    badge: { label: "Plaćeno", tone: "success" },
    title: "Uplata je evidentirana",
    keyValues: [
      { label: "Broj fakture", value: "{{invoiceNumber}}" },
      { label: "Uplaćeno", value: "{{amountPaid}} {{currency}}", emphasize: true },
      { label: "Sledeća naplata", value: "{{nextBillingDate}}" },
    ],
    cta: {
      label: "Vidi fakture",
      href: "{{appUrl}}/podesavanja/fakture",
    },
    footerNote: "Hvala Vam na blagovremenoj uplati.",
  },
  "invoice.canceled": {
    preheader:
      "Faktura {{invoiceNumber}} je otkazana — {{reason}}.",
    badge: { label: "Otkazano", tone: "muted" },
    title: "Faktura {{invoiceNumber}} je otkazana",
    keyValues: [
      { label: "Broj fakture", value: "{{invoiceNumber}}" },
      { label: "Razlog", value: "{{reason}}" },
    ],
    cta: {
      label: "Vidi fakture",
      href: "{{appUrl}}/podesavanja/fakture",
    },
  },
  "reminder.pre_due": {
    preheader:
      "Podsetnik: faktura {{invoiceNumber}} dospeva {{dueDate}} — {{amountDue}} {{currency}}.",
    badge: { label: "Podsetnik", tone: "info" },
    title: "Faktura dospeva {{dueDate}}",
    keyValues: [
      { label: "Broj fakture", value: "{{invoiceNumber}}" },
      { label: "Iznos za uplatu", value: "{{amountDue}} {{currency}}", emphasize: true },
      { label: "Rok plaćanja", value: "{{dueDate}}" },
    ],
    cta: {
      label: "Plati sada",
      href: "{{appUrl}}/podesavanja/fakture/{{invoiceId}}",
    },
  },
  "reminder.due_day": {
    preheader:
      "Faktura {{invoiceNumber}} dospeva danas — {{amountDue}} {{currency}}.",
    badge: { label: "Dospeva danas", tone: "warning" },
    title: "Faktura dospeva danas",
    keyValues: [
      { label: "Broj fakture", value: "{{invoiceNumber}}" },
      { label: "Iznos za uplatu", value: "{{amountDue}} {{currency}}", emphasize: true },
    ],
    cta: {
      label: "Plati sada",
      href: "{{appUrl}}/podesavanja/fakture/{{invoiceId}}",
    },
  },
  "reminder.post_due": {
    preheader:
      "Faktura {{invoiceNumber}} u kašnjenju — {{daysOverdue}} dana, {{amountDue}} {{currency}}.",
    badge: { label: "U kašnjenju", tone: "warning" },
    title: "Faktura je u kašnjenju",
    keyValues: [
      { label: "Broj fakture", value: "{{invoiceNumber}}" },
      { label: "Iznos za uplatu", value: "{{amountDue}} {{currency}}", emphasize: true },
      { label: "Kašnjenje", value: "{{daysOverdue}} dana" },
    ],
    callout: {
      tone: "warning",
      text: "Molimo Vas da izvršite uplatu što pre kako bismo izbegli ograničavanje pristupa.",
    },
    cta: {
      label: "Plati sada",
      href: "{{appUrl}}/podesavanja/fakture/{{invoiceId}}",
    },
  },
  "reminder.final_notice": {
    preheader:
      "POSLEDNJA OPOMENA: faktura {{invoiceNumber}} — pristup će biti ograničen.",
    badge: { label: "Poslednja opomena", tone: "danger" },
    title: "Poslednja opomena za fakturu {{invoiceNumber}}",
    keyValues: [
      { label: "Broj fakture", value: "{{invoiceNumber}}" },
      { label: "Iznos za uplatu", value: "{{amountDue}} {{currency}}", emphasize: true },
      { label: "Dospela", value: "{{dueDate}}" },
    ],
    callout: {
      tone: "danger",
      text: "Ukoliko uplata ne bude izvršena u naredna 3 dana, Vaš pristup platformi biće ograničen.",
    },
    cta: {
      label: "Plati odmah",
      href: "{{appUrl}}/podesavanja/fakture/{{invoiceId}}",
    },
  },
  "subscription.restricted": {
    preheader:
      "Vaš pristup je ograničen — otvorene stavke {{amountDue}} {{currency}}.",
    badge: { label: "Pristup ograničen", tone: "danger" },
    title: "Pristup je privremeno ograničen",
    keyValues: [
      { label: "Organizacija", value: "{{organizationName}}" },
      {
        label: "Otvorene stavke",
        value: "{{amountDue}} {{currency}}",
        emphasize: true,
      },
    ],
    callout: {
      tone: "danger",
      text: "Nakon evidentiranja uplate, pristup se automatski vraća.",
    },
    cta: {
      label: "Vidi otvorene fakture",
      href: "{{appUrl}}/podesavanja/fakture",
    },
  },
  "subscription.suspended": {
    preheader:
      "Vaša pretplata je suspendovana — kontaktirajte {{supportEmail}}.",
    badge: { label: "Suspendovano", tone: "danger" },
    title: "Pretplata je suspendovana",
    keyValues: [
      { label: "Organizacija", value: "{{organizationName}}" },
      { label: "Kontakt", value: "{{supportEmail}}" },
    ],
    callout: {
      tone: "danger",
      text: "Za nastavak saradnje molimo Vas da nas kontaktirate.",
    },
    cta: {
      label: "Kontaktiraj podršku",
      href: "mailto:{{supportEmail}}",
    },
  },
};

// -----------------------------------------------------------------------------
// Rendering — strict, whitelist-only variable substitution
// -----------------------------------------------------------------------------

const VARIABLE_RE = /\{\{\s*([a-zA-Z][a-zA-Z0-9_]*)\s*\}\}/g;

/**
 * Substitute `{{name}}` placeholders inside `template` with values from
 * the `variables` map. Unknown names are replaced with an empty string
 * (never leaked as the literal placeholder to the user). Values are
 * HTML-escaped when the surrounding template appears to contain HTML
 * markup so operator-supplied data can never break out of a tag.
 */
export function safeSubstitute(
  template: string,
  variables: Record<string, string>,
): string {
  const looksLikeHtml = template.startsWith("<") || template.includes("<p") || template.includes("&");
  return template.replace(VARIABLE_RE, (_match, name: string) => {
    if (Object.prototype.hasOwnProperty.call(variables, name)) {
      return escapeHtmlWhereNeeded(variables[name] ?? "", looksLikeHtml);
    }
    return "";
  });
}

/**
 * Substitute placeholders without escaping. Only used for URL attribute
 * values (e.g. CTA `href`) where the caller has already promised to
 * pass URL-safe values. Never use for user-generated content.
 */
function substituteRaw(
  template: string,
  variables: Record<string, string>,
): string {
  return template.replace(VARIABLE_RE, (_match, name: string) => {
    if (Object.prototype.hasOwnProperty.call(variables, name)) {
      return variables[name] ?? "";
    }
    return "";
  });
}

function escapeHtmlWhereNeeded(value: string, isHtml: boolean): string {
  if (!isHtml) return value;
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface RenderedBillingEmail {
  subject: string;
  text: string;
  html: string;
  templateKey: string;
}

/**
 * Given a template key + the raw intro HTML from the DB (or default),
 * compose the full-document HTML by feeding the substituted parts into
 * `wrapBillingEmail`. Templates that already look like a complete HTML
 * document (e.g. hand-authored one-offs) are passed through unchanged.
 */
export function composeBillingEmailHtml(
  key: string,
  bodyHtml: string,
  variables: Record<string, string>,
): string {
  const substitutedIntro = safeSubstitute(bodyHtml, variables);

  if (isFullHtmlDocument(bodyHtml)) {
    return substitutedIntro;
  }

  const layout = TEMPLATE_LAYOUTS[key as BillingTemplateKey];
  if (!layout) {
    // Unknown key — wrap with a minimal shell so it still looks branded.
    return wrapBillingEmail({
      contentHtml: substitutedIntro,
      supportEmail: variables.supportEmail,
    });
  }

  const parts: string[] = [];
  if (substitutedIntro.trim()) parts.push(substitutedIntro);
  if (layout.keyValues && layout.keyValues.length > 0) {
    const substitutedRows: KeyValuePair[] = layout.keyValues.map((kv) => ({
      label: kv.label,
      value: safeSubstitute(kv.value, variables),
      emphasize: kv.emphasize,
    }));
    parts.push(renderKeyValue(substitutedRows));
  }
  if (layout.callout) {
    parts.push(
      renderCallout(
        safeSubstitute(layout.callout.text, variables),
        layout.callout.tone,
      ),
    );
  }

  return wrapBillingEmail({
    preheader: safeSubstitute(layout.preheader, variables),
    title: safeSubstitute(layout.title, variables),
    badge: layout.badge
      ? { label: layout.badge.label, tone: layout.badge.tone }
      : undefined,
    contentHtml: parts.join("\n"),
    cta: layout.cta
      ? {
          label: safeSubstitute(layout.cta.label, variables),
          href: substituteRaw(layout.cta.href, variables),
        }
      : undefined,
    footerNote: layout.footerNote
      ? safeSubstitute(layout.footerNote, variables)
      : undefined,
    supportEmail: variables.supportEmail,
  });
}

export async function renderBillingEmail(
  key: string,
  variables: Record<string, string>,
): Promise<RenderedBillingEmail> {
  const row = await prisma.billingEmailTemplate.findUnique({ where: { key } });
  if (row && row.active) {
    return {
      subject: safeSubstitute(row.subject, variables),
      text: safeSubstitute(row.bodyText, variables),
      html: composeBillingEmailHtml(key, row.bodyHtml, variables),
      templateKey: row.key,
    };
  }
  // DB miss (or inactive row) — fall through to hardcoded defaults so
  // email delivery keeps working before the seed runs.
  const fallback = DEFAULT_TEMPLATES.find((t) => t.key === key);
  if (!fallback) {
    throw DomainErrors.notFound(`Šablon "${key}"`);
  }
  return {
    subject: safeSubstitute(fallback.subject, variables),
    text: safeSubstitute(fallback.bodyText, variables),
    html: composeBillingEmailHtml(key, fallback.bodyHtml, variables),
    templateKey: fallback.key,
  };
}

// -----------------------------------------------------------------------------
// Admin CRUD
// -----------------------------------------------------------------------------

export async function listBillingEmailTemplates(): Promise<BillingEmailTemplate[]> {
  return prisma.billingEmailTemplate.findMany({ orderBy: { key: "asc" } });
}

export async function updateBillingEmailTemplate(
  key: string,
  input: {
    subject?: string;
    bodyText?: string;
    bodyHtml?: string;
    active?: boolean;
  },
  actorUserId: string | null,
): Promise<BillingEmailTemplate> {
  const previous = await prisma.billingEmailTemplate.findUnique({ where: { key } });
  if (!previous) throw DomainErrors.notFound("Šablon");

  const next = await prisma.billingEmailTemplate.update({
    where: { key },
    data: {
      subject: input.subject ?? undefined,
      bodyText: input.bodyText ?? undefined,
      bodyHtml: input.bodyHtml ?? undefined,
      active: input.active ?? undefined,
    },
  });

  await recordAudit({
    action: "billing.email_template_updated",
    entityType: "BillingEmailTemplate",
    entityId: previous.id,
    actorUserId,
    previousValues: previous,
    newValues: next,
  });

  return next;
}

/**
 * Idempotent seeder for the default template set. Safe to call from
 * migrations or on-boot bootstraps — existing rows are never overwritten.
 */
export async function seedDefaultBillingTemplates(): Promise<{ inserted: number }> {
  let inserted = 0;
  for (const tmpl of DEFAULT_TEMPLATES) {
    const exists = await prisma.billingEmailTemplate.findUnique({
      where: { key: tmpl.key },
    });
    if (exists) continue;
    await prisma.billingEmailTemplate.create({
      data: {
        id: createId(),
        key: tmpl.key,
        name: tmpl.name,
        description: tmpl.description,
        subject: tmpl.subject,
        bodyText: tmpl.bodyText,
        bodyHtml: tmpl.bodyHtml,
        variables: tmpl.variables as unknown as object,
      },
    });
    inserted++;
  }
  return { inserted };
}
