import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PermissionGuard } from "@/components/app/permission-guard";
import { loadUserContext } from "@/server/auth/context";
import { getProjectById } from "@/server/services/projects.service";
import { listDocuments } from "@/server/services/documents.service";
import { isDomainError } from "@/lib/errors";
import { formatDate } from "@/lib/formatters";
import { createT, projectStatusLabel } from "@/lib/i18n";
import { StructureManager } from "@/features/projects/structure-manager";
import { PhotoGallery, type PhotoItem } from "@/features/documents/photo-gallery";
import { ProjectMap } from "@/features/projects/project-map-loader";
import { CloneProjectDialog } from "@/features/projects/clone-project-dialog";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProjectDetail({ params }: Props) {
  const { id } = await params;
  const ctx = await loadUserContext();
  if (!ctx) redirect("/sign-in");
  if (!ctx.activeOrganization) redirect("/podesavanja");
  const t = createT(ctx.user.locale);

  let project: Awaited<ReturnType<typeof getProjectById>>;
  try {
    project = await getProjectById(ctx.activeOrganization.id, id);
  } catch (err) {
    if (isDomainError(err) && err.code === "NOT_FOUND") return notFound();
    throw err;
  }

  const canManageDocs = ctx.permissions.includes("document.manage");
  const photosResult = await listDocuments({
    organizationId: ctx.activeOrganization.id,
    entityType: "Project",
    entityId: project.id,
    imagesOnly: true,
    page: 1,
    pageSize: 60,
  });
  const photos: PhotoItem[] = photosResult.items.map((d) => ({
    id: d.id,
    fileName: d.fileName,
    originalFileName: d.originalFileName,
    mimeType: d.mimeType,
    size: d.size,
    isCover: d.isCover,
    sortOrder: d.sortOrder,
    createdAt: d.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-mono uppercase text-[var(--color-foreground-muted)]">
            {project.code}
          </div>
          <h1 className="text-2xl font-semibold">{project.name}</h1>
          <div className="text-sm text-[var(--color-foreground-muted)]">
            {project.city ?? "—"}
            {project.address ? ` · ${project.address}` : ""}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <PermissionGuard permission="project.update">
            <Button asChild variant="outline">
              <Link href={`/projekti/${project.id}/izmena`}>{t("inventory.projects.edit")}</Link>
            </Button>
          </PermissionGuard>
          <PermissionGuard permission="inventory.import">
            <Button asChild variant="outline">
              <Link href={`/projekti/${project.id}/uvoz`}>{t("import.title")}</Link>
            </Button>
          </PermissionGuard>
          <PermissionGuard permission="project.create">
            <CloneProjectDialog
              projectId={project.id}
              sourceCode={project.code}
              sourceName={project.name}
            />
          </PermissionGuard>
          <PermissionGuard permission="inventory.manage">
            <Button asChild>
              <Link href={`/projekti/${project.id}/jedinice/nova`}>{t("units.newUnit")}</Link>
            </Button>
          </PermissionGuard>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label={t("projects.summary.totalUnits")} value={project._count.units} />
        <StatCard label={t("nav.reservations")} value={project._count.reservations} />
        <StatCard label={t("nav.sales")} value={project._count.sales} />
        <StatCard
          label={t("common.statusLabel")}
          value={projectStatusLabel(project.projectStatus, t)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("projects.tabs.overview")}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <InfoRow label={t("projects.fields.name")} value={project.name} />
          <InfoRow label={t("inventory.columns.code")} value={project.code} />
          <InfoRow label={t("projects.fields.city")} value={project.city ?? "—"} />
          <InfoRow label={t("projects.fields.municipality")} value={project.municipality ?? "—"} />
          <InfoRow label={t("projects.fields.address")} value={project.address ?? "—"} />
          <InfoRow label={t("projects.fields.postalCode")} value={project.postalCode ?? "—"} />
          <InfoRow label={t("projects.fields.defaultCurrency")} value={project.defaultCurrency} />
          <InfoRow
            label={t("inventory.projects.vatRate")}
            value={project.defaultVatRate ? `${project.defaultVatRate.toString()}%` : "—"}
          />
          <InfoRow label={t("inventory.columns.created")} value={formatDate(project.createdAt)} />
          <InfoRow
            label={t("inventory.projects.expectedCompletion")}
            value={project.expectedCompletionDate ? formatDate(project.expectedCompletionDate) : "—"}
          />
          {project.description ? (
            <div className="sm:col-span-2">
              <div className="text-xs uppercase tracking-wide text-[var(--color-foreground-muted)]">
                {t("projects.fields.description")}
              </div>
              <div className="mt-1 whitespace-pre-wrap text-sm">{project.description}</div>
            </div>
          ) : null}
          {project.publicMicrositeEnabled ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm sm:col-span-2">
              <div className="font-medium text-emerald-800">{t("inventory.projects.micrositeActive")}</div>
              <div className="mt-1 text-emerald-700">
                <a
                  href={`/p/projekat/${project.publicMicrositeSlug ?? project.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  /p/projekat/{project.publicMicrositeSlug ?? project.slug}
                </a>
              </div>
            </div>
          ) : null}
          {project.networkCatalogEnabled ? (
            <div className="rounded-md border border-sky-200 bg-sky-50 p-3 text-sm sm:col-span-2">
              <div className="font-medium text-sky-900">
                {t("inventory.projects.networkCatalogActive")}
              </div>
              <div className="mt-1 text-sky-800">
                {t("inventory.projects.networkCatalogActiveHint")}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <PhotoGallery
        entityType="Project"
        entityId={project.id}
        photos={photos}
        canManage={canManageDocs}
        uploadCategory="PROJECT"
      />

      <Card>
        <CardHeader>
          <CardTitle>{t("inventory.projects.location")}</CardTitle>
        </CardHeader>
        <CardContent>
          {project.latitude != null && project.longitude != null ? (
            <ProjectMap
              latitude={Number(project.latitude)}
              longitude={Number(project.longitude)}
            />
          ) : (
            <div className="rounded-md border border-dashed border-[var(--color-border)] px-4 py-6 text-center text-sm text-[var(--color-foreground-muted)]">
              {t("inventory.projects.noCoordinates")}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>{t("structure.title")}</CardTitle>
              <p className="text-xs text-[var(--color-foreground-muted)]">
                {t("inventory.structure.help")}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <StructureManager
            projectId={project.id}
            buildings={project.buildings.map((b) => ({
              id: b.id,
              code: b.code,
              name: b.name,
              entrances: b.entrances.map((e) => ({
                id: e.id,
                code: e.code,
                name: e.name,
                floors: e.floors.map((f) => ({ id: f.id, label: f.label })),
              })),
            }))}
            canManage={ctx.permissions.includes("inventory.manage")}
          />
        </CardContent>
      </Card>

      <div className="flex items-center gap-2">
        <Button asChild variant="outline">
          <Link href={`/jedinice?projectId=${project.id}`}>{t("inventory.projects.viewAllUnits")}</Link>
        </Button>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-[var(--color-foreground-muted)]">
        {label}
      </div>
      <div className="mt-0.5">{value}</div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <Card>
      <CardContent className="py-3">
        <div className="text-xs uppercase tracking-wide text-[var(--color-foreground-muted)]">
          {label}
        </div>
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}
