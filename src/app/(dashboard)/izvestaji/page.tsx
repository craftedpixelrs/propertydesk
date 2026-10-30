import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Building2,
  Handshake,
  Users,
  BadgeCheck,
  Wallet,
  Store,
  Wrench,
  FileBarChart,
  AlertCircle,
} from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadUserContext } from "@/server/auth/context";
import { createT, type TranslationKey } from "@/lib/i18n";

const REPORTS: Array<{
  href: string;
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
  Icon: typeof Building2;
}> = [
  {
    href: "/izvestaji/zalihe",
    titleKey: "ops.reports.inventoryTitle",
    descriptionKey: "ops.reports.inventoryCardDesc",
    Icon: Building2,
  },
  {
    href: "/izvestaji/prodaje",
    titleKey: "ops.reports.salesTitle",
    descriptionKey: "ops.reports.salesCardDesc",
    Icon: Handshake,
  },
  {
    href: "/izvestaji/kupci",
    titleKey: "ops.reports.buyersTitle",
    descriptionKey: "ops.reports.buyersCardDesc",
    Icon: Users,
  },
  {
    href: "/izvestaji/rezervacije",
    titleKey: "ops.reports.reservationsTitle",
    descriptionKey: "ops.reports.reservationsCardDesc",
    Icon: BadgeCheck,
  },
  {
    href: "/izvestaji/uplate",
    titleKey: "ops.reports.paymentsTitle",
    descriptionKey: "ops.reports.paymentsCardDesc",
    Icon: Wallet,
  },
  {
    href: "/izvestaji/agencije",
    titleKey: "ops.reports.agenciesTitle",
    descriptionKey: "ops.reports.agenciesCardDesc",
    Icon: Store,
  },
];

const MANAGER_REPORTS: Array<{
  href: string;
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
  Icon: typeof Building2;
}> = [
  {
    href: "/izvestaji/upravljanje/finansije",
    titleKey: "manager.reports.financialTitle",
    descriptionKey: "manager.reports.financialDesc",
    Icon: Wallet,
  },
  {
    href: "/izvestaji/upravljanje/duznici",
    titleKey: "manager.reports.debtorsTitle",
    descriptionKey: "manager.reports.debtorsDesc",
    Icon: AlertCircle,
  },
  {
    href: "/izvestaji/upravljanje/troskovi",
    titleKey: "manager.reports.expensesTitle",
    descriptionKey: "manager.reports.expensesDesc",
    Icon: Wrench,
  },
  {
    href: "/izvestaji/upravljanje/odrzavanje",
    titleKey: "manager.reports.maintenanceTitle",
    descriptionKey: "manager.reports.maintenanceDesc",
    Icon: Wrench,
  },
  {
    href: "/izvestaji/upravljanje/godisnji",
    titleKey: "manager.reports.annualTitle",
    descriptionKey: "manager.reports.annualDesc",
    Icon: FileBarChart,
  },
];

export default async function ReportsIndexPage() {
  const ctx = await loadUserContext();
  if (!ctx) redirect("/sign-in");
  if (!ctx.activeOrganization) redirect("/dashboard");
  if (!ctx.isSuperAdmin && !ctx.permissions.includes("report.read")) {
    redirect("/dashboard");
  }
  const t = createT(ctx.user.locale);
  const orgType = ctx.activeOrganization.type;
  const isInvestor = orgType === "INVESTOR";
  const isManager = orgType === "MANAGER";
  const items = isManager
    ? MANAGER_REPORTS
    : isInvestor
      ? REPORTS
      : REPORTS.filter(
          (r) =>
            !r.href.endsWith("/prodaje") &&
            !r.href.endsWith("/agencije") &&
            !r.href.endsWith("/uplate"),
        );

  return (
    <div className="space-y-6">
      <PageHeader title={t("nav.reports")} description={t("ops.reports.subtitle")} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((r) => (
          <Link key={r.href} href={r.href}>
            <Card className="h-full transition hover:border-[var(--color-brand-300)]">
              <CardHeader className="flex flex-row items-center gap-3">
                <r.Icon className="size-5 text-[var(--color-brand-700)]" />
                <CardTitle className="text-base">{t(r.titleKey)}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-[var(--color-foreground-muted)]">
                {t(r.descriptionKey)}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
