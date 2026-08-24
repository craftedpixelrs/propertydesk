import "server-only";
import { APP_NAME } from "@/lib/constants/app";
import type { EmailMessage } from "@/server/auth/email";

/**
 * Serbian (sr-Latn) transactional email templates for domain events.
 *
 * Each builder returns an `EmailMessage` with an empty `to` — the caller
 * (notification service) fills in the recipient. Keeping the copy here means
 * every event has a single, reviewable source of truth for wording.
 */

function layout(lines: string[]): string {
  return [...lines, "", `— ${APP_NAME}`].join("\n");
}

export function reservationRequestedEmail(params: {
  unitCode: string;
  projectName: string;
  buyerName: string;
  actionUrl?: string;
}): EmailMessage {
  return {
    to: "",
    subject: `${APP_NAME}: Nova rezervacija — ${params.unitCode}`,
    text: layout([
      `Poštovani,`,
      ``,
      `Kreirana je nova rezervacija koja čeka odobrenje.`,
      ``,
      `Jedinica: ${params.unitCode} (${params.projectName})`,
      `Kupac: ${params.buyerName}`,
      ...(params.actionUrl ? [``, `Detalji: ${params.actionUrl}`] : []),
    ]),
  };
}

function formatWhen(value: Date): string {
  return value.toLocaleString("sr-Latn-RS");
}

export function publicReservationRequestEmail(params: {
  buyerName: string;
  unitCode: string;
  projectName: string;
  expiresAt: Date;
  paymentLines: string[];
}): EmailMessage {
  return {
    to: "",
    subject: `${APP_NAME}: Zahtev za rezervaciju — ${params.unitCode}`,
    text: layout([
      `Poštovani/a ${params.buyerName},`,
      ``,
      `Primili smo Vaš zahtev za rezervaciju.`,
      ``,
      `Jedinica: ${params.unitCode} (${params.projectName})`,
      `Zahtev važi do: ${formatWhen(params.expiresAt)}`,
      ``,
      ...params.paymentLines,
      ``,
      `Kad uplata stigne, investitor potvrđuje rezervaciju na Vaše ime.`,
    ]),
  };
}

export function publicReservationConfirmedEmail(params: {
  buyerName: string;
  unitCode: string;
  projectName: string;
  expiresAt?: Date | null;
  paymentLines: string[];
}): EmailMessage {
  return {
    to: "",
    subject: `${APP_NAME}: Rezervacija potvrđena — ${params.unitCode}`,
    text: layout([
      `Poštovani/a ${params.buyerName},`,
      ``,
      `Vaša rezervacija je potvrđena.`,
      ``,
      `Jedinica: ${params.unitCode} (${params.projectName})`,
      ...(params.expiresAt
        ? [`Rezervacija važi do: ${formatWhen(params.expiresAt)}`]
        : []),
      ``,
      ...params.paymentLines,
    ]),
  };
}

export function reservationApprovedEmail(params: {
  unitCode: string;
  projectName: string;
  expiresAt?: Date | null;
  actionUrl?: string;
}): EmailMessage {
  return {
    to: "",
    subject: `${APP_NAME}: Rezervacija odobrena — ${params.unitCode}`,
    text: layout([
      `Poštovani,`,
      ``,
      `Vaša rezervacija je odobrena.`,
      ``,
      `Jedinica: ${params.unitCode} (${params.projectName})`,
      ...(params.expiresAt
        ? [`Rezervacija važi do: ${params.expiresAt.toLocaleDateString("sr-Latn-RS")}`]
        : []),
      ...(params.actionUrl ? [``, `Detalji: ${params.actionUrl}`] : []),
    ]),
  };
}

export function reservationRejectedEmail(params: {
  unitCode: string;
  projectName: string;
  reason?: string | null;
  actionUrl?: string;
}): EmailMessage {
  return {
    to: "",
    subject: `${APP_NAME}: Rezervacija odbijena — ${params.unitCode}`,
    text: layout([
      `Poštovani,`,
      ``,
      `Vaša rezervacija je odbijena.`,
      ``,
      `Jedinica: ${params.unitCode} (${params.projectName})`,
      ...(params.reason ? [`Razlog: ${params.reason}`] : []),
      ...(params.actionUrl ? [``, `Detalji: ${params.actionUrl}`] : []),
    ]),
  };
}

export function reservationExpiredEmail(params: {
  unitCode: string;
  projectName: string;
  actionUrl?: string;
}): EmailMessage {
  return {
    to: "",
    subject: `${APP_NAME}: Rezervacija istekla — ${params.unitCode}`,
    text: layout([
      `Poštovani,`,
      ``,
      `Rezervacija je istekla i jedinica je ponovo dostupna.`,
      ``,
      `Jedinica: ${params.unitCode} (${params.projectName})`,
      ...(params.actionUrl ? [``, `Detalji: ${params.actionUrl}`] : []),
    ]),
  };
}

export function taskAssignedEmail(params: {
  title: string;
  dueAt: Date;
  actionUrl?: string;
}): EmailMessage {
  return {
    to: "",
    subject: `${APP_NAME}: Novi zadatak — ${params.title}`,
    text: layout([
      `Poštovani,`,
      ``,
      `Dodeljen Vam je novi zadatak.`,
      ``,
      `Zadatak: ${params.title}`,
      `Rok: ${params.dueAt.toLocaleString("sr-Latn-RS")}`,
      ...(params.actionUrl ? [``, `Detalji: ${params.actionUrl}`] : []),
    ]),
  };
}

/** Generic template for any notification that doesn't have a bespoke one. */
export function genericNotificationEmail(params: {
  title: string;
  message: string;
  actionUrl?: string;
}): EmailMessage {
  return {
    to: "",
    subject: `${APP_NAME}: ${params.title}`,
    text: layout([
      params.message,
      ...(params.actionUrl ? [``, `Detalji: ${params.actionUrl}`] : []),
    ]),
  };
}

// -----------------------------------------------------------------------------
// Section 28 — additional lifecycle emails
// -----------------------------------------------------------------------------

export function saleContractedEmail(params: {
  unitCode: string;
  projectName: string;
  buyerName: string;
  finalPrice: string;
  currency: string;
  actionUrl?: string;
}): EmailMessage {
  return {
    to: "",
    subject: `${APP_NAME}: Ugovorena prodaja — ${params.unitCode}`,
    text: layout([
      `Poštovani,`,
      ``,
      `Prodaja je uspešno ugovorena.`,
      ``,
      `Jedinica: ${params.unitCode} (${params.projectName})`,
      `Kupac: ${params.buyerName}`,
      `Cena: ${params.finalPrice} ${params.currency}`,
      ...(params.actionUrl ? [``, `Detalji: ${params.actionUrl}`] : []),
    ]),
  };
}

export function salePaidEmail(params: {
  unitCode: string;
  projectName: string;
  actionUrl?: string;
}): EmailMessage {
  return {
    to: "",
    subject: `${APP_NAME}: Prodaja plaćena — ${params.unitCode}`,
    text: layout([
      `Poštovani,`,
      ``,
      `Ukupan iznos za prodaju je naplaćen.`,
      ``,
      `Jedinica: ${params.unitCode} (${params.projectName})`,
      ...(params.actionUrl ? [``, `Detalji: ${params.actionUrl}`] : []),
    ]),
  };
}

export function saleHandoverEmail(params: {
  unitCode: string;
  projectName: string;
  handoverDate?: Date | null;
  actionUrl?: string;
}): EmailMessage {
  return {
    to: "",
    subject: `${APP_NAME}: Primopredaja — ${params.unitCode}`,
    text: layout([
      `Poštovani,`,
      ``,
      `Zakazana/izvršena je primopredaja jedinice.`,
      ``,
      `Jedinica: ${params.unitCode} (${params.projectName})`,
      ...(params.handoverDate
        ? [`Datum: ${params.handoverDate.toLocaleDateString("sr-Latn-RS")}`]
        : []),
      ...(params.actionUrl ? [``, `Detalji: ${params.actionUrl}`] : []),
    ]),
  };
}

export function saleCanceledEmail(params: {
  unitCode: string;
  projectName: string;
  reason?: string | null;
  actionUrl?: string;
}): EmailMessage {
  return {
    to: "",
    subject: `${APP_NAME}: Prodaja otkazana — ${params.unitCode}`,
    text: layout([
      `Poštovani,`,
      ``,
      `Prodaja je otkazana.`,
      ``,
      `Jedinica: ${params.unitCode} (${params.projectName})`,
      ...(params.reason ? [`Razlog: ${params.reason}`] : []),
      ...(params.actionUrl ? [``, `Detalji: ${params.actionUrl}`] : []),
    ]),
  };
}

export function paymentReceivedEmail(params: {
  unitCode: string;
  amount: string;
  currency: string;
  paymentDate: Date;
  actionUrl?: string;
}): EmailMessage {
  return {
    to: "",
    subject: `${APP_NAME}: Primljena uplata — ${params.unitCode}`,
    text: layout([
      `Poštovani,`,
      ``,
      `Evidentirana je nova uplata.`,
      ``,
      `Jedinica: ${params.unitCode}`,
      `Iznos: ${params.amount} ${params.currency}`,
      `Datum uplate: ${params.paymentDate.toLocaleDateString("sr-Latn-RS")}`,
      ...(params.actionUrl ? [``, `Detalji: ${params.actionUrl}`] : []),
    ]),
  };
}

export function paymentReversedEmail(params: {
  unitCode: string;
  amount: string;
  currency: string;
  reason?: string | null;
  actionUrl?: string;
}): EmailMessage {
  return {
    to: "",
    subject: `${APP_NAME}: Storno uplate — ${params.unitCode}`,
    text: layout([
      `Poštovani,`,
      ``,
      `Uplata je stornirana.`,
      ``,
      `Jedinica: ${params.unitCode}`,
      `Iznos: ${params.amount} ${params.currency}`,
      ...(params.reason ? [`Razlog: ${params.reason}`] : []),
      ...(params.actionUrl ? [``, `Detalji: ${params.actionUrl}`] : []),
    ]),
  };
}

export function commissionCalculatedEmail(params: {
  unitCode: string;
  agencyName: string;
  amount: string;
  currency: string;
  actionUrl?: string;
}): EmailMessage {
  return {
    to: "",
    subject: `${APP_NAME}: Provizija kalkulisana — ${params.unitCode}`,
    text: layout([
      `Poštovani,`,
      ``,
      `Provizija je automatski kalkulisana nakon zaključenja ugovora.`,
      ``,
      `Jedinica: ${params.unitCode}`,
      `Agencija: ${params.agencyName}`,
      `Iznos: ${params.amount} ${params.currency}`,
      ...(params.actionUrl ? [``, `Detalji: ${params.actionUrl}`] : []),
    ]),
  };
}

export function commissionApprovedEmail(params: {
  agencyName: string;
  amount: string;
  currency: string;
  actionUrl?: string;
}): EmailMessage {
  return {
    to: "",
    subject: `${APP_NAME}: Provizija odobrena`,
    text: layout([
      `Poštovani,`,
      ``,
      `Provizija je odobrena i spremna za fakturisanje.`,
      ``,
      `Agencija: ${params.agencyName}`,
      `Iznos: ${params.amount} ${params.currency}`,
      ...(params.actionUrl ? [``, `Detalji: ${params.actionUrl}`] : []),
    ]),
  };
}

export function commissionPaidEmail(params: {
  agencyName: string;
  amount: string;
  currency: string;
  actionUrl?: string;
}): EmailMessage {
  return {
    to: "",
    subject: `${APP_NAME}: Provizija isplaćena`,
    text: layout([
      `Poštovani,`,
      ``,
      `Provizija je isplaćena.`,
      ``,
      `Agencija: ${params.agencyName}`,
      `Iznos: ${params.amount} ${params.currency}`,
      ...(params.actionUrl ? [``, `Detalji: ${params.actionUrl}`] : []),
    ]),
  };
}

export function agencyRegistrationApprovedEmail(params: {
  projectName: string;
  buyerName: string;
  protectionEndsAt?: Date | null;
  actionUrl?: string;
}): EmailMessage {
  return {
    to: "",
    subject: `${APP_NAME}: Registracija kupca odobrena`,
    text: layout([
      `Poštovani,`,
      ``,
      `Vaša registracija kupca je odobrena i zaštita je aktivirana.`,
      ``,
      `Projekat: ${params.projectName}`,
      `Kupac: ${params.buyerName}`,
      ...(params.protectionEndsAt
        ? [
            `Zaštita važi do: ${params.protectionEndsAt.toLocaleDateString(
              "sr-Latn-RS",
            )}`,
          ]
        : []),
      ...(params.actionUrl ? [``, `Detalji: ${params.actionUrl}`] : []),
    ]),
  };
}

export function agencyRegistrationRejectedEmail(params: {
  projectName: string;
  buyerName: string;
  reason?: string | null;
  actionUrl?: string;
}): EmailMessage {
  return {
    to: "",
    subject: `${APP_NAME}: Registracija kupca odbijena`,
    text: layout([
      `Poštovani,`,
      ``,
      `Registracija kupca je odbijena.`,
      ``,
      `Projekat: ${params.projectName}`,
      `Kupac: ${params.buyerName}`,
      ...(params.reason ? [`Razlog: ${params.reason}`] : []),
      ...(params.actionUrl ? [``, `Detalji: ${params.actionUrl}`] : []),
    ]),
  };
}

export function buyerProtectionExpiredEmail(params: {
  projectName: string;
  buyerName: string;
  actionUrl?: string;
}): EmailMessage {
  return {
    to: "",
    subject: `${APP_NAME}: Zaštita registracije istekla`,
    text: layout([
      `Poštovani,`,
      ``,
      `Zaštita registracije kupca je istekla.`,
      ``,
      `Projekat: ${params.projectName}`,
      `Kupac: ${params.buyerName}`,
      ...(params.actionUrl ? [``, `Detalji: ${params.actionUrl}`] : []),
    ]),
  };
}

export function taskDueSoonEmail(params: {
  title: string;
  dueAt: Date;
  actionUrl?: string;
}): EmailMessage {
  return {
    to: "",
    subject: `${APP_NAME}: Zadatak uskoro dospeva — ${params.title}`,
    text: layout([
      `Poštovani,`,
      ``,
      `Vaš zadatak dospeva uskoro.`,
      ``,
      `Zadatak: ${params.title}`,
      `Rok: ${params.dueAt.toLocaleString("sr-Latn-RS")}`,
      ...(params.actionUrl ? [``, `Detalji: ${params.actionUrl}`] : []),
    ]),
  };
}

export function taskOverdueEmail(params: {
  title: string;
  dueAt: Date;
  actionUrl?: string;
}): EmailMessage {
  return {
    to: "",
    subject: `${APP_NAME}: Prekoračen zadatak — ${params.title}`,
    text: layout([
      `Poštovani,`,
      ``,
      `Zadatak je prekoračio rok.`,
      ``,
      `Zadatak: ${params.title}`,
      `Rok je bio: ${params.dueAt.toLocaleString("sr-Latn-RS")}`,
      ...(params.actionUrl ? [``, `Detalji: ${params.actionUrl}`] : []),
    ]),
  };
}

export function trialExpiringEmail(params: {
  organizationName: string;
  trialEndsAt: Date;
  actionUrl?: string;
}): EmailMessage {
  return {
    to: "",
    subject: `${APP_NAME}: Vaš probni period uskoro ističe`,
    text: layout([
      `Poštovani,`,
      ``,
      `Probni period za organizaciju "${params.organizationName}" ističe ${params.trialEndsAt.toLocaleDateString("sr-Latn-RS")}.`,
      ``,
      `Da biste izbegli suspenziju, kontaktirajte administratora ili obnovite pretplatu.`,
      ...(params.actionUrl ? [``, `Detalji: ${params.actionUrl}`] : []),
    ]),
  };
}
