import "server-only";
import { headers } from "next/headers";

import { auth } from "@/server/auth/auth";
import { recordAudit } from "@/server/audit/audit";
import { DomainErrors } from "@/lib/errors";
import { prisma } from "@/server/db/prisma";
import type { AppSession } from "@/server/auth/session";
import { normalizeDisplayName } from "@/server/services/account-name";

export { normalizeDisplayName };

export function assertNotImpersonating(session: AppSession): void {
  const impersonatedBy = (session.session as { impersonatedBy?: string | null })
    .impersonatedBy;
  if (impersonatedBy) {
    throw DomainErrors.forbidden(
      "Ne možete menjati nalog dok ste u impersonaciji.",
    );
  }
}

export async function updateOwnName(input: {
  session: AppSession;
  name: string;
}) {
  assertNotImpersonating(input.session);
  const name = normalizeDisplayName(input.name);
  if (name.length < 2 || name.length > 80) {
    throw DomainErrors.validation("Ime nije ispravno.", {
      name: ["Ime mora imati između 2 i 80 karaktera."],
    });
  }

  const previous = input.session.user.name;
  if (previous === name) return { name };

  await prisma.user.update({
    where: { id: input.session.user.id },
    data: { name },
  });
  await recordAudit({
    action: "auth.profile_updated",
    entityType: "User",
    entityId: input.session.user.id,
    actorUserId: input.session.user.id,
    previousValues: { name: previous },
    newValues: { name },
  });
  return { name };
}

function betterAuthMessage(err: unknown): string {
  if (err && typeof err === "object" && "body" in err) {
    const body = (err as { body?: { message?: string; code?: string } }).body;
    if (body?.code) return body.code;
    if (body?.message) return body.message;
  }
  if (err instanceof Error) return err.message;
  return "";
}

export async function changeOwnPassword(input: {
  session: AppSession;
  currentPassword: string;
  newPassword: string;
}) {
  assertNotImpersonating(input.session);
  if (input.newPassword.length < 10) {
    throw DomainErrors.validation("Nova lozinka je prekratka.", {
      newPassword: ["Lozinka mora imati najmanje 10 znakova."],
    });
  }
  if (input.newPassword.length > 128) {
    throw DomainErrors.validation("Nova lozinka je predugačka.", {
      newPassword: ["Lozinka je predugačka."],
    });
  }
  if (input.currentPassword === input.newPassword) {
    throw DomainErrors.validation("Nova lozinka mora biti drugačija.", {
      newPassword: ["Nova lozinka mora biti drugačija od trenutne."],
    });
  }

  try {
    await auth.api.changePassword({
      body: {
        currentPassword: input.currentPassword,
        newPassword: input.newPassword,
        revokeOtherSessions: true,
      },
      headers: await headers(),
    });
  } catch (err) {
    const msg = betterAuthMessage(err).toUpperCase();
    if (msg.includes("INVALID_PASSWORD") || msg.includes("INVALID")) {
      throw DomainErrors.validation("Trenutna lozinka nije tačna.", {
        currentPassword: ["Trenutna lozinka nije tačna."],
      });
    }
    throw DomainErrors.badRequest("Lozinka nije promenjena. Pokušajte ponovo.");
  }

  await recordAudit({
    action: "auth.password_changed",
    entityType: "User",
    entityId: input.session.user.id,
    actorUserId: input.session.user.id,
  });
}

export async function requestOwnEmailChange(input: {
  session: AppSession;
  newEmail: string;
}) {
  assertNotImpersonating(input.session);
  const newEmail = input.newEmail.trim().toLowerCase();
  if (newEmail === input.session.user.email.toLowerCase()) {
    throw DomainErrors.validation("To je već Vaša trenutna adresa.", {
      email: ["To je već Vaša trenutna adresa."],
    });
  }

  try {
    await auth.api.changeEmail({
      body: {
        newEmail,
        callbackURL: "/podesavanja/profil?email=ok",
      },
      headers: await headers(),
    });
  } catch (err) {
    const msg = betterAuthMessage(err);
    if (msg.toUpperCase().includes("CHANGE_EMAIL_DISABLED")) {
      throw DomainErrors.badRequest("Promena emaila nije dostupna.");
    }
    throw DomainErrors.badRequest(
      "Zahtev za promenu emaila nije poslat. Pokušajte ponovo.",
    );
  }

  await recordAudit({
    action: "auth.email_change_requested",
    entityType: "User",
    entityId: input.session.user.id,
    actorUserId: input.session.user.id,
    newValues: { requestedEmail: newEmail },
  });
  return { requestedEmail: newEmail };
}
