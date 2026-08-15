import Link from "next/link";
import { z } from "zod";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  hasPdPermission,
  requirePropertyDeskAccess,
} from "@/server/permissions/property-desk";
import { listMarketingLeads } from "@/server/services/property-desk/marketing-leads.service";
import { listTeamMembers } from "@/server/services/property-desk/team.service";
import { STAGE_TO_LEVEL } from "@/server/services/property-desk/lead-lifecycle";

import { LeadListView, type LeadRow } from "./lead-list-view";

export const dynamic = "force-dynamic";

const STAGE_ENUM = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "DEMO",
  "PROPOSAL",
  "WON",
  "LOST",
  "NURTURING",
] as const;
const AUDIENCE_ENUM = ["INVESTOR", "AGENCY", "OTHER"] as const;
const LEVEL_ENUM = ["SOURCING", "CLOSING", "OPERATIONS", "ARCHIVED"] as const;
const PRIORITY_ENUM = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;
const TEMPERATURE_ENUM = ["COLD", "WARM", "HOT"] as const;
const TIMELINE_ENUM = ["WITHIN_30D", "WITHIN_90D", "LATER", "UNDECIDED"] as const;

const querySchema = z.object({
  page: z.string().optional(),
  stage: z.enum(STAGE_ENUM).optional(),
  audience: z.enum(AUDIENCE_ENUM).optional(),
  level: z.enum(LEVEL_ENUM).optional(),
  priority: z.enum(PRIORITY_ENUM).optional(),
  temperature: z.enum(TEMPERATURE_ENUM).optional(),
  timeline: z.enum(TIMELINE_ENUM).optional(),
  followUpWithinDays: z.string().optional(),
  minScore: z.string().optional(),
  sort: z.enum(["recent", "score"]).optional(),
  assignedTo: z.string().optional(),
  source: z.string().optional(),
  utmSource: z.string().optional(),
  hasOverdueTask: z.enum(["1", "0"]).optional(),
  q: z.string().optional(),
});

const STAGE_LABEL: Record<string, string> = {
  NEW: "Novi",
  CONTACTED: "Kontaktirano",
  QUALIFIED: "Kvalifikovano",
  DEMO: "Demo",
  PROPOSAL: "Ponuda",
  WON: "Konvertovano",
  LOST: "Izgubljeno",
  NURTURING: "Nurturing",
};

const AUDIENCE_LABEL: Record<string, string> = {
  INVESTOR: "Investitor",
  AGENCY: "Agencija",
  OTHER: "Ostalo",
};

const LEVEL_LABEL: Record<string, string> = {
  SOURCING: "L1 Sourcing",
  CLOSING: "L2 Closing",
  OPERATIONS: "L3 Operations",
  ARCHIVED: "Arhivirano",
};

const PRIORITY_LABEL: Record<string, string> = {
  LOW: "Nizak",
  NORMAL: "Normalan",
  HIGH: "Visok",
  URGENT: "Hitno",
};

const TEMPERATURE_LABEL: Record<string, string> = {
  COLD: "Cold",
  WARM: "Warm",
  HOT: "Hot",
};

const TIMELINE_LABEL: Record<string, string> = {
  WITHIN_30D: "≤ 30 dana",
  WITHIN_90D: "30–90 dana",
  LATER: "Kasnije",
  UNDECIDED: "Neodređeno",
};

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function PropertyDeskLeadsPage({ searchParams }: PageProps) {
  const ctx = await requirePropertyDeskAccess();
  const raw = await searchParams;
  const parsed = querySchema.parse(raw);
  const page = Number.parseInt(parsed.page ?? "1", 10) || 1;

  let assignedToUserId: string | null | undefined = undefined;
  if (parsed.assignedTo === "unassigned") assignedToUserId = null;
  else if (parsed.assignedTo === "me") assignedToUserId = ctx.session.user.id;
  else if (parsed.assignedTo) assignedToUserId = parsed.assignedTo;

  const followUpWithinDays = parsed.followUpWithinDays
    ? Math.max(0, Math.min(365, Number.parseInt(parsed.followUpWithinDays, 10) || 0))
    : undefined;
  const minScore = parsed.minScore
    ? Math.max(0, Math.min(100, Number.parseInt(parsed.minScore, 10) || 0))
    : undefined;

  const [
    { items, total, pageSize },
    teamMembers,
    canCreate,
    canBulk,
    canReassign,
    canUpdateStage,
    canReopen,
  ] = await Promise.all([
    listMarketingLeads(ctx, {
      page,
      pageSize: 25,
      stage: parsed.stage,
      audience: parsed.audience,
      level: parsed.level,
      priority: parsed.priority,
      temperature: parsed.temperature,
      timelineHorizon: parsed.timeline,
      followUpWithinDays,
      minScore,
      sort: parsed.sort,
      assignedToUserId,
      q: parsed.q,
      source: parsed.source,
      utmSource: parsed.utmSource,
      hasOverdueTask: parsed.hasOverdueTask === "1",
    }),
    listTeamMembers(),
    hasPdPermission(ctx, "pd_lead.create"),
    hasPdPermission(ctx, "pd_lead.bulk"),
    hasPdPermission(ctx, "pd_lead.reassign"),
    hasPdPermission(ctx, "pd_lead.update_stage"),
    hasPdPermission(ctx, "pd_lead.reopen"),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const rows: LeadRow[] = items.map((l) => ({
    id: l.id,
    email: l.email,
    firstName: l.firstName,
    lastName: l.lastName,
    phone: l.phone,
    city: l.city,
    audience: l.audience,
    stage: l.stage,
    level: l.level,
    priority: l.priority,
    temperature: l.temperature,
    leadScore: l.leadScore,
    companyName: l.companyName,
    nextFollowUpAt: l.nextFollowUpAt ? l.nextFollowUpAt.toISOString() : null,
    createdAt: l.createdAt.toISOString(),
    source: l.source,
    assignedTo: l.assignedTo
      ? { id: l.assignedTo.id, name: l.assignedTo.name }
      : null,
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Marketing lead pipeline</h2>
          <p className="text-sm text-[var(--color-foreground-muted)]">
            Persistirani lead-ovi grupisani po levelima (Sourcing → Closing →
            Operations). Vidljivost je scoping-aware — vidite samo lead-ove u
            vašem level-u i <code>leadScope</code>-u (osim ako imate{" "}
            <code>pd_lead.view_team</code>).
          </p>
        </div>
        <Badge tone="neutral">Ukupno: {total}</Badge>
      </div>

      {raw.handoff ? (
        <HandoffBanner stage={raw.handoff} />
      ) : null}

      <Card>
        <CardContent className="p-4">
          <form
            className="grid gap-3 md:grid-cols-6"
            action="/administracija/property-desk/leadovi"
          >
            <input
              type="text"
              name="q"
              defaultValue={parsed.q ?? ""}
              placeholder="Pretraga (ime, email, telefon, grad, firma, beleška)"
              className="h-10 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm md:col-span-3"
            />
            <select
              name="level"
              defaultValue={parsed.level ?? ""}
              className="h-10 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
            >
              <option value="">— svi leveli —</option>
              {Object.entries(LEVEL_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            <select
              name="stage"
              defaultValue={parsed.stage ?? ""}
              className="h-10 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
            >
              <option value="">— sve faze —</option>
              {Object.entries(STAGE_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            <select
              name="audience"
              defaultValue={parsed.audience ?? ""}
              className="h-10 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
            >
              <option value="">— sve publike —</option>
              {Object.entries(AUDIENCE_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            <select
              name="priority"
              defaultValue={parsed.priority ?? ""}
              className="h-10 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
            >
              <option value="">— svi prioriteti —</option>
              {Object.entries(PRIORITY_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            <select
              name="temperature"
              defaultValue={parsed.temperature ?? ""}
              className="h-10 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
            >
              <option value="">— svi „grade" —</option>
              {Object.entries(TEMPERATURE_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            <select
              name="timeline"
              defaultValue={parsed.timeline ?? ""}
              className="h-10 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
            >
              <option value="">— svi timeline-ovi —</option>
              {Object.entries(TIMELINE_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            <select
              name="assignedTo"
              defaultValue={parsed.assignedTo ?? ""}
              className="h-10 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
            >
              <option value="">— svi vlasnici —</option>
              <option value="me">Meni dodeljeno</option>
              <option value="unassigned">Bez vlasnika</option>
              {teamMembers.map((tm) => (
                <option key={tm.userId} value={tm.userId}>
                  {tm.user.name}
                </option>
              ))}
            </select>
            <select
              name="sort"
              defaultValue={parsed.sort ?? ""}
              className="h-10 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
            >
              <option value="">Sort: score desc (default)</option>
              <option value="recent">Sort: najnoviji</option>
              <option value="score">Sort: score desc</option>
            </select>
            <input
              type="number"
              name="minScore"
              min={0}
              max={100}
              defaultValue={parsed.minScore ?? ""}
              placeholder="Min score (0-100)"
              className="h-10 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
            />
            <input
              type="number"
              name="followUpWithinDays"
              min={0}
              max={365}
              defaultValue={parsed.followUpWithinDays ?? ""}
              placeholder="Follow-up u N dana"
              className="h-10 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="hasOverdueTask"
                value="1"
                defaultChecked={parsed.hasOverdueTask === "1"}
              />
              Overdue task
            </label>
            <input
              type="text"
              name="source"
              defaultValue={parsed.source ?? ""}
              placeholder="Izvor (npr. landing, manual)"
              className="h-10 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
            />
            <input
              type="text"
              name="utmSource"
              defaultValue={parsed.utmSource ?? ""}
              placeholder="utm_source"
              className="h-10 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
            />
            <div className="md:col-span-6 flex gap-2">
              <button
                type="submit"
                className="h-10 rounded-md bg-[var(--color-brand-600)] px-4 text-sm text-white hover:bg-[var(--color-brand-700)]"
              >
                Primeni filtere
              </button>
              <Link
                href="/administracija/property-desk/leadovi"
                className="h-10 rounded-md border border-[var(--color-border)] px-4 text-sm leading-10 hover:bg-[var(--color-surface-inset)]"
              >
                Reset
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      <LeadListView
        items={rows}
        teamMembers={teamMembers.map((tm) => ({
          userId: tm.userId,
          name: tm.user.name,
        }))}
        canCreate={canCreate}
        canBulk={canBulk}
        canReassign={canReassign}
        canUpdateStage={canUpdateStage}
        canReopen={canReopen}
        currentUserId={ctx.session.user.id}
      />

      {totalPages > 1 ? (
        <div className="flex items-center justify-end gap-2 text-sm">
          <PageLink
            label="← Prethodna"
            page={page - 1}
            disabled={page <= 1}
            params={parsed}
          />
          <span className="px-2 text-[var(--color-foreground-muted)]">
            Strana {page} / {totalPages}
          </span>
          <PageLink
            label="Sledeća →"
            page={page + 1}
            disabled={page >= totalPages}
            params={parsed}
          />
        </div>
      ) : null}
    </div>
  );
}

function HandoffBanner({ stage }: { stage: string }) {
  const stageLabel = STAGE_LABEL[stage] ?? stage;
  const level = STAGE_TO_LEVEL[stage as keyof typeof STAGE_TO_LEVEL];
  const levelLabel = level ? LEVEL_LABEL[level] : null;
  const body =
    stage === "LOST"
      ? "Lead je označen kao izgubljen i arhiviran. Više nije u tvom aktivnom pipeline-u."
      : stage === "WON"
        ? "Lead je konvertovan i prešao u L3 Operations. Handover je uspeo — više nije u tvom pipeline-u."
        : `Lead je prebačen u fazu „${stageLabel}”${
            levelLabel ? ` (${levelLabel})` : ""
          } i predat sledećem timu u pool. To je uspešna predaja, ne greška.`;

  return (
    <div
      className="rounded-md border border-[var(--color-success)] bg-[var(--color-success-bg)] p-4 text-sm text-[var(--color-success)]"
      role="status"
    >
      <p className="font-semibold">Predaja uspela</p>
      <p className="mt-1">{body}</p>
      <Link
        href="/administracija/property-desk/leadovi"
        className="mt-2 inline-block text-xs font-medium underline"
      >
        Sakrij poruku
      </Link>
    </div>
  );
}

function PageLink({
  label,
  page,
  disabled,
  params,
}: {
  label: string;
  page: number;
  disabled: boolean;
  params: Record<string, string | undefined>;
}) {
  if (disabled) {
    return (
      <span className="cursor-not-allowed rounded-md border border-[var(--color-border)] px-3 py-1 opacity-50">
        {label}
      </span>
    );
  }
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v && k !== "page") usp.set(k, v);
  }
  usp.set("page", String(page));
  return (
    <Link
      href={`/administracija/property-desk/leadovi?${usp.toString()}`}
      className="rounded-md border border-[var(--color-border)] px-3 py-1 hover:bg-[var(--color-surface-inset)]"
    >
      {label}
    </Link>
  );
}
