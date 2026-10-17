"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  ChevronDown,
  CircleHelp,
  FileSpreadsheet,
  Handshake,
  Info,
  Library,
  LifeBuoy,
  Menu,
  QrCode,
  Tags,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";

import { APP_NAME, LANDING_IMAGES } from "@/lib/constants/app";
import { LanguageSwitcher } from "@/components/app/language-switcher";
import { marketingCta } from "@/features/marketing/marketing-cta";
import { useT } from "@/components/app/i18n-provider";
import type { TranslationKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type MenuId = "product" | "who" | "resources";

type MenuLink = {
  href: string;
  label: TranslationKey;
  body: TranslationKey;
  icon: LucideIcon;
};

const MENUS: Array<{
  id: MenuId;
  label: TranslationKey;
  intro: TranslationKey;
  links: MenuLink[];
}> = [
  {
    id: "product",
    label: "marketing.nav.product",
    intro: "marketing.nav.productIntro",
    links: [
      {
        href: "/#mogucnosti",
        label: "marketing.nav.features",
        body: "marketing.nav.featuresBody",
        icon: Building2,
      },
      {
        href: "/prodaja-novogradnje",
        label: "marketing.nav.newBuild",
        body: "marketing.nav.newBuildBody",
        icon: Library,
      },
      {
        href: "/rezervacije-i-uplate",
        label: "marketing.nav.reservations",
        body: "marketing.nav.reservationsBody",
        icon: QrCode,
      },
      {
        href: "/crm-za-investitore",
        label: "marketing.nav.crm",
        body: "marketing.nav.crmBody",
        icon: Users,
      },
      {
        href: "/alternative-excelu",
        label: "marketing.nav.excel",
        body: "marketing.nav.excelBody",
        icon: FileSpreadsheet,
      },
    ],
  },
  {
    id: "who",
    label: "marketing.nav.personas",
    intro: "marketing.nav.personasIntro",
    links: [
      {
        href: "/za-investitore",
        label: "marketing.nav.investors",
        body: "marketing.nav.investorsBody",
        icon: Building2,
      },
      {
        href: "/za-agencije",
        label: "marketing.nav.agencies",
        body: "marketing.nav.agenciesBody",
        icon: Handshake,
      },
      {
        href: "/provizije-agencija",
        label: "marketing.nav.commissions",
        body: "marketing.nav.commissionsBody",
        icon: Wallet,
      },
    ],
  },
  {
    id: "resources",
    label: "marketing.nav.resources",
    intro: "marketing.nav.resourcesIntro",
    links: [
      {
        href: "/blog",
        label: "marketing.nav.blog",
        body: "marketing.nav.blogBody",
        icon: Library,
      },
      {
        href: "/pomoc",
        label: "marketing.nav.help",
        body: "marketing.nav.helpBody",
        icon: LifeBuoy,
      },
      {
        href: "/#cenovnik",
        label: "marketing.nav.pricing",
        body: "marketing.nav.pricingBody",
        icon: Tags,
      },
      {
        href: "/#faq",
        label: "marketing.nav.faqLong",
        body: "marketing.nav.faqBody",
        icon: CircleHelp,
      },
      {
        href: "/o-nama",
        label: "marketing.nav.about",
        body: "marketing.nav.aboutBody",
        icon: Info,
      },
    ],
  },
];

function linkCurrent(href: string, pathname: string) {
  if (href.startsWith("/#")) return false;
  if (href === "/blog") return pathname === "/blog" || pathname.startsWith("/blog/");
  return pathname === href;
}

/**
 * Sticky marketing bar. Three menus open a cream panel of real pages,
 * so the landing is not a single row of anchors.
 */
export function MarketingHeader() {
  const t = useT();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState<MenuId | null>(null);
  const [panel, setPanel] = useState<MenuId | null>(null);
  const [panelOn, setPanelOn] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const closeTimer = useRef<number | null>(null);
  const hideTimer = useRef<number | null>(null);
  const panelRef = useRef<MenuId | null>(null);

  const activeMenu = MENUS.find((item) => item.id === panel) ?? null;

  const cancelClose = useCallback(() => {
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
  }, []);

  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimer.current = window.setTimeout(() => setMenu(null), 140);
  }, [cancelClose]);

  const openMenu = useCallback(
    (id: MenuId) => {
      cancelClose();
      setMenu(id);
    },
    [cancelClose],
  );

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
    setMenu(null);
  }, [pathname]);

  useEffect(() => {
    if (hideTimer.current !== null) window.clearTimeout(hideTimer.current);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (menu) {
      const opening = panelRef.current === null;
      panelRef.current = menu;
      setPanel(menu);
      if (reduce || !opening) {
        setPanelOn(true);
        return;
      }
      setPanelOn(false);
      let second = 0;
      const first = window.requestAnimationFrame(() => {
        second = window.requestAnimationFrame(() => setPanelOn(true));
      });
      return () => {
        window.cancelAnimationFrame(first);
        window.cancelAnimationFrame(second);
      };
    }

    panelRef.current = null;
    setPanelOn(false);
    if (reduce) {
      setPanel(null);
      return;
    }
    hideTimer.current = window.setTimeout(() => setPanel(null), 280);
    return () => {
      if (hideTimer.current !== null) window.clearTimeout(hideTimer.current);
    };
  }, [menu]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenu(null);
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(
    () => () => {
      cancelClose();
      if (hideTimer.current !== null) window.clearTimeout(hideTimer.current);
    },
    [cancelClose],
  );

  const closeMenu = useCallback(() => setOpen(false), []);

  return (
    <header
      className={cn(
        "relative sticky top-0 z-40 border-b text-[#f7f3ea] transition-[background-color,box-shadow,border-color] duration-300",
        scrolled || menu
          ? "border-[#d6b26a]/35 bg-[#0b1020]/95 shadow-[0_16px_40px_-28px_rgba(0,0,0,0.7)] backdrop-blur-xl"
          : "border-white/10 bg-[#0b1020]",
      )}
    >
      <div className="container-app flex h-[4.25rem] items-center gap-3">
        <Link
          href="/"
          aria-label={t("marketing.header.homeAria", { name: APP_NAME })}
          className="flex shrink-0 items-center gap-2.5 text-[#f7f3ea]"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#f7f3ea] p-0.5 ring-1 ring-[#d6b26a]/50">
            <Image
              src={LANDING_IMAGES.logo.src}
              alt=""
              width={LANDING_IMAGES.logo.width}
              height={LANDING_IMAGES.logo.height}
              priority
              className="size-full rounded-[10px] object-cover"
            />
          </span>
          <span className="font-display text-[1.15rem] font-semibold tracking-tight">
            {APP_NAME}
          </span>
        </Link>

        <nav
          className="hidden min-w-0 flex-1 items-center justify-center lg:flex"
          aria-label={t("a11y.primaryNavigation")}
        >
          <div className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] p-1">
            {MENUS.map((item) => {
              const current = item.links.some((link) => linkCurrent(link.href, pathname));
              const expanded = menu === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={`mega-${item.id}`}
                  onMouseEnter={() => openMenu(item.id)}
                  onMouseLeave={scheduleClose}
                  onFocus={() => openMenu(item.id)}
                  onClick={() => setMenu((value) => (value === item.id ? null : item.id))}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition-[color,background-color,box-shadow] duration-300",
                    expanded
                      ? "bg-[#f7f3ea] text-[#0b1020] shadow-[0_8px_18px_-14px_rgba(0,0,0,0.7)]"
                      : current
                        ? "text-[#f3e2bc]"
                        : "text-[#f7f3ea]/70 hover:bg-white/[0.07] hover:text-[#f7f3ea]",
                  )}
                >
                  {t(item.label)}
                  <ChevronDown
                    aria-hidden
                    className={cn(
                      "size-3.5 transition-transform duration-300 ease-out",
                      expanded && "rotate-180",
                    )}
                  />
                </button>
              );
            })}
          </div>
        </nav>

        <div className="ml-auto hidden items-center gap-2 lg:flex">
          <div className="flex items-center rounded-full border border-white/10 bg-white/[0.05] py-0.5 pr-1 pl-1">
            <LanguageSwitcher compact tone="marketing" />
          </div>
          <button
            type="button"
            disabled
            aria-disabled="true"
            title={t("marketing.header.signInSoonTitle")}
            className="hidden items-center gap-2 rounded-full px-2 py-2 text-sm text-[#f7f3ea]/55 xl:inline-flex"
          >
            <span>{t("auth.signIn")}</span>
            <span className="text-[10px] font-semibold tracking-[0.14em] text-[#d6b26a] uppercase">
              {t("common.comingSoon")}
            </span>
          </button>
          <Link href="/demo" className={marketingCta("cream", "sm")}>
            {t("marketing.header.bookDemo")}
          </Link>
        </div>

        <button
          type="button"
          onClick={() => {
            setMenu(null);
            setOpen((value) => !value);
          }}
          aria-label={open ? t("a11y.closeMenu") : t("a11y.openMenu")}
          aria-expanded={open}
          aria-controls="mobile-nav"
          className="relative ml-auto inline-flex size-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-[#f7f3ea] transition-colors hover:bg-white/10 lg:hidden"
        >
          <span className="relative grid size-5 place-items-center">
            <Menu
              aria-hidden
              className={cn(
                "col-start-1 row-start-1 size-5 transition duration-200 ease-out",
                open ? "scale-75 rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100",
              )}
            />
            <X
              aria-hidden
              className={cn(
                "col-start-1 row-start-1 size-5 transition duration-200 ease-out",
                open ? "scale-100 rotate-0 opacity-100" : "scale-75 -rotate-90 opacity-0",
              )}
            />
          </span>
        </button>
      </div>

      {panel
        ? createPortal(
            <div
              aria-hidden
              className={cn(
                "fixed inset-0 z-30 bg-[#0b1020]/25 transition-opacity duration-300",
                panelOn ? "opacity-100" : "pointer-events-none opacity-0",
              )}
              onMouseEnter={() => {
                cancelClose();
                setMenu(null);
              }}
              onClick={() => setMenu(null)}
            />,
            document.body,
          )
        : null}
      {activeMenu ? (
        <div
          id={`mega-${activeMenu.id}`}
          className={cn(
            "pd-mega-panel absolute inset-x-0 top-full z-40 hidden origin-top border-t border-[#d6b26a]/35 bg-[#f7f3ea] text-[#0b1020] shadow-[0_24px_48px_-28px_rgba(11,16,32,0.45)] transition-[opacity,translate] duration-300 ease-out before:absolute before:inset-x-0 before:-top-4 before:h-4 before:content-[''] lg:block",
            panelOn ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0",
            menu ? "" : "pointer-events-none",
          )}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        >
          <div
            key={activeMenu.id}
            className="container-app grid gap-6 py-6 lg:grid-cols-[15rem_1fr] lg:gap-10"
          >
            <div className="pd-mega-item hidden pr-8 lg:block">
              <p className="font-display text-[1.65rem] leading-tight tracking-tight">
                {t(activeMenu.label)}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-[#3d4558]">{t(activeMenu.intro)}</p>
            </div>
            <div className="grid content-start gap-1 sm:grid-cols-2">
              {activeMenu.links.map((link, index) => {
                const Icon = link.icon;
                const current = linkCurrent(link.href, pathname);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={current ? "page" : undefined}
                    style={{ ["--pd-delay" as string]: `${70 + index * 45}ms` }}
                    className={cn(
                      "pd-mega-item group flex gap-3 rounded-2xl p-3 transition duration-300 ease-out hover:-translate-y-px hover:bg-white hover:shadow-[0_12px_28px_-20px_rgba(11,16,32,0.55)]",
                      current && "bg-white shadow-[0_12px_28px_-20px_rgba(11,16,32,0.4)]",
                    )}
                    onClick={() => setMenu(null)}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "grid size-10 shrink-0 place-items-center rounded-2xl bg-white text-[#9a7430] ring-1 ring-[#0b1020]/10 transition duration-300 group-hover:bg-[#0b1020] group-hover:text-[#f3e2bc] group-hover:ring-[#0b1020]",
                        current && "bg-[#0b1020] text-[#f3e2bc] ring-[#0b1020]",
                      )}
                    >
                      <Icon className="size-4" strokeWidth={1.75} />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-semibold tracking-tight">{t(link.label)}</span>
                      <span className="mt-0.5 block text-sm leading-snug text-[#3d4558]">
                        {t(link.body)}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      <div
        id="mobile-nav"
        className={cn(
          "grid overflow-hidden transition-[grid-template-rows] duration-300 ease-out lg:hidden",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
        aria-hidden={!open}
      >
        <div className="min-h-0">
          <div
            className={cn(
              "max-h-[calc(100dvh-4.25rem)] overflow-y-auto border-t border-white/10 bg-[#0b1020] transition duration-300 ease-out",
              open ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0",
            )}
          >
            <div className="container-app flex flex-col gap-5 py-4">
              {MENUS.map((item) => (
                <div key={item.id}>
                  <div className="px-3">
                    <div className="text-[11px] font-semibold tracking-[0.16em] text-[#d6b26a] uppercase">
                      {t(item.label)}
                    </div>
                    <p className="mt-1 text-sm leading-snug text-white/55">{t(item.intro)}</p>
                  </div>
                  <ul className="mt-1">
                    {item.links.map((link) => {
                      const Icon = link.icon;
                      const current = linkCurrent(link.href, pathname);
                      return (
                        <li key={link.href}>
                          <Link
                            href={link.href}
                            onClick={closeMenu}
                            tabIndex={open ? 0 : -1}
                            aria-current={current ? "page" : undefined}
                            className={cn(
                              "flex items-start gap-3 rounded-2xl px-3 py-2.5 transition duration-200",
                              current ? "bg-white/[0.06]" : "hover:bg-white/[0.06]",
                            )}
                          >
                            <span
                              aria-hidden
                              className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl bg-white/[0.06] text-[#f3e2bc]"
                            >
                              <Icon className="size-3.5" strokeWidth={1.75} />
                            </span>
                            <span className="min-w-0">
                              <span
                                className={cn(
                                  "block text-base font-medium",
                                  current ? "text-[#f3e2bc]" : "text-[#f7f3ea]",
                                )}
                              >
                                {t(link.label)}
                              </span>
                              <span className="mt-0.5 block text-sm leading-snug text-white/55">
                                {t(link.body)}
                              </span>
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
              <div className="border-t border-white/10 px-1 pt-4">
                <LanguageSwitcher compact tone="marketing" />
              </div>
              <div className="flex flex-col gap-2">
                <Link
                  href="/demo"
                  onClick={closeMenu}
                  tabIndex={open ? 0 : -1}
                  className={marketingCta("cream", "md", "w-full")}
                >
                  {t("marketing.header.bookDemo")}
                </Link>
                <button
                  type="button"
                  disabled
                  aria-disabled="true"
                  tabIndex={open ? 0 : -1}
                  title={t("marketing.header.signInSoonTitle")}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 text-sm text-[#f7f3ea]/60"
                >
                  <span>{t("auth.signIn")}</span>
                  <span className="text-[10px] font-semibold tracking-[0.14em] text-[#d6b26a] uppercase">
                    {t("common.comingSoon")}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
