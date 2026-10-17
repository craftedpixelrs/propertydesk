import { redirect } from "next/navigation";

import { loadUserContext } from "@/server/auth/context";
import { getSession } from "@/server/auth/session";
import { AccountProfileForm } from "@/features/settings/account-profile-form";
import { TwoFactorSettings } from "@/features/settings/two-factor-settings";

export const dynamic = "force-dynamic";

export default async function AccountProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const ctx = await loadUserContext();
  if (!ctx) redirect("/sign-in");
  const [sp, session] = await Promise.all([searchParams, getSession()]);

  return (
    <div className="space-y-6">
      <AccountProfileForm
        name={ctx.user.name}
        email={ctx.user.email}
        emailVerified={Boolean(session?.user.emailVerified)}
        impersonating={Boolean(ctx.session.impersonatedBy)}
        emailJustChanged={sp.email === "ok"}
        security={
          <TwoFactorSettings
            enabled={ctx.twoFactorEnabled}
            required={ctx.twoFactorRequired}
            impersonating={Boolean(ctx.session.impersonatedBy)}
          />
        }
      />
    </div>
  );
}
