import Image from "next/image";
import Link from "next/link";

import { APP_NAME, LANDING_IMAGES } from "@/lib/constants/app";
import { LANDING_ROUTES } from "@/features/marketing/landing/landing-shell";

// Solutions column: 6 of the 8 topic pages (skip /demo which lives in
// the Contact column, and /prodaja-novogradnje which duplicates the
// homepage message). Order deliberately mixes audience-type pages and
// problem-type pages for balanced anchor-text signal.
const SOLUTION_LINKS = LANDING_ROUTES.filter(
  (r) => r.slug !== "demo" && r.slug !== "prodaja-novogradnje",
).slice(0, 6);

export function MarketingFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface-muted)]">
      <div className="container-app grid gap-8 py-10 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 md:py-12">
        <div className="space-y-3">
          <div className="flex items-center gap-2 font-semibold tracking-tight">
            <Image
              src={LANDING_IMAGES.logo.src}
              alt=""
              width={LANDING_IMAGES.logo.width}
              height={LANDING_IMAGES.logo.height}
              className="h-8 w-8 object-contain"
            />
            <span className="text-base">{APP_NAME}</span>
          </div>
          <p className="max-w-xs text-sm leading-relaxed text-[var(--color-foreground-muted)]">
            Operativni sistem za prodaju novogradnje - projekti, kupci,
            rezervacije, uplate i provizije agencija na jednom mestu.
          </p>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-foreground-subtle)]">
            Proizvod
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <a
                href="#mogucnosti"
                className="text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)]"
              >
                Mogućnosti
              </a>
            </li>
            <li>
              <a
                href="#za-koga"
                className="text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)]"
              >
                Za koga
              </a>
            </li>
            <li>
              <a
                href="#uskoro"
                className="text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)]"
              >
                Uskoro (roadmap)
              </a>
            </li>
            <li>
              <a
                href="#cenovnik"
                className="text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)]"
              >
                Cenovnik
              </a>
            </li>
            <li>
              <a
                href="#faq"
                className="text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)]"
              >
                Česta pitanja
              </a>
            </li>
          </ul>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-foreground-subtle)]">
            Rešenja
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            {SOLUTION_LINKS.map((r) => (
              <li key={r.slug}>
                <Link
                  href={`/${r.slug}`}
                  className="text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)]"
                >
                  {r.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-foreground-subtle)]">
            Kontakt
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <a
                href="mailto:marko.banovic@craftedpixel.rs"
                className="text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)]"
              >
                marko.banovic@craftedpixel.rs
              </a>
            </li>
            <li>
              <a
                href="tel:+381654363142"
                className="text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)]"
              >
                +381 65 43 63 142
              </a>
            </li>
            <li>
              <Link
                href="/demo"
                className="text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)]"
              >
                Zakaži 25-minutni demo
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-foreground-subtle)]">
            Aplikacija
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            <li className="flex items-center gap-2 text-[var(--color-foreground-muted)]">
              <span>Prijava na nalog</span>
              <span className="rounded-full bg-[var(--color-surface-inset)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-foreground-subtle)]">
                Uskoro
              </span>
            </li>
            <li className="text-xs text-[var(--color-foreground-subtle)]">
              Zvanično lansiranje: 01.09.2026.
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-[var(--color-border)]">
        <div className="container-app flex flex-col items-start justify-between gap-3 py-4 text-xs text-[var(--color-foreground-subtle)] sm:flex-row sm:items-center">
          <div>
            © {year} {APP_NAME}. Sva prava zadržana.
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span>Napravljeno za srpsko tržište · sr-Latn · EUR / RSD</span>
            <a
              href="https://getcraftedpixel.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[var(--color-foreground-muted)] transition-colors hover:text-[var(--color-foreground)]"
              aria-label="Powered by CraftedPixel"
            >
              <span>Powered by</span>
              <Image
                src="/images/landing/craftedpixel.svg"
                alt="CraftedPixel"
                width={162}
                height={33}
                className="h-4 w-auto"
              />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
