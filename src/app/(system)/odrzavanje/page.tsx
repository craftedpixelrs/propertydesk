import { APP_NAME } from "@/lib/constants/app";

export const metadata = { title: "Održavanje" };

/**
 * Static maintenance page. When we need to take the app offline for a
 * planned window we can rewrite ALL routes to this page in a reverse
 * proxy (nginx `try_files` / Vercel middleware) without redeploying.
 *
 * Kept purely presentational so it renders even when the DB / auth
 * providers are unavailable.
 */
export default function MaintenancePage() {
  return (
    <main
      role="main"
      className="flex min-h-screen items-center justify-center bg-[var(--color-surface)] p-6"
    >
      <div className="max-w-md text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-brand-700)]">
          Planirano održavanje
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-[var(--color-foreground)]">
          Radovi u toku
        </h1>
        <p className="mt-3 text-sm text-[var(--color-foreground-muted)]">
          Trenutno vršimo neophodno održavanje sistema. Servis će uskoro biti dostupan.
          Zahvaljujemo na strpljenju.
        </p>
        <p className="mt-8 text-xs text-[var(--color-foreground-subtle)]">{APP_NAME}</p>
      </div>
    </main>
  );
}
