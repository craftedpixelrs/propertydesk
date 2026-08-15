import type { Metadata } from "next";
import { AcceptInvitationForm } from "@/features/auth/accept-invitation-form";
import { getPublicInvitation } from "@/server/services/organization-admin.service";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: t("auth.invitationTitle") };

export default async function AcceptInvitationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const invitation = await getPublicInvitation(id);
  const inactive =
    !invitation ||
    invitation.status !== "pending";

  return (
    <div>
      <h1 className="text-xl font-semibold text-[var(--color-foreground)]">
        {t("auth.invitationTitle")}
      </h1>
      <p className="mt-1 text-sm text-[var(--color-foreground-muted)]">
        {inactive
          ? invitation?.status === "expired"
            ? t("auth.invitationExpired")
            : t("auth.invitationUnavailable")
          : t("auth.invitationSubtitle")}
      </p>
      {invitation && invitation.status === "pending" ? (
        <div className="mt-5">
          <AcceptInvitationForm
            invitation={{
              id: invitation.id,
              email: invitation.email,
              organizationName: invitation.organizationName,
              role: invitation.role,
              status: invitation.status,
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
