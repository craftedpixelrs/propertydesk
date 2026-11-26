"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  ChevronDown,
  CircleHelp,
  FileSpreadsheet,
  Handshake,
  Info,
  KeyRound,
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

import { APP_NAME, DEMO_APP_URL, LANDING_IMAGES, MY_APP_URL } from "@/lib/constants/app";
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
        href: "/za-upravnike",
        label: "marketing.nav.managers",
        body: "marketing.nav.managersBody",
        icon: KeyRound,
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
 * Sticky marketing bar on frosted paper. Three menus open a floating
 * sheet of real pages, so the landing is not a single row of anchors.
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
        "text-ink sticky top-0 z-40 border-b transition-[background-color,box-shadow,border-color] duration-300",
        scrolled || menu || open
          ? "border-line bg-white/[0.94] shadow-[0_12px_32px_-28px_rgba(10,27,61,0.55)] backdrop-blur-xl"
          : "bg-paper/70 border-transparent backdrop-blur-md",
      )}
    >
      <div className="container-app flex h-[4.25rem] items-center gap-4">
        <Link
          href="/"
          aria-label={t("marketing.header.homeAria", { name: APP_NAME })}
          className="text-ink flex shrink-0 items-center gap-2.5"
        >
          <span className="border-line grid size-9 shrink-0 place-items-center rounded-[10px] border bg-white p-1">
            <Image
              src={LANDING_IMAGES.logo.src}
              alt=""
              width={LANDING_IMAGES.logo.width}
              height={LANDING_IMAGES.logo.height}
              priority
              className="size-full object-contain"
            />
          </span>
          <span className="text-[1.1rem] font-bold tracking-[-0.03em]">{APP_NAME}</span>
        </Link>

        <nav
          className="hidden min-w-0 flex-1 items-center lg:flex lg:pl-4"
          aria-label={t("a11y.primaryNavigation")}
        >
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
                  "relative inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors duration-200",
                  expanded
                    ? "bg-ink/[0.06] text-ink"
                    : current
                      ? "text-ink"
                      : "text-mute hover:text-ink",
                )}
              >
                {t(item.label)}
                <ChevronDown
                  aria-hidden
                  className={cn(
                    "size-3.5 opacity-60 transition-transform duration-300 ease-out",
                    expanded && "rotate-180",
                  )}
                />
                {current ? (
                  <span
                    aria-hidden
                    className="bg-tide absolute inset-x-3 -bottom-[0.95rem] h-0.5 rounded-full"
                  />
                ) : null}
              </button>
            );
          })}
        </nav>

        <div className="ml-auto hidden items-center gap-1.5 lg:flex">
          <LanguageSwitcher compact tone="marketing" />
          <a
            href={`${MY_APP_URL}/sign-in`}
            className="text-mute hover:text-ink hidden h-9 items-center rounded-lg px-2.5 text-sm font-medium transition-colors xl:inline-flex"
          >
            {t("auth.signIn")}
          </a>
          <a href={DEMO_APP_URL} className={marketingCta("outline", "sm")}>
            {t("marketing.header.openDemo")}
            <ArrowUpRight aria-hidden className="text-tide-700 size-3.5" />
          </a>
          <Link href="/demo" className={marketingCta("ink", "sm")}>
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
          className="border-line text-ink hover:bg-paper relative ml-auto inline-flex size-10 items-center justify-center rounded-xl border bg-white transition-colors lg:hidden"
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
                "bg-ink-950/20 fixed inset-0 z-30 backdrop-blur-[2px] transition-opacity duration-300",
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
            "pd-mega-panel absolute inset-x-0 top-full z-40 hidden origin-top transition-[opacity,translate] duration-300 ease-out before:absolute before:inset-x-0 before:-top-4 before:h-6 before:content-[''] lg:block",
            panelOn ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0",
            menu ? "" : "pointer-events-none",
          )}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        >
          <div className="container-app pt-2">
            <div
              key={activeMenu.id}
              className="border-line grid overflow-hidden rounded-2xl border bg-white shadow-[0_40px_80px_-40px_rgba(10,27,61,0.5)] lg:grid-cols-[17rem_1fr]"
            >
              <div className="pd-mega-item bg-ink pd-grid pd-grid-dark relative flex flex-col justify-between gap-10 p-6 text-white">
                <div>
                  <p className="text-tide-300 font-mono text-[11px] font-medium tracking-[0.16em] uppercase">
                    {t(activeMenu.label)}
                  </p>
                  <p className="mt-3 text-lg leading-snug font-semibold tracking-[-0.02em]">
                    {t(activeMenu.intro)}
                  </p>
                </div>
                <a
                  href={DEMO_APP_URL}
                  onClick={() => setMenu(null)}
                  className="text-tide-300 inline-flex items-center gap-1.5 text-sm font-semibold hover:text-white"
                >
                  {t("marketing.header.openDemo")}
                  <ArrowRight aria-hidden className="size-4" />
                </a>
              </div>
              <div className="grid content-start gap-1 p-3 sm:grid-cols-2">
                {activeMenu.links.map((link, index) => {
                  const Icon = link.icon;
                  const current = linkCurrent(link.href, pathname);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      aria-current={current ? "page" : undefined}
                      style={{ ["--pd-delay" as string]: `${60 + index * 40}ms` }}
                      className={cn(
                        "pd-mega-item group hover:bg-paper flex gap-3 rounded-xl p-3 transition-colors duration-200",
                        current && "bg-paper",
                      )}
                      onClick={() => setMenu(null)}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "border-line text-tide-700 group-hover:border-ink group-hover:bg-ink group-hover:text-tide-300 grid size-10 shrink-0 place-items-center rounded-[10px] border bg-white transition-colors duration-200",
                          current && "border-ink bg-ink text-tide-300",
                        )}
                      >
                        <Icon className="size-[1.05rem]" strokeWidth={1.75} />
                      </span>
                      <span className="min-w-0">
                        <span className="text-ink block text-[0.95rem] font-semibold tracking-[-0.01em]">
                          {t(link.label)}
                        </span>
                        <span className="text-mute mt-0.5 block text-[0.83rem] leading-snug">
                          {t(link.body)}
                        </span>
                      </span>
                    </Link>
                  );
                })}
              </div>
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
              "border-line max-h-[calc(100dvh-4.25rem)] overflow-y-auto border-t bg-white transition duration-300 ease-out",
              open ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0",
            )}
          >
            <div className="container-app flex flex-col gap-6 py-5">
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/demo"
                  onClick={closeMenu}
                  tabIndex={open ? 0 : -1}
                  className={marketingCta("ink", "md", "w-full px-3")}
                >
                  {t("marketing.header.bookDemo")}
                </Link>
                <a
                  href={DEMO_APP_URL}
                  onClick={closeMenu}
                  tabIndex={open ? 0 : -1}
                  className={marketingCta("outline", "md", "w-full px-3")}
                >
                  {t("marketing.header.openDemo")}
                  <ArrowUpRight aria-hidden className="text-tide-700 size-3.5" />
                </a>
              </div>

              {MENUS.map((item) => (
                <div key={item.id}>
                  <div className="text-tide-700 flex items-center gap-2.5 font-mono text-[11px] font-medium tracking-[0.16em] uppercase">
                    <span aria-hidden className="bg-tide h-px w-5" />
                    {t(item.label)}
                  </div>
                  <ul className="divide-line border-line mt-3 divide-y overflow-hidden rounded-2xl border">
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
                              "flex items-center gap-3 px-3.5 py-3 transition-colors duration-200",
                              current ? "bg-tide-50" : "active:bg-paper bg-white",
                            )}
                          >
                            <span
                              aria-hidden
                              className={cn(
                                "grid size-9 shrink-0 place-items-center rounded-[10px]",
                                current ? "bg-ink text-tide-300" : "bg-paper text-tide-700",
                              )}
                            >
                              <Icon className="size-4" strokeWidth={1.75} />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="text-ink block text-[0.95rem] font-semibold">
                                {t(link.label)}
                              </span>
                              <span className="text-mute mt-0.5 block text-[0.8rem] leading-snug">
                                {t(link.body)}
                              </span>
                            </span>
                            <ArrowRight aria-hidden className="text-faint size-4 shrink-0" />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}

              <div className="border-line flex items-center justify-between border-t pt-4">
                <LanguageSwitcher compact tone="marketing" />
                <a
                  href={`${MY_APP_URL}/sign-in`}
                  onClick={closeMenu}
                  tabIndex={open ? 0 : -1}
                  className="text-ink inline-flex h-10 items-center gap-1.5 text-sm font-semibold"
                >
                  {t("auth.signIn")}
                  <ArrowRight aria-hidden className="size-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
