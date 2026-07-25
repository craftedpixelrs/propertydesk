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

export const dynamic = "force-dynamic";

interface SectionLink {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

const SECTIONS: SectionLink[] = [
  {
    href: "/administracija/naplata/podesavanja",
    title: "Globalna podešavanja",
    description: "Master prekidač, valuta, invoice format, pragovi kašnjenja.",
    icon: Settings2,
  },
  {
    href: "/administracija/naplata/profil-firme",
    title: "Profil izdavaoca",
    description: "Naziv, PIB, matični broj, adresa — pojavljuje se na svakoj fakturi.",
    icon: Building,
  },
  {
    href: "/administracija/naplata/racuni",
    title: "Poslovni računi",
    description: "IBAN i model plaćanja za instant plaćanje i IPS QR.",
    icon: Landmark,
  },
  {
    href: "/administracija/naplata/kursna-lista",
    title: "Kursna lista",
    description: "Srednji kurs EUR/RSD za fakture u dinarskoj protivvrednosti.",
    icon: Coins,
  },
  {
    href: "/administracija/naplata/planovi",
    title: "Planovi i cenovnik",
    description: "SaaS planovi sa cikličnim cenama i onboarding naknadom.",
    icon: Layers,
  },
  {
    href: "/administracija/naplata/automatizacija",
    title: "Automatizacija",
    description: "Kontrolni centar za 7 poslova — ručno pokretanje i status.",
    icon: ServerCog,
  },
  {
    href: "/administracija/naplata/fakture",
    title: "Fakture",
    description: "Sve fakture platforme sa filterima i akcijama.",
    icon: Receipt,
  },
  {
    href: "/administracija/naplata/uplate",
    title: "Uplate",
    description: "Ručne uplate, storniranje, alokacija na fakture.",
    icon: Wallet,
  },
  {
    href: "/administracija/naplata/izvodi",
    title: "Bankovni izvodi",
    description: "Uvoz CSV/XLSX izvoda i pregled queue-a za sparivanje.",
    icon: FileSpreadsheet,
  },
  {
    href: "/administracija/naplata/sef",
    title: "SEF integracija",
    description: "Postavke i istorija slanja elektronskih faktura.",
    icon: FileCheck,
  },
  {
    href: "/administracija/naplata/sabloni",
    title: "Email šabloni",
    description: "14 lifecycle šablona sa live pregledom i test slanjem.",
    icon: Mail,
  },
  {
    href: "/administracija/naplata/podsjetnici",
    title: "Pravila podsjetnika",
    description: "Raspored automatskih podsetnika (T-7, T-1, T+1, T+7, T+14).",
    icon: ListChecks,
  },
  {
    href: "/administracija/revizija?resource=billing",
    title: "Revizijski trag",
    description: "Filtriran prikaz revizije po billing akcijama.",
    icon: History,
  },
];

export default async function BillingAdminHomePage() {
  await requireSuperAdmin();

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
        <h2 className="text-lg font-semibold">Naplata i pretplate</h2>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          Automatizovano izdavanje faktura, upravljanje pretplatama, integracija sa SEF-om i
          instant IPS QR plaćanjima.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-[var(--color-foreground-muted)]">Master prekidač</div>
            <div className="mt-1 text-lg font-semibold">
              {settings.billingEnabled ? "Aktivna" : "Isključena"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-[var(--color-foreground-muted)]">Ukupno faktura</div>
            <div className="mt-1 text-lg font-semibold">
              {invoiceCount} <span className="text-xs font-normal text-[var(--color-foreground-muted)]">({openInvoices} otvorenih)</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-[var(--color-foreground-muted)]">Bankovni queue</div>
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
                <div className="font-semibold">{s.title}</div>
                <p className="mt-1 text-sm text-[var(--color-foreground-muted)]">
                  {s.description}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
