import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Building2,
  Handshake,
  Users,
  BadgeCheck,
  Wallet,
  Store,
} from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadUserContext } from "@/server/auth/context";

const REPORTS: Array<{
  href: string;
  title: string;
  description: string;
  Icon: typeof Building2;
}> = [
  {
    href: "/izvestaji/zalihe",
    title: "Zalihe jedinica",
    description: "Raspoloživost, prodato, rezervisano — po projektu i statusu.",
    Icon: Building2,
  },
  {
    href: "/izvestaji/prodaje",
    title: "Prodaje",
    description: "Ugovorene, naplaćene, preostalo — filteri po projektu i periodu.",
    Icon: Handshake,
  },
  {
    href: "/izvestaji/kupci",
    title: "Kupci",
    description: "Distribucija po statusu i izvoru — pipeline kupaca.",
    Icon: Users,
  },
  {
    href: "/izvestaji/rezervacije",
    title: "Rezervacije",
    description: "Struktura rezervacija po statusu i izvoru.",
    Icon: BadgeCheck,
  },
  {
    href: "/izvestaji/uplate",
    title: "Uplate",
    description: "Kretanje uplata sa metodama plaćanja.",
    Icon: Wallet,
  },
  {
    href: "/izvestaji/agencije",
    title: "Učinak agencija",
    description: "Rezervacije, prodaje i provizije po povezanoj agenciji.",
    Icon: Store,
  },
];

export default async function ReportsIndexPage() {
  const ctx = await loadUserContext();
  if (!ctx) redirect("/sign-in");
  if (!ctx.activeOrganization) redirect("/dashboard");
  const isInvestor = ctx.activeOrganization.type === "INVESTOR";
  const items = isInvestor
    ? REPORTS
    : REPORTS.filter((r) => !r.href.endsWith("/prodaje") && !r.href.endsWith("/agencije") && !r.href.endsWith("/uplate"));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Izveštaji"
        description="Server-strana obračunata analitika. Filtri po projektu i periodu; export u CSV/XLSX."
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((r) => (
          <Link key={r.href} href={r.href}>
            <Card className="h-full transition hover:border-[var(--color-brand-300)]">
              <CardHeader className="flex flex-row items-center gap-3">
                <r.Icon className="size-5 text-[var(--color-brand-700)]" />
                <CardTitle className="text-base">{r.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-[var(--color-foreground-muted)]">
                {r.description}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
