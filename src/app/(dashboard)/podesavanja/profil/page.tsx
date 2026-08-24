import { redirect } from "next/navigation";

import { loadUserContext } from "@/server/auth/context";
import { getSession } from "@/server/auth/session";
import { AccountProfileForm } from "@/features/settings/account-profile-form";

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
    <AccountProfileForm
      name={ctx.user.name}
      email={ctx.user.email}
      emailVerified={Boolean(session?.user.emailVerified)}
      impersonating={Boolean(ctx.session.impersonatedBy)}
      emailJustChanged={sp.email === "ok"}
    />
  );
}
