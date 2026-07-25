import type { Metadata } from "next";
import { AcceptInvitationForm } from "@/features/auth/accept-invitation-form";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: t("auth.invitationTitle") };

export default async function AcceptInvitationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div>
      <h1 className="text-xl font-semibold text-[var(--color-foreground)]">
        {t("auth.invitationTitle")}
      </h1>
      <p className="text-sm text-[var(--color-foreground-muted)] mt-1">
        {t("auth.invitationSubtitle")}
      </p>
      <div className="mt-5">
        <AcceptInvitationForm invitationId={id} />
      </div>
    </div>
  );
}
