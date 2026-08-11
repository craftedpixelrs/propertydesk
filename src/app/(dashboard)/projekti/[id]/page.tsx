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
              <Link href={`/projekti/${project.id}/izmena`}>Izmeni projekat</Link>
            </Button>
          </PermissionGuard>
          <PermissionGuard permission="inventory.import">
            <Button asChild variant="outline">
              <Link href={`/projekti/${project.id}/uvoz`}>Uvoz jedinica</Link>
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
              <Link href={`/projekti/${project.id}/jedinice/nova`}>Nova jedinica</Link>
            </Button>
          </PermissionGuard>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Ukupno jedinica" value={project._count.units} />
        <StatCard label="Rezervacije" value={project._count.reservations} />
        <StatCard label="Prodaje" value={project._count.sales} />
        <StatCard label="Status" value={project.projectStatus} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pregled</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <InfoRow label="Naziv" value={project.name} />
          <InfoRow label="Šifra" value={project.code} />
          <InfoRow label="Grad" value={project.city ?? "—"} />
          <InfoRow label="Opština" value={project.municipality ?? "—"} />
          <InfoRow label="Adresa" value={project.address ?? "—"} />
          <InfoRow label="Poštanski broj" value={project.postalCode ?? "—"} />
          <InfoRow label="Podrazumevana valuta" value={project.defaultCurrency} />
          <InfoRow
            label="PDV stopa"
            value={project.defaultVatRate ? `${project.defaultVatRate.toString()}%` : "—"}
          />
          <InfoRow label="Kreiran" value={formatDate(project.createdAt)} />
          <InfoRow
            label="Očekivani završetak"
            value={project.expectedCompletionDate ? formatDate(project.expectedCompletionDate) : "—"}
          />
          {project.description ? (
            <div className="sm:col-span-2">
              <div className="text-xs uppercase tracking-wide text-[var(--color-foreground-muted)]">
                Opis
              </div>
              <div className="mt-1 whitespace-pre-wrap text-sm">{project.description}</div>
            </div>
          ) : null}
          {project.publicMicrositeEnabled ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm sm:col-span-2">
              <div className="font-medium text-emerald-800">Javna stranica aktivna</div>
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
          <CardTitle>Lokacija</CardTitle>
        </CardHeader>
        <CardContent>
          {project.latitude != null && project.longitude != null ? (
            <ProjectMap
              latitude={Number(project.latitude)}
              longitude={Number(project.longitude)}
            />
          ) : (
            <div className="rounded-md border border-dashed border-[var(--color-border)] px-4 py-6 text-center text-sm text-[var(--color-foreground-muted)]">
              Koordinate projekta još nisu unete. Otvorite izmenu projekta i
              kliknite na mapu da postavite tačku.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>Struktura projekta</CardTitle>
              <p className="text-xs text-[var(--color-foreground-muted)]">
                Organizujte projekat u Objekte (zgrade/lamele) → Ulaze → Spratove.
                Ova hijerarhija omogućava tačno lociranje svake jedinice i lakše
                filtriranje. Sve je opciono — ako imate samo jednu zgradu bez
                izraženih ulaza, možete preskočiti.
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
          <Link href={`/jedinice?projectId=${project.id}`}>Pogledaj sve jedinice</Link>
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
