import Link from "next/link";
import {
  Settings2,
  Building,
  Landmark,
  ListChecks,
  Receipt,
  Wallet,
  FileSpreadsheet,
  FileCheck,
  Mail,
  History,
  Layers,
  ServerCog,
  Coins,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { requireSuperAdmin } from "@/server/permissions/require";
import { prisma } from "@/server/db/prisma";
import { getOrCreateGlobalBillingSettings } from "@/server/services/billing/settings/global.service";
import { createT, type TranslationKey } from "@/lib/i18n";
import { resolveRequestLocale } from "@/lib/i18n/resolve-locale";

export const dynamic = "force-dynamic";

interface SectionLink {
  href: string;
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
  icon: LucideIcon;
}

const SECTIONS: SectionLink[] = [
  {
    href: "/administracija/naplata/podesavanja",
    titleKey: "admin.billingHome.settings",
    descriptionKey: "admin.billingHome.settingsDesc",
    icon: Settings2,
  },
  {
    href: "/administracija/naplata/profil-firme",
    titleKey: "admin.billingHome.profile",
    descriptionKey: "admin.billingHome.profileDesc",
    icon: Building,
  },
  {
    href: "/administracija/naplata/racuni",
    titleKey: "admin.billingHome.accounts",
    descriptionKey: "admin.billingHome.accountsDesc",
    icon: Landmark,
  },
  {
    href: "/administracija/naplata/kursna-lista",
    titleKey: "admin.billingHome.rates",
    descriptionKey: "admin.billingHome.ratesDesc",
    icon: Coins,
  },
  {
    href: "/administracija/naplata/planovi",
    titleKey: "admin.billingHome.plans",
    descriptionKey: "admin.billingHome.plansDesc",
    icon: Layers,
  },
  {
    href: "/administracija/naplata/automatizacija",
    titleKey: "admin.billingHome.automation",
    descriptionKey: "admin.billingHome.automationDesc",
    icon: ServerCog,
  },
  {
    href: "/administracija/naplata/fakture",
    titleKey: "admin.billingHome.invoices",
    descriptionKey: "admin.billingHome.invoicesDesc",
    icon: Receipt,
  },
  {
    href: "/administracija/naplata/uplate",
    titleKey: "admin.billingHome.payments",
    descriptionKey: "admin.billingHome.paymentsDesc",
    icon: Wallet,
  },
  {
    href: "/administracija/naplata/izvodi",
    titleKey: "admin.billingHome.statements",
    descriptionKey: "admin.billingHome.statementsDesc",
    icon: FileSpreadsheet,
  },
  {
    href: "/administracija/naplata/sef",
    titleKey: "admin.billingHome.sef",
    descriptionKey: "admin.billingHome.sefDesc",
    icon: FileCheck,
  },
  {
    href: "/administracija/naplata/sabloni",
    titleKey: "admin.billingHome.templates",
    descriptionKey: "admin.billingHome.templatesDesc",
    icon: Mail,
  },
  {
    href: "/administracija/naplata/podsjetnici",
    titleKey: "admin.billingHome.reminders",
    descriptionKey: "admin.billingHome.remindersDesc",
    icon: ListChecks,
  },
  {
    href: "/administracija/revizija?resource=billing",
    titleKey: "admin.billingHome.audit",
    descriptionKey: "admin.billingHome.auditDesc",
    icon: History,
  },
];

export default async function BillingAdminHomePage() {
  await requireSuperAdmin();
  const t = createT(await resolveRequestLocale());

  const [settings, invoiceCount, openInvoices, reviewQueue] = await Promise.all([
    getOrCreateGlobalBillingSettings(),
    prisma.invoice.count(),
    prisma.invoice.count({
      where: { status: { in: ["ISSUED", "SENT", "PARTIALLY_PAID", "OVERDUE"] } },
    }),
    prisma.bankStatementTransaction.count({
      where: { matchStatus: { in: ["UNMATCHED", "REVIEW_REQUIRED"] } },
    }),
  ]);

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-lg font-semibold">{t("admin.billingHome.title")}</h2>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          {t("admin.billingHome.subtitle")}
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-[var(--color-foreground-muted)]">
              {t("admin.billingHome.masterSwitch")}
            </div>
            <div className="mt-1 text-lg font-semibold">
              {settings.billingEnabled
                ? t("admin.billingHome.active")
                : t("admin.billingHome.off")}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-[var(--color-foreground-muted)]">
              {t("admin.billingHome.totalInvoices")}
            </div>
            <div className="mt-1 text-lg font-semibold">
              {invoiceCount}{" "}
              <span className="text-xs font-normal text-[var(--color-foreground-muted)]">
                {t("admin.openCount", { count: openInvoices })}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-[var(--color-foreground-muted)]">
              {t("admin.billingHome.bankQueue")}
            </div>
            <div className="mt-1 text-lg font-semibold">{reviewQueue}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {SECTIONS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition hover:border-[var(--color-brand-500)]"
          >
            <div className="flex items-start gap-3">
              <s.icon className="mt-0.5 size-5 shrink-0 text-[var(--color-brand-700)]" />
              <div className="min-w-0">
                <div className="font-semibold">{t(s.titleKey)}</div>
                <p className="mt-1 text-sm text-[var(--color-foreground-muted)]">
                  {t(s.descriptionKey)}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
