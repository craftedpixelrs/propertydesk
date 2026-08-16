import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { loadUserContext } from "@/server/auth/context";
import {
  getConnectionDetail,
} from "@/server/services/agencies/agencies.service";
import { listCommissionRules } from "@/server/services/commissions/rules.service";
import { prisma } from "@/server/db/prisma";
import { formatDate } from "@/lib/formatters";
import { ConnectionStatusActions } from "@/features/agencies/connection-status-actions";
import { ProjectAccessManager } from "@/features/agencies/project-access-manager";
import { ProtectionDaysField } from "@/features/agencies/protection-days-field";
import { CommissionRulesManager } from "@/features/agencies/commission-rules-manager";
import { createT, type TranslationKey } from "@/lib/i18n";
import type { AgencyConnectionStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const TABS = ["projects", "protection", "commissions"] as const;
type Tab = (typeof TABS)[number];

const TAB_KEYS: Record<Tab, TranslationKey> = {
  projects: "partners.detail.tabProjects",
  protection: "partners.detail.tabProtection",
  commissions: "partners.detail.tabCommissions",
};

const CONNECTION_STATUS_KEYS: Record<AgencyConnectionStatus, TranslationKey> = {
  INVITED: "partners.connectionStatus.INVITED",
  ACTIVE: "partners.connectionStatus.ACTIVE",
  SUSPENDED: "partners.connectionStatus.SUSPENDED",
  REJECTED: "partners.connectionStatus.REJECTED",
  TERMINATED: "partners.connectionStatus.TERMINATED",
};

function readTab(raw: string | string[] | undefined): Tab {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (v && (TABS as readonly string[]).includes(v)) return v as Tab;
  return "projects";
}

export default async function AgencijaDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const tab = readTab(sp.tab);

  const ctx = await loadUserContext();
  if (!ctx) redirect("/sign-in");
  if (!ctx.activeOrganization) redirect("/podesavanja");
  if (ctx.activeOrganization.type !== "INVESTOR") redirect("/dashboard");

  const t = createT(ctx.user.locale);

  let connection: Awaited<ReturnType<typeof getConnectionDetail>>;
  try {
    connection = await getConnectionDetail(ctx.activeOrganization.id, id);
  } catch {
    notFound();
  }

  const projects = await prisma.project.findMany({
    where: { organizationId: ctx.activeOrganization.id, archivedAt: null },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    select: { id: true, name: true, code: true },
  });

  const commissionRules = await listCommissionRules({
    investorOrganizationId: ctx.activeOrganization.id,
    agencyConnectionId: connection.id,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/agencije" className="text-sm text-[var(--color-brand-700)] hover:underline">
              ← {t("nav.agencies")}
            </Link>
          </div>
          <h1 className="mt-2 text-2xl font-semibold">
            {connection.agency.profile?.displayName ?? connection.agency.name}
          </h1>
          <p className="text-sm text-[var(--color-foreground-muted)]">
            {t("partners.detail.established", { date: formatDate(connection.invitedAt) })}{" "}
            <strong>{t(CONNECTION_STATUS_KEYS[connection.status])}</strong>
          </p>
        </div>
        <ConnectionStatusActions connectionId={connection.id} status={connection.status} />
      </div>

      <nav className="border-b border-[var(--color-border)]">
        <ul className="flex gap-1 overflow-x-auto">
          {TABS.map((tabKey) => (
            <li key={tabKey}>
              <Link
                href={{ pathname: `/agencije/${id}`, query: { tab: tabKey } }}
                className={`inline-block px-3 py-2 text-sm ${
                  tab === tabKey
                    ? "border-b-2 border-[var(--color-brand-600)] font-medium text-[var(--color-brand-700)]"
                    : "text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)]"
                }`}
              >
                {t(TAB_KEYS[tabKey])}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {tab === "projects" ? (
        <ProjectAccessManager
          connectionId={connection.id}
          existing={connection.projectAccess.map((a) => ({
            id: a.id,
            projectId: a.projectId,
            projectName: a.project.name,
            projectCode: a.project.code,
            status: a.status,
            canViewPrices: a.canViewPrices,
            canViewFloorPlans: a.canViewFloorPlans,
            canRequestReservations: a.canRequestReservations,
            showOnlyAgencyVisibleUnits: a.showOnlyAgencyVisibleUnits,
          }))}
          availableProjects={projects}
        />
      ) : null}

      {tab === "protection" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("partners.detail.tabProtection")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-[var(--color-foreground-muted)]">
              {t("partners.detail.protectionHint")}
            </p>
            <ProtectionDaysField
              connectionId={connection.id}
              initialDays={connection.defaultProtectionDays}
            />
          </CardContent>
        </Card>
      ) : null}

      {tab === "commissions" ? (
        <CommissionRulesManager
          connectionId={connection.id}
          rules={commissionRules.map((r) => ({
            id: r.id,
            projectId: r.projectId,
            unitId: r.unitId,
            calculationType: r.calculationType,
            rate: r.rate ? r.rate.toString() : null,
            fixedAmount: r.fixedAmount ? r.fixedAmount.toString() : null,
            currency: r.currency,
            validFrom: r.validFrom,
            validTo: r.validTo,
            internalNote: r.internalNote,
          }))}
          projects={projects}
        />
      ) : null}

      <div className="pt-4">
        <Button asChild variant="outline">
          <Link href="/agencije">{t("common.backToList")}</Link>
        </Button>
      </div>
    </div>
  );
}
