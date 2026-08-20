"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { DateInput } from "@/components/ui/date-input";
import { Button } from "@/components/ui/button";
import { useT } from "@/components/app/i18n-provider";
import { cn } from "@/lib/utils";

export function ReportFiltersBar(props: {
  action: string;
  projects: Array<{ id: string; name: string }>;
  selectedProjectId?: string;
  from?: string;
  to?: string;
  exportCsvHref: string;
  exportXlsxHref: string;
  showProjectFilter?: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [projectId, setProjectId] = useState(props.selectedProjectId ?? "");
  const [from, setFrom] = useState(props.from ?? "");
  const [to, setTo] = useState(props.to ?? "");

  useEffect(() => {
    setProjectId(props.selectedProjectId ?? "");
    setFrom(props.from ?? "");
    setTo(props.to ?? "");
  }, [props.selectedProjectId, props.from, props.to]);

  function apply(next: { projectId?: string; from?: string; to?: string }) {
    const params = new URLSearchParams();
    const nextProject = next.projectId ?? projectId;
    const nextFrom = next.from ?? from;
    const nextTo = next.to ?? to;
    if (nextProject) params.set("projectId", nextProject);
    if (nextFrom) params.set("from", nextFrom);
    if (nextTo) params.set("to", nextTo);
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `${props.action}?${qs}` : props.action, { scroll: false });
      router.refresh();
    });
  }

  const hasFilters = Boolean(projectId || from || to);

  return (
    <div
      className={cn("flex flex-wrap items-end gap-3", pending && "opacity-70")}
      aria-busy={pending}
    >
      {props.showProjectFilter !== false ? (
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-[var(--color-foreground-muted)]">
            {t("units.columns.project")}
          </span>
          <select
            name="projectId"
            value={projectId}
            onChange={(e) => {
              setProjectId(e.target.value);
              apply({ projectId: e.target.value });
            }}
            className="h-9 rounded border border-[var(--color-border)] bg-white px-2 text-sm"
          >
            <option value="">{t("common.allProjects")}</option>
            {props.projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <label className="flex flex-col gap-1 text-xs">
        <span className="text-[var(--color-foreground-muted)]">{t("common.from")}</span>
        <DateInput
          name="from"
          value={from}
          onChange={(next) => {
            setFrom(next);
            apply({ from: next });
          }}
          className="w-40"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs">
        <span className="text-[var(--color-foreground-muted)]">{t("common.to")}</span>
        <DateInput
          name="to"
          value={to}
          onChange={(next) => {
            setTo(next);
            apply({ to: next });
          }}
          className="w-40"
        />
      </label>
      {hasFilters ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => {
            setProjectId("");
            setFrom("");
            setTo("");
            apply({ projectId: "", from: "", to: "" });
          }}
        >
          {t("common.reset")}
        </Button>
      ) : null}
      <div className="ml-auto flex gap-2">
        <Button asChild size="sm" variant="outline">
          <Link href={props.exportCsvHref} prefetch={false} target="_blank" rel="noopener">
            CSV
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href={props.exportXlsxHref} prefetch={false} target="_blank" rel="noopener">
            XLSX
          </Link>
        </Button>
      </div>
    </div>
  );
}
