"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";

import { APP_NAME, LANDING_IMAGES } from "@/lib/constants/app";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/app/language-switcher";
import { useT } from "@/components/app/i18n-provider";
import { cn } from "@/lib/utils";

/**
 * Sticky top bar for the marketing site.
 *
 * Navigation is entirely intra-page (anchor scroll to each `<section id>`),
 * except for two external links: sign-in and the demo CTA. The mobile
 * menu is a lightweight controlled panel - no drawer/portal - because it
 * only needs to reveal 4 anchors and 2 CTAs.
 */
export function MarketingHeader() {
  const t = useT();
  const [open, setOpen] = useState(false);

  const navLinks = [
    { href: "/#mogucnosti", label: t("marketing.nav.features") },
    { href: "/#za-koga", label: t("marketing.nav.personas") },
    { href: "/#uskoro", label: t("marketing.nav.roadmap") },
    { href: "/#cenovnik", label: t("marketing.nav.pricing") },
    { href: "/#faq", label: t("marketing.nav.faq") },
  ] as const;

  // Close on hash-change (anchor click) so the panel doesn't sit open over
  // the newly-scrolled section.
  useEffect(() => {
    if (!open) return;
    function close() {
      setOpen(false);
    }
    window.addEventListener("hashchange", close);
    return () => window.removeEventListener("hashchange", close);
  }, [open]);

  const closeMenu = useCallback(() => setOpen(false), []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-surface)]/90 backdrop-blur",
        "supports-[backdrop-filter]:bg-[var(--color-surface)]/80",
      )}
    >
      <div className="container-app flex h-14 items-center justify-between gap-3 sm:h-16">
        <Link
          href="/"
          aria-label={t("marketing.header.homeAria", { name: APP_NAME })}
          className="flex items-center gap-2 font-semibold tracking-tight text-[var(--color-foreground)]"
        >
          <Image
            src={LANDING_IMAGES.logo.src}
            alt=""
            width={LANDING_IMAGES.logo.width}
            height={LANDING_IMAGES.logo.height}
            priority
            className="h-8 w-8 object-contain sm:h-9 sm:w-9"
          />
          <span className="text-base sm:text-lg">{APP_NAME}</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label={t("a11y.primaryNavigation")}>
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-[var(--color-foreground-muted)] hover:bg-[var(--color-surface-inset)] hover:text-[var(--color-foreground)]"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <LanguageSwitcher compact />
          {/* Sign-in is intentionally disabled until the public launch
           * on 01.09.2026 - we surface a coming-soon affordance instead of
           * silently linking to a route that would just show a login
           * page for accounts that don't exist yet. */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled
            aria-disabled="true"
            title={t("marketing.header.signInSoonTitle")}
            className="cursor-not-allowed gap-2"
          >
            <span>{t("auth.signIn")}</span>
            <span className="rounded-full bg-[var(--color-surface-inset)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-foreground-muted)]">
              {t("common.comingSoon")}
            </span>
          </Button>
          <Button asChild size="sm">
            <Link href="/demo">{t("marketing.header.bookDemo")}</Link>
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? t("a11y.closeMenu") : t("a11y.openMenu")}
          aria-expanded={open}
          aria-controls="mobile-nav"
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-md text-[var(--color-foreground-muted)] transition-colors hover:bg-[var(--color-surface-inset)] md:hidden"
        >
          <span className="relative grid size-5 place-items-center">
            <Menu
              aria-hidden
              className={cn(
                "col-start-1 row-start-1 size-5 transition duration-200 ease-out",
                open ? "rotate-90 scale-75 opacity-0" : "rotate-0 scale-100 opacity-100",
              )}
            />
            <X
              aria-hidden
              className={cn(
                "col-start-1 row-start-1 size-5 transition duration-200 ease-out",
                open ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-75 opacity-0",
              )}
            />
          </span>
        </button>
      </div>

      <div
        id="mobile-nav"
        className={cn(
          "grid overflow-hidden transition-[grid-template-rows] duration-300 ease-out md:hidden",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
        aria-hidden={!open}
      >
        <div className="min-h-0">
          <div
            className={cn(
              "border-t border-[var(--color-border)] bg-[var(--color-surface)] transition duration-300 ease-out",
              open ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0",
            )}
          >
            <div className="container-app flex flex-col gap-1 py-3">
              {navLinks.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  tabIndex={open ? 0 : -1}
                  className="rounded-md px-3 py-3 text-sm font-medium text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-surface-inset)]"
                >
                  {l.label}
                </a>
              ))}
              <div className="mt-2 px-1">
                <LanguageSwitcher compact />
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  disabled
                  aria-disabled="true"
                  tabIndex={open ? 0 : -1}
                  title={t("marketing.header.signInSoonTitle")}
                  className="w-full cursor-not-allowed gap-2"
                >
                  <span>{t("auth.signIn")}</span>
                  <span className="rounded-full bg-[var(--color-surface-inset)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-foreground-muted)]">
                    {t("common.comingSoon")}
                  </span>
                </Button>
                <Button
                  asChild
                  size="md"
                  className="w-full"
                  onClick={closeMenu}
                  tabIndex={open ? 0 : -1}
                >
                  <Link href="/demo">{t("marketing.header.bookDemo")}</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
