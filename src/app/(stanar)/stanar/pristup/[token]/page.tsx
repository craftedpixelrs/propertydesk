import { redirect } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import { acceptResidentInvite } from "@/server/services/manager/residents.service";
import { setResidentSessionCookie } from "@/server/auth/resident-session";
import { isDomainError } from "@/lib/errors";

interface Props {
  params: Promise<{ token: string }>;
}

/**
 * Magic-link landing page. Validates the invite token, flips the
 * `ResidentAccess` row to `ACTIVE`, sets the signed cookie, then
 * redirects into the resident dashboard. On any failure we render a
 * neutral "link is invalid or expired" page so a stale invite leaks
 * nothing about which units/accesses exist.
 */
export default async function ResidentInviteAcceptPage({ params }: Props) {
  const { token } = await params;
  try {
    const { accessId } = await acceptResidentInvite(token);
    await setResidentSessionCookie(accessId);
  } catch (err) {
    if (isDomainError(err)) {
      return (
        <Card>
          <CardContent className="space-y-2 py-10 text-center">
            <h1 className="text-xl font-semibold">Pozivnica nije važeća</h1>
            <p className="text-sm text-[var(--color-foreground-muted)]">
              Link je ili istekao, ili je već iskorišćen. Kontaktirajte upravnika zgrade da vam
              pošalje novu pozivnicu.
            </p>
          </CardContent>
        </Card>
      );
    }
    throw err;
  }
  redirect("/stanar");
}
