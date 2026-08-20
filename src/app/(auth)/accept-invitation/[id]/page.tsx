import type { Metadata } from "next";
import { AcceptInvitationForm } from "@/features/auth/accept-invitation-form";
import { getPublicInvitation } from "@/server/services/organization-admin.service";
import { t } from "@/lib/i18n";
import { resolveRequestLocale } from "@/lib/i18n/resolve-locale";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveRequestLocale();
  return { title: t("auth.invitationTitle", undefined, locale) };
}

export default async function AcceptInvitationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const locale = await resolveRequestLocale();
  const { id } = await params;
  const invitation = await getPublicInvitation(id);
  const inactive =
    !invitation ||
    invitation.status !== "pending";

  return (
    <div>
      <h1 className="text-xl font-semibold text-[var(--color-foreground)]">
        {t("auth.invitationTitle", undefined, locale)}
      </h1>
      <p className="mt-1 text-sm text-[var(--color-foreground-muted)]">
        {inactive
          ? invitation?.status === "expired"
            ? t("auth.invitationExpired", undefined, locale)
            : t("auth.invitationUnavailable", undefined, locale)
          : invitation?.requiresAgencyProfile
            ? t("auth.invitationAgencySubtitle", {
                investor: invitation.investorName ?? invitation.organizationName,
              }, locale)
            : t("auth.invitationSubtitle", undefined, locale)}
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
              requiresAgencyProfile: invitation.requiresAgencyProfile,
              investorName: invitation.investorName,
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
