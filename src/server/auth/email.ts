import { serverEnv, emailFromHeader } from "@/lib/env";
import { APP_NAME } from "@/lib/constants/app";

/**
 * Transactional email adapter.
 *
 * V1 supports three providers, selected by `EMAIL_PROVIDER`:
 *   - `console` (default) — logs the email to stdout, useful during local dev
 *   - `smtp`               — plain SMTP via nodemailer-compatible fields
 *   - `resend`             — sends via the Resend HTTPS API
 *
 * Production: Resend sends as `noreply@propertydesk.app`. Replies go to
 * `hello@propertydesk.app` (Google Workspace). No extra Workspace seat.
 *
 * The rest of the codebase should call `sendEmail(...)` and remain oblivious
 * to which provider is in use. If SMTP is selected but `SMTP_HOST` is not
 * configured, the adapter safely falls back to `console` (never silently
 * loses email in dev/test).
 */

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendEmail(msg: EmailMessage): Promise<void> {
  const from = emailFromHeader();

  if (serverEnv.EMAIL_PROVIDER === "resend" && serverEnv.RESEND_API_KEY) {
    await sendViaResend(msg, from);
    return;
  }

  if (serverEnv.EMAIL_PROVIDER === "smtp" && serverEnv.SMTP_HOST) {
    await sendViaSmtp(msg, from);
    return;
  }

  // Fall-through (console): visible in dev logs, safe in tests.
  console.info(
    `[email:console] from="${from}" to="${msg.to}" subject="${msg.subject}"\n${msg.text}`,
  );
}

async function sendViaResend(msg: EmailMessage, from: string): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serverEnv.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: msg.to,
      reply_to: serverEnv.EMAIL_REPLY_TO,
      subject: msg.subject,
      text: msg.text,
      html: msg.html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`[email:resend] send failed: ${res.status} ${body}`);
    throw new Error("email_send_failed");
  }
}

// SMTP support is loaded lazily so the `nodemailer` dependency is optional.
async function sendViaSmtp(msg: EmailMessage, from: string): Promise<void> {
  try {
    // Runtime-only import path so TypeScript doesn't require @types/nodemailer.
    const nodemailerPath = "nodemailer";
    const mod = (await import(
      /* webpackIgnore: true */ nodemailerPath
    ).catch(() => null)) as
      | { default?: { createTransport: (o: unknown) => unknown }; createTransport?: (o: unknown) => unknown }
      | null;

    if (!mod) {
      console.warn(
        "[email:smtp] nodemailer is not installed. Falling back to console.",
      );
      console.info(
        `[email:console-fallback] from="${from}" to="${msg.to}" subject="${msg.subject}"\n${msg.text}`,
      );
      return;
    }

    const create = mod.createTransport ?? mod.default?.createTransport;
    if (!create) throw new Error("nodemailer.createTransport not found");

    const transport = create({
      host: serverEnv.SMTP_HOST,
      port: serverEnv.SMTP_PORT ?? 587,
      secure: serverEnv.SMTP_SECURE,
      auth:
        serverEnv.SMTP_USER && serverEnv.SMTP_PASSWORD
          ? { user: serverEnv.SMTP_USER, pass: serverEnv.SMTP_PASSWORD }
          : undefined,
    }) as {
      sendMail: (opts: {
        from: string;
        to: string;
        replyTo?: string;
        subject: string;
        text: string;
        html?: string;
      }) => Promise<unknown>;
    };

    await transport.sendMail({
      from,
      to: msg.to,
      replyTo: serverEnv.EMAIL_REPLY_TO,
      subject: msg.subject,
      text: msg.text,
      html: msg.html,
    });
  } catch (err) {
    console.error("[email:smtp] send failed", err);
    throw new Error("email_send_failed");
  }
}

// -----------------------------------------------------------------------------
// Serbian message templates
// -----------------------------------------------------------------------------

export function passwordResetEmail(url: string): EmailMessage {
  return {
    to: "",
    subject: `${APP_NAME}: Resetovanje lozinke`,
    text: [
      `Poštovani,`,
      ``,
      `Primili smo zahtev za resetovanje lozinke za Vaš ${APP_NAME} nalog.`,
      `Da biste postavili novu lozinku, otvorite sledeći link u pretraživaču:`,
      ``,
      url,
      ``,
      `Link ističe za 60 minuta.`,
      ``,
      `Ako niste Vi zatražili resetovanje, ovu poruku možete ignorisati.`,
    ].join("\n"),
  };
}

export function verificationEmail(url: string): EmailMessage {
  return {
    to: "",
    subject: `${APP_NAME}: Potvrda email adrese`,
    text: [
      `Dobro došli u ${APP_NAME}.`,
      ``,
      `Molimo potvrdite Vašu email adresu klikom na sledeći link:`,
      ``,
      url,
      ``,
      `Ako niste Vi kreirali nalog, ovu poruku možete ignorisati.`,
    ].join("\n"),
  };
}

export function changeEmailConfirmationEmail(
  url: string,
  newEmail: string,
): EmailMessage {
  return {
    to: "",
    subject: `${APP_NAME}: Potvrda nove email adrese`,
    text: [
      `Poštovani,`,
      ``,
      `Zatražena je promena email adrese Vašeg ${APP_NAME} naloga na:`,
      newEmail,
      ``,
      `Ako ste to Vi, potvrdite klikom na link:`,
      ``,
      url,
      ``,
      `Ako niste Vi zatražili promenu, ignorišite ovu poruku — stara adresa ostaje.`,
    ].join("\n"),
  };
}

export function invitationEmail(orgName: string, url: string): EmailMessage {
  return {
    to: "",
    subject: `${APP_NAME}: Poziv u organizaciju ${orgName}`,
    text: [
      `Pozvani ste da se pridružite organizaciji "${orgName}" na platformi ${APP_NAME}.`,
      ``,
      `Za prihvatanje poziva, otvorite sledeći link:`,
      ``,
      url,
    ].join("\n"),
  };
}

export function agencyPartnerInvitationEmail(
  investorName: string,
  agencyName: string,
  url: string,
): EmailMessage {
  return {
    to: "",
    subject: `${APP_NAME}: ${investorName} Vas poziva kao agencijskog partnera`,
    text: [
      `${investorName} Vas je pozvao da sarađujete na platformi ${APP_NAME} kao agencija "${agencyName}".`,
      ``,
      `Otvorite link, napravite nalog i odmah vidite projekte koje Vam investitor dodeli:`,
      ``,
      url,
    ].join("\n"),
  };
}

export function agencyConnectionInvitationEmail(
  investorName: string,
  url: string,
): EmailMessage {
  return {
    to: "",
    subject: `${APP_NAME}: Novi poziv za saradnju od ${investorName}`,
    text: [
      `${investorName} Vas je pozvao da povežete agenciju na platformi ${APP_NAME}.`,
      ``,
      `Prijavite se i prihvatite poziv na stranici konekcija:`,
      ``,
      url,
    ].join("\n"),
  };
}
