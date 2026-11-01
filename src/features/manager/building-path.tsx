import Link from "next/link";

import type { TranslateFn } from "@/lib/i18n";
import {
  buildingPath,
  type BuildingPulse,
  type PathTone,
} from "@/server/services/manager/building-pulse";

export function BuildingPathGrid({
  buildingId,
  pulse,
  t,
}: {
  buildingId: string;
  pulse: BuildingPulse;
  t: TranslateFn;
}) {
  const path = buildingPath(pulse);
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <PathStep
        tone={path.units}
        title={t("manager.building.overview.stepUnits")}
        body={
          pulse.units === 0
            ? t("manager.building.overview.unitsEmpty")
            : [
                t("manager.building.overview.unitsReady", { count: pulse.units }),
                pulse.unitsWithoutOwner > 0
                  ? t("manager.building.overview.unitsWithoutOwner", {
                      count: pulse.unitsWithoutOwner,
                    })
                  : null,
              ]
                .filter(Boolean)
                .join(" ")
        }
        links={[
          { href: `/zgrade/${buildingId}/delovi`, label: t("manager.building.tabs.units") },
          { href: `/zgrade/${buildingId}/uvoz`, label: t("manager.buildings.importButton") },
        ]}
      />
      <PathStep
        tone={path.residents}
        title={t("manager.building.overview.stepResidents")}
        body={
          pulse.persons === 0
            ? t("manager.building.overview.residentsEmpty")
            : pulse.portalInvites === 0
              ? t("manager.building.overview.residentsNoInvite", { persons: pulse.persons })
              : t("manager.building.overview.residentsReady", {
                  persons: pulse.persons,
                  invites: pulse.portalInvites,
                })
        }
        links={[
          {
            href: `/zgrade/${buildingId}/vlasnici`,
            label: t("manager.building.overview.openOwners"),
          },
          {
            href: `/zgrade/stanari?building=${buildingId}`,
            label: t("manager.building.overview.openResidents"),
          },
        ]}
      />
      <PathStep
        tone={path.money}
        title={t("manager.building.overview.stepMoney")}
        body={
          pulse.tariffs === 0
            ? t("manager.building.overview.moneyNoTariff")
            : pulse.openCharges > 0
              ? t("manager.building.overview.moneyOpen", { count: pulse.openCharges })
              : t("manager.building.overview.moneyReady")
        }
        links={[
          {
            href: `/zgrade/${buildingId}/finansije`,
            label: t("manager.building.overview.openFinance"),
          },
          {
            href: `/zgrade/duznici?building=${buildingId}`,
            label: t("manager.building.overview.openDebtors"),
          },
        ]}
      />
      <PathStep
        tone={path.community}
        title={t("manager.building.overview.stepCommunity")}
        body={[
          pulse.openTickets > 0
            ? t("manager.building.overview.ticketsOpen", { count: pulse.openTickets })
            : t("manager.building.overview.ticketsClear"),
          pulse.liveAssemblies > 0
            ? t("manager.building.overview.assembliesOpen", { count: pulse.liveAssemblies })
            : t("manager.building.overview.assembliesClear"),
          t("manager.building.overview.noticesCount", { count: pulse.notices }),
        ].join(" ")}
        links={[
          {
            href: `/zgrade/${buildingId}/kvarovi`,
            label: t("manager.building.overview.openTickets"),
          },
          {
            href: `/zgrade/${buildingId}/obavestenja`,
            label: t("manager.building.overview.openNotices"),
          },
          {
            href: `/zgrade/${buildingId}/skupstine`,
            label: t("manager.building.overview.openAssemblies"),
          },
        ]}
      />
    </div>
  );
}

function PathStep({
  tone,
  title,
  body,
  links,
}: {
  tone: PathTone;
  title: string;
  body: string;
  links: Array<{ href: string; label: string }>;
}) {
  return (
    <div
      className={`space-y-2 rounded-md border bg-[var(--color-surface)] p-3 ${
        tone === "next" ? "border-amber-400" : "border-[var(--color-border)]"
      }`}
    >
      <div className="text-sm font-medium">{title}</div>
      <p className="text-sm text-[var(--color-foreground-muted)]">{body}</p>
      <div className="flex flex-wrap gap-3 text-sm">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-[var(--color-brand-700)] hover:underline"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
