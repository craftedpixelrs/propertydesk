"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CircleUser, LogOut } from "lucide-react";

import { LanguageSwitcher } from "@/components/app/language-switcher";
import { ThemeSwitcher } from "@/components/app/theme-switcher";
import { useT } from "@/components/app/i18n-provider";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

export function SignOutButton({ className }: { className?: string }) {
  const t = useT();
  const router = useRouter();

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/sign-in");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={() => void handleSignOut()}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-lg px-2.5 text-sm text-[var(--color-foreground-muted)] transition-colors hover:bg-[var(--color-surface-inset)] hover:text-[var(--color-foreground)]",
        className,
      )}
    >
      <LogOut aria-hidden className="size-4" />
      {t("nav.signOut")}
    </button>
  );
}

/**
 * Language, theme, account, and sign-out live above the page, not in the
 * sidebar, so a long menu never grows a scrollbar just to reach them.
 */
export function SessionToolbar() {
  const t = useT();
  const pathname = usePathname();
  const account =
    pathname === "/podesavanja/profil" || pathname.startsWith("/podesavanja/profil/");

  return (
    <div className="hidden h-14 items-center justify-end gap-1.5 border-b border-[var(--color-border)] bg-[color-mix(in_oklab,var(--color-surface)_92%,transparent)] px-4 backdrop-blur-md md:flex lg:px-8">
      <LanguageSwitcher compact />
      <ThemeSwitcher compact />
      <Link
        href="/podesavanja/profil"
        aria-current={account ? "page" : undefined}
        className={cn(
          "inline-flex h-9 items-center gap-2 rounded-lg px-2.5 text-sm transition-colors",
          account
            ? "bg-[var(--color-brand-50)] text-[var(--color-brand-800)]"
            : "text-[var(--color-foreground-muted)] hover:bg-[var(--color-surface-inset)] hover:text-[var(--color-foreground)]",
        )}
      >
        <CircleUser aria-hidden className="size-4" />
        {t("nav.account")}
      </Link>
      <SignOutButton />
    </div>
  );
}
